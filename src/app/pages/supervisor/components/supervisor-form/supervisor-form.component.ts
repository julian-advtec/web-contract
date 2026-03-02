import { Component, OnInit, ChangeDetectorRef, OnDestroy, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable, of, Subject } from 'rxjs';
import { map, catchError, takeUntil } from 'rxjs/operators';
import { EventEmitter } from '@angular/core';

import { SupervisorService } from '../../../../core/services/supervisor/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorService } from '../../../../core/services/auditor.service'; // ← AÑADIR
import { SupervisorEstadisticasService } from '../../../../core/services/supervisor';

@Component({
  selector: 'app-supervisor-form',
  templateUrl: './supervisor-form.component.html',
  styleUrls: ['./supervisor-form.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class SupervisorFormComponent implements OnInit, OnDestroy {

  @Input() documentoId!: string;           // Recibe el ID desde afuera
  @Input() modo: 'supervisor' | 'auditoria' | 'contabilidad' = 'supervisor';
  @Input() soloLectura: boolean = false;

  // ← Output opcional para que el hijo avise al padre (ej: botón volver)
  @Output() volver = new EventEmitter<void>();
  // Variables principales

  radicadoData: any = null;
  isLoading = false;
  isProcessing = false;
  isDownloadingAll = false;

  // Modos de trabajo - INICIALIZAR CON VALORES POR DEFECTO
  modoEdicion = false;
  desdeHistorial = false;


  // ✅ NUEVA VARIABLE PARA MODO AUDITOR
  esModoAuditor = false;

  // Formulario
  revisionForm!: FormGroup;

  // Archivos del supervisor
  maxFileSize = 10 * 1024 * 1024;
  mostrarCampoArchivo = false;
  archivoAprobacion: File | null = null;
  archivoPazSalvo: File | null = null;

  // Archivos existentes
  nombreArchivoAprobacionExistente: string = '';
  fechaArchivoAprobacionExistente: Date | null = null;
  nombrePazSalvoExistente: string = '';
  fechaPazSalvoExistente: Date | null = null;

  // ✅ NUEVOS ARCHIVOS DE AUDITOR (primer radicado del año)
  archivosAuditor: any[] = [];
  primerRadicadoDelAno = false;

  cargandoVerAprobacion = false;
  cargandoVerPazSalvo = false;

  documento: any = {};



  // Documentos radicados
  documentosExistentes = [
    { nombre: '', disponible: false, tipo: 'cuentaCobro', indice: 1, nombreOriginal: '' },
    { nombre: '', disponible: false, tipo: 'seguridadSocial', indice: 2, nombreOriginal: '' },
    { nombre: '', disponible: false, tipo: 'informeActividades', indice: 3, nombreOriginal: '' }
  ];

  // Información del supervisor
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

  // Historial
  historialEstados: any[] = [];

  cargandoVer: { [key: string]: boolean } = {};

  private destroy$ = new Subject<void>();

  private _documentoIdSeguro: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private supervisorService: SupervisorService,
    private auditorService: AuditorService, // ← AÑADIR
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private estadisticasService: SupervisorEstadisticasService
  ) { }

  ngOnInit(): void {
    console.log('🚀 SupervisorForm: Inicializando componente...');

    this.initializeForm();

    // Detectar modo auditor
    this.esModoAuditor = this.router.url.includes('/auditor/');
    console.log('🔍 Detectando contexto:', {
      url: this.router.url,
      esModoAuditor: this.esModoAuditor,
      inputDocumentoId: this.documentoId || 'NO RECIBIDO AÚN',
      modoInput: this.modo,
      soloLecturaInput: this.soloLectura
    });

    // ───────────────────────────────────────────────────────────────
    // PRIORIDAD: @Input > ruta → y GUARDAR COPIA SEGURA
    // ───────────────────────────────────────────────────────────────
    let idFinal: string | null = null;

    if (this.documentoId) {
      idFinal = this.documentoId;
      console.log('✅ PRIORIDAD 1 → Usando documentoId recibido por @Input:', idFinal);
    } else {
      const idFromRoute = this.route.snapshot.paramMap.get('id');
      if (idFromRoute) {
        idFinal = idFromRoute;
        console.log('⚠️ No hay @Input → fallback a ID de ruta:', idFinal);
      }
    }

    if (!idFinal) {
      console.error('[SupervisorForm] No se recibió ningún ID válido');
      this.notificationService.error('Error crítico', 'No se pudo identificar el documento');
      this.isLoading = false;
      return;
    }

    // ¡Aquí guardamos la copia que nunca se pierde!
    this._documentoIdSeguro = idFinal;
    console.log('🛡️ ID guardado de forma segura internamente:', this._documentoIdSeguro);

    // Query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.desdeHistorial = params['desdeHistorial'] === 'true';
      this.determinarModoDesdeParams(params);
    });

    // Forzar modo solo lectura si viene de contabilidad
    if (this.modo === 'contabilidad' || this.soloLectura === true) {
      console.log('[SUPERVISOR] Detectado modo CONTABILIDAD o soloLectura=true → BLOQUEO TOTAL');
      this.soloLectura = true;
      this.modoEdicion = false;
      this.esModoAuditor = true;

      this.revisionForm.disable({ emitEvent: false });
      this.mostrarCampoArchivo = false;
      this.archivoAprobacion = null;
      this.archivoPazSalvo = null;

      ['estadoRevision', 'observacionSupervisor', 'correcciones', 'esUltimoRadicado']
        .forEach(campo => this.revisionForm.get(campo)?.disable({ emitEvent: false }));
    }

    // Cargar con el ID correcto
    this.cargarDocumentoCompleto(idFinal);

    // Suscripciones a valueChanges
    this.revisionForm.get('estadoRevision')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(estado => this.onEstadoChange(estado));

    this.revisionForm.get('esUltimoRadicado')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(esUltimo => {
        this.onUltimoRadicadoChange(esUltimo);
        setTimeout(() => this.verificarConsistenciaDatos(), 100);
      });

    // Debug: verificar que el ID sobrevive después de 1 segundo
    setTimeout(() => {
      console.log('[SupervisorForm DEBUG] Después de 1s → documentoId input:', this.documentoId);
      console.log('[SupervisorForm DEBUG] ID seguro interno:', this._documentoIdSeguro);
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Determinar modo basado en parámetros explícitos
   */
  private determinarModoDesdeParams(params: any): void {
    console.log('🔍 Determinando modo desde parámetros:', params);

    // ✅ MODO AUDITOR TIENE PRIORIDAD
    if (this.esModoAuditor || params['modo'] === 'auditoria') {
      this.soloLectura = true;
      this.modoEdicion = false;
      console.log('✅ Modo: AUDITORÍA (desde módulo auditor)');
      return;
    }

    // Parámetro explícito de solo lectura tiene prioridad
    if (params['soloLectura'] === 'true' || params['modo'] === 'consulta') {
      this.soloLectura = true;
      this.modoEdicion = false;
      console.log('✅ Modo: SOLO LECTURA (parámetro explícito)');
      return;
    }

    // Parámetro explícito modo=edicion
    if (params['modo'] === 'edicion') {
      this.soloLectura = false;
      this.modoEdicion = true;
      console.log('✅ Modo: EDICIÓN (parámetro explícito)');
      return;
    }

    // Si viene desde historial sin parámetros, determinar después con datos del documento
    console.log('⚠️ Modo: Por determinar con datos del documento');
  }

  private initializeForm(): void {
    this.revisionForm = this.fb.group({
      // Información básica (solo lectura)
      numeroRadicado: [{ value: '', disabled: true }, Validators.required],
      numeroContrato: [{ value: '', disabled: true }, Validators.required],
      nombreContratista: [{ value: '', disabled: true }, Validators.required],
      documentoContratista: [{ value: '', disabled: true }, Validators.required],
      fechaInicio: [{ value: '', disabled: true }, Validators.required],
      fechaFin: [{ value: '', disabled: true }, Validators.required],
      observacionOriginal: [{ value: '', disabled: true }],

      // Información de radicador (solo lectura)
      radicadorNombre: [{ value: '', disabled: true }],
      radicadorUsuario: [{ value: '', disabled: true }],
      fechaRadicacion: [{ value: '', disabled: true }],

      // Información de supervisor asignado (solo lectura)
      supervisorAsignado: [{ value: '', disabled: true }],
      fechaAsignacion: [{ value: '', disabled: true }],

      // Campos para último radicado
      esUltimoRadicado: [{ value: false, disabled: false }],

      // Información de revisión (editables)
      estadoRevision: [{ value: '', disabled: false }, Validators.required],
      observacionSupervisor: [{ value: '', disabled: false }, [Validators.required, Validators.minLength(10)]],
      correcciones: [{ value: '', disabled: false }],
      fechaRevision: [{ value: this.getCurrentDate(), disabled: true }],
      supervisorRevisor: [{ value: this.getCurrentUser(), disabled: true }]
    });
  }

  /**
   * ✅ Carga el documento completo con toda la información
   */
  cargarDocumentoCompleto(id: string): void {
    // Protección final: si por alguna razón el id no coincide con el @Input, forzar el correcto
    if (this.documentoId && this.documentoId !== id) {
      console.warn(
        '[SupervisorForm] ¡ID recibido en cargarDocumentoCompleto NO coincide con @Input! ' +
        'Forzando uso del documentoId correcto recibido del padre.'
      );
      console.log('  → ID recibido:', id);
      console.log('  → ID forzado (@Input):', this.documentoId);
      id = this.documentoId;
    }

    this.isLoading = true;

    console.log('📥 Iniciando carga completa del documento con ID:', id, {
      modoEdicion: this.modoEdicion,
      soloLectura: this.soloLectura,
      desdeHistorial: this.desdeHistorial,
      esModoAuditor: this.esModoAuditor,
      modoInput: this.modo
    });

    // Diferenciar servicio según modo
    let servicioObservable: Observable<any>;

    if (this.esModoAuditor) {
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

          // Cargar datos específicos de auditor si aplica
          if (this.esModoAuditor) {
            this.cargarDatosAuditorEspecificos(documentoData);
          }

          // Determinar modo si no está forzado
          if (!this.modoYaDeterminado()) {
            this.determinarModoDesdeDocumento(documentoData);
          }

          // Poblar formulario y documentos
          this.poblarFormulario(documentoData);
          this.cargarDocumentosExistentes(documentoData);

          // Cargar archivos del supervisor
          this.cargarArchivosSupervisorDesdeBackend(id, documentoData);

          this.isLoading = false;

          // Configurar form según modo final
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
   * ✅ Cargar datos específicos para auditor
   */
  private cargarDatosAuditorEspecificos(documentoData: any): void {
    console.log('🔍 Cargando datos específicos de auditor:', documentoData);

    this.primerRadicadoDelAno = documentoData.primerRadicadoDelAno || false;

    // Cargar archivos de auditor si es primer radicado del año
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

  /**
   * ✅ Verificar si el modo ya fue determinado desde parámetros
   */
  private modoYaDeterminado(): boolean {
    // El modo ya está determinado si:
    // 1. Hay parámetros explícitos en la URL
    // 2. O viene desde historial
    // 3. O es modo auditor
    return this.soloLectura === true ||
      this.modoEdicion === true ||
      this.desdeHistorial === true ||
      this.esModoAuditor === true;
  }

  /**
   * ✅ Determinar modo basado en el documento (solo si no hay parámetros explícitos)
   */
  private determinarModoDesdeDocumento(documentoData: any): void {
    const vieneDeContabilidad = this.modo === 'contabilidad' || this.soloLectura === true;

    if (vieneDeContabilidad) {
      console.log('[determinarModoDesdeDocumento] IGNORADO: viene de Contabilidad o soloLectura=true');
      return;  // ← NO EJECUTA NADA MÁS → no sobrescribe
    }


    // Solo llega aquí si NO está forzado (modo normal de supervisor)
    const estado = (documentoData.estado || '').toUpperCase().trim();
    const usuarioActual = this.getCurrentUser().trim();

    let supervisorAsignado =
      documentoData.supervisorAsignado ||
      documentoData.asignacion?.supervisorActual ||
      documentoData.asignadoA ||
      documentoData.supervisorRevisor ||
      '';

    supervisorAsignado = supervisorAsignado.trim();

    console.log('🔍 Determinando modo (modo normal):', { estado, soyYo: this.compararNombres(supervisorAsignado, usuarioActual) });

    const estadosSoloLectura = ['APROBADO', 'RECHAZADO', 'GLOSADO', 'PROCESADO', 'COMPLETADO', 'PAGADO', 'FINALIZADO'];
    const esEstadoFinal = estadosSoloLectura.some(e => estado.includes(e));

    const estadosEditables = ['RADICADO', 'EN_REVISION_SUPERVISOR', 'EN_REVISION', 'PENDIENTE', 'PENDIENTE_CORRECCIONES', 'OBSERVADO'];

    const soyElSupervisor = this.compararNombres(supervisorAsignado, usuarioActual) ||
      usuarioActual.includes('Administrador') ||
      !supervisorAsignado;

    if (esEstadoFinal) {
      this.soloLectura = true;
      this.modoEdicion = false;
    } else if (soyElSupervisor && estadosEditables.some(e => estado.includes(e))) {
      this.soloLectura = false;
      this.modoEdicion = true;
    } else {
      this.soloLectura = true;
      this.modoEdicion = false;
    }
  }

  /**
   * ✅ Comparar nombres de forma flexible
   */
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

    // Verificar coincidencia exacta o parcial
    const esIgual = nombre1Normalizado === nombre2Normalizado ||
      nombre1Normalizado.includes(nombre2Normalizado) ||
      nombre2Normalizado.includes(nombre1Normalizado);

    return esIgual;
  }


  /**
   * ✅ Configurar formulario para modo edición
   */
  private configurarModoEdicion(): void {
    console.log('✏️ Configurando formulario en modo EDICIÓN');

    // Habilitar campos editables
    this.revisionForm.get('estadoRevision')?.enable();
    this.revisionForm.get('observacionSupervisor')?.enable();
    this.revisionForm.get('correcciones')?.enable();
    this.revisionForm.get('esUltimoRadicado')?.enable();

    // Establecer valores por defecto si están vacíos
    if (!this.revisionForm.get('supervisorRevisor')?.value) {
      this.revisionForm.patchValue({
        supervisorRevisor: this.getCurrentUser(),
        fechaRevision: this.getCurrentDate()
      });
    }

    // Si el estado actual es APROBADO, mostrar campo de archivo
    const estadoActual = this.revisionForm.get('estadoRevision')?.value;
    if (estadoActual === 'APROBADO') {
      this.mostrarCampoArchivo = true;
    }
  }

  /**
   * ✅ Configurar formulario para modo solo lectura
   */
  private configurarModoSoloLectura(): void {
    console.log('👁️ Configurando formulario en modo SOLO LECTURA');

    // Deshabilitar todos los campos editables
    this.revisionForm.get('estadoRevision')?.disable();
    this.revisionForm.get('observacionSupervisor')?.disable();
    this.revisionForm.get('correcciones')?.disable();
    this.revisionForm.get('esUltimoRadicado')?.disable();

    // Si es modo auditor, ocultar/secciones específicas
    if (this.esModoAuditor) {
      this.ocultarCamposNoRelevantesParaAuditor();
    }

    // Si hay archivos existentes, mostrar la sección
    if (this.nombreArchivoAprobacionExistente || this.nombrePazSalvoExistente) {
      this.mostrarCampoArchivo = true;
    }
  }

  /**
   * ✅ Ocultar campos no relevantes para auditor
   */
  private ocultarCamposNoRelevantesParaAuditor(): void {
    console.log('👁️ Ocultando campos no relevantes para auditor');
    // Los campos ya están deshabilitados en modo solo lectura
    // Aquí podrías agregar lógica adicional si necesitas ocultar secciones completas
  }

  /**
   * ✅ Mostrar notificación del modo actual
   */
  private mostrarNotificacionModo(): void {
    setTimeout(() => {
      if (this.esModoAuditor) {
        this.notificationService.info(
          'Modo Auditoría',
          'Está visualizando el documento en modo auditoría. Esta vista es de solo lectura.'
        );
      } else if (this.soloLectura) {
        this.notificationService.info(
          'Modo consulta',
          'Está visualizando en modo solo lectura. Los documentos APROBADOS y RECHAZADOS no se pueden modificar.'
        );
      } else {
        this.notificationService.info(
          'Modo edición',
          'Puede realizar cambios en la revisión. Recuerde guardar los cambios cuando termine.'
        );
      }
    }, 500);
  }

  // ========================
  // ✅ NUEVOS MÉTODOS PARA AUDITOR
  // ========================

  /**
   * ✅ Ver archivo de auditor (primer radicado del año)
   */
  verArchivoAuditor(tipo: string): void {
    const archivo = this.archivosAuditor.find(a => a.tipo === tipo);

    if (!archivo?.subido) {
      this.notificationService.warning('Archivo no disponible',
        'Este archivo no ha sido subido por el auditor');
      return;
    }

    console.log(`👁️ Visualizando archivo de auditor: ${tipo}`);

    this.auditorService.descargarArchivoAuditorBlob(this.documentoId, tipo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const fileURL = URL.createObjectURL(blob);
          window.open(fileURL, '_blank');

          setTimeout(() => {
            URL.revokeObjectURL(fileURL);
          }, 1000);
        },
        error: (error: any) => {
          console.error('Error al previsualizar archivo de auditor:', error);
          this.notificationService.error('Error', 'No se pudo abrir el archivo');
        }
      });
  }

  /**
   * ✅ Descargar archivo de auditor (primer radicado del año)
   */
  descargarArchivoAuditor(tipo: string): void {
    const archivo = this.archivosAuditor.find(a => a.tipo === tipo);

    if (!archivo?.subido) {
      this.notificationService.warning('Archivo no disponible',
        'Este archivo no ha sido subido por el auditor');
      return;
    }

    this.isProcessing = true;
    const nombreArchivo = archivo.nombreArchivo || `${tipo}_${this.revisionForm.get('numeroRadicado')?.value}.pdf`;

    this.auditorService.descargarArchivoAuditorBlob(this.documentoId, tipo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
        error: (error: any) => {
          console.error(`❌ Error descargando archivo de auditor ${tipo}:`, error);
          this.notificationService.error('Error', 'No se pudo descargar el archivo');
          this.isProcessing = false;
        }
      });
  }

  /**
   * ✅ Tomar documento para auditoría
   */
  tomarParaAuditoria(): void {
    if (!this.esModoAuditor) return;

    const confirmar = confirm('¿Está seguro de tomar este documento para auditoría?');
    if (!confirmar) return;

    this.isProcessing = true;

    // ✅ USAR EL MÉTODO CORRECTO
    // Opción 1: Usar el método específico si existe
    this.auditorService.tomarParaRevision(this.documentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Documento tomado para auditoría:', response);
          this.notificationService.success('Éxito', 'Documento tomado para auditoría correctamente');
          this.isProcessing = false;
          this.volverALista();
        },
        error: (error: any) => {
          console.error('❌ Error tomando documento para auditoría:', error);

          // Mensaje específico según el error
          let mensajeError = 'No se pudo tomar el documento para auditoría';
          if (error.status === 409) {
            mensajeError = 'El documento ya fue tomado por otro auditor';
          } else if (error.status === 403) {
            mensajeError = 'No tiene permisos para tomar este documento';
          } else if (error.status === 404) {
            mensajeError = 'El documento no existe o no está disponible';
          }

          this.notificationService.error('Error', mensajeError);
          this.isProcessing = false;
        }
      });
  }

  /**
   * ✅ Verificar si tiene archivos de auditor
   */
  tieneArchivosAuditor(): boolean {
    return this.archivosAuditor.some(archivo => archivo.subido);
  }

  /**
   * ✅ Contar archivos de auditor disponibles
   */
  contarArchivosAuditor(): number {
    return this.archivosAuditor.filter(archivo => archivo.subido).length;
  }

  // ========================
  // MÉTODOS MODIFICADOS PARA AUDITOR
  // ========================

  /**
   * ✅ Ver documento - Usa servicio según el modo
   */
  verDocumento(index: number): void {
    if (index < 0 || index >= this.documentosExistentes.length ||
      !this.documentosExistentes[index].disponible) {
      this.notificationService.warning('Documento no disponible',
        'El documento seleccionado no está disponible para visualización');
      return;
    }

    console.log(`👁️ Visualizando documento ${index}`);

    let servicioObservable: Observable<Blob>;

    if (this.esModoAuditor) {
      // Usar servicio de auditor
      servicioObservable = this.auditorService.descargarArchivoRadicado(
        this.documentoId,
        this.documentosExistentes[index].indice
      );
    } else {
      // Usar servicio de supervisor
      servicioObservable = this.supervisorService.descargarArchivo(
        this.documentoId,
        this.documentosExistentes[index].indice
      );
    }

    servicioObservable.subscribe({
      next: (blob: Blob) => {
        // Crear URL para el blob y abrir en nueva pestaña
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, '_blank');

        // Limpiar la URL después de un tiempo
        setTimeout(() => {
          URL.revokeObjectURL(fileURL);
        }, 1000);
      },
      error: (error: any) => {
        console.error('Error al previsualizar:', error);
        this.notificationService.error('Error', 'No se pudo abrir el documento');
      }
    });
  }

  /**
   * ✅ Descargar documento - Usa servicio según el modo
   */
  descargarDocumento(index: number): void {
    if (index < 0 || index >= this.documentosExistentes.length ||
      !this.documentosExistentes[index].disponible) {
      this.notificationService.warning('Documento no disponible',
        'El documento seleccionado no está disponible para descarga');
      return;
    }

    this.isProcessing = true;
    const nombreArchivo = this.getNombreArchivo(index);

    let servicioObservable: Observable<Blob>;

    if (this.esModoAuditor) {
      servicioObservable = this.auditorService.descargarArchivoRadicado(
        this.documentoId,
        this.documentosExistentes[index].indice
      );
    } else {
      servicioObservable = this.supervisorService.descargarArchivo(
        this.documentoId,
        this.documentosExistentes[index].indice
      );
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

        this.notificationService.success('Descarga completada', 'Documento descargado correctamente');
        this.isProcessing = false;
      },
      error: (error: any) => {
        console.error(`❌ Error descargando documento ${index}:`, error);
        this.notificationService.error('Error', 'No se pudo descargar el documento');
        this.isProcessing = false;
      }
    });
  }

  /**
   * ✅ Obtener nombre de archivo mejorado
   */
  getNombreArchivo(index: number): string {
    if (index < 0 || index >= this.documentosExistentes.length) {
      return 'No disponible';
    }

    const archivo = this.documentosExistentes[index];

    if (!archivo?.disponible) {
      return 'No disponible';
    }

    // 1. Intenta usar nombreOriginal si existe
    if (archivo.nombreOriginal && archivo.nombreOriginal.trim() !== '') {
      const nombre = archivo.nombreOriginal;
      const parts = nombre.split(/[\\/]/);
      return parts[parts.length - 1] || nombre;
    }

    // 2. Intenta usar nombre si existe
    if (archivo.nombre && archivo.nombre.trim() !== '') {
      const nombre = archivo.nombre;
      const parts = nombre.split(/[\\/]/);
      return parts[parts.length - 1] || nombre;
    }

    // 3. Nombre por defecto basado en tipo
    const nombresPorDefecto: { [key: string]: string } = {
      'cuentaCobro': 'Cuenta de Cobro.pdf',
      'seguridadSocial': 'Seguridad Social.pdf',
      'informeActividades': 'Informe de Actividades.pdf'
    };

    return nombresPorDefecto[archivo.tipo] || `Documento ${index + 1}.pdf`;
  }

  /**
   * ✅ Volver a lista según el modo
   */
  volverALista(): void {
    if (this.esModoAuditor) {
      this.router.navigate(['/auditor/lista']);
    } else if (this.desdeHistorial) {
      this.router.navigate(['/supervisor/historial']);
    } else {
      this.router.navigate(['/supervisor/pendientes']);
    }
  }


  puedeGuardar(): boolean {
    if (this.soloLectura) return false;

    const estado = this.revisionForm.get('estadoRevision')?.value;
    const esUltimoRadicado = this.revisionForm.get('esUltimoRadicado')?.value;

    if (estado === 'APROBADO') {
      if (esUltimoRadicado && !this.archivoPazSalvo && !this.tienePazSalvoExistente()) {
        return false;
      }

      if (!this.archivoAprobacion && !this.tieneAprobacionExistente()) {
        return false;
      }
    }

    return this.revisionForm.valid;
  }

  contarLineasCorrecciones(): number {
    const correcciones = this.revisionForm.get('correcciones')?.value || '';
    if (!correcciones) return 0;

    const lineas = correcciones.split('\n');
    let count = 0;

    for (const linea of lineas) {
      const trimmedLinea = linea.trim();
      if (trimmedLinea.length > 0 &&
        (trimmedLinea.includes('-') ||
          trimmedLinea.includes('*') ||
          trimmedLinea.includes('•') ||
          /^\d+\./.test(trimmedLinea))) {
        count++;
      }
    }

    return count;
  }

  tienePazSalvoExistente(): boolean {
    return !!this.nombrePazSalvoExistente ||
      !!this.supervisorInfo?.nombrePazSalvo ||
      this.supervisorInfo?.tienePazSalvo === true;
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
        this.notificationService.info(
          'Corrección automática',
          'Se detectó un archivo de paz y salvo. El documento ha sido automáticamente marcado como último radicado.'
        );
      }
    }

    if (esUltimoRadicado && !tieneArchivoPazSalvo && !this.soloLectura) {
      console.warn('⚠️ ADVERTENCIA: Marcado como último radicado pero sin archivo de paz y salvo');
      this.notificationService.warning(
        'Atención',
        'Al marcar como último radicado, debe adjuntar el archivo de paz y salvo.'
      );
    }
  }

  getNombreArchivoPazSalvo(): string {
    if (this.nombrePazSalvoExistente) {
      const parts = this.nombrePazSalvoExistente.split(/[\\/]/);
      return parts[parts.length - 1] || this.nombrePazSalvoExistente;
    }

    if (this.supervisorInfo?.nombrePazSalvo) {
      const parts = this.supervisorInfo.nombrePazSalvo.split(/[\\/]/);
      return parts[parts.length - 1] || this.supervisorInfo.nombrePazSalvo;
    }

    return 'paz_y_salvo.pdf';
  }

  onArchivoPazSalvoSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.validarYAsignarArchivoPazSalvo(file);
    }
  }

  validarYAsignarArchivoPazSalvo(file: File): void {
    if (file.size > this.maxFileSize) {
      this.notificationService.error('Error', 'El archivo excede el tamaño máximo de 10MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.notificationService.error('Error',
        'Tipo de archivo no permitido. Use PDF, DOC, DOCX, JPG o PNG');
      return;
    }

    this.archivoPazSalvo = file;
    this.notificationService.success('Archivo cargado',
      `Paz y salvo "${file.name}" cargado correctamente`);
  }

  eliminarArchivoPazSalvo(): void {
    this.archivoPazSalvo = null;
    this.notificationService.info('Archivo eliminado',
      'Archivo de paz y salvo eliminado de la selección');
  }

  getFileSize(size: number): string {
    if (!size || size === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));

    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  tieneDocumentosDisponibles(): boolean {
    return this.documentosExistentes.some(doc => doc.disponible);
  }

  contarDocumentosDisponibles(): number {
    return this.documentosExistentes.filter(doc => doc.disponible).length;
  }

  abrirTodosDocumentos(): void {
    if (!this.tieneDocumentosDisponibles()) {
      this.notificationService.warning('Sin documentos', 'No hay documentos disponibles para visualizar');
      return;
    }

    console.log('📂 Abriendo todos los documentos...');

    let documentosAbiertos = 0;

    for (let i = 0; i < this.documentosExistentes.length; i++) {
      if (this.documentosExistentes[i].disponible) {
        setTimeout(() => {
          this.verDocumento(i);
        }, i * 300);
        documentosAbiertos++;
      }
    }

    this.notificationService.info('Documentos abiertos',
      `Se están abriendo ${documentosAbiertos} documentos en nuevas pestañas`);
  }

  descargarTodosDocumentos(): void {
    if (!this.tieneDocumentosDisponibles()) {
      this.notificationService.warning('Sin documentos', 'No hay documentos disponibles para descargar');
      return;
    }

    console.log('📥 Descargando todos los documentos...');
    this.isProcessing = true;
    this.isDownloadingAll = true;

    const documentosDisponibles = this.documentosExistentes
      .map((doc, index) => ({ ...doc, index }))
      .filter(doc => doc.disponible);

    if (documentosDisponibles.length === 0) {
      this.notificationService.warning('Sin documentos', 'No hay documentos disponibles para descargar');
      this.isProcessing = false;
      this.isDownloadingAll = false;
      return;
    }

    this.notificationService.info('Descarga iniciada',
      `Descargando ${documentosDisponibles.length} documentos...`);

    let descargados = 0;
    let errores = 0;

    documentosDisponibles.forEach((doc, i) => {
      setTimeout(() => {
        const nombreArchivo = this.getNombreArchivo(doc.index);

        let servicioObservable: Observable<Blob>;

        if (this.esModoAuditor) {
          servicioObservable = this.auditorService.descargarArchivoRadicado(
            this.documentoId,
            doc.indice
          );
        } else {
          servicioObservable = this.supervisorService.descargarArchivo(
            this.documentoId,
            doc.indice
          );
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

            descargados++;
            this.verificarFinDescargaMultiple(descargados, errores, documentosDisponibles.length);
          },
          error: (error: any) => {
            console.error(`❌ Error descargando documento ${doc.index}:`, error);
            errores++;
            this.verificarFinDescargaMultiple(descargados, errores, documentosDisponibles.length);
          }
        });
      }, i * 1000);
    });
  }

  private verificarFinDescargaMultiple(descargados: number, errores: number, total: number): void {
    if (descargados + errores === total) {
      this.notificationService.success('Descarga completada',
        `Se descargaron ${descargados} documentos correctamente. Errores: ${errores}`);
      this.isProcessing = false;
      this.isDownloadingAll = false;
    }
  }

  previsualizarArchivosSupervisor(tipo: 'aprobacion' | 'pazsalvo'): void {
    let nombreArchivo = '';

    if (tipo === 'aprobacion') {
      nombreArchivo = this.nombreArchivoAprobacionExistente ||
        this.supervisorInfo?.nombreArchivoAprobacion || '';
      if (nombreArchivo) {
        this.supervisorService.verArchivoAprobacion(nombreArchivo);
      }
    } else {
      nombreArchivo = this.nombrePazSalvoExistente ||
        this.supervisorInfo?.nombrePazSalvo || '';
      if (nombreArchivo) {
        this.supervisorService.previsualizarPazSalvo(nombreArchivo);
      }
    }

    if (!nombreArchivo) {
      this.notificationService.warning('Sin archivo', `No hay archivo de ${tipo} para previsualizar`);
    }
  }

  descargarArchivosSupervisor(tipo: 'aprobacion' | 'pazsalvo'): void {
    console.log(`📥 Descargando archivo de ${tipo}...`);
    this.isProcessing = true;

    const nombreArchivo = tipo === 'aprobacion'
      ? this.nombreArchivoAprobacionExistente || this.supervisorInfo.nombreArchivoAprobacion
      : this.nombrePazSalvoExistente || this.supervisorInfo.nombrePazSalvo;

    if (!nombreArchivo) {
      this.notificationService.warning('Advertencia', 'No hay archivo disponible');
      this.isProcessing = false;
      return;
    }

    const servicioObservable = tipo === 'aprobacion'
      ? this.supervisorService.descargarArchivoAprobacion(nombreArchivo)
      : this.supervisorService.descargarPazSalvo(nombreArchivo);

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

        this.isProcessing = false;
        this.notificationService.success('Descarga completada', 'Archivo descargado correctamente');
      },
      error: (error: any) => {
        console.error(`❌ Error descargando archivo de ${tipo}:`, error);

        let errorMsg = 'No se pudo descargar el archivo';
        if (error.status === 404) {
          errorMsg = 'El archivo no existe en el servidor';
        } else if (error.status === 403) {
          errorMsg = 'No tiene permisos para descargar este archivo';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }

        this.notificationService.error('Error', errorMsg);
        this.isProcessing = false;
      }
    });
  }



  cancelarRevision(): void {
    const mensaje = this.desdeHistorial
      ? '¿Cancelar la edición? Los cambios no guardados se perderán.'
      : '¿Cancelar la revisión? Los cambios no guardados se perderán.';

    if (confirm(mensaje)) {
      this.volverALista();
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
    console.log('🔄 Cambio en checkbox esUltimoRadicado:', esUltimo,
      'Tiene paz salvo existente:', this.tienePazSalvoExistente());

    if (esUltimo &&
      !this.soloLectura &&
      !this.archivoPazSalvo &&
      !this.tienePazSalvoExistente()) {

      console.log('📂 Abriendo selector de archivo de paz y salvo...');

      setTimeout(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
        input.style.display = 'none';

        input.onchange = (event: any) => {
          const file = event.target.files[0];
          if (file) {
            console.log('📄 Archivo seleccionado:', file.name);
            this.validarYAsignarArchivoPazSalvo(file);
          } else {
            console.log('❌ Selección cancelada');
          }
          document.body.removeChild(input);
        };

        document.body.appendChild(input);
        input.click();
      }, 100);
    }
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

  onArchivoAprobacionSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > this.maxFileSize) {
        this.notificationService.error('Error', 'El archivo excede el tamaño máximo de 10MB');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.notificationService.error('Error',
          'Tipo de archivo no permitido. Use PDF, DOC, DOCX, JPG o PNG');
        return;
      }

      this.archivoAprobacion = file;
      this.notificationService.success('Archivo cargado',
        `Archivo de aprobación "${file.name}" cargado correctamente`);
    }
  }

  eliminarArchivoAprobacion(): void {
    this.archivoAprobacion = null;
    this.notificationService.info('Archivo eliminado',
      'Archivo de aprobación eliminado de la selección');
  }

  // ✅ MÉTODO PARA OBTENER CLASE CSS DEL ESTADO
  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'badge bg-light text-dark';

    const estadoUpper = estado.toUpperCase();

    switch (estadoUpper) {
      case 'APROBADO':
      case 'APROBADO_SUPERVISOR':
        return 'badge bg-success';
      case 'OBSERVADO':
      case 'OBSERVADO_SUPERVISOR':
        return 'badge bg-warning text-dark';
      case 'RECHAZADO':
      case 'RECHAZADO_SUPERVISOR':
        return 'badge bg-danger';
      case 'PENDIENTE':
        return 'badge bg-secondary';
      case 'EN_REVISION_SUPERVISOR':
      case 'EN_REVISION':
        return 'badge bg-info';
      case 'RADICADO':
        return 'badge bg-primary';
      case 'EN_REVISION_AUDITOR':
        return 'badge bg-info';
      case 'APROBADO_AUDITOR':
        return 'badge bg-success';
      case 'RECHAZADO_AUDITOR':
        return 'badge bg-danger';
      case 'OBSERVADO_AUDITOR':
        return 'badge bg-warning';
      default:
        return 'badge bg-light text-dark';
    }
  }

  /**
   * ✅ Carga los archivos del supervisor desde el backend
   */
  private cargarArchivosSupervisorDesdeBackend(documentoId: string, documentoData: any): void {
    console.log('🔍 Buscando archivos del supervisor para documento:', documentoId);

    this.estadisticasService.obtenerHistorial()
      .pipe(
        map((historialResponse: any) => {
          if (historialResponse.success && Array.isArray(historialResponse.data)) {
            const registroSupervisor = historialResponse.data.find((item: any) => {
              return item.documentoId === documentoId ||
                (item.documento && item.documento.id === documentoId);
            });

            return registroSupervisor;
          }
          return null;
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
            this.procesarDatosSupervisor(registroSupervisor);
          } else {
            this.cargarArchivosDesdeDocumento(documentoData);
          }
        }
      });
  }

  private procesarDatosSupervisor(supervisorData: any): void {
    console.log('🔍 Procesando datos del supervisor:', supervisorData);

    const nombreArchivoAprobacion = supervisorData?.nombreArchivoSupervisor || '';
    const nombrePazSalvo = supervisorData?.pazSalvo || '';

    console.log('📁 Archivos encontrados:', {
      aprobacion: nombreArchivoAprobacion,
      pazSalvo: nombrePazSalvo
    });

    this.nombreArchivoAprobacionExistente = nombreArchivoAprobacion;
    this.nombrePazSalvoExistente = nombrePazSalvo;

    if (supervisorData?.fechaAprobacion) {
      this.fechaArchivoAprobacionExistente = new Date(supervisorData.fechaAprobacion);
    }
    if (supervisorData?.fechaActualizacion) {
      this.fechaPazSalvoExistente = new Date(supervisorData.fechaActualizacion);
    }

    // ✅ Obtener observación y correcciones directamente desde los campos separados
    const observacionSupervisor = supervisorData?.observacion || '';
    const correccionesSugeridas = supervisorData?.correcciones || '';

    console.log('📝 Campos separados encontrados:', {
      observacion: observacionSupervisor,
      correcciones: correccionesSugeridas
    });

    this.supervisorInfo = {
      ...this.supervisorInfo,
      tieneArchivoAprobacion: !!nombreArchivoAprobacion,
      tienePazSalvo: !!nombrePazSalvo,
      nombreArchivoAprobacion: nombreArchivoAprobacion,
      nombrePazSalvo: nombrePazSalvo,
      esUltimoRadicado: supervisorData?.esUltimoRadicado || !!nombrePazSalvo,
      supervisorRevisor: supervisorData?.usuarioNombre || this.getCurrentUser(),
      fechaRevision: supervisorData?.fechaAprobacion || supervisorData?.fechaActualizacion,
      observacionSupervisor: observacionSupervisor,
      correccionesSugeridas: correccionesSugeridas
    };

    // ✅ ACTUALIZAR EL FORMULARIO CON LAS OBSERVACIONES Y CORRECCIONES
    this.revisionForm.patchValue({
      estadoRevision: supervisorData?.estado || '',
      observacionSupervisor: observacionSupervisor || '',
      correcciones: correccionesSugeridas || '',
      esUltimoRadicado: this.supervisorInfo.esUltimoRadicado
    });

    if (nombreArchivoAprobacion || nombrePazSalvo) {
      this.mostrarCampoArchivo = true;
    }

    console.log('✅ Información del supervisor actualizada:', {
      observacionSupervisor: this.supervisorInfo.observacionSupervisor,
      correccionesSugeridas: this.supervisorInfo.correccionesSugeridas,
      estadoRevision: supervisorData?.estado
    });

    this.cdr.detectChanges();
  }

  private cargarArchivosDesdeDocumento(documento: any): void {
    console.log('🔍 Buscando archivos en datos del documento:', documento);

    const docData = documento.documento || documento;

    const historial = docData.historialEstados || [];
    const estadoAprobado = historial.find((h: any) =>
      h.estado === 'APROBADO' || h.estado === 'APROBADO_SUPERVISOR'
    );

    if (estadoAprobado) {
      console.log('✅ Estado APROBADO encontrado en historial:', estadoAprobado);

      this.revisionForm.patchValue({
        observacionSupervisor: estadoAprobado.observacion || ''
      });
    }

    if (docData.nombreArchivoSupervisor) {
      this.nombreArchivoAprobacionExistente = docData.nombreArchivoSupervisor;
      this.fechaArchivoAprobacionExistente = docData.fechaAprobacion ?
        new Date(docData.fechaAprobacion) : null;
      this.mostrarCampoArchivo = true;
    }

    if (docData.pazSalvo) {
      this.nombrePazSalvoExistente = docData.pazSalvo;
      this.fechaPazSalvoExistente = docData.fechaActualizacion ?
        new Date(docData.fechaActualizacion) : null;
    }

    if (docData.esUltimoRadicado !== undefined) {
      this.revisionForm.patchValue({
        esUltimoRadicado: docData.esUltimoRadicado
      });
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

      supervisorAsignado: docData.supervisorAsignado ||
        docData.asignacion?.supervisorActual ||
        supervisorActual,
      fechaAsignacion: this.formatDateForInput(docData.fechaAsignacion || new Date()),

      supervisorRevisor: supervisorActual,
      fechaRevision: this.getCurrentDate(),
      estadoRevision: docData.estado || ''
    });

    // ✅ Guardar historial para uso posterior
    if (docData.historialEstados && Array.isArray(docData.historialEstados)) {
      this.historialEstados = docData.historialEstados;
      console.log(`📋 Historial de estados guardado: ${this.historialEstados.length} registros`);
    }

    if (this.revisionForm.get('estadoRevision')?.value &&
      this.revisionForm.get('estadoRevision')?.value !== 'RADICADO' &&
      this.revisionForm.get('estadoRevision')?.value !== 'PENDIENTE') {
      this.soloLectura = true;
      this.modoEdicion = false;
      console.log('[SUPERVISOR] Bloqueo adicional: ya tiene revisión previa');
    }

    this.configurarFormularioSegunModo();

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




  private determinarModoFinal(data: any): void {
    const estado = (data.estado || '').toUpperCase().trim();
    const supervisorAsignado = (data.supervisorAsignado || data.asignacion?.supervisorActual || '').trim();
    const soyYo = this.compararNombres(supervisorAsignado, this.getCurrentUser());

    const estadosFinales = [
      'APROBADO', 'APROBADO_SUPERVISOR', 'RECHAZADO', 'RECHAZADO_SUPERVISOR',
      'GLOSADO', 'PROCESADO', 'COMPLETADO', 'PAGADO', 'FINALIZADO'
    ];
    const esEstadoFinal = estadosFinales.some(e => estado.includes(e));

    const estadosEditables = [
      'RADICADO', 'EN_REVISION_SUPERVISOR', 'EN_REVISION',
      'PENDIENTE', 'PENDIENTE_CORRECCIONES', 'OBSERVADO'
    ];

    // Lógica normal...
    if (esEstadoFinal) {
      this.soloLectura = true;
      this.modoEdicion = false;
    } else if (estadosEditables.some(e => estado.includes(e)) && soyYo) {
      this.soloLectura = false;
      this.modoEdicion = true;
    } else {
      this.soloLectura = true;
      this.modoEdicion = false;
    }

    // FORZADO FINAL: si el input dice soloLectura=true, NO importa nada más
    if (this.soloLectura === true) {
      this.soloLectura = true;
      this.modoEdicion = false;
      console.log('[SUPERVISOR] Input soloLectura=true → BLOQUEO FINAL (sobrescribe todo)');
    }

    this.configurarFormularioSegunModo();
  }

  private configurarFormularioSegunModo(): void {
    console.log('[configurarFormularioSegunModo] Ejecutando... soloLectura =', this.soloLectura);

    if (this.soloLectura === true) {
      console.log('[configurarFormularioSegunModo] BLOQUEO TOTAL por soloLectura=true (Contabilidad)');

      this.revisionForm.disable({ emitEvent: false });
      this.mostrarCampoArchivo = false;
      this.archivoAprobacion = null;
      this.archivoPazSalvo = null;

      this.cdr.detectChanges();
      return;
    }

    // Solo si NO está forzado → modo normal de supervisor
    const camposEditables = [
      'estadoRevision',
      'observacionSupervisor',
      'correcciones',
      'esUltimoRadicado'
    ];

    if (this.modoEdicion) {
      camposEditables.forEach(campo => {
        this.revisionForm.get(campo)?.enable({ emitEvent: false });
      });
      this.mostrarCampoArchivo = this.revisionForm.get('estadoRevision')?.value === 'APROBADO';
    } else {
      camposEditables.forEach(campo => {
        this.revisionForm.get(campo)?.disable({ emitEvent: false });
      });
      this.mostrarCampoArchivo = false;
    }

    this.cdr.detectChanges();
  }

  guardarRevision(): void {
  // Usar SIEMPRE la copia segura
  const idParaGuardar = this._documentoIdSeguro;

  if (!idParaGuardar) {
    console.error('[SupervisorForm] ¡Intento de guardar sin ID seguro!');
    this.notificationService.error(
      'Error crítico',
      'ID del documento no disponible. Recarga la página e intenta de nuevo.'
    );
    return;
  }

  console.log('[SupervisorForm] Guardando revisión con ID seguro:', idParaGuardar);

  if (this.soloLectura || this.esModoAuditor) {
    this.notificationService.warning('Acción bloqueada', 'No puedes guardar en modo consulta o auditoría.');
    return;
  }

  if (this.revisionForm.invalid) {
    this.notificationService.warning('Formulario incompleto', 'Completa los campos requeridos');
    this.revisionForm.markAllAsTouched();
    return;
  }

  const estado = this.revisionForm.get('estadoRevision')?.value;
  const esUltimo = this.revisionForm.get('esUltimoRadicado')?.value;

  if (estado === 'APROBADO') {
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
    estado,
    observacion: valores.observacionSupervisor || '',
    correcciones: valores.correcciones || '',
    requierePazSalvo: esUltimo,
    esUltimoRadicado: Boolean(esUltimo)
  };

  console.log('[SupervisorForm] Enviando payload:', { id: idParaGuardar, payload });

  let request: Observable<any>;

  if (estado === 'APROBADO' && (this.archivoAprobacion || this.archivoPazSalvo)) {
    request = this.supervisorService.guardarRevisionConArchivo(
      idParaGuardar,  // ← Usar el seguro
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
      if (err.status === 400) msg = 'Datos inválidos enviados al servidor';
      if (err.error?.message) msg = err.error.message;
      this.notificationService.error('Error', msg);
      this.isProcessing = false;
    }
  });
}

}