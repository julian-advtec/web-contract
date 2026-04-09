import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';  // 👈 AGREGAR ESTA IMPORTACIÓN
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { JuridicaService } from '../../../../core/services/juridica.service';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { CreateContratoDto, Contrato, TipoContrato } from '../../../../core/models/juridica.model';

interface DocumentoInfo {
  tipo: string;
  archivo: File | null;
  nombre: string;
  tamano: number;
  label: string;
  value: string;
  id?: string;
  esExistente?: boolean;
  subidoPor?: string;
  fechaSubida?: Date | string;
}

@Component({
  selector: 'app-juridica-creacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormsModule  // 👈 AGREGAR FORMSMODULE AQUÍ
  ],
  templateUrl: './juridica-creacion.component.html',
  styleUrls: ['./juridica-creacion.component.scss']
})

export class JuridicaCreacionComponent implements OnInit, OnDestroy {
  contratoForm!: FormGroup;
  isEditMode = false;
  isViewMode = false;  // 👈 AGREGAR ESTA LÍNEA
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

  documentosPorTipo: Map<string, DocumentoInfo> = new Map();
  documentoError = '';
  tipoSeleccionado = '';
  isDragging = false;

  // Propiedades para búsqueda de contratista
  contratistaEncontrado: any = null;
  contratistaDocumentos: any[] = [];
  buscandoContratista = false;
  contratistaSeleccionadoId: string | null = null;
  cargandoDocumentosContratista = false;

  // Archivos de pólizas y presupuesto
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


  mostrarAutocomplete = false;
  contratistasFiltrados: any[] = [];
  debounceTimer: any;

  tiposDocumentoDisponibles = [
  { value: 'CEDULA', label: 'Cédula de Ciudadanía' },
  { value: 'RUT', label: 'RUT' },
  { value: 'CERTIFICADO_BANCARIO', label: 'Certificado Bancario' },
  { value: 'CERTIFICADO_EXPERIENCIA', label: 'Certificado de Experiencia' },
  { value: 'CERTIFICADO_NO_PLANTA', label: 'Certificado No Planta' },
  { value: 'CERTIFICADO_ANTECEDENTES', label: 'Certificado de Antecedentes' },
  { value: 'CERTIFICADO_IDONEIDAD', label: 'Certificado de Idoneidad' },
  { value: 'DECLARACION_BIENES', label: 'Declaración de Bienes' },
  { value: 'DECLARACION_INHABILIDADES', label: 'Declaración de Inhabilidades' },
  { value: 'EXAMEN_INGRESO', label: 'Examen de Ingreso' },
  { value: 'GARANTIA', label: 'Garantía' },
  { value: 'HOJA_VIDA_SIGEP', label: 'Hoja de Vida SIGEP' },
  { value: 'LIBRETA_MILITAR', label: 'Libreta Militar' },
  { value: 'PANTALLAZO_SECOP', label: 'Pantallazo SECOP' },
  { value: 'PROPUESTA', label: 'Propuesta' },
  { value: 'PUBLICACION_GT', label: 'Publicación GT' },
  { value: 'REDAM', label: 'REDAM' },
  { value: 'SARLAFT', label: 'SARLAFT' },
  { value: 'SEGURIDAD_SOCIAL', label: 'Seguridad Social' },
  { value: 'TARJETA_PROFESIONAL', label: 'Tarjeta Profesional' }
];

// Documentos requeridos: todos excepto LIBRETA_MILITAR
tiposDocumentoRequeridos = this.tiposDocumentoDisponibles.filter(doc => doc.value !== 'LIBRETA_MILITAR');

get tiposPendientes() {
  return this.tiposDocumentoDisponibles.filter(doc => !this.documentosPorTipo.has(doc.value));
}

get documentosSubidosList() {
  const list: any[] = [];
  this.documentosPorTipo.forEach((value, key) => {
    const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === key);
    list.push({
      value: key,
      label: tipoInfo?.label || key,
      nombre: value.nombre,
      tamano: value.tamano,
      esExistente: value.esExistente || false,
      id: value.id,
      subidoPor: value.subidoPor || 'Sistema',
      fechaSubida: value.fechaSubida
    });
  });
  return list;
}

get documentosSubidosCount(): number { return this.documentosPorTipo.size; }
get totalDocumentosRequeridos(): number { return this.tiposDocumentoRequeridos.length; }
get documentosCompletadosRequeridos(): number {
  return this.tiposDocumentoRequeridos.filter(doc => this.documentosPorTipo.has(doc.value)).length;
}
get documentosFaltantesList(): string[] {
  return this.tiposDocumentoRequeridos.filter(doc => !this.documentosPorTipo.has(doc.value)).map(doc => doc.label);
}
get porcentajeDocumentos(): number {
  if (this.totalDocumentosRequeridos === 0) return 0;
  return Math.round((this.documentosCompletadosRequeridos / this.totalDocumentosRequeridos) * 100);
}
get todosDocumentosRequeridosCompletados(): boolean {
  return this.documentosCompletadosRequeridos === this.totalDocumentosRequeridos;
}

// Métodos de documentos
getTipoDocumentoLabel(tipo: string): string {
  const encontrado = this.tiposDocumentoDisponibles.find(d => d.value === tipo);
  return encontrado?.label || tipo;
}

formatearTamano(bytes: number): string {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

onDragOver(event: DragEvent): void { event.preventDefault(); event.stopPropagation(); this.isDragging = true; }
onDragLeave(event: DragEvent): void { event.preventDefault(); event.stopPropagation(); this.isDragging = false; }

onDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  this.isDragging = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) this.procesarArchivoDocumento(files[0]);
}

agregarDocumentoManual(): void {
  if (!this.tipoSeleccionado) {
    this.documentoError = 'Por favor seleccione primero el tipo de documento';
    setTimeout(() => this.documentoError = '', 3000);
    return;
  }
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  fileInput?.click();
}

onDocumentoFileSelected(event: any): void {
  const file = event.target.files[0];
  if (file) this.procesarArchivoDocumento(file);
}

private procesarArchivoDocumento(file: File): void {
  if (!this.tipoSeleccionado) {
    this.documentoError = 'Por favor seleccione primero el tipo de documento';
    setTimeout(() => this.documentoError = '', 3000);
    return;
  }
  if (this.documentosPorTipo.has(this.tipoSeleccionado)) {
    this.documentoError = `Ya se ha subido un documento tipo ${this.getTipoDocumentoLabel(this.tipoSeleccionado)}`;
    setTimeout(() => this.documentoError = '', 3000);
    return;
  }
  if (file.type !== 'application/pdf') {
    this.documentoError = 'Solo se permiten archivos PDF';
    setTimeout(() => this.documentoError = '', 3000);
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    this.documentoError = 'El archivo no puede exceder 5MB';
    setTimeout(() => this.documentoError = '', 3000);
    return;
  }

  const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === this.tipoSeleccionado);
  this.documentosPorTipo.set(this.tipoSeleccionado, {
    tipo: this.tipoSeleccionado,
    archivo: file,
    nombre: file.name,
    tamano: file.size,
    label: tipoInfo?.label || this.tipoSeleccionado,
    value: this.tipoSeleccionado,
    esExistente: false
  });
  this.tipoSeleccionado = '';
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
  this.documentoError = '';
}

eliminarDocumentoPorTipo(tipo: string): void {
  const documento = this.documentosPorTipo.get(tipo);
  if (documento?.esExistente && this.contratoId && documento.id) {
    if (confirm(`¿Eliminar permanentemente el documento "${documento.nombre}"?`)) {
      this.documentosPorTipo.delete(tipo);
    }
  } else {
    this.documentosPorTipo.delete(tipo);
  }
}

descargarDocumentoContrato(doc: any): void {
  if (!this.contratoId || !doc.id) {
    this.documentoError = 'No se puede descargar el documento';
    setTimeout(() => this.documentoError = '', 3000);
    return;
  }
  console.log(`Descargando documento del contrato: ${doc.label}`);
}

  
  // Tipos de contrato ordenados alfabéticamente por label
  tiposContrato = [
    { value: 'ARRENDAMIENTO', label: 'Arrendamiento' },
    { value: 'COMPRAVENTA', label: 'Compraventa' },
    { value: 'CONSULTORIA', label: 'Consultoria' },
    { value: 'OBRA', label: 'Obra' },
    { value: 'OTRO', label: 'Otro' },
    { value: 'PRESTACION_SERVICIOS', label: 'Prestacion de Servicios' },
    { value: 'SUMINISTRO', label: 'Suministro' }
  ];

  // Tipos de identificación ordenados alfabéticamente
  tiposIdentificacion = [
    { value: 'CC', label: 'Cedula de Ciudadania' },
    { value: 'CE', label: 'Cedula de Extranjeria' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PAS', label: 'Pasaporte' }
  ];

  // Aseguradoras ordenadas alfabéticamente
  aseguradoras = [
    'Allianz Seguros',
    'AXA Colpatria',
    'Liberty Seguros',
    'Mapfre Seguros',
    'Otro',
    'Seguros Bolivar',
    'Seguros Generales Suramericana',
    'Seguros Mundial',
    'Seguros Sura'
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

  // ==================== BÚSQUEDA DE CONTRATISTA ====================

  buscarContratistaPorContrato(): void {
    const numeroContrato = this.contratoForm.get('numeroContrato')?.value;

    if (!numeroContrato || numeroContrato.trim().length < 3) {
      this.contratistaEncontrado = null;
      this.contratistaDocumentos = [];
      return;
    }

    this.buscandoContratista = true;

    this.juridicaService.buscarContratistaPorNumeroContrato(numeroContrato).subscribe({
      next: (response: any) => {
        this.contratistaEncontrado = response;
        this.buscandoContratista = false;

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

          this.cargarDocumentosContratista(this.contratistaEncontrado.id);
        } else {
          this.contratistaDocumentos = [];
        }
      },
      error: (error: any) => {
        console.error('Error buscando contratista:', error);
        this.contratistaEncontrado = null;
        this.contratistaDocumentos = [];
        this.buscandoContratista = false;
      }
    });
  }

  cargarDocumentosContratista(contratistaId: string): void {
    if (!contratistaId) {
      this.cargandoDocumentosContratista = false;
      return;
    }

    this.cargandoDocumentosContratista = true;
    this.contratistaSeleccionadoId = contratistaId;

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

  // ==================== MÉTODOS DE DOCUMENTOS DEL CONTRATO ====================

 

  descargarDocumento(doc: any): void {
    if (!this.contratoId || !doc.id) {
      this.documentoError = 'No se puede descargar el documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }
    // Aquí iría la llamada al servicio para descargar documento del contrato
    console.log(`Descargando documento: ${doc.label}`);
  }

  // ==================== MÉTODOS EXISTENTES ====================

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
    if (id) {
      this.isEditMode = true;
      this.contratoId = id;
      this.cargarContrato(id);
    }
  }

  cargarContrato(id: string): void {
    this.isLoading = true;
    const sub = this.juridicaService.obtenerContratoPorId(id).subscribe({
      next: (contrato) => {
        if (contrato) this.cargarDatosEnFormulario(contrato);
        else this.errorMessage = 'Contrato no encontrado';
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando contrato:', error);
        this.errorMessage = 'Error al cargar el contrato';
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  cargarDatosEnFormulario(contrato: Contrato): void {
    const fechaInicio = contrato.fechaInicio ? new Date(contrato.fechaInicio).toISOString().split('T')[0] : '';
    const fechaTerminacion = contrato.fechaTerminacion ? new Date(contrato.fechaTerminacion).toISOString().split('T')[0] : '';
    const fechaFirma = contrato.fechaFirma ? new Date(contrato.fechaFirma).toISOString().split('T')[0] : '';
    const fechaDesembolso = contrato.fechaDesembolsoAnticipo ? new Date(contrato.fechaDesembolsoAnticipo).toISOString().split('T')[0] : '';

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
      next: (supervisores) => this.supervisores = supervisores,
      error: (error) => console.error('Error cargando supervisores:', error)
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

  guardarContrato(): void {
    this.submitted = true;

    // Validar documentos requeridos en paso 3
    if (this.pasoActual === 3 && !this.todosDocumentosRequeridosCompletados) {
      const faltantes = this.documentosFaltantesList;
      this.errorMessage = `Debe subir todos los documentos obligatorios. Faltan: ${faltantes.join(', ')}`;
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
    const formData = new FormData();

    // Agregar campos del formulario
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });

    // Agregar documentos del contrato (paso 3)
    let documentosNuevos = 0;
    this.documentosPorTipo.forEach((doc, tipo) => {
      if (doc.archivo) {
        formData.append(`tipo_documento_${documentosNuevos}`, doc.tipo);
        formData.append('documentos', doc.archivo);
        documentosNuevos++;
      }
    });

    // Agregar archivos de pólizas y presupuesto (paso 2)
    if (this.cdpFile) formData.append('cdpFile', this.cdpFile);
    if (this.rpFile) formData.append('rpFile', this.rpFile);
    if (this.polizaCumplimientoFile) formData.append('polizaCumplimientoFile', this.polizaCumplimientoFile);
    if (this.polizaCalidadFile) formData.append('polizaCalidadFile', this.polizaCalidadFile);
    if (this.polizaRCFile) formData.append('polizaRCFile', this.polizaRCFile);

    let request;
    if (this.isEditMode && this.contratoId) {
      request = this.juridicaService.actualizarContratoConDocumentos(this.contratoId, formData);
    } else {
      request = this.juridicaService.crearContratoConDocumentos(formData);
    }

    const sub = request.subscribe({
      next: (contrato) => {
        this.successMessage = this.isEditMode ? 'Contrato actualizado exitosamente' : 'Contrato creado exitosamente';
        this.isSubmitting = false;
        setTimeout(() => this.router.navigate(['/juridica/list']), 1500);
      },
      error: (error) => {
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

  onDocumentoInput(): void {
    const termino = this.contratoForm.get('proveedor')?.get('numeroIdentificacion')?.value;
    if (!termino || termino.trim().length < 2) {
      this.mostrarAutocomplete = false;
      this.contratistasFiltrados = [];
      return;
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.buscarContratistasPorTermino(termino);
    }, 300);
  }

  buscarContratistasPorTermino(termino: string): void {
    this.contratistaService.buscarPorTermino(termino).subscribe({
      next: (resultados) => {
        this.contratistasFiltrados = resultados;
        this.mostrarAutocomplete = resultados.length > 0;
      },
      error: () => {
        this.contratistasFiltrados = [];
        this.mostrarAutocomplete = false;
      }
    });
  }

  seleccionarContratista(contratista: any): void {
    this.contratistaEncontrado = contratista;
    this.contratoForm.patchValue({
      proveedor: {
        tipoIdentificacion: contratista.tipoDocumento || 'NIT',
        numeroIdentificacion: contratista.documentoIdentidad,
        nombreRazonSocial: contratista.razonSocial,
        telefono: contratista.telefono || '',
        email: contratista.email || ''
      }
    });
    this.mostrarAutocomplete = false;
    this.cargarDocumentosContratista(contratista.id);
  }

  onDocumentoBlur(): void {
    setTimeout(() => {
      this.mostrarAutocomplete = false;
    }, 200);
  }
}