// src/app/pages/juridica/components/juridica-creacion/juridica-creacion.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { JuridicaService } from '../../../../core/services/juridica.service';
import { ContratistasService } from '../../../../core/services/contratistas.service';

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
  contratistaSeleccionadoId: string | null = null;
  cargandoDocumentosContratista = false;

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

  // ✅ Propiedades faltantes para el template
  get cdpRequerido(): boolean {
    return !!this.contratoForm?.get('cdp')?.value && !this.cdpFile;
  }

  get rpRequerido(): boolean {
    return !!this.contratoForm?.get('rp')?.value && !this.rpFile;
  }

  get polizaCalidadValorNumerico(): number {
    return this.contratoForm?.get('polizaCalidadValor')?.value || 0;
  }

  get polizaRCValorNumerico(): number {
    return this.contratoForm?.get('polizaRCValor')?.value || 0;
  }

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

  private subscriptions: Subscription[] = [];

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
        valor = valor.replace(/\./g, '').replace(/\D/g, '');
      }
      if (valor) {
        const numero = parseInt(valor, 10);
        if (!isNaN(numero)) {
          this.contratoForm.get(campo)?.setValue(numero, { emitEvent: false });
        }
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
    const urlCompleta = this.router.url;
    const esModoVista = urlCompleta.includes('/ver/');

    if (id) {
      this.isEditMode = !esModoVista;
      this.isViewMode = esModoVista;
      this.contratoId = id;
      this.cargarContrato(id);
    } else {
      this.isEditMode = false;
      this.isViewMode = false;
      this.contratoId = null;
    }
  }

  cargarContrato(id: string): void {
    this.isLoading = true;
    const sub = this.juridicaService.obtenerContratoPorId(id).subscribe({
      next: (contrato: any) => {
        if (contrato) {
          // ✅ Primero cargar datos al formulario
          this.cargarDatosEnFormulario(contrato);

          // ✅ Asegurar paso 1
          this.pasoActual = 1;

          // ✅ Cargar documentos del contrato
          this.cargarDocumentosContrato(id);

          // ✅ ESPERAR un poco para asegurar que el formulario tiene el número de contrato
          setTimeout(() => {
            // ✅ Buscar contratista después de que el formulario esté actualizado
            if (this.contratoForm.get('numeroContrato')?.value) {
              console.log('🔍 Buscando contratista con número:', this.contratoForm.get('numeroContrato')?.value);
              this.buscarContratistaPorContrato();
            } else {
              console.warn('⚠️ No hay número de contrato en el formulario');
            }
          }, 100);

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


buscarContratistaPorContrato(): void {
  let numeroContrato = this.contratoForm.get('numeroContrato')?.value;

  if (!numeroContrato || numeroContrato.trim().length < 3) {
    this.contratistaEncontrado = null;
    this.contratistaDocumentos = [];
    this.contratistaSeleccionadoId = null;
    return;
  }

  this.buscandoContratista = true;

  this.juridicaService.buscarContratistaPorNumeroContrato(numeroContrato).subscribe({
    next: (contratista: any) => {
      this.buscandoContratista = false;

      if (contratista && contratista.id) {
        this.contratistaEncontrado = contratista;
        this.contratistaSeleccionadoId = contratista.id;

        // ✅ Cargar documentos
        if (contratista.documentos && Array.isArray(contratista.documentos) && contratista.documentos.length > 0) {
          this.contratistaDocumentos = contratista.documentos;
          console.log(`✅ Documentos del contratista cargados: ${this.contratistaDocumentos.length}`);
        } else {
          this.contratistaDocumentos = [];
        }

        // ✅ AUTO-LLENAR el campo "Objeto del Contrato" con objetivoContrato
        if (contratista.objetivoContrato && !this.isViewMode) {
          const objetoActual = this.contratoForm.get('objeto')?.value;
          if (!objetoActual || objetoActual.trim() === '') {
            this.contratoForm.patchValue({
              objeto: contratista.objetivoContrato
            });
            console.log(`✅ Campo "Objeto del Contrato" auto-llenado con: ${contratista.objetivoContrato}`);
          }
        }

        // ✅ Auto-llenar datos del proveedor
        if (!this.isViewMode) {
          this.contratoForm.patchValue({
            proveedor: {
              tipoIdentificacion: contratista.tipoDocumento || 'NIT',
              numeroIdentificacion: contratista.documentoIdentidad,
              nombreRazonSocial: contratista.razonSocial,
              telefono: contratista.telefono || '',
              email: contratista.email || ''
            }
          });
          console.log('✅ Datos del proveedor auto-llenados');
        }

        // ✅ Mostrar mensaje de éxito
        this.successMessage = `Contratista "${contratista.razonSocial}" cargado correctamente`;
        setTimeout(() => this.dismissSuccess(), 3000);
        
      } else {
        console.warn('⚠️ No se encontró contratista con el número:', numeroContrato);
        this.contratistaEncontrado = null;
        this.contratistaSeleccionadoId = null;
        this.contratistaDocumentos = [];
      }
    },
    error: (error: any) => {
      console.error('❌ Error buscando contratista:', error);
      this.contratistaEncontrado = null;
      this.contratistaDocumentos = [];
      this.contratistaSeleccionadoId = null;
      this.buscandoContratista = false;
    }
  });
}

  // ✅ Método para cargar documentos del contratista por separado
  cargarDocumentosContratista(contratistaId: string): void {
    if (!contratistaId) return;

    this.cargandoDocumentosContratista = true;
    this.contratistaService.obtenerDocumentos(contratistaId).subscribe({
      next: (documentos: any[]) => {
        this.contratistaDocumentos = documentos || [];
        console.log(`✅ Documentos del contratista cargados (petición aparte): ${this.contratistaDocumentos.length}`);
        this.cargandoDocumentosContratista = false;
      },
      error: (error: any) => {
        console.error('Error cargando documentos del contratista:', error);
        this.contratistaDocumentos = [];
        this.cargandoDocumentosContratista = false;
      }
    });
  }

  // ✅ Método para ver documento del contratista
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

  // ✅ Método para descargar documento del contratista
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

  cargarDatosEnFormulario(contrato: any): void {
    if (!contrato) {
      console.error('❌ Contrato es undefined o null');
      return;
    }

    console.log('📋 DATOS COMPLETOS DEL CONTRATO:', JSON.stringify(contrato, null, 2));
    console.log('📋 ESTRUCTURA - contrato.data?', contrato.data ? 'Sí' : 'No');

    // ✅ Si el contrato viene envuelto en { data: {...} }, extraerlo
    let datosContrato = contrato;
    if (contrato.data && !contrato.id) {
      datosContrato = contrato.data;
      console.log('📦 Contrato extraído de data:', datosContrato);
    }

    // ✅ Verificar campos principales
    console.log('🔍 Verificando campos:');
    console.log('  - numeroContrato:', datosContrato.numeroContrato);
    console.log('  - vigencia:', datosContrato.vigencia);
    console.log('  - valor:', datosContrato.valor);
    console.log('  - objeto:', datosContrato.objeto?.substring(0, 50));
    console.log('  - proveedor:', datosContrato.proveedor);
    console.log('  - documentos:', datosContrato.documentos?.length || 0);

    // ✅ Formatear fechas correctamente
    const fechaInicio = datosContrato.fechaInicio
      ? new Date(datosContrato.fechaInicio).toISOString().split('T')[0]
      : '';
    const fechaTerminacion = datosContrato.fechaTerminacion
      ? new Date(datosContrato.fechaTerminacion).toISOString().split('T')[0]
      : '';
    const fechaFirma = datosContrato.fechaFirma
      ? new Date(datosContrato.fechaFirma).toISOString().split('T')[0]
      : '';
    const fechaDesembolso = datosContrato.fechaDesembolsoAnticipo
      ? new Date(datosContrato.fechaDesembolsoAnticipo).toISOString().split('T')[0]
      : '';

    console.log('📅 Fechas formateadas:', { fechaInicio, fechaTerminacion, fechaFirma, fechaDesembolso });

    // ✅ Asignar documentos
    this.documentosContrato = datosContrato.documentos || [];
    console.log(`📄 Documentos del contrato: ${this.documentosContrato.length}`);

    // ✅ Proveedor con valores por defecto
    const proveedorData = datosContrato.proveedor || {
      tipoIdentificacion: 'NIT',
      numeroIdentificacion: '',
      nombreRazonSocial: '',
      telefono: '',
      email: ''
    };

    // ✅ Preparar datos para patchValue
    const patchData: any = {
      vigencia: datosContrato.vigencia || this.anioActual.toString(),
      numeroContrato: datosContrato.numeroContrato || '',
      tipoContrato: datosContrato.tipoContrato || '',
      proveedor: {
        tipoIdentificacion: proveedorData.tipoIdentificacion || 'NIT',
        numeroIdentificacion: proveedorData.numeroIdentificacion || '',
        nombreRazonSocial: proveedorData.nombreRazonSocial || '',
        telefono: proveedorData.telefono || '',
        email: proveedorData.email || ''
      },
      objeto: datosContrato.objeto || '',
      valor: datosContrato.valor || 0,
      plazoDias: datosContrato.plazoDias || 0,
      fechaInicio: fechaInicio,
      fechaTerminacion: fechaTerminacion,
      fechaFirma: fechaFirma,
      supervisor: datosContrato.supervisor || '',
      cdp: datosContrato.cdp || '',
      rp: datosContrato.rp || '',
      seDesembolsaAnticipo: datosContrato.seDesembolsaAnticipo || false,
      porcentajeAnticipo: datosContrato.porcentajeAnticipo || '',
      valorAnticipo: datosContrato.valorAnticipo || '',
      fechaDesembolsoAnticipo: fechaDesembolso,
      adiciones: datosContrato.adiciones || 0,
      requierePolizas: datosContrato.requierePolizas || false,
      polizaCumplimientoNumero: datosContrato.polizaCumplimientoNumero || '',
      polizaCumplimientoAseguradora: datosContrato.polizaCumplimientoAseguradora || '',
      polizaCumplimientoValor: datosContrato.polizaCumplimientoValor || '',
      polizaCumplimientoVigenciaDesde: datosContrato.polizaCumplimientoVigenciaDesde || '',
      polizaCumplimientoVigenciaHasta: datosContrato.polizaCumplimientoVigenciaHasta || '',
      requierePolizaCalidad: datosContrato.requierePolizaCalidad || false,
      polizaCalidadNumero: datosContrato.polizaCalidadNumero || '',
      polizaCalidadAseguradora: datosContrato.polizaCalidadAseguradora || '',
      polizaCalidadValor: datosContrato.polizaCalidadValor || '',
      polizaCalidadVigenciaDesde: datosContrato.polizaCalidadVigenciaDesde || '',
      polizaCalidadVigenciaHasta: datosContrato.polizaCalidadVigenciaHasta || '',
      requierePolizaRC: datosContrato.requierePolizaRC || false,
      polizaRCNumero: datosContrato.polizaRCNumero || '',
      polizaRCAseguradora: datosContrato.polizaRCAseguradora || '',
      polizaRCValor: datosContrato.polizaRCValor || '',
      polizaRCVigenciaDesde: datosContrato.polizaRCVigenciaDesde || '',
      polizaRCVigenciaHasta: datosContrato.polizaRCVigenciaHasta || ''
    };

    console.log('📝 Datos a actualizar en el formulario:', patchData);

    // ✅ Actualizar formulario
    this.contratoForm.patchValue(patchData);

    // ✅ Verificar que los valores se asignaron correctamente
    console.log('🔍 Verificación post-patch:');
    console.log('  - numeroContrato en formulario:', this.contratoForm.get('numeroContrato')?.value);
    console.log('  - vigencia en formulario:', this.contratoForm.get('vigencia')?.value);
    console.log('  - valor en formulario:', this.contratoForm.get('valor')?.value);
    console.log('  - proveedor.nombreRazonSocial:', this.contratoForm.get('proveedor.nombreRazonSocial')?.value);

    this.valorTotal = datosContrato.valorTotal || 0;

    // ✅ Habilitar campos condicionales
    if (datosContrato.seDesembolsaAnticipo) {
      this.contratoForm.get('porcentajeAnticipo')?.enable();
      this.contratoForm.get('valorAnticipo')?.enable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.enable();
    }

    if (datosContrato.requierePolizas) {
      this.onRequierePolizasChange(true);
    }

    if (datosContrato.objeto) {
      this.contratoForm.patchValue({ objeto: datosContrato.objeto });
    }

    this.calcularValores();

    console.log('✅ cargarDatosEnFormulario completado');
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
        if (!this.polizaCumplimientoFile && !this.isEditMode) isValid = false;
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
    const valorTotal = (Number(formValue.valor) || 0) + (Number(formValue.adiciones) || 0);

    const dto: any = {
      vigencia: formValue.vigencia,
      numeroContrato: formValue.numeroContrato,
      tipoContrato: formValue.tipoContrato,
      proveedor: formValue.proveedor,
      objeto: formValue.objeto,
      valor: Number(formValue.valor) || 0,
      plazoDias: Number(formValue.plazoDias) || 0,
      fechaFirma: formValue.fechaFirma,
      fechaInicio: formValue.fechaInicio,
      fechaTerminacion: formValue.fechaTerminacion,
      valorTotal: valorTotal,
      adiciones: Number(formValue.adiciones) || 0,
      creadoPor: this.obtenerUsuarioActual()
    };

    if (formValue.supervisor) dto.supervisor = formValue.supervisor;
    if (formValue.cdp) dto.cdp = formValue.cdp;
    if (formValue.rp) dto.rp = formValue.rp;

    if (formValue.seDesembolsaAnticipo === true) {
      dto.seDesembolsaAnticipo = true;
      if (formValue.porcentajeAnticipo) dto.porcentajeAnticipo = Number(formValue.porcentajeAnticipo);
      if (formValue.valorAnticipo) dto.valorAnticipo = Number(formValue.valorAnticipo);
      if (formValue.fechaDesembolsoAnticipo) dto.fechaDesembolsoAnticipo = formValue.fechaDesembolsoAnticipo;
    }

    if (formValue.requierePolizas === true) {
      dto.requierePolizas = true;

      if (formValue.polizaCumplimientoNumero) dto.polizaCumplimientoNumero = formValue.polizaCumplimientoNumero;
      if (formValue.polizaCumplimientoAseguradora) dto.polizaCumplimientoAseguradora = formValue.polizaCumplimientoAseguradora;
      if (formValue.polizaCumplimientoValor) dto.polizaCumplimientoValor = Number(formValue.polizaCumplimientoValor);
      if (formValue.polizaCumplimientoVigenciaDesde) dto.polizaCumplimientoVigenciaDesde = formValue.polizaCumplimientoVigenciaDesde;
      if (formValue.polizaCumplimientoVigenciaHasta) dto.polizaCumplimientoVigenciaHasta = formValue.polizaCumplimientoVigenciaHasta;

      if (formValue.requierePolizaCalidad === true) {
        dto.requierePolizaCalidad = true;
        if (formValue.polizaCalidadNumero) dto.polizaCalidadNumero = formValue.polizaCalidadNumero;
        if (formValue.polizaCalidadAseguradora) dto.polizaCalidadAseguradora = formValue.polizaCalidadAseguradora;
        if (formValue.polizaCalidadValor) dto.polizaCalidadValor = Number(formValue.polizaCalidadValor);
        if (formValue.polizaCalidadVigenciaDesde) dto.polizaCalidadVigenciaDesde = formValue.polizaCalidadVigenciaDesde;
        if (formValue.polizaCalidadVigenciaHasta) dto.polizaCalidadVigenciaHasta = formValue.polizaCalidadVigenciaHasta;
      }

      if (formValue.requierePolizaRC === true) {
        dto.requierePolizaRC = true;
        if (formValue.polizaRCNumero) dto.polizaRCNumero = formValue.polizaRCNumero;
        if (formValue.polizaRCAseguradora) dto.polizaRCAseguradora = formValue.polizaRCAseguradora;
        if (formValue.polizaRCValor) dto.polizaRCValor = Number(formValue.polizaRCValor);
        if (formValue.polizaRCVigenciaDesde) dto.polizaRCVigenciaDesde = formValue.polizaRCVigenciaDesde;
        if (formValue.polizaRCVigenciaHasta) dto.polizaRCVigenciaHasta = formValue.polizaRCVigenciaHasta;
      }
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
        console.error('Error detallado:', error);
        if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else if (error.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Error al guardar el contrato. Verifique los datos ingresados.';
        }
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

  cargarDocumentosContrato(contratoId: string): void {
    console.log('📄 Cargando documentos del contrato:', contratoId);
    this.juridicaService.obtenerDocumentosContrato(contratoId).subscribe({
      next: (documentos: any[]) => {
        this.documentosContrato = documentos || [];
        console.log(`✅ Documentos del contrato cargados: ${this.documentosContrato.length}`);

        // Log para depuración - mostrar detalles de los documentos
        if (this.documentosContrato.length > 0) {
          console.log('📋 Detalles de documentos:', this.documentosContrato.map(d => ({
            nombre: d.nombreArchivo,
            tipo: d.tipoDocumento,
            tamaño: d.tamanoBytes
          })));
        }
      },
      error: (error: any) => {
        console.error('❌ Error cargando documentos del contrato:', error);
        this.documentosContrato = [];
      }
    });
  }
}