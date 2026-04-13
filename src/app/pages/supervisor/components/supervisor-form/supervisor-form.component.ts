import { Component, OnInit, ChangeDetectorRef, OnDestroy, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable, of, Subject } from 'rxjs';
import { map, catchError, takeUntil } from 'rxjs/operators';
import { EventEmitter } from '@angular/core';

import { SupervisorService } from '../../../../core/services/supervisor/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorService } from '../../../../core/services/auditor.service';
import { SupervisorEstadisticasService } from '../../../../core/services/supervisor';
import { AuditorFormComponent } from '../../../auditor/components/auditor-form/auditor-form.component';
import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';

@Component({
  selector: 'app-supervisor-form',
  templateUrl: './supervisor-form.component.html',
  styleUrls: ['./supervisor-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AuditorFormComponent,
    
  ]
})
export class SupervisorFormComponent implements OnInit, OnDestroy {

  @Input() documentoId: string = '';
  @Input() modo: 'supervisor' | 'auditoria' | 'contabilidad' = 'supervisor';
  @Input() soloLectura: boolean = false;

  @Output() volver = new EventEmitter<void>();

  
  
  radicadoData: any = null;
  isLoading = false;
  isProcessing = false;
  isDownloadingAll = false;

  modoEdicion = false;
  desdeHistorial = false;
  esModoAuditor = false;

  revisionForm!: FormGroup;

  maxFileSize = 10 * 1024 * 1024;
  mostrarCampoArchivo = false;
  archivoAprobacion: File | null = null;
  archivoPazSalvo: File | null = null;

  nombreArchivoAprobacionExistente: string = '';
  fechaArchivoAprobacionExistente: Date | null = null;
  nombrePazSalvoExistente: string = '';
  fechaPazSalvoExistente: Date | null = null;

  archivosAuditor: any[] = [];
  primerRadicadoDelAno = false;

  cargandoVerAprobacion = false;
  cargandoVerPazSalvo = false;
  documento: any = {};

  documentosExistentes = [
    { nombre: '', disponible: false, tipo: 'cuentaCobro', indice: 1, nombreOriginal: '' },
    { nombre: '', disponible: false, tipo: 'seguridadSocial', indice: 2, nombreOriginal: '' },
    { nombre: '', disponible: false, tipo: 'informeActividades', indice: 3, nombreOriginal: '' }
  ];

  supervisorInfo: any = {
    supervisorAsignado: 'No asignado',
    fechaAsignacion: '',
    supervisorRevisor: 'No asignado',
    fechaRevision: '',
    esUltimoRadicado: false,
    tieneArchivoAprobacion: false,
    tienePazSalvo: false,
    nombreArchivoAprobacion: null,
    nombrePazSalvo: null,
    supervisorAsignadoNombre: '',
    supervisorRevisorNombre: '',
    observacionSupervisor: ''
  };

  historialEstados: any[] = [];
  cargandoVer: { [key: string]: boolean } = {};

  private destroy$ = new Subject<void>();

  // Estados que fuerzan SOLO LECTURA
  private readonly estadosSoloLecturaForzado = [
    'APROBADO', 'APROBADO_SUPERVISOR', 'APROBADO_AUDITOR',
    'RECHAZADO', 'RECHAZADO_SUPERVISOR', 'RECHAZADO_AUDITOR',
    'GLOSADO', 'PROCESADO', 'COMPLETADO', 'COMPLETADO_AUDITOR',
    'PAGADO', 'FINALIZADO'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private supervisorService: SupervisorService,
    private auditorService: AuditorService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private estadisticasService: SupervisorEstadisticasService,
    private rendicionService?: RendicionCuentasService 
  ) { }

 ngOnInit(): void {
    console.log('🚀 SupervisorForm: Inicializando componente...');

    this.initializeForm();

    // ✅ Obtener ID con manejo de null
    let idParaCargar: string | null = this.documentoId;
    if (!idParaCargar) {
      idParaCargar = this.route.snapshot.paramMap.get('id');
    }
    
    if (!idParaCargar) {
      console.error('[SupervisorForm] No se encontró ID del documento');
      this.notificationService.error('Error crítico', 'No se pudo identificar el documento');
      this.isLoading = false;
      return;
    }
    
    // Verificar si es rendiciónId
    if (this.router.url.includes('/rendicion-cuentas/')) {
      this.cargarViaRendicion(idParaCargar);
    } else {
      this.cargarDocumentoCompleto(idParaCargar);
    }

    // ✅ Asignar documentoId correctamente
    this.documentoId = idParaCargar;
    
    // Verificar si es rendiciónId
    if (this.router.url.includes('/rendicion-cuentas/')) {
      this.cargarViaRendicion(idParaCargar);
    } else {
      this.cargarDocumentoCompleto(idParaCargar);
    }

    this.initializeForm();

    const url = this.router.url;
    const esRutaSupervisor = url.includes('/supervisor/');
    const esRutaAuditor = url.includes('/auditor/') && !esRutaSupervisor;
    this.esModoAuditor = esRutaAuditor;

    console.log('🔍 Detectando contexto:', {
      url,
      esRutaSupervisor,
      esRutaAuditor,
      esModoAuditor: this.esModoAuditor,
      inputDocumentoId: this.documentoId || 'NO RECIBIDO AÚN',
      modoInput: this.modo,
      soloLecturaInput: this.soloLectura
    });

    // OBTENER EL ID REAL DE LA RUTA
    const idFromRoute = this.route.snapshot.paramMap.get('id');
    
    if (idFromRoute) {
      this.documentoId = idFromRoute;
      console.log('✅ ID REAL asignado a documentoId:', this.documentoId);
    } else if (!this.documentoId) {
      console.error('[SupervisorForm] No se encontró ID en la ruta');
      this.notificationService.error('Error crítico', 'No se pudo identificar el documento');
      this.isLoading = false;
      return;
    }

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      console.log('📌 QueryParams recibidos en formulario:', params);

      this.desdeHistorial = params['desdeHistorial'] === 'true';

      // Guardar parámetros de URL temporalmente
      const urlModoEdicion = params['modo'] === 'edicion' || params['soloLectura'] === 'false';
      const urlSoloLectura = params['modo'] === 'consulta' || params['soloLectura'] === 'true';

      // NO aplicar todavía - esperar a tener el estado del documento
      if (urlModoEdicion) {
        console.log('📌 URL indica EDICIÓN (se aplicará si el documento lo permite)');
      }
      if (urlSoloLectura) {
        console.log('📌 URL indica SOLO LECTURA (se aplicará si el documento lo permite)');
      }

      this.determinarModoDesdeParams(params, this.router.url);
    });

    this.cargarDocumentoCompleto(this.documentoId);

    this.revisionForm.get('estadoRevision')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(estado => this.onEstadoChange(estado));

    this.revisionForm.get('esUltimoRadicado')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(esUltimo => {
        this.onUltimoRadicadoChange(esUltimo);
        setTimeout(() => this.verificarConsistenciaDatos(), 100);
      });

    setTimeout(() => {
      console.log('[SupervisorForm DEBUG] Después de 1s → documentoId:', this.documentoId);
    }, 1000);
  }

   private cargarViaRendicion(id: string): void {
    this.rendicionService?.obtenerDetalleRendicion(id).subscribe({
      next: (data) => {
        const documentoIdReal = data.documento?.id || data.documentoId;
        if (documentoIdReal) {
          this.cargarDocumentoCompleto(documentoIdReal);
        }
      },
      error: () => this.cargarDocumentoCompleto(id)
    });
  }


  private initializeForm(): void {
    this.revisionForm = this.fb.group({
      numeroRadicado: [{ value: '', disabled: true }, Validators.required],
      numeroContrato: [{ value: '', disabled: true }, Validators.required],
      nombreContratista: [{ value: '', disabled: true }, Validators.required],
      documentoContratista: [{ value: '', disabled: true }, Validators.required],
      fechaInicio: [{ value: '', disabled: true }, Validators.required],
      fechaFin: [{ value: '', disabled: true }, Validators.required],
      observacionOriginal: [{ value: '', disabled: true }],
      radicadorNombre: [{ value: '', disabled: true }],
      radicadorUsuario: [{ value: '', disabled: true }],
      fechaRadicacion: [{ value: '', disabled: true }],
      supervisorAsignado: [{ value: '', disabled: true }],
      fechaAsignacion: [{ value: '', disabled: true }],
      esUltimoRadicado: [{ value: false, disabled: false }],
      estadoRevision: [{ value: '', disabled: false }, Validators.required],
      observacionSupervisor: [{ value: '', disabled: false }, [Validators.required, Validators.minLength(10)]],
      correcciones: [{ value: '', disabled: false }],
      fechaRevision: [{ value: this.getCurrentDate(), disabled: true }],
      supervisorRevisor: [{ value: this.getCurrentUser(), disabled: true }]
    });
  }

  cargarDocumentoCompleto(id: string): void {
    this.isLoading = true;

    const url = this.router.url;
    const esRutaSupervisor = url.includes('/supervisor/');

    console.log('📥 Iniciando carga completa del documento con ID:', id, {
      modoEdicion: this.modoEdicion,
      soloLectura: this.soloLectura,
      desdeHistorial: this.desdeHistorial,
      esModoAuditor: this.esModoAuditor,
      esRutaSupervisor,
      modoInput: this.modo
    });

    let servicioObservable: Observable<any>;

    if (this.esModoAuditor && !esRutaSupervisor) {
      console.log('→ Usando servicio AUDITOR para vista');
      servicioObservable = this.auditorService.obtenerDocumentoParaVista(id);
    } else {
      console.log('→ Usando servicio SUPERVISOR normal');
      servicioObservable = this.supervisorService.obtenerDocumentoPorId(id);
    }

    servicioObservable
      .pipe(
        map((response: any) => {
          console.log('📊 Respuesta cruda del servicio:', response);
          const documentoData = response?.data?.documento ||
            response?.documento ||
            response?.data ||
            response;
          return documentoData;
        }),
        catchError(error => {
          console.error('❌ Error cargando documento:', error);
          this.notificationService.error('Error', 'No se pudo cargar la información del documento');
          this.isLoading = false;
          return of(null);
        })
      )
      .subscribe({
        next: (documentoData: any) => {
          if (!documentoData) {
            this.isLoading = false;
            return;
          }

          this.radicadoData = documentoData;

          console.log('🔍 Datos del documento recibidos:', {
            estado: documentoData.estado,
            supervisorAsignado: documentoData.supervisorAsignado,
            asignacion: documentoData.asignacion
          });

          if (this.esModoAuditor) {
            this.cargarDatosAuditorEspecificos(documentoData);
          }

          // Determinar modo basado en el ESTADO DEL DOCUMENTO (prioridad sobre URL)
          this.determinarModoPorEstadoDocumento(documentoData);

          this.poblarFormulario(documentoData);
          this.cargarDocumentosExistentes(documentoData);
          this.cargarArchivosSupervisorDesdeBackend(id, documentoData);

          this.isLoading = false;
          this.configurarFormularioSegunModo();

          console.log('✅ Carga completa finalizada. Modo actual:', {
            soloLectura: this.soloLectura,
            modoEdicion: this.modoEdicion,
            esModoAuditor: this.esModoAuditor
          });

          this.mostrarNotificacionModo();
        },
        error: (err) => {
          console.error('[SupervisorForm] Falló carga completa con ID:', id, err);
          this.isLoading = false;
        }
      });
  }

  /**
   * ✅ Determinar modo basado en el ESTADO del documento (prioridad sobre URL)
   */
  private determinarModoPorEstadoDocumento(documentoData: any): void {
    const estadoDocumento = (documentoData.estado || '').toUpperCase().trim();
    
    console.log('🔍 [determinarModoPorEstadoDocumento] Estado del documento:', estadoDocumento);
    
    // Verificar si el estado fuerza solo lectura
    const esEstadoFinal = this.estadosSoloLecturaForzado.some(e => estadoDocumento.includes(e));
    
    if (esEstadoFinal) {
      // FORZAR solo lectura independientemente de la URL
      this.soloLectura = true;
      this.modoEdicion = false;
      console.log('🔒 FORZADO SOLO LECTURA - Estado final del documento:', estadoDocumento);
      return;
    }
    
    // Si el documento está en estado editable, permitir edición
    const estadosEditables = ['RADICADO', 'EN_REVISION', 'EN_REVISION_SUPERVISOR', 'PENDIENTE', 'PENDIENTE_CORRECCIONES', 'OBSERVADO'];
    const esEstadoEditable = estadosEditables.some(e => estadoDocumento.includes(e));
    
    if (esEstadoEditable) {
      // Verificar si el supervisor actual es el asignado
      const usuarioActual = this.getCurrentUser().trim();
      let supervisorAsignado = documentoData.supervisorAsignado || documentoData.asignacion?.supervisorActual || '';
      supervisorAsignado = supervisorAsignado.trim();
      
      const soyElSupervisor = this.compararNombres(supervisorAsignado, usuarioActual) ||
        usuarioActual.includes('Administrador') ||
        !supervisorAsignado ||
        supervisorAsignado === 'Sin asignar';
      
      if (soyElSupervisor) {
        // Permitir edición SOLO si el supervisor actual es el asignado
        this.soloLectura = false;
        this.modoEdicion = true;
        console.log('✏️ MODO EDICIÓN - Documento editable y soy el supervisor asignado');
        return;
      } else {
        this.soloLectura = true;
        this.modoEdicion = false;
        console.log('🔒 SOLO LECTURA - Documento editable pero NO soy el supervisor asignado');
        return;
      }
    }
    
    // Por defecto, solo lectura
    this.soloLectura = true;
    this.modoEdicion = false;
    console.log('⚠️ Por defecto: SOLO LECTURA');
  }

  private determinarModoDesdeParams(params: any, url: string): void {
    console.log('🔍 Determinando modo desde parámetros (referencia):', params);
    // Este método ya no modifica soloLectura directamente
    // Solo guarda información para referencia
  }

  private cargarDatosAuditorEspecificos(documentoData: any): void {
    console.log('🔍 Cargando datos específicos de auditor:', documentoData);
    this.primerRadicadoDelAno = documentoData.primerRadicadoDelAno || false;

    if (this.primerRadicadoDelAno && documentoData.archivosAuditor) {
      this.archivosAuditor = documentoData.archivosAuditor.map((archivo: any) => ({
        tipo: archivo.tipo,
        descripcion: archivo.descripcion,
        subido: archivo.subido || false,
        nombreArchivo: archivo.nombreArchivo || ''
      }));
      console.log('📁 Archivos de auditor cargados:', this.archivosAuditor);
    }
  }

  private compararNombres(nombre1: string, nombre2: string): boolean {
    if (!nombre1 || !nombre2) return false;

    const normalizar = (nombre: string) => {
      return nombre.toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[áä]/g, 'a').replace(/[éë]/g, 'e').replace(/[íï]/g, 'i')
        .replace(/[óö]/g, 'o').replace(/[úü]/g, 'u');
    };

    const nombre1Normalizado = normalizar(nombre1);
    const nombre2Normalizado = normalizar(nombre2);

    return nombre1Normalizado === nombre2Normalizado ||
      nombre1Normalizado.includes(nombre2Normalizado) ||
      nombre2Normalizado.includes(nombre1Normalizado);
  }

  private mostrarNotificacionModo(): void {
    setTimeout(() => {
      if (this.esModoAuditor) {
        this.notificationService.info('Modo Auditoría', 'Está visualizando el documento en modo auditoría.');
      } else if (this.soloLectura) {
        this.notificationService.info('Modo consulta', 'Está visualizando en modo solo lectura.');
      } else {
        this.notificationService.info('Modo edición', 'Puede realizar cambios en la revisión.');
      }
    }, 500);
  }

  private cargarArchivosSupervisorDesdeBackend(documentoId: string, documentoData: any): void {
    console.log('🔍 Buscando archivos del supervisor para documento:', documentoId);
    this.cargarArchivosDesdeDocumento(documentoData);

    this.estadisticasService.obtenerHistorial()
      .pipe(
        map((historialResponse: any) => {
          let historialArray = [];
          if (historialResponse?.data && Array.isArray(historialResponse.data)) {
            historialArray = historialResponse.data;
          } else if (Array.isArray(historialResponse)) {
            historialArray = historialResponse;
          }
          return historialArray.find((item: any) => {
            return item.documentoId === documentoId ||
              item.id === documentoId ||
              (item.documento && item.documento.id === documentoId);
          });
        }),
        catchError(error => {
          console.warn('⚠️ Error obteniendo historial:', error);
          return of(null);
        })
      )
      .subscribe({
        next: (registroSupervisor: any) => {
          if (registroSupervisor) {
            console.log('✅ Archivos del supervisor encontrados en historial:', registroSupervisor);
            if (registroSupervisor.nombreArchivoSupervisor) {
              this.nombreArchivoAprobacionExistente = registroSupervisor.nombreArchivoSupervisor;
              this.fechaArchivoAprobacionExistente = registroSupervisor.fechaAprobacion ? new Date(registroSupervisor.fechaAprobacion) : null;
            }
            if (registroSupervisor.pazSalvo) {
              this.nombrePazSalvoExistente = registroSupervisor.pazSalvo;
              this.fechaPazSalvoExistente = registroSupervisor.fechaActualizacion ? new Date(registroSupervisor.fechaActualizacion) : null;
            }
            if (registroSupervisor.observacion && !this.revisionForm.get('observacionSupervisor')?.value) {
              this.revisionForm.patchValue({ observacionSupervisor: registroSupervisor.observacion });
            }
            if (registroSupervisor.correcciones && !this.revisionForm.get('correcciones')?.value) {
              this.revisionForm.patchValue({ correcciones: registroSupervisor.correcciones });
            }
            this.cdr.detectChanges();
          }
        }
      });
  }

  private cargarArchivosDesdeDocumento(documento: any): void {
    console.log('🔍 Buscando archivos en datos del documento:', documento);
    const docData = documento.documento || documento;

    const historial = docData.historialEstados || [];
    const estadoAprobado = historial.find((h: any) => h.estado === 'APROBADO' || h.estado === 'APROBADO_SUPERVISOR');

    if (estadoAprobado) {
      this.revisionForm.patchValue({ observacionSupervisor: estadoAprobado.observacion || '' });
    }

    if (docData.nombreArchivoSupervisor) {
      this.nombreArchivoAprobacionExistente = docData.nombreArchivoSupervisor;
      this.fechaArchivoAprobacionExistente = docData.fechaAprobacion ? new Date(docData.fechaAprobacion) : null;
      this.mostrarCampoArchivo = true;
    }

    if (docData.pazSalvo) {
      this.nombrePazSalvoExistente = docData.pazSalvo;
      this.fechaPazSalvoExistente = docData.fechaActualizacion ? new Date(docData.fechaActualizacion) : null;
    }

    if (docData.esUltimoRadicado !== undefined) {
      this.revisionForm.patchValue({ esUltimoRadicado: docData.esUltimoRadicado });
    }
  }

  private poblarFormulario(documento: any): void {
    console.log('📝 Poblando formulario con datos:', documento);

    const docData = documento.documento || documento;
    const supervisorActual = this.getCurrentUser();

    this.revisionForm.patchValue({
      numeroRadicado: docData.numeroRadicado || '',
      numeroContrato: docData.numeroContrato || '',
      nombreContratista: docData.nombreContratista || '',
      documentoContratista: docData.documentoContratista || '',
      fechaInicio: this.formatDateForInput(docData.fechaInicio),
      fechaFin: this.formatDateForInput(docData.fechaFin),
      observacionOriginal: docData.observacion || '',
      radicadorNombre: docData.radicador || docData.nombreRadicador || 'N/A',
      radicadorUsuario: docData.radicadorUsuario || docData.usuarioRadicador || 'N/A',
      fechaRadicacion: this.formatDateForInput(docData.fechaRadicacion || docData.createdAt),
      supervisorAsignado: docData.supervisorAsignado || docData.asignacion?.supervisorActual || supervisorActual,
      fechaAsignacion: this.formatDateForInput(docData.fechaAsignacion || new Date()),
      supervisorRevisor: supervisorActual,
      fechaRevision: this.getCurrentDate(),
      estadoRevision: docData.estado || ''
    });

    if (docData.historialEstados && Array.isArray(docData.historialEstados)) {
      this.historialEstados = docData.historialEstados;
      console.log(`📋 Historial de estados guardado: ${this.historialEstados.length} registros`);
    }
  }

  private cargarDocumentosExistentes(documento: any): void {
    const docData = documento.documento || documento;
    console.log('📁 Datos para cargar documentos:', docData);

    this.documentosExistentes[0] = {
      nombre: docData.cuentaCobro || '',
      nombreOriginal: docData.descripcionCuentaCobro || 'cuenta_cobro.pdf',
      disponible: !!docData.cuentaCobro,
      tipo: 'cuentaCobro',
      indice: 1
    };

    this.documentosExistentes[1] = {
      nombre: docData.seguridadSocial || '',
      nombreOriginal: docData.descripcionSeguridadSocial || 'seguridad_social.pdf',
      disponible: !!docData.seguridadSocial,
      tipo: 'seguridadSocial',
      indice: 2
    };

    this.documentosExistentes[2] = {
      nombre: docData.informeActividades || '',
      nombreOriginal: docData.descripcionInformeActividades || 'informe_actividades.pdf',
      disponible: !!docData.informeActividades,
      tipo: 'informeActividades',
      indice: 3
    };

    console.log('📁 Documentos existentes cargados:', this.documentosExistentes);
  }

  private configurarFormularioSegunModo(): void {
    // Obtener el estado actual del documento
    const estadoActual = this.revisionForm.get('estadoRevision')?.value;
    
    console.log('[configurarFormularioSegunModo] soloLectura =', this.soloLectura);
    console.log('[configurarFormularioSegunModo] estadoDocumento =', estadoActual);

    // 🔒 BLOQUEO TOTAL - Si soloLectura es true
    if (this.soloLectura === true) {
      console.log('🔒 BLOQUEANDO FORMULARIO COMPLETO - Modo solo lectura');
      this.revisionForm.disable();
      this.mostrarCampoArchivo = false;
      this.archivoAprobacion = null;
      this.archivoPazSalvo = null;
      this.cdr.detectChanges();
      return;
    }

    // ✏️ MODO EDICIÓN
    console.log('✏️ MODO EDICIÓN - Habilitando campos editables');
    
    // Habilitar SOLO los campos editables
    this.revisionForm.get('estadoRevision')?.enable();
    this.revisionForm.get('observacionSupervisor')?.enable();
    this.revisionForm.get('correcciones')?.enable();
    this.revisionForm.get('esUltimoRadicado')?.enable();
    
    // Asegurar que los campos de solo lectura permanezcan deshabilitados
    this.revisionForm.get('numeroRadicado')?.disable();
    this.revisionForm.get('numeroContrato')?.disable();
    this.revisionForm.get('nombreContratista')?.disable();
    this.revisionForm.get('documentoContratista')?.disable();
    this.revisionForm.get('fechaInicio')?.disable();
    this.revisionForm.get('fechaFin')?.disable();
    this.revisionForm.get('observacionOriginal')?.disable();
    this.revisionForm.get('radicadorNombre')?.disable();
    this.revisionForm.get('radicadorUsuario')?.disable();
    this.revisionForm.get('fechaRadicacion')?.disable();
    this.revisionForm.get('supervisorAsignado')?.disable();
    this.revisionForm.get('fechaAsignacion')?.disable();
    this.revisionForm.get('fechaRevision')?.disable();
    this.revisionForm.get('supervisorRevisor')?.disable();

    // Mostrar campo de archivo solo si el estado es APROBADO
    this.mostrarCampoArchivo = estadoActual === 'APROBADO';

    this.cdr.detectChanges();
    
    console.log('[configurarFormularioSegunModo] estadoRevision enabled?', this.revisionForm.get('estadoRevision')?.enabled);
  }

  guardarRevision(): void {
    const idParaGuardar = this.documentoId;

    if (!idParaGuardar) {
      console.error('[SupervisorForm] ¡Intento de guardar sin ID!');
      this.notificationService.error('Error crítico', 'ID del documento no disponible');
      return;
    }

    if (this.soloLectura || this.esModoAuditor) {
      this.notificationService.warning('Acción bloqueada', 'No puedes guardar en modo consulta o auditoría.');
      return;
    }

    if (this.revisionForm.invalid) {
      this.notificationService.warning('Formulario incompleto', 'Completa los campos requeridos');
      this.revisionForm.markAllAsTouched();
      return;
    }

    const estadoSeleccionado = this.revisionForm.get('estadoRevision')?.value;
    const esUltimo = this.revisionForm.get('esUltimoRadicado')?.value;

    let estadoBackend = estadoSeleccionado;

    if (estadoSeleccionado === 'PENDIENTE_CORRECCIONES') {
      estadoBackend = 'OBSERVADO';
    }

    if (estadoBackend === 'APROBADO') {
      if (!this.archivoAprobacion && !this.tieneAprobacionExistente()) {
        this.notificationService.error('Error', 'Debe adjuntar documento de aprobación');
        return;
      }
      if (esUltimo && !this.archivoPazSalvo && !this.tienePazSalvoExistente()) {
        this.notificationService.error('Error', 'Debe adjuntar paz y salvo para último radicado');
        return;
      }
    }

    if (!confirm('¿Guardar revisión? Esto cambiará el estado del documento.')) return;

    this.isProcessing = true;
    const valores = this.revisionForm.getRawValue();

    const payload = {
      estado: estadoBackend,
      observacion: valores.observacionSupervisor || '',
      correcciones: valores.correcciones || '',
      requierePazSalvo: esUltimo,
      esUltimoRadicado: Boolean(esUltimo)
    };

    console.log('[SupervisorForm] Enviando payload:', { id: idParaGuardar, payload });

    let request: Observable<any>;

    if (estadoBackend === 'APROBADO' && (this.archivoAprobacion || this.archivoPazSalvo)) {
      request = this.supervisorService.guardarRevisionConArchivo(
        idParaGuardar,
        payload,
        this.archivoAprobacion,
        esUltimo ? this.archivoPazSalvo : null
      );
    } else {
      request = this.supervisorService.guardarRevision(idParaGuardar, payload);
    }

    request.subscribe({
      next: (response) => {
        console.log('[SupervisorForm] Revisión guardada OK:', response);
        this.notificationService.success('Éxito', 'Revisión guardada correctamente');
        this.isProcessing = false;
        setTimeout(() => this.volverALista(), 1500);
      },
      error: (err) => {
        console.error('[SupervisorForm] Error al guardar:', err);
        let msg = 'No se pudo guardar la revisión';
        if (err.error?.message) {
          msg = err.error.message;
        } else if (err.message) {
          msg = err.message;
        }
        this.notificationService.error('Error', msg);
        this.isProcessing = false;
      }
    });
  }

  // ==================== MÉTODOS AUXILIARES ====================

  getNombreArchivoParaMostrar(nombreArchivo: string | null): string {
    if (!nombreArchivo) return 'Archivo sin nombre';
    const parts = nombreArchivo.split(/[\\/]/);
    const nombreLimpio = parts[parts.length - 1] || nombreArchivo;
    if (nombreLimpio.length > 50) {
      return nombreLimpio.substring(0, 47) + '...';
    }
    return nombreLimpio;
  }

  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getCurrentUser(): string {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.fullName || user.username || user.email || 'Supervisor';
      } catch (error) {
        console.error('Error parseando usuario:', error);
      }
    }
    return 'Supervisor';
  }

  formatDateForInput(date: string | Date): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  onEstadoChange(estado: string): void {
    console.log('🔄 Cambio de estado:', estado);
    this.mostrarCampoArchivo = estado === 'APROBADO';
    if (estado !== 'APROBADO') {
      this.archivoAprobacion = null;
      if (!this.nombrePazSalvoExistente) {
        this.archivoPazSalvo = null;
      }
    }
  }

  onUltimoRadicadoChange(esUltimo: boolean): void {
    console.log('🔄 Cambio en checkbox esUltimoRadicado:', esUltimo);
    if (esUltimo && !this.soloLectura && !this.archivoPazSalvo && !this.tienePazSalvoExistente()) {
      setTimeout(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
        input.style.display = 'none';
        input.onchange = (event: any) => {
          const file = event.target.files[0];
          if (file) {
            this.validarYAsignarArchivoPazSalvo(file);
          }
          document.body.removeChild(input);
        };
        document.body.appendChild(input);
        input.click();
      }, 100);
    }
  }

  validarYAsignarArchivoPazSalvo(file: File): void {
    if (file.size > this.maxFileSize) {
      this.notificationService.error('Error', 'El archivo excede el tamaño máximo de 10MB');
      return;
    }
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.notificationService.error('Error', 'Tipo de archivo no permitido. Use PDF, DOC, DOCX, JPG o PNG');
      return;
    }
    this.archivoPazSalvo = file;
    this.notificationService.success('Archivo cargado', `Paz y salvo "${file.name}" cargado correctamente`);
  }

  puedeGuardar(): boolean {
    if (this.soloLectura) return false;
    const estado = this.revisionForm.get('estadoRevision')?.value;
    const esUltimoRadicado = this.revisionForm.get('esUltimoRadicado')?.value;
    if (estado === 'APROBADO') {
      if (esUltimoRadicado && !this.archivoPazSalvo && !this.tienePazSalvoExistente()) return false;
      if (!this.archivoAprobacion && !this.tieneAprobacionExistente()) return false;
    }
    return this.revisionForm.valid;
  }

  tienePazSalvoExistente(): boolean {
    return !!this.nombrePazSalvoExistente || !!this.supervisorInfo?.nombrePazSalvo || this.supervisorInfo?.tienePazSalvo === true;
  }

  tieneAprobacionExistente(): boolean {
    return !!this.nombreArchivoAprobacionExistente || !!this.supervisorInfo.nombreArchivoAprobacion;
  }

  private verificarConsistenciaDatos(): void {
    const tieneArchivoPazSalvo = this.tienePazSalvoExistente();
    const esUltimoRadicado = this.revisionForm.get('esUltimoRadicado')?.value;

    if (tieneArchivoPazSalvo && !esUltimoRadicado) {
      console.warn('⚠️ INCONSISTENCIA: Existe archivo de paz y salvo pero no está marcado como último radicado');
      if (!this.soloLectura) {
        this.revisionForm.patchValue({ esUltimoRadicado: true });
        this.notificationService.info('Corrección automática', 'Se detectó un archivo de paz y salvo. El documento ha sido automáticamente marcado como último radicado.');
      }
    }

    if (esUltimoRadicado && !tieneArchivoPazSalvo && !this.soloLectura) {
      console.warn('⚠️ ADVERTENCIA: Marcado como último radicado pero sin archivo de paz y salvo');
      this.notificationService.warning('Atención', 'Al marcar como último radicado, debe adjuntar el archivo de paz y salvo.');
    }
  }

  onArchivoAprobacionSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > this.maxFileSize) {
        this.notificationService.error('Error', 'El archivo excede el tamaño máximo de 10MB');
        return;
      }
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.notificationService.error('Error', 'Tipo de archivo no permitido. Use PDF, DOC, DOCX, JPG o PNG');
        return;
      }
      this.archivoAprobacion = file;
      this.notificationService.success('Archivo cargado', `Archivo de aprobación "${file.name}" cargado correctamente`);
    }
  }

  onArchivoPazSalvoSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > this.maxFileSize) {
        this.notificationService.error('Error', 'El archivo excede el tamaño máximo de 10MB');
        return;
      }
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.notificationService.error('Error', 'Tipo de archivo no permitido. Use PDF, DOC, DOCX, JPG o PNG');
        return;
      }
      this.archivoPazSalvo = file;
      this.notificationService.success('Archivo cargado', `Paz y salvo "${file.name}" cargado correctamente`);
    }
  }

  volverALista(): void {
    if (this.esModoAuditor) {
      this.router.navigate(['/auditor/lista']);
    } else if (this.desdeHistorial) {
      this.router.navigate(['/supervisor/historial']);
    } else {
      this.router.navigate(['/supervisor/pendientes']);
    }
  }

  cancelarRevision(): void {
    if (confirm('¿Cancelar la revisión? Los cambios no guardados se perderán.')) {
      this.volverALista();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

previsualizarArchivosSupervisor(tipo: 'aprobacion' | 'pazsalvo'): void {
    let nombreArchivo = '';
    
    if (tipo === 'aprobacion') {
        nombreArchivo = this.nombreArchivoAprobacionExistente || this.supervisorInfo?.nombreArchivoAprobacion || '';
        if (!nombreArchivo) {
            this.notificationService.warning('Sin archivo', 'No hay archivo de aprobación para previsualizar');
            return;
        }
    } else {
        nombreArchivo = this.nombrePazSalvoExistente || this.supervisorInfo?.nombrePazSalvo || '';
        if (!nombreArchivo) {
            this.notificationService.warning('Sin archivo', 'No hay archivo de paz y salvo para previsualizar');
            return;
        }
    }
    
    // ✅ Usar el método genérico que ya acepta el tipo
    const url = this.supervisorService.getUrlArchivoSupervisor(nombreArchivo, tipo);
    
    if (url && url !== '#') {
        window.open(url, '_blank');
    } else {
        this.notificationService.error('Error', 'No se pudo generar la URL del archivo');
    }
}

// Eliminar el método previsualizarPazSalvo o dejarlo como está
previsualizarPazSalvo(): void {
    const nombreArchivo = this.nombrePazSalvoExistente || this.supervisorInfo?.nombrePazSalvo || '';
    if (!nombreArchivo) {
        this.notificationService.warning('Sin archivo', 'No hay archivo de paz y salvo para previsualizar');
        return;
    }
    
    // ✅ Usar el método genérico con tipo 'pazsalvo'
    const url = this.supervisorService.getUrlArchivoSupervisor(nombreArchivo, 'pazsalvo');
    
    if (url && url !== '#') {
        window.open(url, '_blank');
    } else {
        this.notificationService.error('Error', 'No se pudo generar la URL del archivo');
    }
}

// Método separado para paz y salvo si es necesario


descargarArchivosSupervisor(tipo: 'aprobacion' | 'pazsalvo'): void {
    let nombreArchivo = '';
    let tipoArchivo: 'aprobacion' | 'pazsalvo' = tipo;
    
    if (tipo === 'aprobacion') {
        nombreArchivo = this.nombreArchivoAprobacionExistente || this.supervisorInfo?.nombreArchivoAprobacion || '';
        if (!nombreArchivo) {
            this.notificationService.warning('Sin archivo', 'No hay archivo de aprobación para descargar');
            return;
        }
    } else {
        nombreArchivo = this.nombrePazSalvoExistente || this.supervisorInfo?.nombrePazSalvo || '';
        if (!nombreArchivo) {
            this.notificationService.warning('Sin archivo', 'No hay archivo de paz y salvo para descargar');
            return;
        }
    }
    
    this.isProcessing = true;
    
    let servicioObservable: Observable<Blob>;
    if (tipo === 'aprobacion') {
        servicioObservable = this.supervisorService.descargarArchivoAprobacion(nombreArchivo);
    } else {
        servicioObservable = this.supervisorService.descargarPazSalvo(nombreArchivo);
    }
    
    servicioObservable.subscribe({
        next: (blob: Blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            this.notificationService.success('Descarga completada', 'Archivo descargado correctamente');
            this.isProcessing = false;
        },
        error: (error) => {
            console.error('Error descargando:', error);
            this.notificationService.error('Error', 'No se pudo descargar el archivo');
            this.isProcessing = false;
        }
    });
}

  verDocumento(index: number): void {
    if (!this.documentosExistentes[index]?.disponible) {
      this.notificationService.warning('Documento no disponible', 'El documento no está disponible');
      return;
    }
    let servicioObservable: Observable<Blob>;
    if (this.esModoAuditor) {
      servicioObservable = this.auditorService.descargarArchivoRadicado(this.documentoId, this.documentosExistentes[index].indice);
    } else {
      servicioObservable = this.supervisorService.descargarArchivo(this.documentoId, this.documentosExistentes[index].indice);
    }
    servicioObservable.subscribe({
      next: (blob: Blob) => {
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, '_blank');
        setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
      },
      error: (error) => {
        console.error('Error al previsualizar:', error);
        this.notificationService.error('Error', 'No se pudo abrir el documento');
      }
    });
  }

  getNombreArchivo(index: number): string {
    const archivo = this.documentosExistentes[index];
    if (!archivo?.disponible) return 'No disponible';
    if (archivo.nombreOriginal && archivo.nombreOriginal.trim() !== '') {
      const parts = archivo.nombreOriginal.split(/[\\/]/);
      return parts[parts.length - 1] || archivo.nombreOriginal;
    }
    if (archivo.nombre && archivo.nombre.trim() !== '') {
      const parts = archivo.nombre.split(/[\\/]/);
      return parts[parts.length - 1] || archivo.nombre;
    }
    const nombresPorDefecto: { [key: string]: string } = {
      'cuentaCobro': 'Cuenta de Cobro.pdf',
      'seguridadSocial': 'Seguridad Social.pdf',
      'informeActividades': 'Informe de Actividades.pdf'
    };
    return nombresPorDefecto[archivo.tipo] || `Documento ${index + 1}.pdf`;
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'badge bg-light text-dark';
    const estadoUpper = estado.toUpperCase();
    switch (estadoUpper) {
      case 'APROBADO': case 'APROBADO_SUPERVISOR': return 'badge bg-success';
      case 'OBSERVADO': case 'OBSERVADO_SUPERVISOR': return 'badge bg-warning text-dark';
      case 'RECHAZADO': case 'RECHAZADO_SUPERVISOR': return 'badge bg-danger';
      case 'PENDIENTE': return 'badge bg-secondary';
      case 'EN_REVISION_SUPERVISOR': case 'EN_REVISION': return 'badge bg-info';
      case 'RADICADO': return 'badge bg-primary';
      case 'EN_REVISION_AUDITOR': return 'badge bg-info';
      case 'APROBADO_AUDITOR': return 'badge bg-success';
      case 'RECHAZADO_AUDITOR': return 'badge bg-danger';
      case 'OBSERVADO_AUDITOR': return 'badge bg-warning';
      default: return 'badge bg-light text-dark';
    }
  }
}