import { Component, OnInit, ChangeDetectorRef, OnDestroy, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable, of, Subject } from 'rxjs';
import { map, catchError, takeUntil } from 'rxjs/operators';
import { EventEmitter } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { SupervisorService } from '../../../../core/services/supervisor/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorService } from '../../../../core/services/auditor.service';
import { SupervisorEstadisticasService } from '../../../../core/services/supervisor';
import { AuditorFormComponent } from '../../../auditor/components/auditor-form/auditor-form.component';
import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { SupervisorArchivosService } from '../../../../core/services/supervisor';
import { SignatureService, Signature } from '../../../../core/services/signature.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SignaturePadComponent } from '../../../signature/components/signature-pad/signature-pad.component';
import { SignaturePositionComponent, SignaturePosition } from '../../../signature/components/signature-position/signature-position.component';

@Component({
  selector: 'app-supervisor-form',
  templateUrl: './supervisor-form.component.html',
  styleUrls: ['./supervisor-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AuditorFormComponent,
    SignaturePadComponent,
    SignaturePositionComponent
  ]
})
export class SupervisorFormComponent implements OnInit, OnDestroy {

  @Input() documentoId: string = '';
  @Input() modo: 'supervisor' | 'auditoria' | 'contabilidad' = 'supervisor';
  @Input() soloLectura: boolean = false;

  @Output() volver = new EventEmitter<void>();

  radicadoData: any = null;
  supervisorDoc: any = null;
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

  // ==================== PROPIEDADES PARA FIRMA Y ACTA ====================
  userSignature: Signature | null = null;
  tieneFirma = false;
  mostrarSelectorPosicion = false;
  firmaPosicion: SignaturePosition | null = null;
  currentUserRole: string = '';

  tieneActaOriginal: boolean = false;
  actaOriginalNombre: string = '';
  actaOriginalSubidaPor: string = '';
  actaOriginalFecha: Date | null = null;
  actaOriginalFile: File | null = null;

  tieneActaFirmada: boolean = false;
  actaFirmadaNombre: string = '';
  fechaFirma: Date | null = null;

  esModoContabilidad = false;
  esModoSupervisor = false;
  // =============================================================================

  private mapearEstadoParaDropdown(estadoBackend: string): string {
    const estadoMap: { [key: string]: string } = {
      'APROBADO_SUPERVISOR': 'APROBADO',
      'APROBADO': 'APROBADO',
      'APROBADO_AUDITOR': '',
      'OBSERVADO_SUPERVISOR': 'OBSERVADO',
      'OBSERVADO': 'OBSERVADO',
      'RECHAZADO_SUPERVISOR': 'RECHAZADO',
      'RECHAZADO': 'RECHAZADO',
      'EN_REVISION_SUPERVISOR': '',
      'EN_REVISION': '',
      'RADICADO': '',
      'PENDIENTE': ''
    };
    return estadoMap[estadoBackend] || '';
  }

  historialEstados: any[] = [];
  cargandoVer: { [key: string]: boolean } = {};

  private destroy$ = new Subject<void>();

  private readonly estadosSoloLecturaForzado = [
    'APROBADO', 'APROBADO_SUPERVISOR', 'APROBADO_AUDITOR',
    'RECHAZADO', 'RECHAZADO_SUPERVISOR', 'RECHAZADO_AUDITOR',
    'GLOSADO', 'PROCESADO', 'COMPLETADO', 'COMPLETADO_AUDITOR',
    'PAGADO', 'FINALIZADO', 'FIRMADO_SUPERVISOR'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private supervisorService: SupervisorService,
    private supervisorArchivosService: SupervisorArchivosService,
    private auditorService: AuditorService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private estadisticasService: SupervisorEstadisticasService,
    private sanitizer: DomSanitizer,
    private rendicionService?: RendicionCuentasService,
    private signatureService?: SignatureService,
    private authService?: AuthService
  ) { }

  ngOnInit(): void {
    console.log('🚀 SupervisorForm: Inicializando componente...');

    this.initializeForm();
    
    this.cargarFirmaYInicializar();
  }

  private async cargarFirmaYInicializar(): Promise<void> {
    await this.cargarFirmaUsuario();
    
    const url = this.router.url;
    const esRutaSupervisor = url.includes('/supervisor/');
    const esRutaAuditor = url.includes('/auditor/');
    const esRutaContabilidad = url.includes('/contabilidad/');

    if (this.modo === 'supervisor') {
      this.esModoSupervisor = true;
      this.esModoAuditor = false;
      this.esModoContabilidad = false;
    } else if (this.modo === 'auditoria') {
      this.esModoSupervisor = false;
      this.esModoAuditor = true;
      this.esModoContabilidad = false;
    } else if (this.modo === 'contabilidad') {
      this.esModoSupervisor = false;
      this.esModoAuditor = false;
      this.esModoContabilidad = true;
    } else {
      this.esModoSupervisor = esRutaSupervisor;
      this.esModoAuditor = esRutaAuditor;
      this.esModoContabilidad = esRutaContabilidad;
    }

    console.log('🔍 Detectando contexto:', {
      url,
      modo: this.modo,
      esModoSupervisor: this.esModoSupervisor,
      esModoAuditor: this.esModoAuditor,
      esModoContabilidad: this.esModoContabilidad,
      soloLecturaInput: this.soloLectura,
      tieneFirma: this.tieneFirma,
      userSignature: this.userSignature
    });

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

    this.documentoId = idParaCargar;

    if (this.router.url.includes('/rendicion-cuentas/')) {
      this.cargarViaRendicion(idParaCargar);
    } else {
      this.cargarDocumentoCompleto(idParaCargar);
    }

    const idFromRoute = this.route.snapshot.paramMap.get('id');
    if (idFromRoute) {
      this.documentoId = idFromRoute;
      console.log('✅ ID REAL asignado a documentoId:', this.documentoId);
    }

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      console.log('📌 QueryParams recibidos en formulario:', params);
      this.desdeHistorial = params['desdeHistorial'] === 'true';
      this.determinarModoDesdeParams(params, this.router.url);
    });

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
      console.log('[SupervisorForm DEBUG] tieneFirma:', this.tieneFirma);
      console.log('[SupervisorForm DEBUG] firmaPosicion:', this.firmaPosicion);
    }, 1000);
  }

  // ==================== MÉTODOS PARA FIRMA ====================
  cargarFirmaUsuario(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.authService || !this.signatureService) {
        this.tieneFirma = false;
        console.warn('[Firma] Servicios no disponibles');
        resolve(false);
        return;
      }

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        this.tieneFirma = false;
        console.warn('[Firma] No hay usuario logueado');
        resolve(false);
        return;
      }
      
      this.currentUserRole = currentUser.role;
      console.log('[Firma] Rol del usuario:', this.currentUserRole);

      console.log('[Firma] Cargando firma para usuario:', currentUser.fullName);
      
      this.signatureService.getMySignature(currentUser.id).subscribe({
        next: (signature) => {
          this.userSignature = signature;
          this.tieneFirma = !!signature && !!signature.id;
          console.log('[Firma] Resultado carga:', { 
            tieneFirma: this.tieneFirma, 
            signatureId: this.userSignature?.id,
            signatureName: this.userSignature?.name
          });
          
          if (!this.tieneFirma) {
            console.warn('[Firma] Usuario sin firma. Debe registrarla en su perfil.');
            this.notificationService?.warning(
              'Firma no encontrada',
              'No tienes una firma digital registrada. Debes registrarla en tu perfil de usuario.'
            );
          }
          
          resolve(this.tieneFirma);
        },
        error: (err) => {
          console.error('[Firma] Error al cargar firma:', err);
          this.tieneFirma = false;
          this.userSignature = null;
          
          this.notificationService?.error(
            'Error al cargar firma',
            'No se pudo cargar tu firma digital. Verifica que esté registrada.'
          );
          
          resolve(false);
        }
      });
    });
  }

  verActaCorrecta(): void {
    if (!this.documentoId) return;
    const esModoConsulta = this.soloLectura || this.esModoAuditor || this.esModoContabilidad;
    if (this.supervisorService) {
        this.supervisorService.verActa(this.documentoId, esModoConsulta);
    }
  }

  verActaOriginal(): void {
    if (this.documentoId && this.supervisorService) {
        this.supervisorService.verActa(this.documentoId, false);
    }
  }

  verActaFirmada(): void {
    if (this.documentoId && this.supervisorService) {
        this.supervisorService.verActa(this.documentoId, true);
    }
  }

  async abrirSelectorPosicion() {
    if (!this.documentoId || !this.supervisorService) return;
    if (!this.tieneFirma) {
      this.notificationService.warning('Sin firma', 'Debes cargar una firma digital en tu perfil antes de firmar.');
      return;
    }

    this.isProcessing = true;
    try {
      const blob = await this.supervisorService.descargarActaOriginal(this.documentoId).toPromise();
      if (blob) {
        const fileName = this.actaOriginalNombre || 'acta_supervision.pdf';
        const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });
        this.actaOriginalFile = file;
        this.mostrarSelectorPosicion = true;
      } else {
        this.notificationService.error('Error', 'No se pudo cargar el acta para seleccionar posición');
      }
    } catch (error) {
      console.error('Error al cargar acta:', error);
      this.notificationService.error('Error', 'No se pudo cargar el acta');
    } finally {
      this.isProcessing = false;
    }
  }

  // ✅ MÉTODO MODIFICADO: Solo guarda la posición, NO cierra el selector
  onPositionSelected(position: SignaturePosition): void {
    this.firmaPosicion = position;
    console.log('[Firma] Posición seleccionada:', position);
    // ❌ ELIMINADO: this.mostrarSelectorPosicion = false;
    // El usuario debe cerrar manualmente con el botón cerrar del selector
    this.cdr.detectChanges();
    this.notificationService.success('Posición guardada', 'La posición de la firma ha sido guardada. Cierra el selector cuando termines.');
  }

  // ✅ MÉTODO MODIFICADO: Cierra el selector manualmente
  cerrarSelectorPosicion(): void {
    this.mostrarSelectorPosicion = false;
    this.actaOriginalFile = null;
    this.notificationService.info('Selector cerrado', 'Puedes continuar con la revisión.');
  }
  // ==================== FIN MÉTODOS FIRMA ====================

  private cargarViaRendicion(id: string): void {
    this.rendicionService?.obtenerDetalleRendicion(id).subscribe({
      next: (data) => {
        const documentoIdReal = data.documentoId || data.id;
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

    let servicioObservable: Observable<any>;

    if (this.esModoAuditor && !esRutaSupervisor) {
      servicioObservable = this.auditorService.obtenerDocumentoParaVista(id);
    } else {
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

          this.tieneActaOriginal = !!documentoData.tieneActaOriginal || !!documentoData.actaSupervisionPath;
          this.actaOriginalNombre = documentoData.actaOriginalNombre || documentoData.actaSupervisionNombre;
          this.actaOriginalSubidaPor = documentoData.actaOriginalSubidaPor || documentoData.actaSupervisionSubidaPor;
          this.actaOriginalFecha = documentoData.actaOriginalFecha || documentoData.actaSupervisionFecha;

          if (documentoData.supervisor) {
            this.supervisorDoc = documentoData.supervisor;
            this.tieneActaFirmada = !!this.supervisorDoc?.actaFirmadaPath;
            this.actaFirmadaNombre = this.supervisorDoc?.actaFirmadaNombre;
            this.fechaFirma = this.supervisorDoc?.fechaFirma;
          }

          if (!this.tieneActaFirmada && documentoData.actaFirmadaPath) {
            this.tieneActaFirmada = true;
            this.actaFirmadaNombre = documentoData.actaFirmadaNombre;
            this.fechaFirma = documentoData.fechaFirma;
          }

          if (!this.tieneActaFirmada && documentoData.historialEstados) {
            const firmaEnHistorial = documentoData.historialEstados.some((h: any) =>
              h.observacion?.includes('Acta firmada') ||
              h.estado === 'FIRMADO_SUPERVISOR' ||
              (h.observacion?.includes('firmada') && h.observacion?.includes('Acta'))
            );
            if (firmaEnHistorial) {
              this.tieneActaFirmada = true;
            }
          }

          console.log('📄 Datos del documento recibidos:', {
            estado: documentoData.estado,
            tieneActaOriginal: this.tieneActaOriginal,
            actaOriginalNombre: this.actaOriginalNombre,
            tieneActaFirmada: this.tieneActaFirmada,
            actaFirmadaNombre: this.actaFirmadaNombre
          });

          if (this.esModoAuditor) {
            this.cargarDatosAuditorEspecificos(documentoData);
          }

          const estadoReal = documentoData.estado || documentoData.estadoDocumento || '';
          console.log('🔍 Estado REAL del documento:', estadoReal);

          this.determinarModoPorEstadoDocumento(documentoData, estadoReal);
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
        error: (err: any) => {
          console.error('[SupervisorForm] Falló carga completa con ID:', id, err);
          this.isLoading = false;
        }
      });
  }

  /**
   * ✅ NUEVO MÉTODO: Recarga el documento sin cerrar el modal
   */
  recargarDocumento(): void {
    if (this.documentoId) {
      this.isLoading = true;
      this.cargarDocumentoCompleto(this.documentoId);
      this.notificationService.info('Recargando', 'Actualizando información del documento...');
    }
  }

  private determinarModoPorEstadoDocumento(documentoData: any, estadoReal: string): void {
    const estadoDocumento = estadoReal.toUpperCase().trim();

    console.log('🔍 [determinarModoPorEstadoDocumento] Estado del documento:', estadoDocumento);
    console.log('🔍 [determinarModoPorEstadoDocumento] Modo input:', this.modo);

    const rolesSoloLectura = ['auditoria', 'contabilidad', 'tesoreria', 'asesor-gerencia', 'juridica'];
    if (rolesSoloLectura.includes(this.modo)) {
      this.soloLectura = true;
      this.modoEdicion = false;
      console.log('🔒 FORZADO SOLO LECTURA - Rol de solo lectura:', this.modo);
      return;
    }

    const estadosFinales = [
      'APROBADO_SUPERVISOR', 'APROBADO_AUDITOR', 'APROBADO_RENDICION_CUENTAS',
      'APROBADO_CONTABILIDAD', 'APROBADO_TESORERIA', 'COMPLETADO', 'COMPLETADO_AUDITOR',
      'COMPLETADO_CONTABILIDAD', 'COMPLETADO_TESORERIA', 'COMPLETADO_ASESOR_GERENCIA',
      'RECHAZADO_SUPERVISOR', 'RECHAZADO_AUDITOR', 'OBSERVADO_SUPERVISOR', 'OBSERVADO_AUDITOR',
      'PAGADO', 'FINALIZADO', 'FIRMADO_SUPERVISOR'
    ];

    if (estadosFinales.includes(estadoDocumento)) {
      this.soloLectura = true;
      this.modoEdicion = false;
      console.log('🔒 FORZADO SOLO LECTURA - Estado final del documento:', estadoDocumento);
      return;
    }

    const estadosEditablesSupervisor = ['APROBADO_AUDITOR', 'EN_REVISION_SUPERVISOR'];
    const esEstadoEditable = estadosEditablesSupervisor.includes(estadoDocumento);

    if (esEstadoEditable) {
      const usuarioActual = this.getCurrentUser().trim();
      let supervisorAsignado = documentoData.supervisorAsignado || documentoData.asignacion?.supervisorActual || '';
      supervisorAsignado = supervisorAsignado.trim();

      const soyElSupervisor = this.compararNombres(supervisorAsignado, usuarioActual) ||
        usuarioActual.includes('Administrador') ||
        !supervisorAsignado ||
        supervisorAsignado === 'Sin asignar';

      if (soyElSupervisor) {
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

    this.soloLectura = true;
    this.modoEdicion = false;
    console.log('⚠️ Por defecto: SOLO LECTURA para estado:', estadoDocumento);
  }

  private determinarModoDesdeParams(params: any, url: string): void {
    console.log('🔍 Determinando modo desde parámetros (referencia):', params);
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

            if (registroSupervisor.actaFirmadaPath) {
              this.tieneActaFirmada = true;
              this.actaFirmadaNombre = registroSupervisor.actaFirmadaNombre;
              this.fechaFirma = registroSupervisor.fechaFirma ? new Date(registroSupervisor.fechaFirma) : null;
              console.log('✅ Acta firmada encontrada en historial:', this.actaFirmadaNombre);
            }

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
    const estadoAprobado = historial.find((h: any) =>
      h.estado === 'APROBADO' ||
      h.estado === 'APROBADO_SUPERVISOR' ||
      h.estado === 'APROBADO_AUDITOR'
    );

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

    const estadoBackend = docData.estado || '';
    const estadoParaDropdown = this.mapearEstadoParaDropdown(estadoBackend);

    console.log(`🔀 Mapeando estado: "${estadoBackend}" → "${estadoParaDropdown}"`);

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
      estadoRevision: estadoParaDropdown
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
    const estadoActual = this.revisionForm.get('estadoRevision')?.value;

    console.log('[configurarFormularioSegunModo] soloLectura =', this.soloLectura);

    if (this.soloLectura === true) {
      console.log('🔒 BLOQUEANDO FORMULARIO COMPLETO - Modo solo lectura');
      this.revisionForm.disable();
      this.mostrarCampoArchivo = false;
      this.archivoAprobacion = null;
      this.archivoPazSalvo = null;
      this.cdr.detectChanges();
      return;
    }

    console.log('✏️ MODO EDICIÓN - Habilitando campos editables');

    this.revisionForm.get('estadoRevision')?.enable();
    this.revisionForm.get('observacionSupervisor')?.enable();
    this.revisionForm.get('correcciones')?.enable();
    this.revisionForm.get('esUltimoRadicado')?.enable();

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

    this.mostrarCampoArchivo = estadoActual === 'APROBADO';

    this.cdr.detectChanges();
  }

  /**
   * ✅ MÉTODO MODIFICADO: Guardar revisión SIN cerrar el modal
   */
  guardarRevision(): void {
    const idParaGuardar = this.documentoId;

    if (!idParaGuardar) {
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

    console.log('[guardarRevision] Validando aprobación:', {
      estado: estadoSeleccionado,
      tieneFirma: this.tieneFirma,
      tienePosicion: !!this.firmaPosicion,
      userSignatureId: this.userSignature?.id
    });

    if (estadoSeleccionado === 'APROBADO') {
      if (!this.tieneFirma) {
        this.notificationService.error('Error', 'Debes tener una firma digital registrada para aprobar');
        return;
      }

      if (!this.firmaPosicion) {
        this.abrirSelectorPosicion();
        this.notificationService.warning('Posición requerida', 'Selecciona la posición de la firma en el acta');
        return;
      }
    }

    if (!confirm('¿Guardar revisión? Esto cambiará el estado del documento.')) return;

    this.isProcessing = true;
    const valores = this.revisionForm.getRawValue();

    const estadoParaEnviar = estadoSeleccionado;

    const payload: any = {
      estado: estadoParaEnviar,
      observacion: valores.observacionSupervisor || '',
      correcciones: valores.correcciones || '',
      requierePazSalvo: esUltimo,
      esUltimoRadicado: Boolean(esUltimo)
    };

    if (estadoSeleccionado === 'APROBADO') {
      if (this.firmaPosicion && this.userSignature?.id) {
        payload.signatureId = this.userSignature.id;
        payload.signaturePosition = JSON.stringify({
          page: this.firmaPosicion.page,
          x: this.firmaPosicion.x,
          y: this.firmaPosicion.y,
          width: this.firmaPosicion.width,
          height: this.firmaPosicion.height
        });
        console.log('[Supervisor] Enviando firma con revisión:', {
          signatureId: this.userSignature.id,
          signaturePosition: payload.signaturePosition
        });
      } else {
        console.error('[Supervisor] ERROR: No se encontró firma o posición al guardar');
        this.notificationService.error('Error', 'No se pudo obtener la información de la firma');
        this.isProcessing = false;
        return;
      }
    }

    console.log('[Supervisor] Payload final:', JSON.stringify(payload, null, 2));

    let request: Observable<any>;

    if (estadoSeleccionado === 'APROBADO' && (this.archivoAprobacion || this.archivoPazSalvo)) {
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
        
        // ✅ Limpiar estados temporales
        this.isProcessing = false;
        this.firmaPosicion = null;
        this.mostrarSelectorPosicion = false;
        this.archivoAprobacion = null;
        this.archivoPazSalvo = null;
        
        // ✅ FORZAR modo solo lectura después de guardar
        this.soloLectura = true;
        this.modoEdicion = false;
        
        // ✅ RECARGAR el documento (NO cerrar el modal)
        this.cargarDocumentoCompleto(idParaGuardar);
        
        // ✅ Mostrar mensaje informativo
        this.notificationService.info(
          'Documento actualizado', 
          estadoSeleccionado === 'APROBADO' 
            ? 'El documento ha sido aprobado y el acta ha sido firmada. Puedes visualizar el documento firmado.' 
            : 'La revisión ha sido guardada. El documento ahora está en modo solo lectura.'
        );
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[SupervisorForm] Error al guardar:', err);
        let msg = err.error?.message || err.message || 'No se pudo guardar la revisión';
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
    if (this.soloLectura) {
      console.log('[puedeGuardar] false - soloLectura es true');
      return false;
    }
    
    const estado = this.revisionForm.get('estadoRevision')?.value;
    const esUltimoRadicado = this.revisionForm.get('esUltimoRadicado')?.value;
    const esFormularioValido = this.revisionForm.valid;

    if (estado === 'APROBADO') {
      if (!this.tieneFirma) {
        return false;
      }
      
      if (!this.firmaPosicion) {
        return false;
      }
      
      if (esUltimoRadicado && !this.archivoPazSalvo && !this.tienePazSalvoExistente()) {
        console.log('[puedeGuardar] false - Último radicado sin paz y salvo');
        return false;
      }
      
      return esFormularioValido;
    }
    
    console.log('[puedeGuardar]', esFormularioValido ? 'true' : 'false', '- Estado:', estado);
    return esFormularioValido;
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
        this.notificationService?.info('Corrección automática', 'Se detectó un archivo de paz y salvo. El documento ha sido automáticamente marcado como último radicado.');
      }
    }

    if (esUltimoRadicado && !tieneArchivoPazSalvo && !this.soloLectura) {
      console.warn('⚠️ ADVERTENCIA: Marcado como último radicado pero sin archivo de paz y salvo');
      this.notificationService?.warning('Atención', 'Al marcar como último radicado, debe adjuntar el archivo de paz y salvo.');
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
      nombreArchivo = this.nombreArchivoAprobacionExistente;
    } else {
      nombreArchivo = this.nombrePazSalvoExistente;
    }

    if (!nombreArchivo) {
      this.notificationService.warning('Sin archivo', 'No hay archivo para previsualizar');
      return;
    }

    const url = this.supervisorArchivosService.getUrlArchivoSupervisor(nombreArchivo, tipo);

    if (url && url !== '#') {
      window.open(url, '_blank');
    } else {
      this.notificationService.error('Error', 'No se pudo generar la URL del archivo');
    }
  }

  descargarArchivosSupervisor(tipo: 'aprobacion' | 'pazsalvo'): void {
    let nombreArchivo = '';

    if (tipo === 'aprobacion') {
      nombreArchivo = this.nombreArchivoAprobacionExistente;
      if (!nombreArchivo) {
        this.notificationService.warning('Sin archivo', 'No hay archivo de aprobación para descargar');
        return;
      }
    } else {
      nombreArchivo = this.nombrePazSalvoExistente;
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

    this.isProcessing = true;

    let servicioObservable: Observable<Blob>;
    if (this.esModoAuditor) {
      servicioObservable = this.auditorService.descargarArchivoRadicado(this.documentoId, this.documentosExistentes[index].indice);
    } else {
      servicioObservable = this.supervisorService.descargarArchivo(this.documentoId, this.documentosExistentes[index].indice);
    }

    servicioObservable.subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        this.isProcessing = false;
      },
      error: (error) => {
        console.error('Error al previsualizar:', error);
        this.notificationService.error('Error', 'No se pudo abrir el documento');
        this.isProcessing = false;
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
      case 'FIRMADO_SUPERVISOR': return 'badge bg-primary';
      default: return 'badge bg-light text-dark';
    }
  }

  debugFirma(): void {
    console.log('========== DEBUG FIRMA ==========');
    console.log('tieneFirma:', this.tieneFirma);
    console.log('userSignature:', this.userSignature);
    console.log('userSignature?.id:', this.userSignature?.id);
    console.log('firmaPosicion:', this.firmaPosicion);
    console.log('mostrarSelectorPosicion:', this.mostrarSelectorPosicion);
    console.log('estadoRevision:', this.revisionForm.get('estadoRevision')?.value);
    console.log('puedeGuardar():', this.puedeGuardar());
    console.log('soloLectura:', this.soloLectura);
    console.log('esModoAuditor:', this.esModoAuditor);
    console.log('currentUserRole:', this.currentUserRole);
    console.log('================================');
  }

  registrarFirmaPrueba(): void {
    if (!this.signatureService) {
      this.notificationService.error('Error', 'Servicio de firmas no disponible');
      return;
    }

    this.isProcessing = true;
    
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = '#cccccc';
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
      
      ctx.font = 'bold 24px cursive';
      ctx.fillStyle = '#000000';
      ctx.fillText('Firma Digital', 50, 80);
      
      const currentUser = this.authService?.getCurrentUser();
      const userName = currentUser?.fullName || currentUser?.username || 'Supervisor';
      ctx.font = '16px Arial';
      ctx.fillStyle = '#333333';
      ctx.fillText(userName, 50, 120);
      
      const fecha = new Date().toLocaleDateString();
      ctx.font = '12px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(fecha, 50, 150);
      
      ctx.beginPath();
      ctx.moveTo(50, 170);
      ctx.quadraticCurveTo(100, 180, 150, 165);
      ctx.quadraticCurveTo(200, 150, 250, 160);
      ctx.quadraticCurveTo(300, 170, 350, 155);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `firma_${this.currentUserRole}_${Date.now()}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });
          
          this.signatureService!.uploadSignature(file, 'Firma Digital Supervisor').subscribe({
            next: (signature) => {
              console.log('✅ Firma registrada exitosamente:', signature);
              this.userSignature = signature;
              this.tieneFirma = true;
              this.notificationService.success('Éxito', 'Firma digital registrada correctamente');
              this.cdr.detectChanges();
              this.isProcessing = false;
            },
            error: (err) => {
              console.error('❌ Error al registrar firma:', err);
              this.notificationService.error('Error', 'No se pudo registrar la firma: ' + (err.message || 'Error desconocido'));
              this.isProcessing = false;
            }
          });
        } else {
          this.notificationService.error('Error', 'No se pudo crear la imagen de la firma');
          this.isProcessing = false;
        }
      }, 'image/png');
    } else {
      this.notificationService.error('Error', 'No se pudo crear el canvas para la firma');
      this.isProcessing = false;
    }
  }

  private crearFirmaTemporal(): void {
    if (!this.signatureService) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '30px cursive';
      ctx.fillStyle = '#000000';
      ctx.fillText('Firma Temporal', 50, 100);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'firma_temporal.png', { type: 'image/png' });
          this.signatureService!.uploadSignature(file, 'Firma Temporal').subscribe({
            next: (signature) => {
              console.log('✅ Firma temporal creada:', signature);
              this.userSignature = signature;
              this.tieneFirma = true;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('❌ Error al crear firma temporal:', err);
            }
          });
        }
      }, 'image/png');
    }
  }
}