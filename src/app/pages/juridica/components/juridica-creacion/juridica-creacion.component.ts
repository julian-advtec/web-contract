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

  // ViewChilds para inputs de archivos
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

  // Propiedades para búsqueda de contratista
  contratistaEncontrado: any = null;
  contratistaDocumentos: any[] = [];
  buscandoContratista = false;
  contratistaSeleccionadoId: string | null = null;
  cargandoDocumentosContratista = false;

  // Configuración de reintentos
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  // Objeto centralizado para archivos con estados mejorados
  archivos: {
    [key: string]: {
      file: File | null;
      fileId: string | null;
      fileName: string;
      error: string | null;
      mostrarUpload: boolean;
      requerido: boolean;
      uploading: boolean;
      uploadProgress: number;
      retryCount: number;
      success: boolean;
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

  // Inicializar estructura de archivos con estados mejorados
  private inicializarArchivos(): void {
    this.archivos = {
      CDP: { file: null, fileId: null, fileName: '', error: null, mostrarUpload: false, requerido: false, uploading: false, uploadProgress: 0, retryCount: 0, success: false },
      RP: { file: null, fileId: null, fileName: '', error: null, mostrarUpload: false, requerido: false, uploading: false, uploadProgress: 0, retryCount: 0, success: false },
      POLIZA_CUMPLIMIENTO: { file: null, fileId: null, fileName: '', error: null, mostrarUpload: false, requerido: true, uploading: false, uploadProgress: 0, retryCount: 0, success: false },
      POLIZA_CALIDAD: { file: null, fileId: null, fileName: '', error: null, mostrarUpload: false, requerido: false, uploading: false, uploadProgress: 0, retryCount: 0, success: false },
      POLIZA_RC: { file: null, fileId: null, fileName: '', error: null, mostrarUpload: false, requerido: false, uploading: false, uploadProgress: 0, retryCount: 0, success: false },
      MINUTA: { file: null, fileId: null, fileName: '', error: null, mostrarUpload: false, requerido: true, uploading: false, uploadProgress: 0, retryCount: 0, success: false },
      ACTA_INICIO: { file: null, fileId: null, fileName: '', error: null, mostrarUpload: false, requerido: true, uploading: false, uploadProgress: 0, retryCount: 0, success: false }
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

  get polizaCumplimientoValorNumerico(): number {
    const valor = this.contratoForm.get('polizaCumplimientoValor')?.value;
    return typeof valor === 'string' ? parseInt(valor.replace(/\./g, '')) || 0 : valor || 0;
  }

  get polizaCalidadValorNumerico(): number {
    const valor = this.contratoForm.get('polizaCalidadValor')?.value;
    return typeof valor === 'string' ? parseInt(valor.replace(/\./g, '')) || 0 : valor || 0;
  }

  get polizaRCValorNumerico(): number {
    const valor = this.contratoForm.get('polizaRCValor')?.value;
    return typeof valor === 'string' ? parseInt(valor.replace(/\./g, '')) || 0 : valor || 0;
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

  // Método unificado para disparar input de archivo
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

  // Método mejorado para manejar selección de archivos
  onFileSelected(event: any, tipo: string): void {
    const file: File = event.target.files[0];
    if (!file) return;

    // Resetear estado del archivo
    this.archivos[tipo] = {
      ...this.archivos[tipo],
      error: null,
      success: false,
      uploading: false,
      uploadProgress: 0,
      retryCount: 0
    };

    // Validaciones
    if (file.type !== 'application/pdf') {
      this.archivos[tipo].error = 'Solo se permiten archivos PDF';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.archivos[tipo].error = 'El archivo es demasiado grande (máx. 5MB)';
      return;
    }

    // Actualizar archivo
    this.archivos[tipo].file = file;
    this.archivos[tipo].fileName = file.name;
    this.archivos[tipo].fileId = null;
    this.archivos[tipo].mostrarUpload = false;

    // Subir automáticamente (usando el método que ya existe en tu servicio)
    this.subirArchivoIndividual(tipo);
  }

  // Método para subir archivo individual con reintentos
  subirArchivoIndividual(tipo: string, isRetry: boolean = false): void {
    const archivo = this.archivos[tipo];

    if (!archivo.file) {
      archivo.error = 'No hay archivo seleccionado';
      return;
    }

    if (!isRetry) {
      archivo.uploading = true;
      archivo.uploadProgress = 0;
      archivo.error = null;

      // Simular progreso para mejor UX
      this.simulateProgress(tipo);
    }

    const formData = new FormData();
    formData.append('file', archivo.file);
    formData.append('tipoDocumento', tipo);

    // Usar el método existente en tu servicio para subir documentos
    // Asumiendo que tienes un método para subir documentos asociados al contrato
    this.juridicaService.subirDocumentoContrato(formData).subscribe({
      next: (response: any) => {
        archivo.uploading = false;
        archivo.uploadProgress = 100;
        archivo.success = true;
        archivo.fileId = response.fileId || response.id || response.documentoId;
        archivo.error = null;
        archivo.retryCount = 0;

        this.successMessage = `Documento ${archivo.fileName} subido correctamente`;
        setTimeout(() => this.dismissSuccess(), 2000);
      },
      error: (error: any) => {
        console.error(`Error subiendo archivo ${tipo}:`, error);

        if (archivo.retryCount < this.MAX_RETRIES) {
          archivo.retryCount++;
          archivo.error = `Error en subida (intento ${archivo.retryCount}/${this.MAX_RETRIES}). Reintentando...`;

          // Reintentar después del delay
          setTimeout(() => {
            this.subirArchivoIndividual(tipo, true);
          }, this.RETRY_DELAY);
        } else {
          archivo.uploading = false;
          archivo.error = `No se pudo subir el archivo después de ${this.MAX_RETRIES} intentos. ${error.message || 'Error de conexión'}`;
          archivo.success = false;
        }
      }
    });
  }

  // Simular progreso de subida
  private simulateProgress(tipo: string): void {
    const interval = setInterval(() => {
      const archivo = this.archivos[tipo];
      if (!archivo.uploading) {
        clearInterval(interval);
        return;
      }

      if (archivo.uploadProgress < 90) {
        archivo.uploadProgress += 10;
      }
    }, 200);
  }

  // Método para validar archivos requeridos antes de guardar
  private validarArchivosRequeridos(): boolean {
    const archivosRequeridos = ['MINUTA', 'ACTA_INICIO'];

    // Si requiere pólizas, validar póliza de cumplimiento
    if (this.contratoForm.get('requierePolizas')?.value) {
      archivosRequeridos.push('POLIZA_CUMPLIMIENTO');
    }

    let isValid = true;

    for (const tipo of archivosRequeridos) {
      const archivo = this.archivos[tipo];
      // Verificar si tiene file (nuevo) o fileId (existente)
      if (!archivo.file && !archivo.fileId) {
        archivo.error = 'Este documento es requerido';
        archivo.mostrarUpload = true;
        isValid = false;
      }
    }

    return isValid;
  }

  // Método para obtener documentos subidos
  private obtenerDocumentosSubidos(): any[] {
    const documentos = [];

    for (const [tipo, data] of Object.entries(this.archivos)) {
      if (data.fileId) {
        documentos.push({
          tipoDocumento: tipo,
          documentoId: data.fileId,
          nombreArchivo: data.fileName
        });
      }
    }

    return documentos;
  }

  // Método unificado para ver documento
  verDocumento(tipo: string): void {
    const fileId = this.archivos[tipo]?.fileId;
    if (fileId) {
      this.juridicaService.previsualizarDocumento(fileId).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          window.URL.revokeObjectURL(url);
        },
        error: (error: any) => {
          console.error('Error al visualizar documento:', error);
          this.errorMessage = 'Error al visualizar el documento';
        }
      });
    } else {
      this.errorMessage = `No hay documento de tipo ${tipo} asociado`;
      setTimeout(() => this.dismissError(), 3000);
    }
  }

  // Método unificado para descargar documento
  descargarDocumento(tipo: string): void {
    const fileId = this.archivos[tipo]?.fileId;
    if (fileId) {
      this.juridicaService.descargarDocumentoContrato(fileId).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `documento_${tipo}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error: any) => {
          console.error('Error al descargar documento:', error);
          this.errorMessage = 'Error al descargar el documento';
        }
      });
    } else {
      this.errorMessage = `No hay documento de tipo ${tipo} asociado`;
      setTimeout(() => this.dismissError(), 3000);
    }
  }

  // Alternar visibilidad del upload
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

          if (contratista.documentos && Array.isArray(contratista.documentos) && contratista.documentos.length > 0) {
            this.contratistaDocumentos = contratista.documentos;
          } else {
            this.contratistaDocumentos = [];
          }

          if (contratista.objetivoContrato && !this.isViewMode) {
            const objetoActual = this.contratoForm.get('objeto')?.value;
            if (!objetoActual || objetoActual.trim() === '') {
              this.contratoForm.patchValue({
                objeto: contratista.objetivoContrato
              });
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
          console.warn('No se encontró contratista con el número:', numeroContrato);
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
    const polizasExistentes = datosContrato.polizas || [];

    // Resetear archivos
    Object.keys(this.archivos).forEach(key => {
      this.archivos[key].fileId = null;
      this.archivos[key].fileName = '';
      this.archivos[key].file = null;
      this.archivos[key].success = !!this.archivos[key].fileId;
    });

    // Cargar documentos existentes
    documentosContrato.forEach((doc: any) => {
      const tipo = doc.tipoDocumento;
      if (this.archivos[tipo]) {
        this.archivos[tipo].fileId = doc.id || doc.documentoId;
        this.archivos[tipo].fileName = doc.nombreArchivo;
        this.archivos[tipo].success = true;
      }
    });

    // ==================== CARGAR PÓLIZAS EXISTENTES ====================
    // Buscar póliza de Cumplimiento
    const polizaCumplimiento = polizasExistentes.find((p: any) => p.tipoPoliza === 'CUMPLIMIENTO');
    if (polizaCumplimiento) {
      this.contratoForm.patchValue({
        requierePolizas: true,
        polizaCumplimientoNumero: polizaCumplimiento.numeroPoliza,
        polizaCumplimientoAseguradora: polizaCumplimiento.aseguradora,
        polizaCumplimientoValor: polizaCumplimiento.valorAsegurado,
        polizaCumplimientoVigenciaDesde: polizaCumplimiento.fechaVigenciaInicio ? new Date(polizaCumplimiento.fechaVigenciaInicio).toISOString().split('T')[0] : '',
        polizaCumplimientoVigenciaHasta: polizaCumplimiento.fechaVigenciaFin ? new Date(polizaCumplimiento.fechaVigenciaFin).toISOString().split('T')[0] : ''
      });
    }

    // Buscar póliza de Calidad
    const polizaCalidad = polizasExistentes.find((p: any) => p.tipoPoliza === 'CALIDAD');
    if (polizaCalidad) {
      this.contratoForm.patchValue({
        requierePolizaCalidad: true,
        polizaCalidadNumero: polizaCalidad.numeroPoliza,
        polizaCalidadAseguradora: polizaCalidad.aseguradora,
        polizaCalidadValor: polizaCalidad.valorAsegurado,
        polizaCalidadVigenciaDesde: polizaCalidad.fechaVigenciaInicio ? new Date(polizaCalidad.fechaVigenciaInicio).toISOString().split('T')[0] : '',
        polizaCalidadVigenciaHasta: polizaCalidad.fechaVigenciaFin ? new Date(polizaCalidad.fechaVigenciaFin).toISOString().split('T')[0] : ''
      });
    }

    // Buscar póliza de Responsabilidad Civil
    const polizaRC = polizasExistentes.find((p: any) => p.tipoPoliza === 'RESPONSABILIDAD_CIVIL');
    if (polizaRC) {
      this.contratoForm.patchValue({
        requierePolizaRC: true,
        polizaRCNumero: polizaRC.numeroPoliza,
        polizaRCAseguradora: polizaRC.aseguradora,
        polizaRCValor: polizaRC.valorAsegurado,
        polizaRCVigenciaDesde: polizaRC.fechaVigenciaInicio ? new Date(polizaRC.fechaVigenciaInicio).toISOString().split('T')[0] : '',
        polizaRCVigenciaHasta: polizaRC.fechaVigenciaFin ? new Date(polizaRC.fechaVigenciaFin).toISOString().split('T')[0] : ''
      });
    }

    // Si hay alguna póliza, activar el switch principal
    if (polizaCumplimiento) {
      this.onRequierePolizasChange(true);
    }
    if (polizaCalidad) {
      this.contratoForm.get('requierePolizaCalidad')?.setValue(true);
    }
    if (polizaRC) {
      this.contratoForm.get('requierePolizaRC')?.setValue(true);
    }

    // Fechas
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

    const proveedorData = datosContrato.proveedor || {
      tipoIdentificacion: 'NIT',
      numeroIdentificacion: '',
      nombreRazonSocial: '',
      telefono: '',
      email: ''
    };

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
      requierePolizas: datosContrato.requierePolizas || false
    };

    this.contratoForm.patchValue(patchData);
    this.valorTotal = datosContrato.valorTotal || 0;

    if (datosContrato.seDesembolsaAnticipo) {
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

    // Validar archivos requeridos ANTES de guardar
    if (!this.validarArchivosRequeridos()) {
      this.errorMessage = 'Por favor complete todos los documentos requeridos';
      this.pasoActual = 3;
      setTimeout(() => {
        const requeridos = document.querySelectorAll('.document-card .alert-danger');
        if (requeridos.length) {
          requeridos[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
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

    // Función para convertir fechas: null o string vacío se convierten a undefined
    const toDateOrUndefined = (value: any): Date | undefined => {
      if (!value || value === '' || value === 'null' || value === 'undefined') {
        return undefined;
      }
      return new Date(value);
    };

    // Función para convertir número: null o string vacío se convierten a undefined
    const toNumberOrUndefined = (value: any): number | undefined => {
      if (!value || value === '' || value === 'null' || value === 'undefined') {
        return undefined;
      }
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    };

    // Función para convertir string: null se convierte a undefined
    const toStringOrUndefined = (value: any): string | undefined => {
      if (!value || value === '' || value === 'null' || value === 'undefined') {
        return undefined;
      }
      return String(value);
    };

    // ==================== CONSTRUIR ARRAY DE PÓLIZAS ====================
    const polizasArray: any[] = [];

    // Póliza de Cumplimiento
    if (formValue.requierePolizas && formValue.polizaCumplimientoNumero) {
      polizasArray.push({
        tipoPoliza: 'CUMPLIMIENTO',
        numeroPoliza: formValue.polizaCumplimientoNumero,
        aseguradora: formValue.polizaCumplimientoAseguradora,
        valorAsegurado: toNumberOrUndefined(formValue.polizaCumplimientoValor) || 0,
        fechaExpedicion: toDateOrUndefined(formValue.polizaCumplimientoVigenciaDesde) || new Date(),
        fechaVigenciaInicio: toDateOrUndefined(formValue.polizaCumplimientoVigenciaDesde),
        fechaVigenciaFin: toDateOrUndefined(formValue.polizaCumplimientoVigenciaHasta),
      });
    }

    // Póliza de Calidad
    if (formValue.requierePolizaCalidad && formValue.polizaCalidadNumero) {
      polizasArray.push({
        tipoPoliza: 'CALIDAD',
        numeroPoliza: formValue.polizaCalidadNumero,
        aseguradora: formValue.polizaCalidadAseguradora,
        valorAsegurado: toNumberOrUndefined(formValue.polizaCalidadValor) || 0,
        fechaExpedicion: toDateOrUndefined(formValue.polizaCalidadVigenciaDesde) || new Date(),
        fechaVigenciaInicio: toDateOrUndefined(formValue.polizaCalidadVigenciaDesde),
        fechaVigenciaFin: toDateOrUndefined(formValue.polizaCalidadVigenciaHasta),
      });
    }

    // Póliza de Responsabilidad Civil
    if (formValue.requierePolizaRC && formValue.polizaRCNumero) {
      polizasArray.push({
        tipoPoliza: 'RESPONSABILIDAD_CIVIL',
        numeroPoliza: formValue.polizaRCNumero,
        aseguradora: formValue.polizaRCAseguradora,
        valorAsegurado: toNumberOrUndefined(formValue.polizaRCValor) || 0,
        fechaExpedicion: toDateOrUndefined(formValue.polizaRCVigenciaDesde) || new Date(),
        fechaVigenciaInicio: toDateOrUndefined(formValue.polizaRCVigenciaDesde),
        fechaVigenciaFin: toDateOrUndefined(formValue.polizaRCVigenciaHasta),
      });
    }

    // ==================== PREPARAR CONTRATO DATA ====================
    const contratoData: any = {
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
      // Mantener campos planos por compatibilidad (opcional)
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
      // NUEVO: Array de pólizas
      polizas: polizasArray,
      proveedor: {
        tipoIdentificacion: formValue.proveedor?.tipoIdentificacion || 'NIT',
        numeroIdentificacion: formValue.proveedor?.numeroIdentificacion || '',
        nombreRazonSocial: formValue.proveedor?.nombreRazonSocial || '',
        telefono: toStringOrUndefined(formValue.proveedor?.telefono),
        email: toStringOrUndefined(formValue.proveedor?.email)
      }
    };

    let request: Observable<any>;

    if (this.isEditMode && this.contratoId) {
      // Actualizar contrato (solo JSON, sin archivos nuevos)
      request = this.juridicaService.actualizarContrato(this.contratoId, contratoData);
    } else {
      // Crear contrato CON archivos (usando FormData)
      const formData = new FormData();
      formData.append('contrato', JSON.stringify(contratoData));

      // Agregar archivos pendientes
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

      request = this.juridicaService.crearContratoConArchivos(formData);
    }

    request.subscribe({
      next: (resultado: any) => {
        this.successMessage = this.isEditMode ? 'Contrato actualizado exitosamente' : 'Contrato creado exitosamente';
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