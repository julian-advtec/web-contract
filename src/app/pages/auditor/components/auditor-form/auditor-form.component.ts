import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Observable, forkJoin, of, throwError } from 'rxjs';
import { takeUntil, map, catchError, tap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { SupervisorFormComponent } from '../../../supervisor/components/supervisor-form/supervisor-form.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorService } from '../../../../core/services/auditor.service';
import { environment } from '../../../../../environments/environment';

interface ArchivoAuditor {
  subido: boolean;
  archivo: File | null;
  nombreArchivo: string;
  rutaServidor: string | null;
}

interface DocumentoAuditoriaItem {
  key: string;
  nombre: string;
  icon: string;
}

@Component({
  selector: 'app-auditor-form',
  standalone: true,
  imports: [
    CommonModule,
    SupervisorFormComponent,
    FormsModule
  ],
  templateUrl: './auditor-form.component.html',
  styleUrls: ['./auditor-form.component.scss']
})
export class AuditorFormComponent implements OnInit, OnDestroy {
  @Input() documentoIdExterno?: string;
  @Input() modo: 'auditoria' | 'contabilidad' | 'general' = 'auditoria';
  @Input() soloLectura: boolean = false;

  documentoId: string = '';

  isLoading = false;
  isProcessing = false;
  subiendoArchivos = false;

  // Variables necesarias para que compile (antes daban error)
  documentoEnRevision = false;
  estaEnRevision = false;
  isDownloadingAll = false;

  documentoData: any = null;
  numeroRadicado: string = '';
  nombreContratista: string = '';
  estadoDocumento: string = '';
  primerRadicadoDelAno = false;

  observacionesRevision = '';
  decisionSeleccionada = '';

  // Variables para modo solo lectura
  decisionAuditor: string = '';
  observacionAuditor: string = '';
  fechaDecisionAuditor: Date | null = null;
  nombreAuditor: string = 'Auditor';

  documentosExistentes: any[] = [
    { nombre: '', disponible: false, tipo: 'cuentaCobro', indice: 1, nombreOriginal: '' },
    { nombre: '', disponible: false, tipo: 'seguridadSocial', indice: 2, nombreOriginal: '' },
    { nombre: '', disponible: false, tipo: 'informeActividades', indice: 3, nombreOriginal: '' }
  ];

  listaDocumentosAuditoria: DocumentoAuditoriaItem[] = [
    { key: 'rp', nombre: 'Resolución de Pago (RP)', icon: 'fas fa-file-invoice-dollar text-primary' },
    { key: 'cdp', nombre: 'Certificado de Disponibilidad Presupuestal (CDP)', icon: 'fas fa-file-contract text-success' },
    { key: 'poliza', nombre: 'Póliza de Cumplimiento', icon: 'fas fa-file-shield text-info' },
    { key: 'certificadoBancario', nombre: 'Certificado Bancario', icon: 'fas fa-university text-danger' },
    { key: 'minuta', nombre: 'Minuta de Contrato', icon: 'fas fa-gavel text-warning' },
    { key: 'actaInicio', nombre: 'Acta de Inicio', icon: 'fas fa-clipboard-check text-success' }
  ];

  archivosAuditorFormulario: Record<string, ArchivoAuditor> = {
    rp: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null },
    cdp: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null },
    poliza: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null },
    certificadoBancario: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null },
    minuta: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null },
    actaInicio: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null }
  };

  archivosCompletos = false;

  private destroy$ = new Subject<void>();

  esModoContabilidad = false;
  esModoGeneral = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auditorService: AuditorService,
    private http: HttpClient,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {

    console.log('Valor de soloLectura al iniciar:', this.soloLectura);
    console.log('EstadoDocumento:', this.estadoDocumento);
    console.log('esModoSoloLectura() devuelve:', this.esModoSoloLectura());
    this.esModoContabilidad = this.modo === 'contabilidad';
    this.esModoGeneral = this.modo === 'general';

    if ((this.esModoContabilidad || this.esModoGeneral) && this.documentoIdExterno) {
      this.documentoId = this.documentoIdExterno;
      this.soloLectura = true;
      this.cargarDocumentoParaAuditor(this.documentoId);
    } else {
      this.route.params.subscribe(params => {
        this.documentoId = params['id'];
        this.cargarDocumentoParaAuditor(this.documentoId);
      });

this.route.queryParams.subscribe(qp => {
  // Solo aplicar soloLectura de la URL si NO estamos en revisión activa
  if (qp['soloLectura'] === 'true' && this.estadoDocumento !== 'EN_REVISION_AUDITOR') {
    this.soloLectura = true;
    console.log('[QUERY PARAM] Forzado soloLectura = true desde URL');
  } else {
    console.log('[QUERY PARAM] Ignorado soloLectura=true porque está en revisión');
  }
});
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  esModoSoloLectura(): boolean {
    // Prioridad #1: si está en revisión del auditor → SIEMPRE permitir edición
    // (salvo que sea modo contabilidad o general)
    if (this.estadoDocumento === 'EN_REVISION_AUDITOR') {
      return this.esModoContabilidad || this.esModoGeneral;
    }

    // Para los demás casos: solo lectura si ya fue decidido o viene forzado
    return (
      this.soloLectura ||
      this.esModoContabilidad ||
      this.esModoGeneral ||
      ['APROBADO_AUDITOR', 'COMPLETADO_AUDITOR', 'RECHAZADO_AUDITOR', 'OBSERVADO_AUDITOR']
        .includes(this.estadoDocumento)
    );
  }

  getClaseEstado(estado: string): string {
    if (!estado) return 'bg-secondary text-white';

    const upper = estado.toUpperCase();
    if (upper.includes('APROBADO') || upper.includes('COMPLETADO')) return 'bg-success text-white';
    if (upper.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (upper.includes('RECHAZADO')) return 'bg-danger text-white';
    return 'bg-secondary text-white';
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado || estado === 'SIN ESTADO') {
      return 'badge bg-light text-dark';
    }

    const upper = estado.toUpperCase();

    if (upper.includes('EN_REVISION_AUDITOR')) return 'badge bg-info';
    if (upper.includes('APROBADO_SUPERVISOR')) return 'badge bg-success';
    if (upper.includes('APROBADO_AUDITOR')) return 'badge bg-success';
    if (upper.includes('RECHAZADO_AUDITOR')) return 'badge bg-danger';
    if (upper.includes('OBSERVADO_AUDITOR')) return 'badge bg-warning';
    if (upper.includes('COMPLETADO_AUDITOR')) return 'badge bg-primary';
    if (upper.includes('EN_REVISION_CONTABILIDAD')) return 'badge bg-secondary';
    if (upper.includes('APROBADO_CONTABILIDAD')) return 'badge bg-success';
    if (upper.includes('EN_REVISION_TESORERIA')) return 'badge bg-secondary';
    if (upper.includes('APROBADO_TESORERIA')) return 'badge bg-success';
    if (upper.includes('COMPLETADO')) return 'badge bg-dark';

    if (upper.includes('EN_REVISION')) return 'badge bg-info';
    if (upper.includes('APROBADO')) return 'badge bg-success';
    if (upper.includes('RECHAZADO')) return 'badge bg-danger';
    if (upper.includes('OBSERVADO')) return 'badge bg-warning';

    return 'badge bg-light text-dark';
  }

  cargarDocumentoParaAuditor(id: string): void {
    this.isLoading = true;

    this.auditorService.obtenerDocumentoParaVista(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.documentoData = data?.documento || null;
        this.numeroRadicado = data?.documento?.numeroRadicado || '';
        this.nombreContratista = data?.documento?.nombreContratista || '';
        this.estadoDocumento = data?.documento?.estado || '';
        this.primerRadicadoDelAno = !!data?.documento?.primerRadicadoDelAno;

        if (this.estadoDocumento === 'EN_REVISION_AUDITOR') {
          this.soloLectura = false;
          console.log('[FORZADO] Modo edición activado porque está EN_REVISION_AUDITOR');
        }

        // Logs para confirmar
        console.log('[CARGA] Estado final:', this.estadoDocumento);
        console.log('[CARGA] soloLectura después de forzado:', this.soloLectura);
        console.log('[CARGA] esModoSoloLectura después de forzado:', this.esModoSoloLectura());
        console.log('[CARGA] ¿Debería mostrar el formulario de edición?:',
          this.estadoDocumento === 'EN_REVISION_AUDITOR' && !this.esModoSoloLectura());

        // Extraer decisión y observación del auditor
        if (data?.auditor) {
          const aud = data.auditor;
          this.decisionAuditor = this.mapearEstadoAuditor(aud.estado);
          this.observacionAuditor = aud.observaciones || '';
          this.fechaDecisionAuditor = aud.fechaAprobacion || aud.fechaFinRevision || null;
          this.nombreAuditor = aud.auditor?.nombre || 'Auditor';
        } else if (this.estadoDocumento?.includes('_AUDITOR')) {
          this.decisionAuditor = this.mapearEstadoAuditor(this.estadoDocumento);
          this.observacionAuditor = this.documentoData?.comentarios || '';
          this.fechaDecisionAuditor = this.documentoData?.fechaActualizacion || null;
        }

        this.actualizarArchivosDesdeServidor(data?.archivosAuditor || []);

        // Forzar modo solo lectura si ya hay decisión
        if (['APROBADO_AUDITOR', 'COMPLETADO_AUDITOR', 'RECHAZADO_AUDITOR', 'OBSERVADO_AUDITOR']
          .includes(this.estadoDocumento)) {
          this.soloLectura = true;
        }

        this.documentoEnRevision = this.estadoDocumento === 'EN_REVISION_AUDITOR';
        this.estaEnRevision = this.documentoEnRevision;

        this.cdr.detectChanges();
        this.isLoading = false;
      },
      error: (err) => {
        this.notificationService.error('Error', 'No se pudo cargar el documento');
        this.isLoading = false;
      }
    });
  }

  private mapearEstadoAuditor(estado: string): string {
    if (!estado) return '';
    const upper = estado.toUpperCase();
    if (upper.includes('APROBADO')) return 'APROBADO';
    if (upper.includes('OBSERVADO')) return 'OBSERVADO';
    if (upper.includes('RECHAZADO')) return 'RECHAZADO';
    if (upper.includes('COMPLETADO')) return 'COMPLETADO';
    return estado;
  }

  private actualizarArchivosDesdeServidor(archivos: any[]): void {
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key] = {
        subido: false,
        archivo: null,
        nombreArchivo: '',
        rutaServidor: null
      };
    });

    archivos.forEach((a: any) => {
      const key = a.tipo;
      if (this.archivosAuditorFormulario[key]) {
        this.archivosAuditorFormulario[key] = {
          subido: !!a.subido,
          archivo: null,
          nombreArchivo: a.nombreArchivo || '',
          rutaServidor: a.rutaServidor || null
        };
      }
    });
  }

  verArchivoAuditor(tipo: string): void {
    if (!this.puedeAccederArchivo(tipo)) {
      this.notificationService.warning('No disponible', 'Archivo no subido');
      return;
    }
    this.auditorService.previsualizarArchivoAuditor(this.documentoId, tipo);
  }

  descargarArchivoAuditor(tipo: string): void {
    if (!this.puedeAccederArchivo(tipo)) {
      this.notificationService.warning('No disponible', 'Archivo no subido');
      return;
    }
    this.auditorService.descargarArchivoAuditorDirecto(this.documentoId, tipo);
  }

  volverALista(): void {
    if (this.esModoContabilidad) {
      this.router.navigate(['/contabilidad/pendientes']);
      return;
    }
    if (this.esModoGeneral) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.router.navigate(['/auditor/lista']);
  }

  onArchivoSeleccionado(event: any, tipo: string): void {
if (this.esModoContabilidad || this.esModoGeneral) {
    this.notificationService.warning('No permitido', 'No puede subir archivos en modo contabilidad/general');
    return;
  }

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      this.notificationService.error('Error', `El archivo excede 15MB`);
      event.target.value = '';
      return;
    }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      this.notificationService.error('Error', `Tipo de archivo no permitido`);
      event.target.value = '';
      return;
    }

    const key = tipo as keyof typeof this.archivosAuditorFormulario;

    this.archivosAuditorFormulario[key] = {
      ...this.archivosAuditorFormulario[key],
      archivo: file,
      nombreArchivo: file.name,
      subido: false
    };

    this.verificarArchivosCompletos();
    this.cdr.detectChanges();
  }

  puedeSubirArchivos(): boolean {
    return this.primerRadicadoDelAno &&
      this.estadoDocumento === 'EN_REVISION_AUDITOR' &&
      !this.esModoContabilidad &&
      !this.esModoGeneral;
  }

  puedeAccederArchivo(tipo: string): boolean {
    const arch = this.archivosAuditorFormulario[tipo];
    return arch?.subido && !!arch.nombreArchivo;
  }

  hayArchivosAuditorSubidos(): boolean {
    return Object.values(this.archivosAuditorFormulario).some(
      arch => arch.subido && (!!arch.rutaServidor?.trim() || !!arch.nombreArchivo?.trim())
    );
  }

  contarArchivosRealmenteSubidos(): number {
    return Object.values(this.archivosAuditorFormulario)
      .filter(a => a.subido && (a.rutaServidor || a.nombreArchivo))
      .length;
  }

  hayArchivosPendientesDeSubir(): boolean {
    return Object.values(this.archivosAuditorFormulario).some(a => !!a.archivo);
  }

  private getArchivosSubidosAuditor(): string[] {
    return Object.keys(this.archivosAuditorFormulario).filter(key => {
      const arch = this.archivosAuditorFormulario[key];
      return arch.subido && (arch.nombreArchivo?.trim() || arch.rutaServidor?.trim());
    });
  }

  descargarTodosArchivosAuditorMejorado(): void {
    if (this.isDownloadingAll) return;

    const archivosSubidos = this.getArchivosSubidosAuditor();
    if (archivosSubidos.length === 0) {
      this.notificationService.info('Sin documentos', 'No hay archivos para descargar');
      return;
    }

    this.isDownloadingAll = true;
    this.isProcessing = true;

    this.notificationService.info('Descarga iniciada', `Descargando ${archivosSubidos.length} archivos...`);

    const descargas: Observable<Blob>[] = [];
    const nombresArchivos: string[] = [];
    const tiposArchivos: string[] = [];

    archivosSubidos.forEach(tipo => {
      if (this.archivosAuditorFormulario[tipo]?.subido) {
        const nombreArchivo = this.archivosAuditorFormulario[tipo].nombreArchivo || `${tipo}.pdf`;
        descargas.push(this.auditorService.descargarArchivoAuditorBlob(this.documentoId, tipo));
        nombresArchivos.push(nombreArchivo);
        tiposArchivos.push(tipo);
      }
    });

    forkJoin(descargas).subscribe({
      next: (blobs: Blob[]) => {
        blobs.forEach((blob, index) => {
          const tipo = tiposArchivos[index];
          const nombreArchivo = nombresArchivos[index];
          setTimeout(() => {
            this.descargarBlobComoArchivo(blob, nombreArchivo);
          }, index * 300);
        });

        this.notificationService.success(
          'Descarga completada',
          `${blobs.length} archivos descargados correctamente`
        );

        this.isDownloadingAll = false;
        this.isProcessing = false;
      },
      error: (error) => {
        this.notificationService.error('Error', 'No se pudieron descargar todos los archivos');
        this.isDownloadingAll = false;
        this.isProcessing = false;
      }
    });
  }

  descargarTodosArchivosAuditor(): void {
    const subidos = this.getArchivosSubidosAuditor();
    if (subidos.length === 0) {
      this.notificationService.info('Sin documentos', 'No hay archivos subidos');
      return;
    }
    this.auditorService.descargarTodosArchivosAuditor(this.documentoId);
  }

  abrirTodosArchivosAuditor(): void {
    const subidos = this.getArchivosSubidosAuditor();
    if (subidos.length === 0) return;

    subidos.forEach((tipo, i) => {
      setTimeout(() => this.verArchivoAuditor(tipo), i * 700);
    });
  }

  private descargarBlobComoArchivo(blob: Blob, nombre: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    const userJson = localStorage.getItem('user');
    const userId = userJson ? JSON.parse(userJson).id : null;

    const headers = new HttpHeaders({
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    if (userId) {
      return headers.set('X-Auditor-Id', userId);
    }

    return headers;
  }

  // Métodos de decisión (los que el HTML necesita)
  registrarDecision(): void {
    if (!this.decisionSeleccionada) {
      this.notificationService.warning('Atención', 'Seleccione una decisión');
      return;
    }

    if (['OBSERVADO', 'RECHAZADO'].includes(this.decisionSeleccionada) &&
      !this.observacionesRevision.trim()) {
      this.notificationService.warning('Atención', 'Ingrese observaciones para esta decisión');
      return;
    }

    this.isProcessing = true;

    const formData = new FormData();

    Object.entries(this.archivosAuditorFormulario).forEach(([key, data]) => {
      if (data.archivo) {
        formData.append(key, data.archivo, data.archivo.name);
      }
    });

    formData.append('estado', this.decisionSeleccionada);
    formData.append('observaciones', this.observacionesRevision.trim() || 'Sin observaciones adicionales');

    this.auditorService.registrarDecisionCompleta(this.documentoId, formData).subscribe({
      next: (response) => {
        this.notificationService.success('Éxito', 'Decisión registrada correctamente');
        Object.keys(this.archivosAuditorFormulario).forEach(k => {
          this.archivosAuditorFormulario[k].archivo = null;
        });
        this.observacionesRevision = '';
        this.decisionSeleccionada = '';
        this.cargarDocumentoParaAuditor(this.documentoId);
        this.isProcessing = false;
        setTimeout(() => this.router.navigate(['/auditor/lista']), 2000);
      },
      error: (err) => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo registrar la decisión');
        this.isProcessing = false;
      }
    });
  }

  liberarDocumento(): void {
    this.isProcessing = true;
    this.auditorService.liberarDocumento(this.documentoId).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Documento liberado');
        this.cargarDocumentoParaAuditor(this.documentoId);
        this.isProcessing = false;
      },
      error: err => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo liberar el documento');
        this.isProcessing = false;
      }
    });
  }

  // Resto de métodos originales que tenías (sin eliminar ninguno)
  private cargarConEndpointNormal(id: string): void {
    const vistaUrl = `${environment.apiUrl}/auditor/documentos/${id}/vista`;

    this.http.get(vistaUrl, { headers: this.getAuthHeaders() })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          const fallbackUrl = `${environment.apiUrl}/auditor/documentos/${id}`;
          return this.http.get(fallbackUrl, { headers: this.getAuthHeaders() });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.procesarRespuestaDocumento(response);
          this.isLoading = false;
        },
        error: (error: any) => {
          this.isLoading = false;
        }
      });
  }

  private procesarRespuestaDebug(debugResponse: any): void {
    const doc = debugResponse.documento;

    this.documentoData = doc;
    this.numeroRadicado = doc.numeroRadicado || '';
    this.nombreContratista = doc.nombreContratista || '';
    this.estadoDocumento = doc.estado || '';
    this.primerRadicadoDelAno = !!doc.primerRadicadoDelAno;

    this.documentoEnRevision = this.estadoDocumento === 'EN_REVISION_AUDITOR';
    this.estaEnRevision = this.documentoEnRevision;

    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key] = {
        subido: false,
        archivo: null,
        nombreArchivo: '',
        rutaServidor: null
      };
    });

    if (debugResponse.archivosDetalle && Array.isArray(debugResponse.archivosDetalle)) {
      debugResponse.archivosDetalle.forEach((archivo: any) => {
        if (archivo.tipo && this.archivosAuditorFormulario.hasOwnProperty(archivo.tipo)) {
          this.archivosAuditorFormulario[archivo.tipo] = {
            subido: archivo.subido || false,
            archivo: null,
            nombreArchivo: archivo.nombre || '',
            rutaServidor: archivo.ruta || null
          };
        }
      });
    }

    this.verificarArchivosCompletos();
    this.verificarEstado();

    this.cdr.detectChanges();
  }

  private procesarRespuestaDocumento(response: any): void {
    let estadoEncontrado = 'SIN ESTADO';
    let docData = null;

    if (response?.data?.data?.documento) {
      docData = response.data.data.documento;
      estadoEncontrado = docData.estado || response.data.data.estado || 'SIN ESTADO';
    }
    else if (response?.data?.documento) {
      docData = response.data.documento;
      estadoEncontrado = docData.estado || response.data.estado || 'SIN ESTADO';
    }
    else if (response?.documento) {
      docData = response.documento;
      estadoEncontrado = docData.estado || response.estado || 'SIN ESTADO';
    }
    else if (response?.estado) {
      docData = response;
      estadoEncontrado = response.estado;
    }

    this.estadoDocumento = estadoEncontrado;

    if (docData) {
      this.documentoData = docData;
      this.numeroRadicado = docData.numeroRadicado || '';
      this.nombreContratista = docData.nombreContratista || '';
      this.primerRadicadoDelAno = !!docData.primerRadicadoDelAno;
    }

    let archivosAuditor = [];
    if (response?.data?.data?.archivosAuditor) {
      archivosAuditor = response.data.data.archivosAuditor;
    } else if (response?.data?.archivosAuditor) {
      archivosAuditor = response.data.archivosAuditor;
    } else if (response?.archivosAuditor) {
      archivosAuditor = response.archivosAuditor;
    }

    if (archivosAuditor.length > 0) {
      this.procesarArchivosAuditor(archivosAuditor);
    }

    let archivosRadicados = [];
    if (response?.data?.data?.archivosRadicados) {
      archivosRadicados = response.data.data.archivosRadicados;
    } else if (response?.data?.archivosRadicados) {
      archivosRadicados = response.data.archivosRadicados;
    } else if (response?.archivosRadicados) {
      archivosRadicados = response.archivosRadicados;
    }

    if (archivosRadicados.length > 0) {
      this.cargarDocumentosRadicados(archivosRadicados);
    }

    this.documentoEnRevision = this.estadoDocumento === 'EN_REVISION_AUDITOR';
    this.estaEnRevision = this.documentoEnRevision;

    this.cdr.detectChanges();

    setTimeout(() => {
      this.verificarEstado();
      this.verificarArchivosCompletos();
    }, 100);
  }

  private procesarArchivosAuditor(archivos: any[]): void {
    archivos.forEach((archivo: any) => {
      if (archivo.subido && archivo.tipo) {
        const key = archivo.tipo as keyof typeof this.archivosAuditorFormulario;
        if (this.archivosAuditorFormulario[key]) {
          this.archivosAuditorFormulario[key].subido = archivo.subido;
          this.archivosAuditorFormulario[key].nombreArchivo = archivo.nombreArchivo || '';
          this.archivosAuditorFormulario[key].rutaServidor = archivo.rutaServidor || null;
        }
      }
    });
  }

  tomarParaRevision(): void {
    this.isProcessing = true;

    this.auditorService.tomarDocumentoParaRevision(this.documentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationService.success('Éxito', 'Documento tomado para revisión');
          this.isProcessing = false;
          this.cargarDocumentoParaAuditor(this.documentoId);
        },
        error: (err) => {
          this.notificationService.error('Error', err.error?.message || 'No se pudo tomar el documento');
          this.isProcessing = false;
        }
      });
  }

  private cargarDocumentosRadicados(archivos: any[]): void {
    const cuentaCobro = archivos.find(a => a.numero === 1 || a.tipo?.includes('cuenta'));
    const seguridadSocial = archivos.find(a => a.numero === 2 || a.tipo?.includes('seguridad'));
    const informeActividades = archivos.find(a => a.numero === 3 || a.tipo?.includes('informe'));

    this.documentosExistentes = [
      {
        nombre: cuentaCobro?.nombre || '',
        nombreOriginal: cuentaCobro?.descripcion || 'cuenta_cobro.pdf',
        disponible: !!cuentaCobro?.nombre,
        tipo: 'cuentaCobro',
        indice: 1
      },
      {
        nombre: seguridadSocial?.nombre || '',
        nombreOriginal: seguridadSocial?.descripcion || 'seguridad_social.pdf',
        disponible: !!seguridadSocial?.nombre,
        tipo: 'seguridadSocial',
        indice: 2
      },
      {
        nombre: informeActividades?.nombre || '',
        nombreOriginal: informeActividades?.descripcion || 'informe_actividades.pdf',
        disponible: !!informeActividades?.nombre,
        tipo: 'informeActividades',
        indice: 3
      }
    ];
  }

  private actualizarArchivosAuditorFormulario(archivos: any[]): void {
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key] = {
        subido: false,
        archivo: null,
        nombreArchivo: '',
        rutaServidor: null
      };
    });

    archivos.forEach((archivo: any) => {
      if (archivo.subido && archivo.tipo) {
        const key = archivo.tipo as keyof typeof this.archivosAuditorFormulario;
        if (this.archivosAuditorFormulario[key]) {
          this.archivosAuditorFormulario[key].subido = true;
          this.archivosAuditorFormulario[key].nombreArchivo = archivo.nombreArchivo || '';
          this.archivosAuditorFormulario[key].rutaServidor = archivo.rutaServidor || null;
        }
      }
    });
  }

  private verificarArchivosCompletos(): void {
    if (!this.primerRadicadoDelAno) {
      this.archivosCompletos = true;
      return;
    }

    const subidosConfirmados = Object.values(this.archivosAuditorFormulario)
      .filter(a => a.subido === true && (a.rutaServidor || a.nombreArchivo))
      .length;

    this.archivosCompletos = subidosConfirmados === 6;
  }

  contarArchivosAuditorSubidos(): number {
    const subidos = Object.values(this.archivosAuditorFormulario)
      .filter(a => {
        return a.subido === true && (!!a.rutaServidor?.trim() || !!a.nombreArchivo?.trim());
      }).length;

    return subidos;
  }

  hayArchivosSeleccionados(): boolean {
    const haySeleccionados = Object.values(this.archivosAuditorFormulario)
      .some(a => a.archivo !== null);
    return haySeleccionados;
  }

  puedeRealizarRevision(): boolean {
    if (this.estadoDocumento !== 'EN_REVISION_AUDITOR') {
      return false;
    }

    if (this.primerRadicadoDelAno && !this.archivosCompletos) {
      return false;
    }

    if (this.esModoContabilidad || this.esModoGeneral) {
      return false;
    }

    return true;
  }

  verificarEstado(): void {
    // Puedes dejarlo vacío o agregar lógica si lo necesitas
  }

  aprobarDocumento(): void {
    if (!this.observacionesRevision.trim()) {
      this.notificationService.warning('Advertencia', 'Debe ingresar observaciones');
      return;
    }

    this.isProcessing = true;
    this.auditorService.guardarRevision(this.documentoId, {
      estado: 'APROBADO',
      observaciones: this.observacionesRevision
    }).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Documento aprobado');
        this.isProcessing = false;
        this.cargarDocumentoParaAuditor(this.documentoId);
        this.observacionesRevision = '';
      },
      error: err => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo aprobar el documento');
        this.isProcessing = false;
      }
    });
  }

  observarDocumento(): void {
    if (!this.observacionesRevision.trim()) {
      this.notificationService.warning('Advertencia', 'Debe ingresar observaciones');
      return;
    }

    this.isProcessing = true;
    this.auditorService.guardarRevision(this.documentoId, {
      estado: 'OBSERVADO',
      observaciones: this.observacionesRevision
    }).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Documento observado');
        this.isProcessing = false;
        this.cargarDocumentoParaAuditor(this.documentoId);
        this.observacionesRevision = '';
      },
      error: err => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo observar el documento');
        this.isProcessing = false;
      }
    });
  }

  rechazarDocumento(): void {
    if (!this.observacionesRevision.trim()) {
      this.notificationService.warning('Advertencia', 'Debe ingresar observaciones');
      return;
    }

    this.isProcessing = true;
    this.auditorService.guardarRevision(this.documentoId, {
      estado: 'RECHAZADO',
      observaciones: this.observacionesRevision
    }).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Documento rechazado');
        this.isProcessing = false;
        this.cargarDocumentoParaAuditor(this.documentoId);
        this.observacionesRevision = '';
      },
      error: err => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo rechazar el documento');
        this.isProcessing = false;
      }
    });
  }

  completarRevision(): void {
    this.isProcessing = true;
    this.auditorService.guardarRevision(this.documentoId, {
      estado: 'COMPLETADO',
      observaciones: this.observacionesRevision || 'Revisión completada'
    }).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Revisión completada');
        this.isProcessing = false;
        this.cargarDocumentoParaAuditor(this.documentoId);
        this.observacionesRevision = '';
      },
      error: err => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo completar la revisión');
        this.isProcessing = false;
      }
    });
  }

  archivosRealmenteSubidos(): boolean {
    return this.primerRadicadoDelAno ?
      this.contarArchivosRealmenteSubidos() === 6 : true;
  }

  private finalizarProceso(): void {
    this.decisionSeleccionada = '';
    this.observacionesRevision = '';
    this.recargarEstadoCompleto();
    this.isProcessing = false;
  }

  private enviarRevisionConArchivos(): void {
    const formData = new FormData();
    const datosRevision = {
      estado: this.decisionSeleccionada,
      observaciones: this.observacionesRevision,
      timestamp: new Date().toISOString()
    };

    formData.append('data', JSON.stringify(datosRevision));

    let archivosAgregados = 0;
    Object.entries(this.archivosAuditorFormulario).forEach(([tipo, datos]) => {
      if (datos.archivo) {
        formData.append(tipo, datos.archivo);
        archivosAgregados++;
      }
    });

    this.auditorService.registrarDecisionCompleta(this.documentoId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationService.success('Éxito', 'Decisión registrada correctamente');
          this.finalizarProceso();

          setTimeout(() => {
            this.router.navigate(['/auditor/lista']);
          }, 1500);
        },
        error: (err) => {
          this.enviarRevisionSecuencial();
        }
      });
  }

  enviarRevisionSimple(): void {
    this.auditorService.guardarRevision(this.documentoId, {
      estado: this.decisionSeleccionada,
      observaciones: this.observacionesRevision
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success('Éxito', 'Decisión registrada correctamente');
          this.finalizarProceso();
          setTimeout(() => {
            this.router.navigate(['/auditor/lista']);
          }, 1500);
        },
        error: (err) => {
          this.notificationService.error('Error', err.error?.message || 'No se pudo registrar la decisión');
          this.isProcessing = false;
        }
      });
  }

  contarArchivosSeleccionados(): number {
    return Object.values(this.archivosAuditorFormulario)
      .filter(a => a.archivo !== null)
      .length;
  }

  private enviarRevisionSecuencial(): void {
    this.subirArchivosPrimero().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.auditorService.guardarRevision(this.documentoId, {
          estado: this.decisionSeleccionada,
          observaciones: this.observacionesRevision
        }).pipe(takeUntil(this.destroy$)).subscribe({
          next: (response) => {
            this.notificationService.success('Éxito', 'Decisión registrada');
            this.finalizarProceso();

            setTimeout(() => {
              this.router.navigate(['/auditor/lista']);
            }, 1500);
          },
          error: (error) => {
            this.notificationService.error('Error', 'No se pudo completar la operación');
            this.isProcessing = false;
          }
        });
      },
      error: (error) => {
        this.notificationService.error('Error', 'No se pudo completar la operación');
        this.isProcessing = false;
      }
    });
  }

  subirArchivosPrimero(): Observable<any> {
    const formData = new FormData();

    Object.entries(this.archivosAuditorFormulario).forEach(([key, datos]) => {
      if (datos.archivo) {
        formData.append(key, datos.archivo);
      }
    });

    if (this.observacionesRevision.trim()) {
      formData.append('observaciones', this.observacionesRevision.trim());
    }

    return this.auditorService.subirArchivosAuditor(this.documentoId, formData).pipe(
      tap(() => {
        this.notificationService.success('Éxito', 'Archivos subidos correctamente');
        Object.keys(this.archivosAuditorFormulario).forEach(key => {
          this.archivosAuditorFormulario[key].archivo = null;
        });
      }),
      catchError(err => {
        this.notificationService.error('Error', 'Fallo al subir archivos');
        return throwError(() => err);
      })
    );
  }

  private intentarMetodoAlternativo(): void {
    const tieneArchivos = this.contarArchivosSeleccionados() > 0;

    if (tieneArchivos) {
      this.subirArchivosPrimero().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.registrarDecisionDespuesDeSubida();
        },
        error: (error) => {
          this.notificationService.error('Error', 'No se pudo completar la operación');
          this.isProcessing = false;
        }
      });
    } else {
      this.registrarDecisionDespuesDeSubida();
    }
  }

  private registrarDecisionDespuesDeSubida(): void {
    this.auditorService.guardarRevision(this.documentoId, {
      estado: this.decisionSeleccionada,
      observaciones: this.observacionesRevision
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationService.success('Éxito', 'Decisión registrada correctamente');
          this.finalizarProceso();

          setTimeout(() => {
            this.router.navigate(['/auditor/lista']);
          }, 1500);
        },
        error: (err) => {
          this.notificationService.error('Error', err.error?.message || 'Error registrando decisión');
          this.isProcessing = false;
        }
      });
  }

  private debugResponseStructure(response: any): void {
    // Método de depuración - puedes usarlo o comentarlo
  }

  contarDocumentosConfirmados(): number {
    if (!this.documentoData?.archivosAuditor) return 0;
    return this.documentoData.archivosAuditor.filter((a: any) => a.subido === true).length;
  }

  contarArchivosRealmenteSubidosEnFormulario(): number {
    return Object.values(this.archivosAuditorFormulario).filter(a =>
      a.subido === true &&
      (a.nombreArchivo?.trim() || a.rutaServidor?.trim())
    ).length;
  }

  archivosObligatoriosCompletos(): boolean {
    if (!this.primerRadicadoDelAno) return true;
    return this.contarDocumentosConfirmados() >= 6;
  }

  subirArchivosAuditor(): void {
    if (!this.hayArchivosPendientesDeSubir()) {
      this.notificationService.warning('Atención', 'No hay archivos nuevos seleccionados');
      return;
    }

    this.subiendoArchivos = true;

    const formData = new FormData();

    Object.entries(this.archivosAuditorFormulario).forEach(([key, data]) => {
      if (data.archivo) {
        formData.append(key, data.archivo);
      }
    });

    if (this.observacionesRevision?.trim()) {
      formData.append('observaciones', this.observacionesRevision.trim());
    }

    this.auditorService.subirArchivosAuditor(this.documentoId, formData).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Archivos subidos correctamente');

        Object.keys(this.archivosAuditorFormulario).forEach(k => {
          this.archivosAuditorFormulario[k as keyof typeof this.archivosAuditorFormulario].archivo = null;
        });

        this.recargarEstadoCompleto();

        this.subiendoArchivos = false;
      },
      error: (err) => {
        this.notificationService.error('Error', err.error?.message || 'Fallo al subir archivos');
        this.subiendoArchivos = false;
      }
    });
  }

  recargarEstadoCompleto(): void {
    this.cargarDocumentoParaAuditor(this.documentoId);
  }

  puedeRegistrarDecision(): boolean {
    if (this.estadoDocumento !== 'EN_REVISION_AUDITOR') return false;
    if (!this.decisionSeleccionada) return false;

    if (['OBSERVADO', 'RECHAZADO'].includes(this.decisionSeleccionada) &&
      !this.observacionesRevision?.trim()) {
      return false;
    }

    return true;
  }
}