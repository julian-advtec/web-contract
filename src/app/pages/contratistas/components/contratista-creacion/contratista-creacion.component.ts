// contratista-creacion.component.ts

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, Observable, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { FormulariosPublicosService } from '../../../../core/services/formularios-publicos.service';
import { Location } from '@angular/common';

interface DocumentoInfo {
  tipo: string;
  archivo: File | null;
  nombre: string;
  nombreArchivo?: string;
  tamano: number;
  tamanoBytes?: number;
  label: string;
  value: string;
  id?: string;
  esExistente?: boolean;
  subidoPor?: string;
  fechaSubida?: Date | string;
  marcadoEliminar?: boolean;
  esCombinado?: boolean;
  documentosIds?: string[];
  documentosIndividuales?: number;
  esTemporal?: boolean;
  existeEnBackend?: boolean;
  perteneceAGrupo?: string | null;
  esDelFormulario?: boolean;
  formularioId?: string;
}

@Component({
  selector: 'app-contratista-creacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './contratista-creacion.component.html',
  styleUrls: ['./contratista-creacion.component.scss']
})
export class ContratistaCreacionComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  contratistaForm!: FormGroup;
  isEditMode = false;
  contratistaId: string | null = null;
  formularioId: string | null = null;
  isLoading = false;
  isSubmitting = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';
  documentoExistente = false;

  pasoActual = 1;

  fromAprobacion = false;
  formularioAprobacionData: any = null;

  documentosPorTipo: Map<string, DocumentoInfo> = new Map();
  documentoError = '';
  isDragging = false;
  uploading = false;
  uploadProgress = 0;
  tipoSeleccionado = '';
  documentosAEliminar: string[] = [];

  tiposDocumentoDisponibles = [
    { value: 'CEDULA', label: 'Cédula de Ciudadanía' },
    { value: 'RUT', label: 'RUT' },
    { value: 'CERTIFICADO_BANCARIO', label: 'Certificado Bancario' },
    { value: 'CERTIFICADO_EXPERIENCIA', label: 'Certificado de Experiencia' },
    { value: 'CERTIFICADO_NO_PLANTA', label: 'Certificado No Planta' },
    { value: 'CERTIFICADO_ANTECEDENTES', label: 'Certificado de Antecedentes (Combinado)' },
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
    { value: 'SEGURIDAD_SOCIAL', label: 'Seguridad Social (Combinado)' },
    { value: 'TARJETA_PROFESIONAL', label: 'Tarjeta Profesional' }
  ];

  tiposDocumentoRequeridos = this.tiposDocumentoDisponibles.filter(
    doc => doc.value !== 'LIBRETA_MILITAR'
  );

  // ============================================
  // GETTERS
  // ============================================

  get tiposPendientes() {
    return this.tiposDocumentoDisponibles.filter(doc => {
      const documento = this.documentosPorTipo.get(doc.value);
      return !documento || documento.marcadoEliminar === true;
    });
  }

  get documentosSubidosList() {
    const list: any[] = [];
    this.documentosPorTipo.forEach((value, key) => {
      const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === key);
      list.push({
        value: key,
        label: tipoInfo?.label || key,
        nombre: value.nombre,
        nombreArchivo: value.nombreArchivo,
        tamano: value.tamano,
        tamanoBytes: value.tamanoBytes,
        esExistente: value.esExistente || false,
        id: value.id,
        subidoPor: value.subidoPor || 'Sistema',
        fechaSubida: value.fechaSubida,
        marcadoEliminar: value.marcadoEliminar || false,
        esCombinado: value.esCombinado || false,
        documentosIds: value.documentosIds || [],
        documentosIndividuales: value.documentosIndividuales || 0,
        esTemporal: value.esTemporal || false,
        existeEnBackend: value.existeEnBackend || false,
        perteneceAGrupo: value.perteneceAGrupo || null,
        esDelFormulario: value.esDelFormulario || false,
        formularioId: value.formularioId || null
      });
    });
    return list;
  }

  get documentosSubidosCount(): number {
    return this.documentosPorTipo.size;
  }

  get totalDocumentosRequeridos(): number {
    return this.tiposDocumentoRequeridos.length;
  }

  get documentosCompletadosRequeridos(): number {
    return this.tiposDocumentoRequeridos.filter(doc => {
      const documento = this.documentosPorTipo.get(doc.value);
      return documento && documento.marcadoEliminar !== true && documento.existeEnBackend !== false;
    }).length;
  }

  get documentosFaltantesList(): string[] {
    return this.tiposDocumentoRequeridos
      .filter(doc => {
        const documento = this.documentosPorTipo.get(doc.value);
        return !documento || documento.marcadoEliminar === true || documento.existeEnBackend === false;
      })
      .map(doc => doc.label);
  }

  get porcentajeDocumentos(): number {
    if (this.totalDocumentosRequeridos === 0) return 0;
    return Math.round((this.documentosCompletadosRequeridos / this.totalDocumentosRequeridos) * 100);
  }

  get todosDocumentosRequeridosCompletados(): boolean {
    return this.documentosCompletadosRequeridos === this.totalDocumentosRequeridos;
  }

  get f() {
    return this.contratistaForm.controls;
  }

  /**
   * ✅ Verifica si el número de contrato tiene error de existencia
   */
  get numeroContratoTieneError(): boolean {
    const control = this.contratistaForm.get('numeroContrato');
    return control?.errors?.['existe'] === true;
  }

  /**
   * ✅ Verifica si el número de contrato es inválido para mostrar el estilo
   */
  get numeroContratoIsInvalid(): boolean {
    const control = this.contratistaForm.get('numeroContrato');
    if (!control) return false;

    if (this.fromAprobacion) {
      return (this.submitted && !control.value) || control.errors?.['existe'] === true;
    }
    return false;
  }

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private contratistaService: ContratistasService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private formularioService: FormulariosPublicosService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.checkQueryParams();
    this.checkStateService();
    this.checkNavigationState();
    this.checkEditMode();
    this.setupContratoValidation();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.fromAprobacion && !this.isEditMode) {
      this.formularioService.clearAprobacionState();
    }
  }

  // ============================================
  // INICIALIZACIÓN DEL FORMULARIO
  // ============================================

  private initializeForm(): void {
    this.contratistaForm = this.fb.group({
      tipoDocumento: ['CC', Validators.required],
      documentoIdentidad: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
      representanteLegal: ['', Validators.maxLength(200)],
      documentoRepresentante: ['', Validators.maxLength(20)],
      telefono: ['', Validators.maxLength(15)],
      email: ['', [Validators.email]],
      direccion: [''],
      departamento: ['', Validators.maxLength(50)],
      ciudad: ['', Validators.maxLength(50)],
      tipoContratista: [''],
      estado: ['ACTIVO', Validators.required],
      numeroContrato: ['', [Validators.maxLength(50)]],
      cargo: ['', Validators.maxLength(100)],
      objetivoContrato: ['']
    });
  }

  // ============================================
  // VALIDACIÓN DE NÚMERO DE CONTRATO
  // ============================================

  private setupContratoValidation(): void {
    const numeroContratoControl = this.contratistaForm.get('numeroContrato');
    if (!numeroContratoControl) return;

    this.subscriptions.push(
      numeroContratoControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((value: string) => {
          if (!this.fromAprobacion || !value || value.trim().length < 3) {
            return of(null);
          }
          return this.contratistaService.buscarContratistaPorNumeroContratoExacto(value.trim());
        })
      ).subscribe((contratista) => {
        const control = this.contratistaForm.get('numeroContrato');
        if (!control) return;

        if (contratista && contratista.id !== this.contratistaId) {
          control.setErrors({ existe: true });
          this.errorMessage = `⚠️ El número de contrato "${control.value}" ya está en uso. Por favor use un número diferente.`;
        } else {
          control.setErrors(null);
          if (this.errorMessage?.includes('número de contrato')) {
            this.errorMessage = '';
          }
        }
        this.cdr.markForCheck();
      })
    );
  }

  verificarNumeroContrato(): void {
    const control = this.contratistaForm.get('numeroContrato');
    if (!control || !control.value || control.value.trim().length < 3 || !this.fromAprobacion) {
      return;
    }
    control.updateValueAndValidity();
  }

  // ============================================
  // QUERY PARAMS Y STATE
  // ============================================

  private checkQueryParams(): void {
    const fromAprobacion = this.route.snapshot.queryParamMap.get('fromAprobacion');
    const formularioId = this.route.snapshot.queryParamMap.get('formularioId');

    if (fromAprobacion === 'true') {
      this.fromAprobacion = true;
      if (formularioId) {
        this.formularioId = formularioId;
        console.log('✅ fromAprobacion = true (desde queryParams), formularioId:', formularioId);
      }
    }
  }

  private checkStateService(): void {
    if (this.fromAprobacion) {
      console.log('✅ Ya tenemos fromAprobacion desde queryParams');
      return;
    }

    const fromAprobacion = this.formularioService.getFromAprobacion();
    const formularioData = this.formularioService.getFormularioData();

    if (fromAprobacion && formularioData) {
      this.fromAprobacion = true;
      this.formularioAprobacionData = formularioData;
      if (formularioData.idFormulario) {
        this.formularioId = formularioData.idFormulario;
      }
      console.log('✅ Datos cargados desde FormulariosPublicosService');
    }
  }

  private checkNavigationState(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state;
      if (state['fromAprobacion']) {
        this.fromAprobacion = true;
        this.formularioAprobacionData = state['formularioData'];
        if (this.formularioAprobacionData?.idFormulario) {
          this.formularioId = this.formularioAprobacionData.idFormulario;
        }
        console.log('✅ fromAprobacion = true (desde navigation state)');
      }
    }
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (this.fromAprobacion) {
      if (id) {
        this.contratistaId = id;
        console.log('✅ ContratistaId desde URL para aprobación:', this.contratistaId);
      }

      if (!this.formularioId) {
        const data = this.formularioService.getFormularioData();
        if (data?.idFormulario) {
          this.formularioId = data.idFormulario;
        }
      }

      if (this.formularioId) {
        this.cargarFormularioPublico(this.formularioId);
      } else {
        this.errorMessage = 'No se encontró el ID del formulario de aprobación';
        this.isLoading = false;
      }
      return;
    }

    if (id) {
      this.isEditMode = true;
      this.contratistaId = id;
      this.cargarContratista(id);
    }
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================

  cargarFormularioPublico(formularioId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📋 Cargando formulario público para aprobación:', formularioId);

    this.formularioService.obtenerDetalleAprobacion(formularioId).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const detalle = this.extraerDetalleAprobacion(response);

        if (!detalle) {
          this.errorMessage = 'No se pudo obtener el detalle del formulario';
          this.cdr.markForCheck();
          return;
        }

        console.log('✅ Detalle del formulario cargado:', detalle);
        this.cargarDatosFormulario(detalle);
        this.configurarModoAprobacion();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Error cargando formulario:', error);
        this.errorMessage = error.error?.message || 'Error al cargar el formulario de aprobación';
        this.cdr.markForCheck();
      }
    });
  }

  cargarContratista(id: string): void {
    this.isLoading = true;

    const sub = this.contratistaService.obtenerCompleto(id).subscribe({
      next: (data: any) => {
        if (data) {
          this.documentosPorTipo.clear();
          this.documentosAEliminar = [];

          this.contratistaForm.patchValue({
            tipoDocumento: data.tipoDocumento || 'CC',
            documentoIdentidad: data.documentoIdentidad,
            razonSocial: data.razonSocial,
            representanteLegal: data.representanteLegal,
            documentoRepresentante: data.documentoRepresentante,
            telefono: data.telefono,
            email: data.email,
            direccion: data.direccion,
            departamento: data.departamento,
            ciudad: data.ciudad,
            tipoContratista: data.tipoContratista,
            estado: data.estado || 'ACTIVO',
            numeroContrato: data.numeroContrato || '',
            cargo: data.cargo,
            objetivoContrato: data.objetivoContrato
          });

          if (data.documentos && Array.isArray(data.documentos)) {
            // Lógica para cargar documentos existentes...
          }
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.errorMessage = error.message || 'Error al cargar el contratista';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.push(sub);
  }

  private extraerDetalleAprobacion(response: any): any {
    if (!response) return null;

    if (response?.data?.data?.data) return response.data.data.data;
    if (response?.data?.data) return response.data.data;
    if (response?.data) return response.data;
    return response;
  }

  private cargarDatosFormulario(detalle: any): void {
    this.documentosPorTipo.clear();
    this.documentosAEliminar = [];

    const formulario = detalle.formulario || detalle;
    const contratista = detalle.contratista || {};

    this.contratistaForm.patchValue({
      tipoDocumento: 'CC',
      documentoIdentidad: contratista.documentoIdentidad || formulario.documentoRepresentante || '',
      razonSocial: contratista.razonSocial || formulario.representanteLegal || '',
      representanteLegal: formulario.representanteLegal || '',
      documentoRepresentante: formulario.documentoRepresentante || '',
      telefono: formulario.telefono || '',
      direccion: formulario.direccion || '',
      departamento: formulario.departamento || '',
      ciudad: formulario.ciudad || '',
      tipoContratista: formulario.tipoContratista || contratista.tipoContratista || '',
      cargo: formulario.cargo || '',
      objetivoContrato: formulario.objetivoContrato || '',
      estado: 'ACTIVO',
      numeroContrato: contratista.numeroContrato || ''
    });

    const documentos = detalle.documentos || [];
    this.procesarDocumentosFormulario(documentos, formulario);
  }

  private procesarDocumentosFormulario(documentos: any[], formulario: any): void {
    console.log(`📄 Total de documentos del formulario: ${documentos.length}`);

    const gruposConCombinado = new Set<string>();
    documentos.forEach((doc: any) => {
      if (doc.esCombinado === true) {
        if (doc.tipo === 'SEGURIDAD_SOCIAL' || doc.tipo === 'CERTIFICADO_ANTECEDENTES') {
          gruposConCombinado.add(doc.tipo);
        }
      }
    });

    console.log(`📌 Grupos con combinado: ${Array.from(gruposConCombinado).join(', ') || 'Ninguno'}`);

    const tiposSeguridadSocial = ['SEGURIDAD_SOCIAL_SALUD', 'SEGURIDAD_SOCIAL_PENSION', 'SEGURIDAD_SOCIAL_ARL'];
    const tiposAntecedentes = ['CERTIFICADO_DISCIPLINARIOS', 'CERTIFICADO_RESPONSABILIDAD_FISCAL',
      'CERTIFICADO_ANTECEDENTES_JUDICIALES', 'CERTIFICADO_MEDIDAS_CORRECTIVAS'];

    const documentosAMostrar: any[] = [];
    for (const doc of documentos) {
      if (doc.esCombinado === true) {
        documentosAMostrar.push(doc);
        continue;
      }

      let debeOcultar = false;
      if (tiposSeguridadSocial.includes(doc.tipo) && gruposConCombinado.has('SEGURIDAD_SOCIAL')) {
        debeOcultar = true;
      } else if (tiposAntecedentes.includes(doc.tipo) && gruposConCombinado.has('CERTIFICADO_ANTECEDENTES')) {
        debeOcultar = true;
      }

      if (!debeOcultar) {
        documentosAMostrar.push(doc);
      }
    }

    console.log(`📤 Documentos a mostrar: ${documentosAMostrar.length}`);

    documentosAMostrar.forEach((doc: any) => {
      const tipo = doc.tipo;
      let tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === tipo);

      if (!tipoInfo) {
        let label = tipo.replace(/_/g, ' ').toLowerCase();
        label = label.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        this.tiposDocumentoDisponibles.push({ value: tipo, label: label });
        if (tipo !== 'LIBRETA_MILITAR') {
          this.tiposDocumentoRequeridos = this.tiposDocumentoDisponibles.filter(
            d => d.value !== 'LIBRETA_MILITAR'
          );
        }
        tipoInfo = { value: tipo, label: label };
      }

      if (tipoInfo && !this.documentosPorTipo.has(tipo)) {
        if (!this.formularioId) {
          this.formularioId = formulario.id;
        }

        let label = tipoInfo.label;
        if (doc.esCombinado) {
          if (tipo === 'SEGURIDAD_SOCIAL') {
            label = 'Seguridad Social (Combinado)';
          } else if (tipo === 'CERTIFICADO_ANTECEDENTES') {
            label = 'Certificado de Antecedentes (Combinado)';
          }
        }

        const nombreArchivo = doc.nombreArchivo || doc.nombre || `${tipoInfo.label}.pdf`;

        this.documentosPorTipo.set(tipo, {
          tipo: tipo,
          archivo: null,
          nombre: nombreArchivo,
          nombreArchivo: nombreArchivo,
          tamano: doc.tamanoBytes || 0,
          tamanoBytes: doc.tamanoBytes,
          label: label,
          value: tipo,
          id: doc.id,
          esExistente: true,
          subidoPor: doc.subidoPor || 'Contratista',
          fechaSubida: doc.fechaSubida || new Date(),
          marcadoEliminar: false,
          esCombinado: doc.esCombinado || false,
          documentosIds: doc.documentosIds || [],
          documentosIndividuales: doc.documentosIndividuales || 0,
          esTemporal: false,
          existeEnBackend: true,
          perteneceAGrupo: doc.perteneceAGrupo || null,
          esDelFormulario: true,
          formularioId: this.formularioId || undefined
        });
      }
    });

    const combinados = documentosAMostrar.filter((d: any) => d.esCombinado);
    const individuales = documentosAMostrar.filter((d: any) => !d.esCombinado);

    this.successMessage = `📋 Formulario cargado correctamente (${combinados.length} combinados, ${individuales.length} individuales)`;
    setTimeout(() => this.successMessage = '', 3000);
    this.cdr.markForCheck();
  }

  private configurarModoAprobacion(): void {
    if (!this.fromAprobacion) return;

    const campos = [
      'tipoDocumento', 'documentoIdentidad', 'razonSocial', 'representanteLegal',
      'documentoRepresentante', 'telefono', 'email', 'direccion', 'departamento',
      'ciudad', 'tipoContratista', 'estado', 'cargo', 'objetivoContrato'
    ];

    campos.forEach(campo => {
      const control = this.contratistaForm.get(campo);
      if (control) control.disable();
    });

    const numeroContratoControl = this.contratistaForm.get('numeroContrato');
    if (numeroContratoControl) numeroContratoControl.enable();

    console.log('✅ Modo aprobación configurado - Solo número de contrato editable');
  }

  // ============================================
  // MÉTODOS DE DOCUMENTOS
  // ============================================

  esDocumentoCombinado(tipo: string): boolean {
    return tipo === 'SEGURIDAD_SOCIAL' || tipo === 'CERTIFICADO_ANTECEDENTES';
  }

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

  verificarDocumento(): void {
    if (this.fromAprobacion) return;

    const documento = this.contratistaForm.get('documentoIdentidad')?.value;
    if (documento && documento.length >= 3 && !this.isEditMode) {
      this.contratistaService.verificarDocumento(documento).subscribe({
        next: (result: any) => {
          if (result.existe) {
            this.documentoExistente = true;
            this.errorMessage = `Ya existe un contratista con el documento ${documento}`;
            this.contratistaForm.get('documentoIdentidad')?.setErrors({ existe: true });
          } else {
            this.documentoExistente = false;
          }
          this.cdr.markForCheck();
        }
      });
    }
  }

  // ============================================
  // DESCARGA DE DOCUMENTOS
  // ============================================

  descargarDocumento(doc: any): void {
    if (doc.esDelFormulario && doc.id) {
      if (doc.esCombinado) {
        this.descargarCombinadoFormulario(doc.value);
      } else {
        this.descargarDocumentoFormulario(doc.id);
      }
      return;
    }

    if ((this.esDocumentoCombinado(doc.value) || doc.esCombinado) && doc.id && doc.existeEnBackend) {
      this.descargarCombinado(doc.value);
      return;
    }

    if (!this.contratistaId || !doc.id) {
      this.documentoError = 'No se puede descargar el documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    this.contratistaService.descargarDocumento(this.contratistaId, doc.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.nombre || doc.nombreArchivo || `${doc.label}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('❌ Error descargando documento:', error);
        this.documentoError = 'Error al descargar el documento';
        setTimeout(() => this.documentoError = '', 3000);
      }
    });
  }

  descargarDocumentoFormulario(documentoId: string): void {
    if (!this.formularioId) {
      this.documentoError = 'No se puede descargar el documento sin ID de formulario';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    this.formularioService.descargarDocumentoIndividual(this.formularioId, documentoId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nombreArchivo = `documento_${documentoId.substring(0, 8)}.pdf`;
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = '✅ Documento descargado del formulario';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('❌ Error descargando documento del formulario:', error);
        this.documentoError = `Error al descargar el documento: ${error.message || 'Error desconocido'}`;
        setTimeout(() => this.documentoError = '', 4000);
      }
    });
  }

  descargarCombinado(tipo: string): void {
    if (!this.contratistaId) {
      this.documentoError = 'No se puede descargar el combinado sin ID de contratista';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    let request: Observable<Blob>;
    if (tipo === 'SEGURIDAD_SOCIAL') {
      request = this.contratistaService.descargarCombinadoSeguridadSocial(this.contratistaId);
    } else if (tipo === 'CERTIFICADO_ANTECEDENTES') {
      request = this.contratistaService.descargarCombinadoAntecedentes(this.contratistaId);
    } else {
      this.documentoError = `Tipo de combinado no soportado: ${tipo}`;
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    request.subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nombreArchivo = tipo === 'SEGURIDAD_SOCIAL'
          ? `Seguridad_Social_${this.contratistaId}.pdf`
          : `Antecedentes_${this.contratistaId}.pdf`;
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = `✅ ${this.getNombreCombinado(tipo)} descargado exitosamente`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('❌ Error descargando combinado:', error);
        this.documentoError = `Error al descargar el combinado: ${error.message || 'Error desconocido'}`;
        setTimeout(() => this.documentoError = '', 4000);
      }
    });
  }

  descargarCombinadoFormulario(tipo: string): void {
    if (!this.formularioId) {
      this.documentoError = 'No se puede descargar el combinado sin ID de formulario';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    this.formularioService.descargarCombinado(this.formularioId, tipo).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nombreArchivo = tipo === 'SEGURIDAD_SOCIAL'
          ? `Seguridad_Social_Formulario.pdf`
          : `Antecedentes_Formulario.pdf`;
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = `✅ ${this.getNombreCombinado(tipo)} descargado del formulario`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('❌ Error descargando combinado del formulario:', error);
        this.documentoError = `Error al descargar el combinado: ${error.message || 'Error desconocido'}`;
        setTimeout(() => this.documentoError = '', 4000);
      }
    });
  }

  getNombreCombinado(tipo: string): string {
    if (tipo === 'SEGURIDAD_SOCIAL') return 'Combinado Seguridad Social (PDF)';
    if (tipo === 'CERTIFICADO_ANTECEDENTES') return 'Combinado Antecedentes (PDF)';
    return tipo;
  }

  // ============================================
  // ELIMINACIÓN Y RESTAURACIÓN DE DOCUMENTOS
  // ============================================

  confirmarEliminarDocumento(doc: any): void {
    if (doc.esDelFormulario) {
      this.documentoError = '⚠️ No se pueden eliminar documentos del formulario de aprobación';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    const confirmMsg = `¿Marcar el documento "${doc.label}" para eliminar?\n\nSe eliminará cuando guarde los cambios.`;
    if (confirm(confirmMsg)) {
      this.marcarDocumentoParaEliminar(doc.value);
    }
  }

  marcarDocumentoParaEliminar(tipo: string): void {
    const documento = this.documentosPorTipo.get(tipo);
    if (documento) {
      if (documento.esExistente && documento.id) {
        this.documentosAEliminar.push(documento.id);
      }
      documento.marcadoEliminar = true;
      this.documentosPorTipo.set(tipo, documento);
      this.successMessage = `✅ Documento "${documento.label}" marcado para eliminar. Se eliminará al guardar.`;
      setTimeout(() => this.successMessage = '', 3000);
      this.cdr.markForCheck();
    }
  }

  restaurarDocumento(tipo: string): void {
    const documento = this.documentosPorTipo.get(tipo);
    if (documento && documento.marcadoEliminar) {
      documento.marcadoEliminar = false;
      if (documento.id) {
        const index = this.documentosAEliminar.indexOf(documento.id);
        if (index > -1) {
          this.documentosAEliminar.splice(index, 1);
        }
      }
      this.documentosPorTipo.set(tipo, documento);
      this.successMessage = `✅ Documento "${documento.label}" restaurado`;
      setTimeout(() => this.successMessage = '', 2000);
      this.cdr.markForCheck();
    }
  }

  // ============================================
  // DRAG & DROP Y SUBIDA DE ARCHIVOS
  // ============================================

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.procesarArchivo(files[0]);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.procesarArchivo(file);
    }
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  agregarDocumentoManual(): void {
    if (!this.tipoSeleccionado) {
      this.documentoError = '⚠️ Por favor seleccione primero el tipo de documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }
    if (this.fromAprobacion) {
      this.documentoError = '⚠️ No se pueden subir documentos en modo aprobación';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }
    this.fileInput?.nativeElement.click();
  }

  private procesarArchivo(file: File): void {
    if (!this.tipoSeleccionado) {
      this.documentoError = '⚠️ Por favor seleccione primero el tipo de documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    if (this.fromAprobacion) {
      this.documentoError = '⚠️ No se pueden subir documentos en modo aprobación';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    const documentoExistente = this.documentosPorTipo.get(this.tipoSeleccionado);
    if (documentoExistente && !documentoExistente.marcadoEliminar) {
      this.documentoError = `❌ Ya existe un documento tipo "${this.getTipoDocumentoLabel(this.tipoSeleccionado)}". Elimínelo primero si desea reemplazarlo.`;
      setTimeout(() => this.documentoError = '', 4000);
      return;
    }

    if (file.type !== 'application/pdf') {
      this.documentoError = '❌ Solo se permiten archivos PDF';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.documentoError = '❌ El archivo no puede exceder 5MB';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === this.tipoSeleccionado);

    if (this.isEditMode && this.contratistaId) {
      this.uploading = true;
      this.uploadProgress = 0;

      const interval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
        }
      }, 200);

      this.contratistaService.subirDocumento(this.contratistaId, this.tipoSeleccionado as any, file).subscribe({
        next: (doc: any) => {
          clearInterval(interval);
          this.uploadProgress = 100;
          this.documentosPorTipo.set(this.tipoSeleccionado, {
            tipo: this.tipoSeleccionado,
            archivo: null,
            nombre: doc.nombreArchivo,
            nombreArchivo: doc.nombreArchivo,
            tamano: doc.tamanoBytes,
            tamanoBytes: doc.tamanoBytes,
            label: tipoInfo?.label || this.tipoSeleccionado,
            value: this.tipoSeleccionado,
            id: doc.id,
            esExistente: true,
            subidoPor: 'Usuario',
            fechaSubida: new Date(),
            marcadoEliminar: false,
            esCombinado: this.esDocumentoCombinado(this.tipoSeleccionado),
            documentosIds: [doc.id],
            documentosIndividuales: 0,
            esTemporal: false,
            existeEnBackend: true,
            perteneceAGrupo: null,
            esDelFormulario: false
          });
          this.tipoSeleccionado = '';
          setTimeout(() => this.uploading = false, 500);
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          clearInterval(interval);
          this.uploading = false;
          this.documentoError = error.error?.message || 'Error al subir el documento';
          setTimeout(() => this.documentoError = '', 4000);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.documentosPorTipo.set(this.tipoSeleccionado, {
        tipo: this.tipoSeleccionado,
        archivo: file,
        nombre: file.name,
        tamano: file.size,
        label: tipoInfo?.label || this.tipoSeleccionado,
        value: this.tipoSeleccionado,
        esExistente: false,
        marcadoEliminar: false,
        esCombinado: this.esDocumentoCombinado(this.tipoSeleccionado),
        documentosIds: [],
        documentosIndividuales: 0,
        esTemporal: false,
        existeEnBackend: false,
        perteneceAGrupo: null,
        esDelFormulario: false
      });
      this.tipoSeleccionado = '';
      this.documentoError = '';
      this.cdr.markForCheck();
    }
  }

  // ============================================
  // NAVEGACIÓN ENTRE PASOS
  // ============================================

  siguientePaso(): void {
    if (this.validarPasoActual()) {
      this.pasoActual++;
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) {
      this.pasoActual--;
    }
  }

  private validarPasoActual(): boolean {
    this.submitted = true;
    let isValid = true;

    if (this.pasoActual === 1) {
      const documentoControl = this.contratistaForm.get('documentoIdentidad');
      const razonSocialControl = this.contratistaForm.get('razonSocial');

      if (documentoControl?.invalid) {
        documentoControl.markAsTouched();
        isValid = false;
      }
      if (razonSocialControl?.invalid) {
        razonSocialControl.markAsTouched();
        isValid = false;
      }
    }

    if (!isValid) {
      this.errorMessage = '⚠️ Por favor complete los campos requeridos en este paso';
      setTimeout(() => this.errorMessage = '', 3000);
    }

    return isValid;
  }

  // ============================================
  // GUARDAR CONTRATISTA
  // ============================================

  guardarContratista(): void {
    this.submitted = true;

    if (this.contratistaForm.invalid) {
      this.errorMessage = '⚠️ Por favor complete todos los campos requeridos';
      return;
    }

    // ✅ Si viene de aprobación, SOLO APROBAR EL FORMULARIO
    if (this.fromAprobacion) {
      const numeroContrato = this.contratistaForm.get('numeroContrato')?.value;
      if (!numeroContrato || numeroContrato.trim() === '') {
        this.errorMessage = '⚠️ Debe ingresar un número de contrato';
        this.pasoActual = 2;
        return;
      }

      // ✅ Verificar que el número de contrato no esté en uso
      const control = this.contratistaForm.get('numeroContrato');
      if (control?.errors?.['existe']) {
        this.errorMessage = `⚠️ El número de contrato "${control.value}" ya está en uso. Por favor use un número diferente.`;
        this.pasoActual = 2;
        return;
      }

      // ✅ En modo aprobación: SOLO APROBAR, no actualizar
      this.isSubmitting = true;
      this.aprobarFormularioPublico();
      return;
    }

    // ✅ Modo normal (no aprobación)
    if (!this.todosDocumentosRequeridosCompletados) {
      const faltantes = this.documentosFaltantesList;
      this.errorMessage = `⚠️ Debe subir todos los documentos obligatorios.\n📌 Faltan: ${faltantes.join(', ')}`;
      this.pasoActual = 3;
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.contratistaForm.getRawValue();
    const formData = new FormData();

    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    if (this.documentosAEliminar.length > 0) {
      formData.append('documentos_eliminar', JSON.stringify(this.documentosAEliminar));
    }

    let documentosNuevos = 0;
    this.documentosPorTipo.forEach((doc) => {
      if (doc.archivo && !doc.esExistente && !doc.marcadoEliminar) {
        formData.append(`tipo_documento_${documentosNuevos}`, doc.tipo);
        formData.append('documentos', doc.archivo);
        documentosNuevos++;
      }
    });

    let request;

    if (this.isEditMode && this.contratistaId) {
      console.log('✅ Actualizando contratista:', this.contratistaId);
      request = this.contratistaService.actualizarConDocumentos(this.contratistaId, formData);
    } else {
      console.log('✅ Creando nuevo contratista');
      request = this.contratistaService.crearConDocumentos(formData);
    }

    const sub = request.subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta del servidor:', response);

        if (response?.data?.success === false) {
          this.errorMessage = response.data.message || 'Error al guardar el contratista';
          this.isSubmitting = false;
          this.cdr.markForCheck();
          return;
        }

        this.successMessage = this.isEditMode
          ? '✅ Contratista actualizado exitosamente'
          : '✅ Contratista creado exitosamente';
        this.isSubmitting = false;
        this.cdr.markForCheck();

        setTimeout(() => {
          this.router.navigate(['/contratistas/list']);
        }, 3000);
      },
      error: (error: any) => {
        console.error('❌ Error en la solicitud:', error);
        const errorMsg = error.error?.data?.message || error.error?.message || error.message;

        this.errorMessage = errorMsg || 'Error al guardar el contratista';
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.push(sub);
  }

  // ============================================
  // APROBAR FORMULARIO
  // ============================================

  aprobarFormularioPublico(): void {
    if (!this.formularioId) {
      this.errorMessage = 'No se puede aprobar: falta ID del formulario';
      this.isSubmitting = false;
      this.cdr.markForCheck();
      return;
    }

    // ✅ Obtener el número de contrato ingresado
    const numeroContrato = this.contratistaForm.get('numeroContrato')?.value;
    if (!numeroContrato || numeroContrato.trim() === '') {
      this.errorMessage = '⚠️ Debe ingresar un número de contrato';
      this.isSubmitting = false;
      this.pasoActual = 2;
      this.cdr.markForCheck();
      return;
    }

    console.log('✅ Aprobando formulario público con contrato:', numeroContrato);

    // ✅ Enviar el número de contrato como objeto (no como string)
    this.formularioService.aprobarFormulario(
      this.formularioId,
      { numeroContrato: numeroContrato }
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Formulario aprobado - Estado cambiado a APROBADO:', response);

        this.isSubmitting = false;
        this.successMessage = `✅ ¡Formulario aprobado exitosamente! Contrato: ${numeroContrato}. El formulario ya no aparecerá en la lista de aprobación.`;
        this.cdr.markForCheck();

        this.formularioService.clearAprobacionState();

        setTimeout(() => {
          this.router.navigate(['/contratistas/formularios-aprobacion']);
        }, 5000);
      },
      error: (error: any) => {
        console.error('❌ Error aprobando formulario:', error);
        this.isSubmitting = false;

        if (error.error?.message?.includes('número de contrato')) {
          this.errorMessage = error.error.message;
          this.pasoActual = 2;
        } else {
          this.errorMessage = error.error?.message || error.message || 'Error al aprobar el formulario. Por favor, intente nuevamente.';
        }

        this.cdr.markForCheck();
      }
    });
  }


  // ============================================
  // NAVEGACIÓN Y UTILIDADES
  // ============================================

  volverAListaAprobacion(): void {
    if (this.fromAprobacion) {
      this.formularioService.clearAprobacionState();
      this.router.navigate(['/contratistas/formularios-aprobacion']);
    } else {
      this.router.navigate(['/contratistas/list']);
    }
  }

  cancelar(): void {
    if (confirm('¿Cancelar la operación?\nLos datos no guardados se perderán.')) {
      if (this.fromAprobacion) {
        this.volverAListaAprobacion();
      } else {
        this.router.navigate(['/contratistas/list']);
      }
    }
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  getRemainingChars(fieldName: string): number {
    const control = this.contratistaForm.get(fieldName);
    if (!control) return 500;
    const currentValue = control.value || '';
    return 500 - currentValue.length;
  }

  getEstadoClass(estado: string): string {
    const clases: Record<string, string> = {
      'PENDIENTE': 'estado-pendiente',
      'EN_REVISION': 'estado-en_revision',
      'APROBADO': 'estado-aprobado',
      'RECHAZADO': 'estado-rechazado'
    };
    return clases[estado] || 'estado-pendiente';
  }

  getEstadoTexto(estado: string): string {
    const textos: Record<string, string> = {
      'PENDIENTE': 'Pendiente',
      'EN_REVISION': 'En Revisión',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado'
    };
    return textos[estado] || estado;
  }
}