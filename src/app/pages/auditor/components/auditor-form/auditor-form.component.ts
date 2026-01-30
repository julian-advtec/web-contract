import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Observable, forkJoin } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { SupervisorFormComponent } from '../../../supervisor/components/supervisor-form/supervisor-form.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorService } from '../../../../core/services/auditor.service';
import { environment } from '../../../../../environments/environment';
import { throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

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
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './auditor-form.component.html',
  styleUrls: ['./auditor-form.component.scss']
})
export class AuditorFormComponent implements OnInit, OnDestroy {
  documentoId: string = '';
  isLoading = false;
  isProcessing = false;
  subiendoArchivos = false;

  documentoData: any = null;
  numeroRadicado: string = '';
  nombreContratista: string = '';
  estadoDocumento: string = '';
  primerRadicadoDelAno = false;

  observacionesDocumentos: string = '';

  isDownloadingAll = false;

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
  observacionesRevision = '';

  documentoEnRevision = false;
  estaEnRevision = false;

  archivosAuditorForm = new FormGroup({
    observaciones: new FormControl('')
  });

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auditorService: AuditorService,
    private http: HttpClient,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) { }

  modoSoloLectura: boolean = false;
  modo: string = 'edicion';
  decisionSeleccionada: string = '';

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.documentoId = params['id'];
      this.cargarDocumentoParaAuditor(this.documentoId);
    });

    this.route.queryParams.subscribe(qp => {
      this.modoSoloLectura = qp['soloLectura'] === 'true';
      this.modo = qp['modo'] || 'edicion';
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDocumentoParaAuditor(id: string): void {
    this.isLoading = true;
    const debugUrl = `${environment.apiUrl}/auditor/documentos/${id}/debug`;

    this.http.get(debugUrl, { headers: this.getAuthHeaders() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (debugResponse: any) => {
          if (debugResponse.debug) {
            this.procesarRespuestaDebug(debugResponse);
          } else {
            this.cargarConEndpointNormal(id);
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          this.cargarConEndpointNormal(id);
        }
      });
  }

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

// En el método procesarRespuestaDebug
private procesarRespuestaDebug(debugResponse: any): void {
  const doc = debugResponse.documento;
  
  this.documentoData = doc;
  this.numeroRadicado = doc.numeroRadicado || '';
  this.nombreContratista = doc.nombreContratista || '';
  this.estadoDocumento = doc.estado || '';
  this.primerRadicadoDelAno = !!doc.primerRadicadoDelAno;
  
  this.documentoEnRevision = this.estadoDocumento === 'EN_REVISION_AUDITOR';
  this.estaEnRevision = this.documentoEnRevision;
  
  // Inicializar con valores por defecto
  Object.keys(this.archivosAuditorFormulario).forEach(key => {
    this.archivosAuditorFormulario[key] = {
      subido: false,
      archivo: null,
      nombreArchivo: '',
      rutaServidor: null
    };
  });
  
  // IMPORTANTE: Procesar los archivos que vienen del debugResponse
  if (debugResponse.archivosDetalle && Array.isArray(debugResponse.archivosDetalle)) {
    debugResponse.archivosDetalle.forEach((archivo: any) => {
      if (archivo.tipo && this.archivosAuditorFormulario.hasOwnProperty(archivo.tipo)) {
        this.archivosAuditorFormulario[archivo.tipo] = {
          subido: archivo.subido || false,
          archivo: null, // No tenemos el File object, solo datos del backend
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
  
  // Contar archivos realmente subidos según datos del backend
  const subidosConfirmados = Object.values(this.archivosAuditorFormulario)
    .filter(a => a.subido === true && (a.rutaServidor || a.nombreArchivo))
    .length;
  
  this.archivosCompletos = subidosConfirmados === 6;
}

contarArchivosAuditorSubidos(): number {
  const subidos = Object.values(this.archivosAuditorFormulario)
    .filter(a => {
      // Un archivo se considera subido si:
      // 1. Tiene subido=true (del backend) Y
      // 2. Tiene rutaServidor O nombreArchivo
      return a.subido === true && (!!a.rutaServidor?.trim() || !!a.nombreArchivo?.trim());
    }).length;
  
  return subidos;
}

  hayArchivosSeleccionados(): boolean {
    const haySeleccionados = Object.values(this.archivosAuditorFormulario)
      .some(a => a.archivo !== null);
    return haySeleccionados;
  }

hayArchivosAuditorSubidos(): boolean {
  return Object.values(this.archivosAuditorFormulario).some(
    arch => arch.subido === true && (!!arch.rutaServidor?.trim() || !!arch.nombreArchivo?.trim())
  );
}

  puedeSubirArchivos(): boolean {
    const puede = this.primerRadicadoDelAno &&
      this.estadoDocumento === 'EN_REVISION_AUDITOR';
    return puede;
  }

puedeAccederArchivo(tipo: string): boolean {
  const arch = this.archivosAuditorFormulario[tipo as keyof typeof this.archivosAuditorFormulario];
  if (!arch) return false;
  
  // Solo se puede ver/descargar si está confirmado por el backend
  return arch.subido === true && 
    (!!arch.rutaServidor?.trim() || !!arch.nombreArchivo?.trim());
}

  puedeRealizarRevision(): boolean {
    if (this.estadoDocumento !== 'EN_REVISION_AUDITOR') {
      return false;
    }

    if (this.primerRadicadoDelAno && !this.archivosCompletos) {
      return false;
    }

    return true;
  }

  verificarEstado(): void {
    // Método vacío pero necesario para la lógica del componente
  }

  onArchivoSeleccionado(event: any, tipo: string): void {
    if (!this.puedeSubirArchivos()) {
      this.notificationService.warning('No permitido', 'No puede subir archivos en este estado');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validaciones de tamaño y tipo (mantener las que ya tienes)
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

    // Solo guardamos localmente → NO marcamos como subido todavía
    this.archivosAuditorFormulario[key] = {
      ...this.archivosAuditorFormulario[key],
      archivo: file,
      nombreArchivo: file.name,   // temporal, se actualizará con el nombre real del backend
      subido: false               // ¡muy importante!
    };

    this.verificarArchivosCompletos();
    this.cdr.detectChanges();
  }

subirArchivosAuditor(): void {
  if (!this.hayArchivosSeleccionados()) {
    this.notificationService.warning('Sin archivos', 'Selecciona al menos un archivo para subir');
    return;
  }
  
  if (!this.puedeSubirArchivos()) {
    this.notificationService.warning('No permitido', 'No se pueden subir archivos en este estado');
    return;
  }
  
  this.subiendoArchivos = true;
  this.isProcessing = true;
  
  const formData = new FormData();
  
  // Solo agregamos los que tienen archivo pendiente
  Object.entries(this.archivosAuditorFormulario).forEach(([key, data]) => {
    if (data.archivo) {
      formData.append(key, data.archivo);
    }
  });
  
  // Opcional: enviar observaciones si las hay
  if (this.archivosAuditorForm.value.observaciones?.trim()) {
    formData.append('observaciones', this.archivosAuditorForm.value.observaciones.trim());
  }
  
  this.auditorService.subirDocumentosAuditor(this.documentoId, formData).subscribe({
    next: (response) => {
      this.notificationService.success('Éxito', 'Archivos subidos correctamente');
      
      // IMPORTANTE: Actualizar el estado local según la respuesta del servidor
      if (response.data && Array.isArray(response.data.archivosSubidos)) {
        response.data.archivosSubidos.forEach((archivoSubido: any) => {
          if (archivoSubido.tipo && this.archivosAuditorFormulario[archivoSubido.tipo]) {
            this.archivosAuditorFormulario[archivoSubido.tipo].subido = true;
            this.archivosAuditorFormulario[archivoSubido.tipo].nombreArchivo = archivoSubido.nombre || '';
            this.archivosAuditorFormulario[archivoSubido.tipo].rutaServidor = archivoSubido.ruta || null;
          }
        });
      }
      
      // Limpiamos la selección local
      Object.keys(this.archivosAuditorFormulario).forEach(k => {
        const key = k as keyof typeof this.archivosAuditorFormulario;
        this.archivosAuditorFormulario[key].archivo = null;
      });
      
      // Recalcular estado
      this.verificarArchivosCompletos();
      this.cdr.detectChanges();
      
      this.subiendoArchivos = false;
      this.isProcessing = false;
      this.archivosAuditorForm.reset();
    },
    error: (err) => {
      this.notificationService.error('Error al subir', err.error?.message || 'No se pudieron subir los archivos');
      this.subiendoArchivos = false;
      this.isProcessing = false;
    }
  });
}

  abrirTodosArchivosAuditor(): void {
    const archivosSubidos = this.getArchivosSubidosAuditor();

    if (archivosSubidos.length === 0) {
      this.notificationService.info('Sin documentos', 'No hay archivos de auditoría disponibles');
      return;
    }

    let abiertos = 0;

    archivosSubidos.forEach((tipo: string) => {
      if (this.archivosAuditorFormulario[tipo]?.subido) {
        this.auditorService.previsualizarArchivoAuditor(this.documentoId, tipo);
        abiertos++;
        setTimeout(() => { }, 100);
      }
    });

    if (abiertos > 0) {
      this.notificationService.success('Archivos abiertos', `Se abrieron ${abiertos} documentos en nuevas pestañas`);
    }
  }

  descargarTodosArchivosAuditorMejorado(): void {
    if (this.isDownloadingAll) {
      return;
    }

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

        descargas.push(this.auditorService.descargarArchivoAuditor(this.documentoId, tipo));
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

  private getArchivosSubidosAuditor(): string[] {
    return Object.keys(this.archivosAuditorFormulario).filter(key => {
      const archivo = this.archivosAuditorFormulario[key];
      return archivo.subido && (archivo.rutaServidor || archivo.nombreArchivo || archivo.archivo);
    });
  }

  private descargarBlobComoArchivo(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  verTodosArchivosAuditor(): void {
    this.abrirTodosArchivosAuditor();
  }

  descargarTodosArchivosAuditor(): void {
    this.descargarTodosArchivosAuditorMejorado();
  }

  verArchivoAuditor(tipo: string): void {
    if (!this.puedeAccederArchivo(tipo)) {
      this.notificationService.warning('No disponible', 'El archivo no está disponible');
      return;
    }

    this.auditorService.previsualizarArchivoAuditor(this.documentoId, tipo);
  }

  descargarArchivoAuditor(tipo: string): void {
    if (!this.puedeAccederArchivo(tipo)) {
      this.notificationService.warning('No disponible', 'El archivo no está disponible');
      return;
    }

    this.isProcessing = true;

    this.auditorService.descargarArchivoAuditor(this.documentoId, tipo)
      .subscribe({
        next: (blob: Blob) => {
          const nombreArchivo = this.archivosAuditorFormulario[tipo].nombreArchivo || `${tipo}.pdf`;
          this.descargarBlobComoArchivo(blob, nombreArchivo);
          this.notificationService.success('Descarga', 'Archivo descargado correctamente');
          this.isProcessing = false;
        },
        error: (error) => {
          this.notificationService.error('Error', 'No se pudo descargar el archivo');
          this.isProcessing = false;
        }
      });
  }

  volverALista(): void {
    this.router.navigate(['/auditor/lista']);
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado || estado === 'SIN ESTADO') {
      return 'badge bg-light text-dark';
    }

    const upper = estado.toUpperCase();

    if (upper.includes('EN_REVISION_AUDITOR')) {
      return 'badge bg-info';
    }
    if (upper.includes('APROBADO_SUPERVISOR')) {
      return 'badge bg-success';
    }
    if (upper.includes('APROBADO_AUDITOR')) {
      return 'badge bg-success';
    }
    if (upper.includes('RECHAZADO_AUDITOR')) {
      return 'badge bg-danger';
    }
    if (upper.includes('OBSERVADO_AUDITOR')) {
      return 'badge bg-warning';
    }
    if (upper.includes('COMPLETADO_AUDITOR')) {
      return 'badge bg-primary';
    }

    if (upper.includes('EN_REVISION')) {
      return 'badge bg-info';
    }
    if (upper.includes('APROBADO')) {
      return 'badge bg-success';
    }
    if (upper.includes('RECHAZADO')) {
      return 'badge bg-danger';
    }
    if (upper.includes('OBSERVADO')) {
      return 'badge bg-warning';
    }

    return 'badge bg-light text-dark';
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

  liberarDocumento(): void {
    this.isProcessing = true;
    this.auditorService.liberarDocumento(this.documentoId).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Documento liberado');
        this.documentoEnRevision = false;
        this.estaEnRevision = false;
        this.isProcessing = false;
        this.cargarDocumentoParaAuditor(this.documentoId);
      },
      error: err => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo liberar el documento');
        this.isProcessing = false;
      }
    });
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

  archivosRealmenteSubidos(): boolean {
    return this.primerRadicadoDelAno ?
      this.contarArchivosRealmenteSubidos() === 6 : true;
  }

  registrarDecision(): void {
    if (!this.decisionSeleccionada || !this.observacionesRevision.trim()) {
      this.notificationService.warning('Advertencia', 'Debe seleccionar una decisión y escribir observaciones');
      return;
    }

    // Validación fuerte con datos del servidor
    if (this.primerRadicadoDelAno && this.contarArchivosRealmenteSubidos() < 6) {
      const faltan = 6 - this.contarArchivosRealmenteSubidos();
      this.notificationService.error(
        'Documentos incompletos',
        `Faltan ${faltan} documentos obligatorios para primer radicado.\n\nSuba todos antes de continuar.`
      );
      return;
    }

    this.isProcessing = true;

    // Si hay archivos nuevos seleccionados → subirlos primero
    if (this.primerRadicadoDelAno && this.contarArchivosSeleccionados() > 0) {
      this.notificationService.info('Procesando', 'Subiendo documentos primero...');

      this.subirArchivosPrimero().subscribe({
        next: () => {
          // Esperar 1.8 segundos y recargar estado real del servidor
          setTimeout(() => {
            this.cargarDocumentoParaAuditor(this.documentoId);
            this.verificarArchivosCompletos();
            this.cdr.detectChanges();

            // Ahora registrar decisión (sin archivos)
            this.enviarRevisionSimple();
          }, 1800);
        },
        error: (err) => {
          this.notificationService.error('Error', 'No se pudieron subir todos los archivos');
          console.error('Fallo en subida previa:', err);
          this.isProcessing = false;
        }
      });
    } else {
      // Sin archivos nuevos → directo a decisión
      this.enviarRevisionSimple();
    }
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

  // Contar archivos realmente subidos (según datos del servidor)
  contarArchivosRealmenteSubidos(): number {
    return Object.values(this.archivosAuditorFormulario)
      .filter(a => a.subido && (a.rutaServidor || a.nombreArchivo))
      .length;
  }

  // Contar archivos seleccionados localmente (para saber si hay que subir)
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

    // Agregar solo los archivos seleccionados
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
        // Limpiar selección local (ya están en servidor)
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
    // Método para debug (vacío)
  }

  private finalizarProceso(): void {
    this.isProcessing = false;
    this.decisionSeleccionada = '';
    this.observacionesRevision = '';
    // Limpiar archivos locales
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key].archivo = null;
    });
  }
}