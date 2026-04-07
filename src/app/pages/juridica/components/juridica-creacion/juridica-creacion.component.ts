// src/app/pages/juridica/components/juridica-creacion/juridica-creacion.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { JuridicaService } from '../../../../core/services/juridica.service';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { CreateContratoDto, Contrato, TipoContrato } from '../../../../core/models/juridica.model';

@Component({
  selector: 'app-juridica-creacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './juridica-creacion.component.html',
  styleUrls: ['./juridica-creacion.component.scss']
})
export class JuridicaCreacionComponent implements OnInit, OnDestroy {
  contratoForm!: FormGroup;
  isEditMode = false;
  isViewMode = false;
  contratoId: string | null = null;
  isLoading = false;
  isSubmitting = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';
  pasoActual = 1;
  anioActual = new Date().getFullYear();
  vigencias: number[] = [];
  supervisores: any[] = [];
  valorTotal = 0;
  documentosContrato: any[] = [];

  // Propiedades para búsqueda de contratista
  contratistaEncontrado: any = null;
  contratistaDocumentos: any[] = [];
  buscandoContratista = false;
  mostrarDocumentosContratista = false;
  contratistaSeleccionadoId: string | null = null;

  // Archivos
  cdpFile: File | null = null;
  rpFile: File | null = null;
  polizaCumplimientoFile: File | null = null;
  polizaCalidadFile: File | null = null;
  polizaRCFile: File | null = null;

  cdpFileName: string = '';
  rpFileName: string = '';
  polizaCumplimientoFileName: string = '';
  polizaCalidadFileName: string = '';
  polizaRCFileName: string = '';

  cdpFileError: string | null = null;
  rpFileError: string | null = null;
  polizaCumplimientoFileError: string | null = null;

  tiposContrato = [
    { value: 'PRESTACION_SERVICIOS', label: 'Prestacion de Servicios' },
    { value: 'SUMINISTRO', label: 'Suministro' },
    { value: 'OBRA', label: 'Obra' },
    { value: 'CONSULTORIA', label: 'Consultoria' },
    { value: 'COMPRAVENTA', label: 'Compraventa' },
    { value: 'ARRENDAMIENTO', label: 'Arrendamiento' },
    { value: 'OTRO', label: 'Otro' }
  ];

  tiposIdentificacion = [
    { value: 'NIT', label: 'NIT' },
    { value: 'CC', label: 'Cedula de Ciudadania' },
    { value: 'CE', label: 'Cedula de Extranjeria' },
    { value: 'PAS', label: 'Pasaporte' }
  ];

  aseguradoras = [
    'Seguros Bolivar',
    'Seguros Sura',
    'Allianz Seguros',
    'Seguros Mundial',
    'AXA Colpatria',
    'Liberty Seguros',
    'Seguros Generales Suramericana',
    'Mapfre Seguros',
    'Otro'
  ];

  tiposDocumento = [
    { value: 'CONTRATO_FIRMADO', label: 'Contrato Firmado', icon: 'fa-file-signature' },
    { value: 'CDP', label: 'CDP - Certificado Disponibilidad', icon: 'fa-file-invoice' },
    { value: 'RP', label: 'RP - Registro Presupuestal', icon: 'fa-file-invoice-dollar' },
    { value: 'POLIZA_CUMPLIMIENTO', label: 'Póliza de Cumplimiento', icon: 'fa-shield-alt' },
    { value: 'POLIZA_CALIDAD', label: 'Póliza de Calidad', icon: 'fa-check-circle' },
    { value: 'POLIZA_RC', label: 'Póliza RC', icon: 'fa-gavel' },
    { value: 'OTRO', label: 'Otros Documentos', icon: 'fa-file-alt' }
  ];

  private subscriptions: Subscription[] = [];

  cargandoDocumentosContratista = false;

  constructor(
    private fb: FormBuilder,
    private juridicaService: JuridicaService,
    private contratistaService: ContratistasService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.generarVigencias();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.cargarSupervisores();
    this.checkEditMode();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get f() {
    return this.contratoForm.controls;
  }

  get valorNumerico(): number {
    return this.contratoForm.get('valor')?.value || 0;
  }

  get valorAnticipoNumerico(): number {
    return this.contratoForm.get('valorAnticipo')?.value || 0;
  }

  get adicionesNumerico(): number {
    return this.contratoForm.get('adiciones')?.value || 0;
  }

  get valorTotalNumerico(): number {
    return this.valorNumerico + this.adicionesNumerico;
  }

  get polizaCumplimientoValorNumerico(): number {
    return this.contratoForm.get('polizaCumplimientoValor')?.value || 0;
  }

  get polizaCalidadValorNumerico(): number {
    return this.contratoForm.get('polizaCalidadValor')?.value || 0;
  }

  get polizaRCValorNumerico(): number {
    return this.contratoForm.get('polizaRCValor')?.value || 0;
  }

  formatearNumeroConPuntos(numero: number): string {
    if (!numero && numero !== 0) return '0';
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  get valorInicialFormateado(): string {
    const valor = this.contratoForm.get('valor')?.value || 0;
    return this.formatearNumeroConPuntos(valor);
  }

  get adicionesFormateado(): string {
    const valor = this.contratoForm.get('adiciones')?.value || 0;
    return this.formatearNumeroConPuntos(valor);
  }

  get valorTotalFormateado(): string {
    const total = this.valorNumerico + this.adicionesNumerico;
    return this.formatearNumeroConPuntos(total);
  }

  get valorAnticipoFormateado(): string {
    const valor = this.contratoForm.get('valorAnticipo')?.value || 0;
    return this.formatearNumeroConPuntos(valor);
  }

  // ==================== BÚSQUEDA DE CONTRATISTA ====================

 buscarContratistaPorContrato(): void {
  const numeroContrato = this.contratoForm.get('numeroContrato')?.value;
  
  if (!numeroContrato || numeroContrato.trim().length < 3) {
    this.contratistaEncontrado = null;
    this.contratistaDocumentos = [];
    return;
  }

  this.buscandoContratista = true;
  
  // ✅ Usar el nombre correcto: buscarContratistaPorNumeroContrato
  this.juridicaService.buscarContratistaPorNumeroContrato(numeroContrato).subscribe({
    next: (response: any) => {  // ✅ Agregar tipo explícito
      this.contratistaEncontrado = response.data;
      this.buscandoContratista = false;
      
      // Actualizar los datos del proveedor en el formulario
      if (this.contratistaEncontrado) {
        this.contratoForm.patchValue({
          proveedor: {
            tipoIdentificacion: this.contratistaEncontrado.tipoDocumento || 'NIT',
            numeroIdentificacion: this.contratistaEncontrado.documentoIdentidad,
            nombreRazonSocial: this.contratistaEncontrado.razonSocial,
            telefono: this.contratistaEncontrado.telefono || '',
            email: this.contratistaEncontrado.email || ''
          }
        });
        
        // Cargar los documentos del contratista
        this.cargarDocumentosContratista(this.contratistaEncontrado.id);
      } else {
        this.contratistaDocumentos = [];
      }
    },
    error: (error: any) => {  // ✅ Agregar tipo explícito
      console.error('Error buscando contratista:', error);
      this.contratistaEncontrado = null;
      this.contratistaDocumentos = [];
      this.buscandoContratista = false;
    }
  });
}

  cargarDatosContratistaEnFormulario(contratista: any): void {
    const proveedorGroup = this.contratoForm.get('proveedor') as FormGroup;

    proveedorGroup.patchValue({
      tipoIdentificacion: contratista.tipoDocumento === 'NIT' ? 'NIT' :
        contratista.tipoDocumento === 'CC' ? 'CC' :
          contratista.tipoDocumento === 'CE' ? 'CE' : 'NIT',
      numeroIdentificacion: contratista.documentoIdentidad,
      nombreRazonSocial: contratista.razonSocial,
      telefono: contratista.telefono || '',
      email: contratista.email || ''
    });
  }

cargarDocumentosContratista(contratistaId: string): void {
  if (!contratistaId) {
    this.cargandoDocumentosContratista = false;
    return;
  }

  this.cargandoDocumentosContratista = true;
  
  this.contratistaService.obtenerDocumentos(contratistaId).subscribe({
    next: (documentos: any[]) => {
      this.contratistaDocumentos = documentos || [];
      this.cargandoDocumentosContratista = false;
    },
    error: (error: any) => {
      console.error('Error cargando documentos del contratista:', error);
      this.contratistaDocumentos = [];
      this.cargandoDocumentosContratista = false;
    }
  });
}

  descargarDocumentoContratista(documento: any): void {
    if (!this.contratistaSeleccionadoId || !documento.id) {
      this.errorMessage = 'No se puede descargar el documento';
      setTimeout(() => this.dismissError(), 3000);
      return;
    }

    this.contratistaService.descargarDocumento(this.contratistaSeleccionadoId, documento.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = documento.nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Error descargando documento:', error);
        this.errorMessage = 'Error al descargar el documento';
        setTimeout(() => this.dismissError(), 3000);
      }
    });
  }

  verDocumentoContratista(documento: any): void {
    if (!this.contratistaSeleccionadoId || !documento.id) {
      this.errorMessage = 'No se puede visualizar el documento';
      setTimeout(() => this.dismissError(), 3000);
      return;
    }

    this.contratistaService.descargarDocumento(this.contratistaSeleccionadoId, documento.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Error visualizando documento:', error);
        this.errorMessage = 'Error al visualizar el documento';
        setTimeout(() => this.dismissError(), 3000);
      }
    });
  }

  // ==================== MÉTODOS EXISTENTES ====================

  private generarVigencias(): void {
    for (let i = 0; i < 5; i++) {
      this.vigencias.push(this.anioActual + i);
    }
  }

  private initializeForm(): void {
    this.contratoForm = this.fb.group({
      vigencia: [this.anioActual.toString(), Validators.required],
      numeroContrato: ['', Validators.required],
      tipoContrato: ['', Validators.required],
      proveedor: this.fb.group({
        tipoIdentificacion: ['NIT', Validators.required],
        numeroIdentificacion: ['', Validators.required],
        nombreRazonSocial: ['', Validators.required],
        telefono: [''],
        email: ['', [Validators.email]]
      }),
      objeto: ['', Validators.required],
      valor: ['', [Validators.required, Validators.min(1)]],
      plazoDias: ['', [Validators.required, Validators.min(1)]],
      fechaInicio: ['', Validators.required],
      fechaTerminacion: [{ value: '', disabled: true }, Validators.required],
      fechaFirma: ['', Validators.required],
      supervisor: ['', Validators.required],
      cdp: [''],
      rp: [''],
      seDesembolsaAnticipo: [false],
      porcentajeAnticipo: [{ value: '', disabled: true }],
      valorAnticipo: [{ value: '', disabled: true }],
      fechaDesembolsoAnticipo: [{ value: '', disabled: true }],
      adiciones: [0],
      requierePolizas: [false],
      polizaCumplimientoNumero: [''],
      polizaCumplimientoAseguradora: [''],
      polizaCumplimientoValor: [''],
      polizaCumplimientoVigenciaDesde: [''],
      polizaCumplimientoVigenciaHasta: [''],
      requierePolizaCalidad: [false],
      polizaCalidadNumero: [''],
      polizaCalidadAseguradora: [''],
      polizaCalidadValor: [''],
      polizaCalidadVigenciaDesde: [''],
      polizaCalidadVigenciaHasta: [''],
      requierePolizaRC: [false],
      polizaRCNumero: [''],
      polizaRCAseguradora: [''],
      polizaRCValor: [''],
      polizaRCVigenciaDesde: [''],
      polizaRCVigenciaHasta: ['']
    });

    const fechaInicioSub = this.contratoForm.get('fechaInicio')?.valueChanges.subscribe(() => this.calcularFechaFin());
    const plazoSub = this.contratoForm.get('plazoDias')?.valueChanges.subscribe(() => this.calcularFechaFin());
    const valorSub = this.contratoForm.get('valor')?.valueChanges.subscribe(() => {
      this.calcularValores();
      this.calcularValorAnticipo();
    });
    const adicionesSub = this.contratoForm.get('adiciones')?.valueChanges.subscribe(() => this.calcularValores());
    const anticipoSub = this.contratoForm.get('seDesembolsaAnticipo')?.valueChanges.subscribe((tieneAnticipo) => this.onAnticipoChange(tieneAnticipo));
    const porcentajeSub = this.contratoForm.get('porcentajeAnticipo')?.valueChanges.subscribe(() => this.calcularValorAnticipo());
    const requierePolizasSub = this.contratoForm.get('requierePolizas')?.valueChanges.subscribe((requiere) => this.onRequierePolizasChange(requiere));

    if (fechaInicioSub) this.subscriptions.push(fechaInicioSub);
    if (plazoSub) this.subscriptions.push(plazoSub);
    if (valorSub) this.subscriptions.push(valorSub);
    if (adicionesSub) this.subscriptions.push(adicionesSub);
    if (anticipoSub) this.subscriptions.push(anticipoSub);
    if (porcentajeSub) this.subscriptions.push(porcentajeSub);
    if (requierePolizasSub) this.subscriptions.push(requierePolizasSub);
  }

  convertirAPalabras(valor: number): string {
    if (!valor || valor === 0) return '';

    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    const convertirTresDigitos = (num: number): string => {
      if (num === 0) return '';

      const centena = Math.floor(num / 100);
      const decena = Math.floor((num % 100) / 10);
      const unidad = num % 10;

      let resultado = '';

      if (centena > 0) {
        if (centena === 1 && (decena > 0 || unidad > 0)) {
          resultado += 'cien ';
        } else {
          resultado += centenas[centena] + ' ';
        }
      }

      const resto = num % 100;
      if (resto >= 10 && resto <= 19) {
        resultado += especiales[resto - 10];
      } else if (resto >= 20) {
        resultado += decenas[decena];
        if (unidad > 0) {
          resultado += (decena === 2 ? ' y ' : ' y ') + unidades[unidad];
        }
      } else if (resto > 0 && resto < 10) {
        resultado += unidades[resto];
      }

      return resultado.trim();
    };

    const millones = Math.floor(valor / 1000000);
    const miles = Math.floor((valor % 1000000) / 1000);
    const resto = valor % 1000;

    let resultado = '';

    if (millones > 0) {
      if (millones === 1) {
        resultado += 'un millón ';
      } else {
        resultado += convertirTresDigitos(millones) + ' millones ';
      }
    }

    if (miles > 0) {
      if (miles === 1) {
        resultado += 'mil ';
      } else {
        resultado += convertirTresDigitos(miles) + ' mil ';
      }
    }

    if (resto > 0) {
      resultado += convertirTresDigitos(resto);
    }

    return resultado.trim() + ' pesos colombianos';
  }

  getRemainingChars(fieldName: string): number {
    const control = this.contratoForm.get(fieldName);
    if (!control) return 0;
    const currentValue = control.value || '';
    const maxLength = 500;
    return maxLength - currentValue.length;
  }

  formatearValor(campo: string): void {
    let valor = this.contratoForm.get(campo)?.value;
    if (valor) {
      if (typeof valor === 'string') {
        valor = valor.replace(/\D/g, '');
      }
      if (valor) {
        const numero = parseInt(valor);
        this.contratoForm.get(campo)?.setValue(numero, { emitEvent: false });
      }
    } else {
      if (campo === 'valor' || campo === 'adiciones') {
        this.contratoForm.get(campo)?.setValue(0, { emitEvent: false });
      }
    }
  }

  private calcularValores(): void {
    const valorInicial = this.contratoForm.get('valor')?.value || 0;
    const adiciones = this.contratoForm.get('adiciones')?.value || 0;
    this.valorTotal = valorInicial + adiciones;
  }

  private calcularValorAnticipo(): void {
    const valorContrato = this.contratoForm.get('valor')?.value || 0;
    const porcentaje = this.contratoForm.get('porcentajeAnticipo')?.value || 0;
    if (valorContrato && porcentaje) {
      const valorAnticipo = (valorContrato * porcentaje) / 100;
      this.contratoForm.patchValue({ valorAnticipo: Math.round(valorAnticipo) });
    }
  }

  private onRequierePolizasChange(requiere: boolean): void {
    if (!requiere) {
      this.contratoForm.patchValue({
        requierePolizaCalidad: false,
        requierePolizaRC: false,
        polizaCumplimientoNumero: '',
        polizaCumplimientoAseguradora: '',
        polizaCumplimientoValor: '',
        polizaCumplimientoVigenciaDesde: '',
        polizaCumplimientoVigenciaHasta: '',
        polizaCalidadNumero: '',
        polizaCalidadAseguradora: '',
        polizaCalidadValor: '',
        polizaCalidadVigenciaDesde: '',
        polizaCalidadVigenciaHasta: '',
        polizaRCNumero: '',
        polizaRCAseguradora: '',
        polizaRCValor: '',
        polizaRCVigenciaDesde: '',
        polizaRCVigenciaHasta: ''
      });
    }
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const modoVista = this.route.snapshot.url.some(segment => segment.path === 'ver');

    if (id) {
      this.isEditMode = true;
      this.isViewMode = modoVista;
      this.contratoId = id;
      this.cargarContrato(id);
    }
  }

  cargarContrato(id: string): void {
    this.isLoading = true;
    const sub = this.juridicaService.obtenerContratoPorId(id).subscribe({
      next: (contrato: any) => {
        if (contrato) {
          this.cargarDatosEnFormulario(contrato);
          if (this.isViewMode) {
            this.contratoForm.disable();
          }
        } else {
          this.errorMessage = 'Contrato no encontrado';
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error cargando contrato:', error);
        this.errorMessage = 'Error al cargar el contrato';
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  cargarDatosEnFormulario(contrato: any): void {
    const fechaInicio = contrato.fechaInicio ? new Date(contrato.fechaInicio).toISOString().split('T')[0] : '';
    const fechaTerminacion = contrato.fechaTerminacion ? new Date(contrato.fechaTerminacion).toISOString().split('T')[0] : '';
    const fechaFirma = contrato.fechaFirma ? new Date(contrato.fechaFirma).toISOString().split('T')[0] : '';
    const fechaDesembolso = contrato.fechaDesembolsoAnticipo ? new Date(contrato.fechaDesembolsoAnticipo).toISOString().split('T')[0] : '';

    this.documentosContrato = contrato.documentos || [];

    const patchData: any = {
      vigencia: contrato.vigencia,
      numeroContrato: contrato.numeroContrato,
      tipoContrato: contrato.tipoContrato,
      proveedor: {
        tipoIdentificacion: contrato.proveedor.tipoIdentificacion,
        numeroIdentificacion: contrato.proveedor.numeroIdentificacion,
        nombreRazonSocial: contrato.proveedor.nombreRazonSocial,
        telefono: contrato.proveedor.telefono || '',
        email: contrato.proveedor.email || ''
      },
      objeto: contrato.objeto,
      valor: contrato.valor,
      plazoDias: contrato.plazoDias,
      fechaInicio: fechaInicio,
      fechaTerminacion: fechaTerminacion,
      fechaFirma: fechaFirma,
      supervisor: contrato.supervisor || '',
      cdp: contrato.cdp || '',
      rp: contrato.rp || '',
      seDesembolsaAnticipo: contrato.seDesembolsaAnticipo,
      porcentajeAnticipo: contrato.porcentajeAnticipo || '',
      valorAnticipo: contrato.valorAnticipo || '',
      fechaDesembolsoAnticipo: fechaDesembolso,
      adiciones: contrato.adiciones || 0
    };

    if (contrato.requierePolizas !== undefined) patchData.requierePolizas = contrato.requierePolizas;
    if (contrato.polizaCumplimientoNumero !== undefined) patchData.polizaCumplimientoNumero = contrato.polizaCumplimientoNumero;
    if (contrato.polizaCumplimientoAseguradora !== undefined) patchData.polizaCumplimientoAseguradora = contrato.polizaCumplimientoAseguradora;
    if (contrato.polizaCumplimientoValor !== undefined) patchData.polizaCumplimientoValor = contrato.polizaCumplimientoValor;
    if (contrato.polizaCumplimientoVigenciaDesde !== undefined) patchData.polizaCumplimientoVigenciaDesde = contrato.polizaCumplimientoVigenciaDesde;
    if (contrato.polizaCumplimientoVigenciaHasta !== undefined) patchData.polizaCumplimientoVigenciaHasta = contrato.polizaCumplimientoVigenciaHasta;
    if (contrato.requierePolizaCalidad !== undefined) patchData.requierePolizaCalidad = contrato.requierePolizaCalidad;
    if (contrato.polizaCalidadNumero !== undefined) patchData.polizaCalidadNumero = contrato.polizaCalidadNumero;
    if (contrato.polizaCalidadAseguradora !== undefined) patchData.polizaCalidadAseguradora = contrato.polizaCalidadAseguradora;
    if (contrato.polizaCalidadValor !== undefined) patchData.polizaCalidadValor = contrato.polizaCalidadValor;
    if (contrato.polizaCalidadVigenciaDesde !== undefined) patchData.polizaCalidadVigenciaDesde = contrato.polizaCalidadVigenciaDesde;
    if (contrato.polizaCalidadVigenciaHasta !== undefined) patchData.polizaCalidadVigenciaHasta = contrato.polizaCalidadVigenciaHasta;
    if (contrato.requierePolizaRC !== undefined) patchData.requierePolizaRC = contrato.requierePolizaRC;
    if (contrato.polizaRCNumero !== undefined) patchData.polizaRCNumero = contrato.polizaRCNumero;
    if (contrato.polizaRCAseguradora !== undefined) patchData.polizaRCAseguradora = contrato.polizaRCAseguradora;
    if (contrato.polizaRCValor !== undefined) patchData.polizaRCValor = contrato.polizaRCValor;
    if (contrato.polizaRCVigenciaDesde !== undefined) patchData.polizaRCVigenciaDesde = contrato.polizaRCVigenciaDesde;
    if (contrato.polizaRCVigenciaHasta !== undefined) patchData.polizaRCVigenciaHasta = contrato.polizaRCVigenciaHasta;

    this.contratoForm.patchValue(patchData);
    this.valorTotal = contrato.valorTotal || 0;

    if (contrato.seDesembolsaAnticipo) {
      this.contratoForm.get('porcentajeAnticipo')?.enable();
      this.contratoForm.get('valorAnticipo')?.enable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.enable();
    }

    this.calcularValores();
  }

  cargarSupervisores(): void {
    const sub = this.juridicaService.obtenerSupervisores().subscribe({
      next: (supervisores: any[]) => this.supervisores = supervisores,
      error: (error: any) => console.error('Error cargando supervisores:', error)
    });
    this.subscriptions.push(sub);
  }

  siguientePaso(): void {
    if (this.validarPasoActual()) {
      this.pasoActual++;
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) this.pasoActual--;
  }

  private validarPasoActual(): boolean {
    if (this.isViewMode) return true;

    this.submitted = true;
    let isValid = true;

    if (this.pasoActual === 1) {
      const camposObligatorios = ['vigencia', 'numeroContrato', 'tipoContrato', 'objeto', 'valor', 'plazoDias', 'fechaInicio', 'fechaFirma', 'supervisor'];
      camposObligatorios.forEach(campo => {
        if (this.contratoForm.get(campo)?.invalid) isValid = false;
      });
      const proveedor = this.contratoForm.get('proveedor') as FormGroup;
      if (proveedor?.get('numeroIdentificacion')?.invalid) isValid = false;
      if (proveedor?.get('nombreRazonSocial')?.invalid) isValid = false;
    }

    if (this.pasoActual === 2) {
      if (this.contratoForm.get('seDesembolsaAnticipo')?.value === true) {
        if (this.contratoForm.get('porcentajeAnticipo')?.invalid) isValid = false;
        if (this.contratoForm.get('fechaDesembolsoAnticipo')?.invalid) isValid = false;
      }
      if (this.contratoForm.get('requierePolizas')?.value === true) {
        if (!this.contratoForm.get('polizaCumplimientoNumero')?.value) isValid = false;
        if (!this.contratoForm.get('polizaCumplimientoAseguradora')?.value) isValid = false;
        if (!this.contratoForm.get('polizaCumplimientoValor')?.value) isValid = false;
        if (!this.contratoForm.get('polizaCumplimientoVigenciaDesde')?.value) isValid = false;
        if (!this.contratoForm.get('polizaCumplimientoVigenciaHasta')?.value) isValid = false;
        if (!this.polizaCumplimientoFile) isValid = false;
      }
    }

    if (!isValid) this.contratoForm.markAllAsTouched();
    return isValid;
  }

  private onAnticipoChange(tieneAnticipo: boolean): void {
    if (tieneAnticipo) {
      this.contratoForm.get('porcentajeAnticipo')?.enable();
      this.contratoForm.get('porcentajeAnticipo')?.setValidators([Validators.required, Validators.min(1), Validators.max(100)]);
      this.contratoForm.get('valorAnticipo')?.enable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.enable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.setValidators(Validators.required);
    } else {
      this.contratoForm.get('porcentajeAnticipo')?.disable();
      this.contratoForm.get('porcentajeAnticipo')?.clearValidators();
      this.contratoForm.get('porcentajeAnticipo')?.setValue('');
      this.contratoForm.get('valorAnticipo')?.disable();
      this.contratoForm.get('valorAnticipo')?.setValue('');
      this.contratoForm.get('fechaDesembolsoAnticipo')?.disable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.clearValidators();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.setValue('');
    }
    this.contratoForm.get('porcentajeAnticipo')?.updateValueAndValidity();
    this.contratoForm.get('fechaDesembolsoAnticipo')?.updateValueAndValidity();
  }

  private calcularFechaFin(): void {
    const fechaInicio = this.contratoForm.get('fechaInicio')?.value;
    const plazo = this.contratoForm.get('plazoDias')?.value;
    if (fechaInicio && plazo) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + parseInt(plazo));
      this.contratoForm.patchValue({
        fechaTerminacion: fecha.toISOString().split('T')[0]
      });
    }
  }

  verDocumento(tipo: string): void {
    console.log('Ver documento:', tipo);
    alert(`Ver documento: ${tipo}\nFuncionalidad en desarrollo`);
  }

  descargarDocumento(tipo: string): void {
    console.log('Descargar documento:', tipo);
    alert(`Descargar documento: ${tipo}\nFuncionalidad en desarrollo`);
  }

  guardarContrato(): void {
    if (this.isViewMode) {
      this.router.navigate(['/juridica/list']);
      return;
    }

    this.submitted = true;
    if (this.contratoForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos requeridos';
      this.markStepFieldsAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.contratoForm.getRawValue();
    const dto: CreateContratoDto = {
      vigencia: formValue.vigencia,
      numeroContrato: formValue.numeroContrato,
      tipoContrato: formValue.tipoContrato as TipoContrato,
      proveedor: formValue.proveedor,
      objeto: formValue.objeto,
      valor: formValue.valor,
      plazoDias: formValue.plazoDias,
      cdp: formValue.cdp,
      rp: formValue.rp,
      fechaFirma: formValue.fechaFirma,
      fechaInicio: formValue.fechaInicio,
      fechaTerminacion: formValue.fechaTerminacion,
      seDesembolsaAnticipo: formValue.seDesembolsaAnticipo,
      adiciones: formValue.adiciones || 0,
      valorTotal: this.valorTotal,
      supervisor: formValue.supervisor,
      creadoPor: this.obtenerUsuarioActual(),
      requierePolizas: formValue.requierePolizas,
      polizaCumplimientoNumero: formValue.polizaCumplimientoNumero,
      polizaCumplimientoAseguradora: formValue.polizaCumplimientoAseguradora,
      polizaCumplimientoValor: formValue.polizaCumplimientoValor,
      polizaCumplimientoVigenciaDesde: formValue.polizaCumplimientoVigenciaDesde,
      polizaCumplimientoVigenciaHasta: formValue.polizaCumplimientoVigenciaHasta,
      requierePolizaCalidad: formValue.requierePolizaCalidad,
      polizaCalidadNumero: formValue.polizaCalidadNumero,
      polizaCalidadAseguradora: formValue.polizaCalidadAseguradora,
      polizaCalidadValor: formValue.polizaCalidadValor,
      polizaCalidadVigenciaDesde: formValue.polizaCalidadVigenciaDesde,
      polizaCalidadVigenciaHasta: formValue.polizaCalidadVigenciaHasta,
      requierePolizaRC: formValue.requierePolizaRC,
      polizaRCNumero: formValue.polizaRCNumero,
      polizaRCAseguradora: formValue.polizaRCAseguradora,
      polizaRCValor: formValue.polizaRCValor,
      polizaRCVigenciaDesde: formValue.polizaRCVigenciaDesde,
      polizaRCVigenciaHasta: formValue.polizaRCVigenciaHasta
    };

    if (formValue.seDesembolsaAnticipo) {
      dto.porcentajeAnticipo = formValue.porcentajeAnticipo;
      dto.valorAnticipo = formValue.valorAnticipo;
      dto.fechaDesembolsoAnticipo = formValue.fechaDesembolsoAnticipo;
    }

    let request;
    if (this.isEditMode && this.contratoId) {
      request = this.juridicaService.actualizarContrato(this.contratoId, dto);
    } else {
      request = this.juridicaService.crearContrato(dto);
    }

    const sub = request.subscribe({
      next: () => {
        this.successMessage = this.isEditMode ? 'Contrato actualizado exitosamente' : 'Contrato creado exitosamente';
        this.isSubmitting = false;
        setTimeout(() => this.router.navigate(['/juridica/list']), 1500);
      },
      error: (error: any) => {
        this.errorMessage = error.message || 'Error al guardar el contrato';
        this.isSubmitting = false;
      }
    });
    this.subscriptions.push(sub);
  }

  private obtenerUsuarioActual(): string {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.fullName || user.username || 'Sistema';
      } catch {
        return 'Sistema';
      }
    }
    return 'Sistema';
  }

  private markStepFieldsAsTouched(): void {
    if (this.pasoActual === 1) {
      this.contratoForm.get('vigencia')?.markAsTouched();
      this.contratoForm.get('numeroContrato')?.markAsTouched();
      this.contratoForm.get('tipoContrato')?.markAsTouched();
      this.contratoForm.get('objeto')?.markAsTouched();
      this.contratoForm.get('valor')?.markAsTouched();
      this.contratoForm.get('plazoDias')?.markAsTouched();
      this.contratoForm.get('fechaInicio')?.markAsTouched();
      this.contratoForm.get('fechaFirma')?.markAsTouched();
      this.contratoForm.get('supervisor')?.markAsTouched();
      const proveedorGroup = this.contratoForm.get('proveedor') as FormGroup;
      proveedorGroup.get('numeroIdentificacion')?.markAsTouched();
      proveedorGroup.get('nombreRazonSocial')?.markAsTouched();
    }
  }

  cancelar(): void {
    if (confirm('¿Cancelar? Los datos no guardados se perderán.')) {
      this.router.navigate(['/juridica/list']);
    }
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  get cdpRequerido(): boolean {
    return !!this.contratoForm.get('cdp')?.value && !this.cdpFile;
  }

  get rpRequerido(): boolean {
    return !!this.contratoForm.get('rp')?.value && !this.rpFile;
  }

  onFileSelected(event: any, tipo: 'cdp' | 'rp' | 'polizaCumplimiento' | 'polizaCalidad' | 'polizaRC'): void {
    const file: File = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      if (tipo === 'cdp') this.cdpFileError = 'Solo se permiten archivos PDF';
      else if (tipo === 'rp') this.rpFileError = 'Solo se permiten archivos PDF';
      else if (tipo === 'polizaCumplimiento') this.polizaCumplimientoFileError = 'Solo se permiten archivos PDF';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      if (tipo === 'cdp') this.cdpFileError = 'El archivo es demasiado grande (max. 5MB)';
      else if (tipo === 'rp') this.rpFileError = 'El archivo es demasiado grande (max. 5MB)';
      else if (tipo === 'polizaCumplimiento') this.polizaCumplimientoFileError = 'El archivo es demasiado grande (max. 5MB)';
      return;
    }

    if (tipo === 'cdp') {
      this.cdpFileError = null;
      this.cdpFile = file;
      this.cdpFileName = file.name;
    } else if (tipo === 'rp') {
      this.rpFileError = null;
      this.rpFile = file;
      this.rpFileName = file.name;
    } else if (tipo === 'polizaCumplimiento') {
      this.polizaCumplimientoFileError = null;
      this.polizaCumplimientoFile = file;
      this.polizaCumplimientoFileName = file.name;
    } else if (tipo === 'polizaCalidad') {
      this.polizaCalidadFile = file;
      this.polizaCalidadFileName = file.name;
    } else if (tipo === 'polizaRC') {
      this.polizaRCFile = file;
      this.polizaRCFileName = file.name;
    }
  }
}