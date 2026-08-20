import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
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
  esDelFormulario?: boolean; // ✅ Nuevo: indica si el documento viene del formulario público
  formularioId?: string; // ✅ Nuevo: ID del formulario al que pertenece
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
  formularioId: string | null = null; // ✅ Nuevo: ID del formulario público
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

  tipoSeleccionado = '';
  documentosAEliminar: string[] = [];

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

    // ✅ PRIMERO verificar queryParams
    this.checkQueryParams();

    // ✅ LUEGO verificar el estado del service
    this.checkStateService();

    // ✅ LUEGO verificar el navigation state
    this.checkNavigationState();

    // ✅ FINALMENTE verificar modo edición (que ahora incluye aprobación)
    this.checkEditMode();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // ✅ SOLO limpiar el state si NO estamos en modo edición
    if (this.fromAprobacion && !this.isEditMode) {
      this.formularioService.clearAprobacionState();
    }
  }

  get f() {
    return this.contratistaForm.controls;
  }

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
      numeroContrato: ['', Validators.maxLength(50)],
      cargo: ['', Validators.maxLength(100)],
      objetivoContrato: [''],
    });
  }

  /**
   * ✅ Verificar queryParams
   */
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

  /**
   * ✅ Verificar el estado del service
   */
  private checkStateService(): void {
    // ✅ Si ya tenemos fromAprobacion desde queryParams, no sobrescribir
    if (this.fromAprobacion) {
      console.log('✅ Ya tenemos fromAprobacion desde queryParams');
      return;
    }

    const fromAprobacion = this.formularioService.getFromAprobacion();
    const formularioData = this.formularioService.getFormularioData();

    console.log('🔍 FormulariosPublicosService - fromAprobacion:', fromAprobacion);
    console.log('🔍 FormulariosPublicosService - formularioData:', formularioData);

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
    console.log('🔍 Navigation state completo:', navigation);

    if (navigation?.extras?.state) {
      const state = navigation.extras.state;
      console.log('📦 State recibido:', state);

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

  /**
   * ✅ Verificar modo edición - AHORA maneja aprobación
   */
  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');

    // ✅ Si viene de aprobación, cargar formulario público
    if (this.fromAprobacion) {
      // Si no tenemos formularioId, intentar obtenerlo del service
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

    // ✅ Si es edición normal de contratista
    if (id) {
      this.isEditMode = true;
      this.contratistaId = id;
      this.cargarContratista(id);
    }
  }

  /**
   * ✅ CARGA EL FORMULARIO PÚBLICO PARA APROBACIÓN
   */
  cargarFormularioPublico(formularioId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📋 Cargando formulario público para aprobación:', formularioId);

    this.formularioService.obtenerDetalleAprobacion(formularioId).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        // Extraer el detalle de la respuesta
        const detalle = this.extraerDetalleAprobacion(response);

        if (!detalle) {
          this.errorMessage = 'No se pudo obtener el detalle del formulario';
          this.cdr.markForCheck();
          return;
        }

        console.log('✅ Detalle del formulario cargado:', detalle);

        // ✅ Cargar datos del formulario (NO del contratista)
        this.cargarDatosFormulario(detalle);

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

  /**
   * ✅ Extraer el detalle de la respuesta anidada
   */
  private extraerDetalleAprobacion(response: any): any {
    if (!response) return null;

    // La respuesta puede tener múltiples niveles de anidación
    if (response?.data?.data?.data) {
      return response.data.data.data;
    }
    if (response?.data?.data) {
      return response.data.data;
    }
    if (response?.data) {
      return response.data;
    }
    return response;
  }

  /**
   * ✅ Cargar los datos del formulario en el componente
   */
  private cargarDatosFormulario(detalle: any): void {
    // 1. Limpiar documentos existentes
    this.documentosPorTipo.clear();
    this.documentosAEliminar = [];

    // 2. Cargar datos del formulario en el formulario reactivo
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
      numeroContrato: ''
    });

    // 3. ✅ OBTENER TODOS LOS DOCUMENTOS DEL FORMULARIO
    const documentos = detalle.documentos || [];

    console.log(`📄 Total de documentos del formulario: ${documentos.length}`);

    // ✅ 4. IDENTIFICAR QUÉ GRUPOS TIENEN COMBINADO
    const gruposConCombinado = new Set<string>();

    documentos.forEach((doc: any) => {
      if (doc.esCombinado === true) {
        if (doc.tipo === 'SEGURIDAD_SOCIAL' || doc.tipo === 'CERTIFICADO_ANTECEDENTES') {
          gruposConCombinado.add(doc.tipo);
        }
      }
    });

    console.log(`📌 Grupos con combinado: ${Array.from(gruposConCombinado).join(', ') || 'Ninguno'}`);

    // ✅ 5. DEFINIR LOS TIPOS QUE PERTENECEN A CADA GRUPO
    const tiposSeguridadSocial = ['SEGURIDAD_SOCIAL_SALUD', 'SEGURIDAD_SOCIAL_PENSION', 'SEGURIDAD_SOCIAL_ARL'];
    const tiposAntecedentes = ['CERTIFICADO_DISCIPLINARIOS', 'CERTIFICADO_RESPONSABILIDAD_FISCAL',
      'CERTIFICADO_ANTECEDENTES_JUDICIALES', 'CERTIFICADO_MEDIDAS_CORRECTIVAS'];

    // ✅ 6. FILTRAR DOCUMENTOS - Mostrar TODOS excepto los individuales que pertenecen a grupos con combinado
    const documentosAMostrar: any[] = [];

    for (const doc of documentos) {
      // ✅ SI es combinado, siempre mostrarlo
      if (doc.esCombinado === true) {
        console.log(`✅ Mostrando combinado: ${doc.tipo}`);
        documentosAMostrar.push(doc);
        continue;
      }

      // ✅ Verificar si el documento individual pertenece a un grupo con combinado
      let debeOcultar = false;
      let grupoPertenece = '';

      // Verificar si pertenece al grupo SEGURIDAD_SOCIAL
      if (tiposSeguridadSocial.includes(doc.tipo)) {
        grupoPertenece = 'SEGURIDAD_SOCIAL';
        if (gruposConCombinado.has('SEGURIDAD_SOCIAL')) {
          debeOcultar = true;
        }
      }
      // Verificar si pertenece al grupo CERTIFICADO_ANTECEDENTES
      else if (tiposAntecedentes.includes(doc.tipo)) {
        grupoPertenece = 'CERTIFICADO_ANTECEDENTES';
        if (gruposConCombinado.has('CERTIFICADO_ANTECEDENTES')) {
          debeOcultar = true;
        }
      }

      // ❌ SI debe ocultar, NO lo agregamos
      if (debeOcultar) {
        console.log(`❌ Ocultando individual: ${doc.tipo} (ya existe combinado de ${grupoPertenece})`);
        continue;
      }

      // ✅ Si no debe ocultar, lo mostramos
      console.log(`✅ Mostrando individual: ${doc.tipo}`);
      documentosAMostrar.push(doc);
    }

    console.log(`📤 Documentos a mostrar: ${documentosAMostrar.length} (combinados + individuales no agrupados)`);

    // ✅ 7. AGREGAR DOCUMENTOS AL MAP
    documentosAMostrar.forEach((doc: any) => {
      const tipo = doc.tipo;

      // Buscar el tipo en la lista de disponibles
      let tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === tipo);

      // Si no está en la lista, agregarlo dinámicamente
      if (!tipoInfo) {
        // Crear un label basado en el tipo
        let label = tipo.replace(/_/g, ' ').toLowerCase();
        label = label.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        // Agregar a la lista de tipos disponibles (si no existe)
        if (!this.tiposDocumentoDisponibles.find(d => d.value === tipo)) {
          this.tiposDocumentoDisponibles.push({ value: tipo, label: label });
          // También agregar a requeridos si no es un tipo especial
          if (tipo !== 'LIBRETA_MILITAR') {
            this.tiposDocumentoRequeridos = this.tiposDocumentoDisponibles.filter(
              d => d.value !== 'LIBRETA_MILITAR'
            );
          }
        }
        tipoInfo = { value: tipo, label: label };
      }

      if (tipoInfo && !this.documentosPorTipo.has(tipo)) {
        // Guardar el formularioId para las descargas
        if (!this.formularioId) {
          this.formularioId = formulario.id || detalle.formulario?.id;
        }

        // Determinar el label apropiado
        let label = tipoInfo.label;
        if (doc.esCombinado) {
          if (tipo === 'SEGURIDAD_SOCIAL') {
            label = 'Seguridad Social (Combinado)';
          } else if (tipo === 'CERTIFICADO_ANTECEDENTES') {
            label = 'Certificado de Antecedentes (Combinado)';
          }
        }

        this.documentosPorTipo.set(tipo, {
          tipo: tipo,
          archivo: null,
          nombre: doc.nombreArchivo || `${label}.pdf`,
          nombreArchivo: doc.nombreArchivo,
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

        console.log(`✅ Documento cargado desde formulario: ${tipo} (${doc.esCombinado ? 'Combinado' : 'Individual'})`);
      }
    });

    // ✅ 8. Mostrar resumen final
    const combinados = documentosAMostrar.filter((d: any) => d.esCombinado);
    const individuales = documentosAMostrar.filter((d: any) => !d.esCombinado);

    console.log('📊 Resumen de documentos cargados desde formulario:');
    console.log(`   - Combinados: ${combinados.length}`);
    console.log(`   - Individuales (no agrupados): ${individuales.length}`);
    console.log(`   - Total mostrados: ${documentosAMostrar.length}`);
    console.log(`   - Ocultados (por pertenecer a grupos con combinado): ${documentos.length - documentosAMostrar.length}`);

    this.successMessage = `📋 Formulario cargado correctamente (${combinados.length} combinados, ${individuales.length} individuales)`;
    setTimeout(() => this.successMessage = '', 3000);

    this.cdr.markForCheck();
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
            numeroContrato: '',
            cargo: data.cargo,
            objetivoContrato: data.objetivoContrato
          });

          if (data.documentos && Array.isArray(data.documentos)) {
            console.log('📌 Documentos recibidos:', data.documentos.length);
            console.log('📌 Documentos con esCombinado=true:', data.documentos.filter((d: any) => d.esCombinado === true).length);
            console.log('📌 fromAprobacion:', this.fromAprobacion);

            let documentosAMostrar: any[] = [];

            // ✅ FORMA 2: Desde Aprobación - SOLO combinados + individuales NO agrupados
            if (this.fromAprobacion) {
              // ✅ 1. Identificar qué grupos tienen combinado
              const gruposConCombinado = new Set<string>();

              data.documentos.forEach((doc: any) => {
                if (doc.esCombinado === true && (doc.tipo === 'SEGURIDAD_SOCIAL' || doc.tipo === 'CERTIFICADO_ANTECEDENTES')) {
                  gruposConCombinado.add(doc.tipo);
                }
              });

              console.log(`📌 Grupos con combinado: ${Array.from(gruposConCombinado).join(', ')}`);

              // ✅ 2. DEFINIR LOS TIPOS QUE PERTENECEN A CADA GRUPO
              const tiposSeguridadSocial = ['SEGURIDAD_SOCIAL_SALUD', 'SEGURIDAD_SOCIAL_PENSION', 'SEGURIDAD_SOCIAL_ARL'];
              const tiposAntecedentes = ['CERTIFICADO_DISCIPLINARIOS', 'CERTIFICADO_RESPONSABILIDAD_FISCAL',
                'CERTIFICADO_ANTECEDENTES_JUDICIALES', 'CERTIFICADO_MEDIDAS_CORRECTIVAS'];

              // ✅ 3. FILTRAR DOCUMENTOS
              documentosAMostrar = [];

              for (const doc of data.documentos) {
                // ✅ SI es combinado, siempre mostrarlo
                if (doc.esCombinado === true) {
                  console.log(`✅ Mostrando combinado: ${doc.tipo}`);
                  documentosAMostrar.push(doc);
                  continue;
                }

                // ✅ Verificar si el documento individual pertenece a un grupo con combinado
                let debeOcultar = false;

                // Verificar si pertenece al grupo SEGURIDAD_SOCIAL
                if (tiposSeguridadSocial.includes(doc.tipo)) {
                  if (gruposConCombinado.has('SEGURIDAD_SOCIAL')) {
                    debeOcultar = true;
                  }
                }
                // Verificar si pertenece al grupo CERTIFICADO_ANTECEDENTES
                else if (tiposAntecedentes.includes(doc.tipo)) {
                  if (gruposConCombinado.has('CERTIFICADO_ANTECEDENTES')) {
                    debeOcultar = true;
                  }
                }

                // ❌ SI debe ocultar, NO lo agregamos
                if (debeOcultar) {
                  console.log(`❌ Ocultando individual: ${doc.tipo} (ya existe combinado)`);
                  continue;
                }

                // ✅ Si no debe ocultar, lo mostramos
                console.log(`✅ Mostrando individual: ${doc.tipo}`);
                documentosAMostrar.push(doc);
              }

              console.log(`📤 FORMA 2 (Desde Aprobación) - Documentos a mostrar: ${documentosAMostrar.length} (combinados + individuales no agrupados)`);
            } else {
              // ✅ FORMA 1 (Manual) y FORMA 3 (Edición) - Mostrar TODOS
              documentosAMostrar = data.documentos;
              console.log(`📤 FORMA ${this.isEditMode ? '3 (Edición)' : '1 (Manual)'} - Todos los documentos: ${documentosAMostrar.length}`);
            }

            // ✅ Agregar documentos al Map
            documentosAMostrar.forEach((doc: any) => {
              const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === doc.tipo);
              if (tipoInfo && !this.documentosPorTipo.has(doc.tipo)) {
                this.documentosPorTipo.set(doc.tipo, {
                  tipo: doc.tipo,
                  archivo: null,
                  nombre: doc.nombreArchivo || `${tipoInfo.label}.pdf`,
                  nombreArchivo: doc.nombreArchivo,
                  tamano: doc.tamanoBytes || 0,
                  tamanoBytes: doc.tamanoBytes,
                  label: doc.esCombinado
                    ? (doc.tipo === 'SEGURIDAD_SOCIAL' ? 'Seguridad Social (Combinado)' : 'Certificado de Antecedentes (Combinado)')
                    : tipoInfo.label,
                  value: doc.tipo,
                  id: doc.id,
                  esExistente: !!doc.id && !doc.esTemporal,
                  subidoPor: doc.subidoPor || 'Sistema',
                  fechaSubida: doc.fechaSubida,
                  marcadoEliminar: false,
                  esCombinado: doc.esCombinado || false,
                  documentosIds: doc.documentosIds || [],
                  documentosIndividuales: doc.documentosIndividuales || 0,
                  esTemporal: doc.esTemporal || false,
                  existeEnBackend: true,
                  perteneceAGrupo: doc.perteneceAGrupo || null,
                  esDelFormulario: false
                });
              }
            });

            // ✅ Resumen final
            console.log('📊 Resumen final:');
            console.log(`   - Combinados: ${documentosAMostrar.filter((d: any) => d.esCombinado).length}`);
            console.log(`   - Individuales: ${documentosAMostrar.filter((d: any) => !d.esCombinado).length}`);
            console.log(`   - Total: ${documentosAMostrar.length}`);
          }

          // ✅ Si viene de aprobación y ya cargamos los datos, actualizar el formulario
          if (this.fromAprobacion && this.formularioAprobacionData) {
            console.log('📋 Aplicando datos de aprobación después de cargar contratista');
            this.aplicarDatosAprobacion();
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

  private aplicarDatosAprobacion(): void {
    if (!this.formularioAprobacionData) return;
    const data = this.formularioAprobacionData;
    console.log('📋 Aplicando datos de aprobación:', data);

    if (data.contratistaNombre) {
      this.contratistaForm.patchValue({ razonSocial: data.contratistaNombre });
    }
    if (data.contratistaDocumento) {
      this.contratistaForm.patchValue({ documentoIdentidad: data.contratistaDocumento });
    }
    if (data.tipoContratista) {
      this.contratistaForm.patchValue({ tipoContratista: data.tipoContratista });
    }
    if (data.representanteLegal) {
      this.contratistaForm.patchValue({ representanteLegal: data.representanteLegal });
    }
    if (data.documentoRepresentante) {
      this.contratistaForm.patchValue({ documentoRepresentante: data.documentoRepresentante });
    }
    if (data.objetivoContrato) {
      this.contratistaForm.patchValue({ objetivoContrato: data.objetivoContrato });
    }
    if (data.cargo) {
      this.contratistaForm.patchValue({ cargo: data.cargo });
    }
    if (data.telefono) {
      this.contratistaForm.patchValue({ telefono: data.telefono });
    }
    if (data.direccion) {
      this.contratistaForm.patchValue({ direccion: data.direccion });
    }
    if (data.departamento) {
      this.contratistaForm.patchValue({ departamento: data.departamento });
    }
    if (data.ciudad) {
      this.contratistaForm.patchValue({ ciudad: data.ciudad });
    }

    this.successMessage = '📋 Datos cargados desde el formulario de aprobación';
    setTimeout(() => this.successMessage = '', 3000);
    this.cdr.markForCheck();
  }

  esDocumentoCombinado(tipo: string): boolean {
    return tipo === 'SEGURIDAD_SOCIAL' || tipo === 'CERTIFICADO_ANTECEDENTES';
  }

  verificarDocumento(): void {
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

  /**
   * ✅ DESCARGAR DOCUMENTO - Soporta documentos del formulario público
   */
descargarDocumento(doc: any): void {
  // ✅ Si es un documento del FORMULARIO PÚBLICO
  if (doc.esDelFormulario && doc.id) {
    // Si es combinado, usar el endpoint de combinado
    if (doc.esCombinado) {
      this.descargarCombinadoFormulario(doc.value);
    } else {
      // Si es individual, descargar desde el formulario
      this.descargarDocumentoFormulario(doc.id);
    }
    return;
  }
  
  // ✅ Si es un documento combinado del CONTRATISTA (edición normal)
  if ((this.esDocumentoCombinado(doc.value) || doc.esCombinado) && doc.id && doc.existeEnBackend) {
    this.descargarCombinado(doc.value);
    return;
  }

  // Si es un documento individual con ID del contratista
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

/**
 * ✅ Descargar documento individual del FORMULARIO PÚBLICO
 */
descargarDocumentoFormulario(documentoId: string): void {
  if (!this.formularioId) {
    this.documentoError = 'No se puede descargar el documento sin ID de formulario';
    setTimeout(() => this.documentoError = '', 3000);
    return;
  }
  
  console.log(`📥 Descargando documento individual del formulario: ${documentoId}`);
  
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

  /**
   * ✅ Descargar combinado del CONTRATISTA (edición normal)
   */
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

  /**
   * ✅ Descargar combinado del FORMULARIO PÚBLICO
   */
  descargarCombinadoFormulario(tipo: string): void {
    if (!this.formularioId) {
      this.documentoError = 'No se puede descargar el combinado sin ID de formulario';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    console.log(`📥 Descargando combinado del formulario: ${tipo} (formularioId: ${this.formularioId})`);

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
    if (tipo === 'SEGURIDAD_SOCIAL') {
      return 'Combinado Seguridad Social (PDF)';
    }
    if (tipo === 'CERTIFICADO_ANTECEDENTES') {
      return 'Combinado Antecedentes (PDF)';
    }
    return tipo;
  }

  confirmarEliminarDocumento(doc: any): void {
    // ✅ No permitir eliminar documentos del formulario público
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
    this.fileInput?.nativeElement.click();
  }

  private procesarArchivo(file: File): void {
    if (!this.tipoSeleccionado) {
      this.documentoError = '⚠️ Por favor seleccione primero el tipo de documento';
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

  getRemainingChars(fieldName: string): number {
    const control = this.contratistaForm.get(fieldName);
    if (!control) return 500;
    const currentValue = control.value || '';
    return 500 - currentValue.length;
  }

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

  guardarContratista(): void {
    this.submitted = true;

    if (this.contratistaForm.invalid) {
      this.errorMessage = '⚠️ Por favor complete todos los campos requeridos';
      return;
    }

    if (this.isEditMode) {
      const numeroContrato = this.contratistaForm.get('numeroContrato')?.value;
      if (!numeroContrato || numeroContrato.trim() === '') {
        this.errorMessage = '⚠️ Debe ingresar un número de contrato para crear una nueva versión';
        this.pasoActual = 2;
        return;
      }
    }

    if (!this.todosDocumentosRequeridosCompletados) {
      const faltantes = this.documentosFaltantesList;
      this.errorMessage = `⚠️ Debe subir todos los documentos obligatorios.\n📌 Faltan: ${faltantes.join(', ')}`;
      this.pasoActual = 3;
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

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
      request = this.contratistaService.actualizarConDocumentos(this.contratistaId, formData);
    } else {
      request = this.contratistaService.crearConDocumentos(formData);
    }

    const sub = request.subscribe({
      next: () => {
        this.successMessage = this.isEditMode ? '✅ Contratista actualizado exitosamente' : '✅ Contratista creado exitosamente';
        this.isSubmitting = false;

        setTimeout(() => {
          if (this.fromAprobacion) {
            this.location.back();
          } else {
            this.router.navigate(['/contratistas/list']);
          }
        }, 1500);
      },
      error: (error: any) => {
        console.error('❌ Error:', error);
        this.errorMessage = error.error?.message || error.message || 'Error al guardar el contratista';
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.push(sub);
  }

  volverAListaAprobacion(): void {
    if (this.fromAprobacion) {
      this.location.back();
    } else {
      this.router.navigate(['/contratistas/list']);
    }
  }

  cancelar(): void {
    if (confirm('¿Cancelar la operación?\nLos datos no guardados se perderán.')) {
      if (this.fromAprobacion) {
        this.location.back();
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