import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JuridicaService } from '../../../../core/services/juridica.service';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { Subscription, Observable } from 'rxjs';

@Component({
  selector: 'app-juridica-creacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './juridica-creacion.component.html',
  styleUrls: ['./juridica-creacion.component.scss']
})
export class JuridicaCreacionComponent implements OnInit, OnDestroy {

  @ViewChild('fileInputMinuta') fileInputMinuta!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputActaInicio') fileInputActaInicio!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputCDP') fileInputCDP!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputRP') fileInputRP!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputPolizaCumplimiento') fileInputPolizaCumplimiento!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputPolizaCalidad') fileInputPolizaCalidad!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputPolizaRC') fileInputPolizaRC!: ElementRef<HTMLInputElement>;

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

  contratistaEncontrado: any = null;
  contratistaDocumentos: any[] = [];
  buscandoContratista = false;
  contratistaSeleccionadoId: string | null = null;
  cargandoDocumentosContratista = false;

  // Objeto centralizado para archivos (SOLO GUARDA LOS FILES, SIN SUBIR)
  archivos: {
    [key: string]: {
      file: File | null;
      fileName: string;
      error: string | null;
      mostrarUpload: boolean;
      requerido: boolean;
    }
  } = {};

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
    this.inicializarArchivos();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.cargarSupervisores();
    this.checkEditMode();
    this.forceCurrentYearVigencia();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private inicializarArchivos(): void {
    this.archivos = {
      CDP: { file: null, fileName: '', error: null, mostrarUpload: false, requerido: false },
      RP: { file: null, fileName: '', error: null, mostrarUpload: false, requerido: false },
      POLIZA_CUMPLIMIENTO: { file: null, fileName: '', error: null, mostrarUpload: false, requerido: true },
      POLIZA_CALIDAD: { file: null, fileName: '', error: null, mostrarUpload: false, requerido: false },
      POLIZA_RC: { file: null, fileName: '', error: null, mostrarUpload: false, requerido: false },
      MINUTA: { file: null, fileName: '', error: null, mostrarUpload: false, requerido: true },
      ACTA_INICIO: { file: null, fileName: '', error: null, mostrarUpload: false, requerido: true }
    };
  }

  get f() {
    return this.contratoForm.controls;
  }

  get valorNumerico(): number {
    const valor = this.contratoForm.get('valor')?.value;
    return typeof valor === 'string' ? parseInt(valor.replace(/\./g, '')) || 0 : valor || 0;
  }

  get valorAnticipoNumerico(): number {
    const valor = this.contratoForm.get('valorAnticipo')?.value;
    return typeof valor === 'string' ? parseInt(valor.replace(/\./g, '')) || 0 : valor || 0;
  }

  get adicionesNumerico(): number {
    const valor = this.contratoForm.get('adiciones')?.value;
    return typeof valor === 'string' ? parseInt(valor.replace(/\./g, '')) || 0 : valor || 0;
  }

  get valorTotalNumerico(): number {
    return this.valorNumerico + this.adicionesNumerico;
  }

  formatearNumeroConPuntos(numero: number): string {
    if (!numero && numero !== 0) return '0';
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  get valorInicialFormateado(): string {
    const valor = this.contratoForm.get('valor')?.value;
    const numValor = typeof valor === 'string' ? parseInt(valor.replace(/\./g, '')) || 0 : valor || 0;
    return this.formatearNumeroConPuntos(numValor);
  }

  get adicionesFormateado(): string {
    const valor = this.contratoForm.get('adiciones')?.value;
    const numValor = typeof valor === 'string' ? parseInt(valor.replace(/\./g, '')) || 0 : valor || 0;
    return this.formatearNumeroConPuntos(numValor);
  }

  get valorTotalFormateado(): string {
    const total = this.valorNumerico + this.adicionesNumerico;
    return this.formatearNumeroConPuntos(total);
  }

  get valorAnticipoFormateado(): string {
    const valor = this.contratoForm.get('valorAnticipo')?.value;
    const numValor = typeof valor === 'string' ? parseInt(valor.replace(/\./g, '')) || 0 : valor || 0;
    return this.formatearNumeroConPuntos(numValor);
  }

  private generarVigencias(): void {
    for (let i = 0; i < 5; i++) {
      this.vigencias.push(this.anioActual + i);
    }
  }

  private forceCurrentYearVigencia(): void {
    const vigenciaControl = this.contratoForm.get('vigencia');
    const currentYear = this.anioActual.toString();

    vigenciaControl?.setValue(currentYear);
    vigenciaControl?.disable();

    vigenciaControl?.valueChanges.subscribe(value => {
      if (value !== currentYear && !this.isViewMode) {
        vigenciaControl.setValue(currentYear, { emitEvent: false });
        this.errorMessage = 'La vigencia debe ser el año actual';
        setTimeout(() => this.dismissError(), 3000);
      }
    });
  }

  triggerFileInput(tipo: string): void {
    switch (tipo) {
      case 'MINUTA':
        this.fileInputMinuta.nativeElement.click();
        break;
      case 'ACTA_INICIO':
        this.fileInputActaInicio.nativeElement.click();
        break;
      case 'CDP':
        this.fileInputCDP.nativeElement.click();
        break;
      case 'RP':
        this.fileInputRP.nativeElement.click();
        break;
      case 'POLIZA_CUMPLIMIENTO':
        this.fileInputPolizaCumplimiento.nativeElement.click();
        break;
      case 'POLIZA_CALIDAD':
        this.fileInputPolizaCalidad.nativeElement.click();
        break;
      case 'POLIZA_RC':
        this.fileInputPolizaRC.nativeElement.click();
        break;
    }
  }

  // Método para manejar selección de archivos (SOLO GUARDA, NO SUBE)
  onFileSelected(event: any, tipo: string): void {
    const file: File = event.target.files[0];
    if (!file) return;

    // Validaciones
    if (file.type !== 'application/pdf') {
      this.archivos[tipo].error = 'Solo se permiten archivos PDF';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.archivos[tipo].error = 'El archivo es demasiado grande (máx. 5MB)';
      return;
    }

    // Guardar archivo localmente
    this.archivos[tipo].file = file;
    this.archivos[tipo].fileName = file.name;
    this.archivos[tipo].error = null;
    this.archivos[tipo].mostrarUpload = false;

    this.successMessage = `Archivo ${file.name} seleccionado correctamente`;
    setTimeout(() => this.dismissSuccess(), 2000);
  }

  private validarArchivosRequeridos(): boolean {
    const archivosRequeridos = ['MINUTA', 'ACTA_INICIO'];
    
    if (this.contratoForm.get('requierePolizas')?.value) {
      archivosRequeridos.push('POLIZA_CUMPLIMIENTO');
    }
    
    let isValid = true;
    
    for (const tipo of archivosRequeridos) {
      const archivo = this.archivos[tipo];
      if (!archivo.file && !archivo.fileName) {
        archivo.error = 'Este documento es requerido';
        archivo.mostrarUpload = true;
        isValid = false;
      }
    }
    
    return isValid;
  }

  verDocumento(tipo: string): void {
    const archivo = this.archivos[tipo];
    if (archivo.file) {
      const url = URL.createObjectURL(archivo.file);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } else {
      this.errorMessage = `No hay archivo seleccionado para ${tipo}`;
      setTimeout(() => this.dismissError(), 3000);
    }
  }

  descargarDocumento(tipo: string): void {
    const archivo = this.archivos[tipo];
    if (archivo.file) {
      const url = URL.createObjectURL(archivo.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = archivo.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      this.errorMessage = `No hay archivo seleccionado para ${tipo}`;
      setTimeout(() => this.dismissError(), 3000);
    }
  }

  toggleUpload(tipo: string): void {
    this.archivos[tipo].mostrarUpload = !this.archivos[tipo].mostrarUpload;
  }

  private configurarEstadoCampos(): void {
    this.contratoForm.get('vigencia')?.disable();

    if (this.isViewMode) {
      this.contratoForm.disable();
      return;
    }

    if (this.isEditMode) {
      this.contratoForm.get('tipoContrato')?.enable();
      this.contratoForm.get('supervisor')?.enable();
      this.contratoForm.get('numeroContrato')?.disable();
      this.contratoForm.get('objeto')?.disable();
      this.contratoForm.get('proveedor')?.disable();
      this.contratoForm.get('valor')?.enable();
      this.contratoForm.get('plazoDias')?.enable();
      this.contratoForm.get('fechaInicio')?.enable();
      this.contratoForm.get('fechaFirma')?.enable();
    } else {
      this.contratoForm.get('numeroContrato')?.enable();
      this.contratoForm.get('tipoContrato')?.enable();
      this.contratoForm.get('supervisor')?.enable();
      this.contratoForm.get('objeto')?.disable();
      this.contratoForm.get('proveedor')?.disable();
      this.contratoForm.get('valor')?.enable();
      this.contratoForm.get('plazoDias')?.enable();
      this.contratoForm.get('fechaInicio')?.enable();
      this.contratoForm.get('fechaFirma')?.enable();
    }
  }

  private bloquearCamposGenerales(bloquear: boolean): void {
    if (this.isEditMode) {
      this.contratoForm.get('tipoContrato')?.enable();
      this.contratoForm.get('supervisor')?.enable();
      return;
    }

    const camposBloqueables = ['vigencia', 'objeto'];
    camposBloqueables.forEach(campo => {
      const control = this.contratoForm.get(campo);
      if (control) {
        if (bloquear) {
          control.disable();
        } else {
          control.enable();
        }
      }
    });

    const proveedorGroup = this.contratoForm.get('proveedor');
    if (proveedorGroup) {
      if (bloquear) {
        proveedorGroup.disable();
      } else {
        proveedorGroup.enable();
      }
    }
  }

  private initializeForm(): void {
    this.contratoForm = this.fb.group({
      vigencia: [{ value: this.anioActual.toString(), disabled: true }, Validators.required],
      numeroContrato: ['', Validators.required],
      tipoContrato: ['', Validators.required],
      proveedor: this.fb.group({
        tipoIdentificacion: [{ value: 'NIT', disabled: true }, Validators.required],
        numeroIdentificacion: [{ value: '', disabled: true }, Validators.required],
        nombreRazonSocial: [{ value: '', disabled: true }, Validators.required],
        telefono: [{ value: '', disabled: true }],
        email: [{ value: '', disabled: true }, [Validators.email]]
      }),
      objeto: [{ value: '', disabled: true }, Validators.required],
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

    this.configurarEstadoCampos();
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
    }
  }

  private calcularValores(): void {
    const valorInicial = this.valorNumerico;
    const adiciones = this.adicionesNumerico;
    this.valorTotal = valorInicial + adiciones;
  }

  private calcularValorAnticipo(): void {
    const valorContrato = this.valorNumerico;
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
          this.cargarDatosEnFormulario(contrato);
          this.pasoActual = 1;
          this.configurarEstadoCampos();

          if (this.isEditMode) {
            this.contratoForm.get('tipoContrato')?.enable();
            this.contratoForm.get('supervisor')?.enable();
          }

          setTimeout(() => {
            if (this.contratoForm.get('numeroContrato')?.value && !this.isEditMode) {
              this.buscarContratistaPorContrato();
            }
          }, 100);
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
    if (this.isEditMode) return;

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
          this.bloquearCamposGenerales(true);

          this.contratistaDocumentos = contratista.documentos || [];

          if (contratista.objetivoContrato && !this.isViewMode) {
            const objetoActual = this.contratoForm.get('objeto')?.value;
            if (!objetoActual || objetoActual.trim() === '') {
              this.contratoForm.patchValue({ objeto: contratista.objetivoContrato });
            }
          }

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
          }

          this.successMessage = `Contratista "${contratista.razonSocial}" cargado correctamente.`;
          setTimeout(() => this.dismissSuccess(), 3000);
        } else {
          this.contratistaEncontrado = null;
          this.contratistaSeleccionadoId = null;
          this.contratistaDocumentos = [];
          this.bloquearCamposGenerales(false);
        }
      },
      error: (error: any) => {
        console.error('Error buscando contratista:', error);
        this.contratistaEncontrado = null;
        this.contratistaDocumentos = [];
        this.contratistaSeleccionadoId = null;
        this.buscandoContratista = false;
        this.bloquearCamposGenerales(false);
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
    if (!contrato) return;

    let datosContrato = contrato;
    if (contrato.data && !contrato.id) {
      datosContrato = contrato.data;
    }

    const documentosContrato = datosContrato.documentos || [];

    Object.keys(this.archivos).forEach(key => {
      this.archivos[key].file = null;
      this.archivos[key].fileName = '';
    });

    documentosContrato.forEach((doc: any) => {
      const tipo = doc.tipoDocumento;
      if (this.archivos[tipo]) {
        this.archivos[tipo].fileName = doc.nombreArchivo;
      }
    });

    const fechaInicio = datosContrato.fechaInicio ? new Date(datosContrato.fechaInicio).toISOString().split('T')[0] : '';
    const fechaTerminacion = datosContrato.fechaTerminacion ? new Date(datosContrato.fechaTerminacion).toISOString().split('T')[0] : '';
    const fechaFirma = datosContrato.fechaFirma ? new Date(datosContrato.fechaFirma).toISOString().split('T')[0] : '';
    const fechaDesembolso = datosContrato.fechaDesembolsoAnticipo ? new Date(datosContrato.fechaDesembolsoAnticipo).toISOString().split('T')[0] : '';

    const proveedorData = datosContrato.proveedor || {
      tipoIdentificacion: 'NIT',
      numeroIdentificacion: '',
      nombreRazonSocial: '',
      telefono: '',
      email: ''
    };

    this.contratoForm.patchValue({
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
    });

    this.valorTotal = datosContrato.valorTotal || 0;

    if (datosContrato.seDesembolsaAnticipo) {
      this.contratoForm.get('porcentajeAnticipo')?.enable();
      this.contratoForm.get('valorAnticipo')?.enable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.enable();
    }

    if (datosContrato.requierePolizas) {
      this.onRequierePolizasChange(true);
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
      const camposObligatorios = ['tipoContrato', 'valor', 'plazoDias', 'fechaInicio', 'fechaFirma', 'supervisor'];
      if (!this.isEditMode) {
        camposObligatorios.push('numeroContrato');
      }
      camposObligatorios.forEach(campo => {
        if (this.contratoForm.get(campo)?.invalid) isValid = false;
      });
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
      }
    }

    if (this.pasoActual === 3) {
      if (!this.validarArchivosRequeridos()) {
        isValid = false;
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
      const year = fecha.getUTCFullYear();
      const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fecha.getUTCDate()).padStart(2, '0');
      this.contratoForm.patchValue({
        fechaTerminacion: `${year}-${month}-${day}`
      });
    }
  }

  guardarContrato(): void {
    if (this.isViewMode) {
      this.router.navigate(['/juridica/list']);
      return;
    }

    this.submitted = true;
    
    if (!this.validarArchivosRequeridos()) {
      this.errorMessage = 'Por favor complete todos los documentos requeridos';
      this.pasoActual = 3;
      return;
    }
    
    if (this.contratoForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos requeridos';
      this.markStepFieldsAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.contratoForm.getRawValue();
    const valorTotal = this.valorNumerico + this.adicionesNumerico;

    const toDateOrUndefined = (value: any): Date | undefined => {
      if (!value || value === '' || value === 'null' || value === 'undefined') return undefined;
      return new Date(value);
    };

    const toNumberOrUndefined = (value: any): number | undefined => {
      if (!value || value === '' || value === 'null' || value === 'undefined') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    };

    const toStringOrUndefined = (value: any): string | undefined => {
      if (!value || value === '' || value === 'null' || value === 'undefined') return undefined;
      return String(value);
    };

    const contratoData = {
      vigencia: this.anioActual.toString(),
      numeroContrato: formValue.numeroContrato,
      tipoContrato: formValue.tipoContrato,
      objeto: formValue.objeto,
      valor: this.valorNumerico,
      plazoDias: Number(formValue.plazoDias) || 0,
      fechaInicio: toDateOrUndefined(formValue.fechaInicio),
      fechaTerminacion: toDateOrUndefined(formValue.fechaTerminacion),
      fechaFirma: toDateOrUndefined(formValue.fechaFirma),
      valorTotal: valorTotal,
      adiciones: this.adicionesNumerico,
      supervisor: formValue.supervisor,
      cdp: toStringOrUndefined(formValue.cdp),
      rp: toStringOrUndefined(formValue.rp),
      creadoPor: this.obtenerUsuarioActual(),
      ultimoUsuario: this.obtenerUsuarioActual(),
      seDesembolsaAnticipo: !!formValue.seDesembolsaAnticipo,
      porcentajeAnticipo: toNumberOrUndefined(formValue.porcentajeAnticipo),
      valorAnticipo: toNumberOrUndefined(formValue.valorAnticipo),
      fechaDesembolsoAnticipo: toDateOrUndefined(formValue.fechaDesembolsoAnticipo),
      requierePolizas: !!formValue.requierePolizas,
      polizaCumplimientoNumero: toStringOrUndefined(formValue.polizaCumplimientoNumero),
      polizaCumplimientoAseguradora: toStringOrUndefined(formValue.polizaCumplimientoAseguradora),
      polizaCumplimientoValor: toNumberOrUndefined(formValue.polizaCumplimientoValor),
      polizaCumplimientoVigenciaDesde: toDateOrUndefined(formValue.polizaCumplimientoVigenciaDesde),
      polizaCumplimientoVigenciaHasta: toDateOrUndefined(formValue.polizaCumplimientoVigenciaHasta),
      requierePolizaCalidad: !!formValue.requierePolizaCalidad,
      polizaCalidadNumero: toStringOrUndefined(formValue.polizaCalidadNumero),
      polizaCalidadAseguradora: toStringOrUndefined(formValue.polizaCalidadAseguradora),
      polizaCalidadValor: toNumberOrUndefined(formValue.polizaCalidadValor),
      polizaCalidadVigenciaDesde: toDateOrUndefined(formValue.polizaCalidadVigenciaDesde),
      polizaCalidadVigenciaHasta: toDateOrUndefined(formValue.polizaCalidadVigenciaHasta),
      requierePolizaRC: !!formValue.requierePolizaRC,
      polizaRCNumero: toStringOrUndefined(formValue.polizaRCNumero),
      polizaRCAseguradora: toStringOrUndefined(formValue.polizaRCAseguradora),
      polizaRCValor: toNumberOrUndefined(formValue.polizaRCValor),
      polizaRCVigenciaDesde: toDateOrUndefined(formValue.polizaRCVigenciaDesde),
      polizaRCVigenciaHasta: toDateOrUndefined(formValue.polizaRCVigenciaHasta),
      proveedor: {
        tipoIdentificacion: formValue.proveedor?.tipoIdentificacion || 'NIT',
        numeroIdentificacion: formValue.proveedor?.numeroIdentificacion || '',
        nombreRazonSocial: formValue.proveedor?.nombreRazonSocial || '',
        telefono: toStringOrUndefined(formValue.proveedor?.telefono),
        email: toStringOrUndefined(formValue.proveedor?.email)
      }
    };

    // Crear FormData con todos los archivos seleccionados
    const formData = new FormData();
    formData.append('contrato', JSON.stringify(contratoData));

    // Agregar archivos al FormData (NUNCA se suben solos, siempre van con el contrato)
    if (this.archivos['MINUTA'].file) {
      formData.append('minutaFile', this.archivos['MINUTA'].file);
    }
    if (this.archivos['ACTA_INICIO'].file) {
      formData.append('actaInicioFile', this.archivos['ACTA_INICIO'].file);
    }
    if (this.archivos['CDP'].file) {
      formData.append('cdpFile', this.archivos['CDP'].file);
    }
    if (this.archivos['RP'].file) {
      formData.append('rpFile', this.archivos['RP'].file);
    }
    if (this.archivos['POLIZA_CUMPLIMIENTO'].file) {
      formData.append('polizaCumplimientoFile', this.archivos['POLIZA_CUMPLIMIENTO'].file);
    }
    if (this.archivos['POLIZA_CALIDAD'].file) {
      formData.append('polizaCalidadFile', this.archivos['POLIZA_CALIDAD'].file);
    }
    if (this.archivos['POLIZA_RC'].file) {
      formData.append('polizaRCFile', this.archivos['POLIZA_RC'].file);
    }

    // Enviar todo junto al backend
    this.juridicaService.crearContratoConArchivos(formData).subscribe({
      next: (resultado: any) => {
        this.successMessage = 'Contrato creado exitosamente';
        this.isSubmitting = false;
        setTimeout(() => this.router.navigate(['/juridica/list']), 1800);
      },
      error: (error: any) => {
        console.error('Error al guardar contrato:', error);
        this.errorMessage = error.message || 'Error al guardar el contrato';
        this.isSubmitting = false;
      }
    });
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
      if (!this.isEditMode) this.contratoForm.get('numeroContrato')?.markAsTouched();
      this.contratoForm.get('tipoContrato')?.markAsTouched();
      this.contratoForm.get('supervisor')?.markAsTouched();
      this.contratoForm.get('valor')?.markAsTouched();
      this.contratoForm.get('plazoDias')?.markAsTouched();
      this.contratoForm.get('fechaInicio')?.markAsTouched();
      this.contratoForm.get('fechaFirma')?.markAsTouched();
    }
  }

  cancelar(): void {
    if (confirm('¿Cancelar? Los datos no guardados se perderán.')) {
      this.router.navigate(['/juridica/list']);
    }
  }

  dismissError(): void { this.errorMessage = ''; }
  dismissSuccess(): void { this.successMessage = ''; }
}