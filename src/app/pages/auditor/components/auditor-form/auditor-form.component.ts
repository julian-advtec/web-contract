import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, interval } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
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
    private cdr: ChangeDetectorRef  // Para forzar detección de cambios
  ) { }

  modoSoloLectura: boolean = false;
  modo: string = 'edicion';
  decisionSeleccionada: string = '';

  ngOnInit(): void {
    console.log('[AUDITOR-FORM] Inicializando componente');

    this.route.params.subscribe(params => {
      this.documentoId = params['id'];
      console.log('[AUDITOR-FORM] Documento ID:', this.documentoId);
      
      // Cargar el documento
      this.cargarDocumentoParaAuditor(this.documentoId);
    });

    this.route.queryParams.subscribe(qp => {
      this.modoSoloLectura = qp['soloLectura'] === 'true';
      this.modo = qp['modo'] || 'edicion';
      console.log('[AUDITOR-FORM] Parámetros de consulta:', {
        soloLectura: this.modoSoloLectura,
        modo: this.modo
      });
    });

    // Monitorizar cambios en las variables críticas
    interval(1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('[MONITOR] estadoDocumento actual:', this.estadoDocumento);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDocumentoParaAuditor(id: string): void {
    console.log('[AUDITOR-FORM] Cargando documento para auditor:', id);
    this.isLoading = true;

    // TEMPORAL: Usar endpoint debug
    const debugUrl = `${environment.apiUrl}/auditor/documentos/${id}/debug`;
    console.log('[AUDITOR-FORM] Llamando a endpoint debug:', debugUrl);

    this.http.get(debugUrl, { headers: this.getAuthHeaders() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (debugResponse: any) => {
          console.log('[AUDITOR-FORM] Respuesta debug:', debugResponse);

          if (debugResponse.debug) {
            // Usar los datos del debug
            this.procesarRespuestaDebug(debugResponse);
          } else {
            // Intentar con el endpoint normal
            this.cargarConEndpointNormal(id);
          }

          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('[AUDITOR-FORM] Error en debug:', error);
          // Intentar con el endpoint normal si debug falla
          this.cargarConEndpointNormal(id);
        }
      });
  }

  private cargarConEndpointNormal(id: string): void {
    const vistaUrl = `${environment.apiUrl}/auditor/documentos/${id}/vista`;
    console.log('[AUDITOR-FORM] Llamando a endpoint normal:', vistaUrl);

    this.http.get(vistaUrl, { headers: this.getAuthHeaders() })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('[AUDITOR-FORM] Error en endpoint /vista:', error);
          const fallbackUrl = `${environment.apiUrl}/auditor/documentos/${id}`;
          console.log('[AUDITOR-FORM] Intentando fallback:', fallbackUrl);
          return this.http.get(fallbackUrl, { headers: this.getAuthHeaders() });
        })
      )
      .subscribe({
        next: (response: any) => {
          console.log('[AUDITOR-FORM] Respuesta normal:', response);
          this.procesarRespuestaDocumento(response);
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('[AUDITOR-FORM] Error cargando documento:', error);
          let mensaje = 'No se pudo cargar el documento';
          if (error.status === 403) mensaje = 'No tiene permisos';
          if (error.status === 404) mensaje = 'Documento no encontrado';

          this.notificationService.error('Error', mensaje);
          this.router.navigate(['/auditor/lista']);
          this.isLoading = false;
        }
      });
  }

  private procesarRespuestaDebug(debugResponse: any): void {
    console.log('[AUDITOR-FORM] Procesando respuesta debug');

    const doc = debugResponse.documento;

    this.documentoData = doc;
    this.numeroRadicado = doc.numeroRadicado || '';
    this.nombreContratista = doc.nombreContratista || '';
    this.estadoDocumento = doc.estado || '';
    this.primerRadicadoDelAno = !!doc.primerRadicadoDelAno;

    this.documentoEnRevision = this.estadoDocumento === 'EN_REVISION_AUDITOR';
    this.estaEnRevision = this.documentoEnRevision;

    console.log('[AUDITOR-FORM] Estado desde debug:', {
      estadoDocumento: this.estadoDocumento,
      numeroRadicado: this.numeroRadicado,
      primerRadicadoDelAno: this.primerRadicadoDelAno,
      documentoEnRevision: this.documentoEnRevision
    });

    // Inicializar archivos vacíos (ya que debug no los trae)
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key] = {
        subido: false,
        archivo: null,
        nombreArchivo: '',
        rutaServidor: null
      };
    });

    this.verificarArchivosCompletos();
    this.verificarEstado();
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  private procesarRespuestaDocumento(response: any): void {
    console.log('[AUDITOR-FORM] RESPUESTA COMPLETA DEL BACKEND:', response);
    
    // Obtener el estado de la respuesta
    this.estadoDocumento = response.estado || response.data?.documento?.estado || 'SIN ESTADO';
    
    console.log('[AUDITOR-FORM] Estado asignado:', this.estadoDocumento);
    
    // Procesar datos del documento
    const datos = response.data || response;
    const doc = datos?.documento || datos;
    
    if (doc) {
      this.documentoData = doc;
      this.numeroRadicado = doc.numeroRadicado || '';
      this.nombreContratista = doc.nombreContratista || '';
      this.primerRadicadoDelAno = !!doc.primerRadicadoDelAno;
      
      // Asegurar que estadoDocumento también se tome del documento si está disponible
      if (!this.estadoDocumento || this.estadoDocumento === 'SIN ESTADO') {
        this.estadoDocumento = doc.estado || doc.estadoDocumento || 'SIN ESTADO';
      }
    }
    
    // Actualizar banderas de estado
    this.documentoEnRevision = this.estadoDocumento === 'EN_REVISION_AUDITOR';
    this.estaEnRevision = this.documentoEnRevision;
    
    console.log('[AUDITOR-FORM] Datos procesados:', {
      estadoDocumento: this.estadoDocumento,
      numeroRadicado: this.numeroRadicado,
      nombreContratista: this.nombreContratista,
      primerRadicadoDelAno: this.primerRadicadoDelAno,
      documentoEnRevision: this.documentoEnRevision
    });
    
    // Forzar la detección de cambios
    this.cdr.detectChanges();
    
    // Verificar estado después de un breve delay
    setTimeout(() => {
      this.verificarEstado();
    }, 100);
  }

  tomarParaRevision(): void {
    console.log('[AUDITOR-FORM] Tomando documento para revisión');
    this.isProcessing = true;

    this.auditorService.tomarDocumentoParaRevision(this.documentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AUDITOR-FORM] Documento tomado:', response);
          this.notificationService.success('Éxito', 'Documento tomado para revisión');
          this.isProcessing = false;

          // Recargar el documento
          this.cargarDocumentoParaAuditor(this.documentoId);
        },
        error: (err) => {
          console.error('[AUDITOR-FORM] Error tomando documento:', err);
          this.notificationService.error('Error', err.error?.message || 'No se pudo tomar el documento');
          this.isProcessing = false;
        }
      });
  }

  private cargarDocumentosRadicados(archivos: any[]): void {
    console.log('[AUDITOR-FORM] Cargando documentos radicados:', archivos);

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
    console.log('[AUDITOR-FORM] Actualizando archivos auditor:', archivos);

    // Reiniciar el formulario
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key] = {
        subido: false,
        archivo: null,
        nombreArchivo: '',
        rutaServidor: null
      };
    });

    // Cargar archivos desde el servidor
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

    console.log('[AUDITOR-FORM] Archivos cargados desde servidor:', this.archivosAuditorFormulario);
  }

  private verificarArchivosCompletos(): void {
    // Para primer radicado: todos deben estar subidos
    // Para no primer radicado: no es obligatorio
    if (this.primerRadicadoDelAno) {
      this.archivosCompletos = Object.values(this.archivosAuditorFormulario).every(a => a.subido);
    } else {
      this.archivosCompletos = true; // No es obligatorio para no primer radicado
    }

    console.log('[AUDITOR-FORM] Archivos completos:', {
      primerRadicadoDelAno: this.primerRadicadoDelAno,
      archivosCompletos: this.archivosCompletos,
      archivosSubidos: this.contarArchivosAuditorSubidos()
    });
  }

  contarArchivosAuditorSubidos(): number {
    const subidos = Object.values(this.archivosAuditorFormulario).filter(a => a.subido).length;
    console.log('[AUDITOR-FORM] Archivos subidos:', subidos);
    return subidos;
  }

  hayArchivosSeleccionados(): boolean {
    const haySeleccionados = Object.values(this.archivosAuditorFormulario).some(a => a.archivo !== null);
    console.log('[AUDITOR-FORM] Hay archivos seleccionados:', haySeleccionados);
    return haySeleccionados;
  }

  hayArchivosAuditorSubidos(): boolean {
    const haySubidos = this.contarArchivosAuditorSubidos() > 0;
    console.log('[AUDITOR-FORM] Hay archivos auditor subidos:', haySubidos);
    return haySubidos;
  }

  puedeSubirArchivos(): boolean {
    const puede = this.primerRadicadoDelAno &&
      this.estadoDocumento === 'EN_REVISION_AUDITOR';

    console.log('[AUDITOR-FORM] Puede subir archivos:', {
      puede: puede,
      primerRadicadoDelAno: this.primerRadicadoDelAno,
      estadoDocumento: this.estadoDocumento,
      esEstadoCorrecto: this.estadoDocumento === 'EN_REVISION_AUDITOR'
    });

    return puede;
  }

  puedeAccederArchivo(tipo: string): boolean {
    const puede = this.archivosAuditorFormulario[tipo]?.subido || false;
    console.log('[AUDITOR-FORM] Puede acceder archivo', tipo, ':', puede);
    return puede;
  }

  puedeRealizarRevision(): boolean {
    console.log('[AUDITOR-FORM] Verificando si puede realizar revisión:', {
      estadoDocumento: this.estadoDocumento,
      documentoEnRevision: this.documentoEnRevision,
      estaEnRevision: this.estaEnRevision,
      primerRadicadoDelAno: this.primerRadicadoDelAno,
      archivosCompletos: this.archivosCompletos,
      archivosSubidos: this.contarArchivosAuditorSubidos()
    });

    // Si el documento está en estado EN_REVISION_AUDITOR
    if (this.estadoDocumento === 'EN_REVISION_AUDITOR') {
      // Si es primer radicado, necesita todos los archivos
      if (this.primerRadicadoDelAno) {
        const puede = this.archivosCompletos;
        console.log('[AUDITOR-FORM] Es primer radicado. Puede revisar:', puede);
        return puede;
      }
      // Si no es primer radicado, puede revisar siempre
      console.log('[AUDITOR-FORM] No es primer radicado. Puede revisar: true');
      return true;
    }

    console.log('[AUDITOR-FORM] No está en estado EN_REVISION_AUDITOR. Puede revisar: false');
    return false;
  }

  verificarEstado(): void {
    console.log('[AUDITOR-FORM] ===== ESTADO DETALLADO =====');
    console.log('Estado del documento:', this.estadoDocumento);
    console.log('¿Es EN_REVISION_AUDITOR?', this.estadoDocumento === 'EN_REVISION_AUDITOR');
    console.log('¿Puede realizar revisión?', this.puedeRealizarRevision());
    console.log('Primer radicado:', this.primerRadicadoDelAno);
    console.log('Archivos completos:', this.archivosCompletos);
    console.log('Archivos subidos:', this.contarArchivosAuditorSubidos());
    console.log('=========================================');

    // Llamar al backend directamente para ver la respuesta real
    const url = `${environment.apiUrl}/auditor/documentos/${this.documentoId}/vista`;
    this.http.get(url, { headers: this.getAuthHeaders() }).subscribe(
      (response: any) => {
        console.log('[DEBUG] Respuesta directa del backend:', response);
      },
      error => console.error('[DEBUG] Error:', error)
    );
  }

  onArchivoSeleccionado(event: any, tipo: string): void {
    console.log('[AUDITOR-FORM] Archivo seleccionado para tipo:', tipo);

    if (!this.puedeSubirArchivos()) {
      console.log('[AUDITOR-FORM] No puede subir archivos para este documento');
      this.notificationService.warning('No permitido', 'No puede subir archivos para este documento');
      return;
    }

    const file = event.target.files[0];
    if (!file) {
      console.log('[AUDITOR-FORM] No se seleccionó ningún archivo');
      return;
    }

    console.log('[AUDITOR-FORM] Archivo seleccionado:', {
      nombre: file.name,
      tamaño: file.size,
      tipo: file.type
    });

    if (file.size > 15 * 1024 * 1024) {
      this.notificationService.error('Error', `El archivo ${tipo} excede 15MB`);
      event.target.value = '';
      return;
    }

    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      this.notificationService.error('Error', `Tipo no permitido para ${tipo}`);
      event.target.value = '';
      return;
    }

    const key = tipo as keyof typeof this.archivosAuditorFormulario;
    this.archivosAuditorFormulario[key].archivo = file;
    this.archivosAuditorFormulario[key].nombreArchivo = file.name;

    console.log(`[AUDITOR-FORM] Archivo asignado para ${tipo}:`, file.name);
  }

  subirArchivosAuditor(): void {
    console.log('[AUDITOR-FORM] Iniciando subida de archivos');

    if (!this.puedeSubirArchivos()) {
      console.log('[AUDITOR-FORM] No tiene permisos para subir archivos');
      this.notificationService.warning('No permitido', 'No puede subir archivos para este documento');
      return;
    }

    if (!this.hayArchivosSeleccionados()) {
      console.log('[AUDITOR-FORM] No hay archivos seleccionados');
      this.notificationService.warning('Advertencia', 'Selecciona al menos un archivo');
      return;
    }

    this.subiendoArchivos = true;
    this.isProcessing = true;

    const formData = new FormData();
    Object.entries(this.archivosAuditorFormulario).forEach(([key, datos]) => {
      if (datos.archivo) {
        formData.append(key, datos.archivo);
        console.log('[AUDITOR-FORM] Archivo agregado a FormData:', key);
      }
    });

    if (this.archivosAuditorForm.value.observaciones) {
      formData.append('observaciones', this.archivosAuditorForm.value.observaciones);
    }

    console.log('[AUDITOR-FORM] Enviando archivos al servidor...');

    this.auditorService.subirDocumentosAuditor(this.documentoId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AUDITOR-FORM] Archivos subidos correctamente:', response);
          this.notificationService.success('Éxito', 'Documentos subidos correctamente');

          // Actualizar estado local
          Object.keys(this.archivosAuditorFormulario).forEach(key => {
            const k = key as keyof typeof this.archivosAuditorFormulario;
            if (this.archivosAuditorFormulario[k].archivo) {
              this.archivosAuditorFormulario[k].subido = true;
              this.archivosAuditorFormulario[k].archivo = null;
            }
          });

          this.verificarArchivosCompletos();
          this.subiendoArchivos = false;
          this.isProcessing = false;

          // Recargar datos del servidor
          console.log('[AUDITOR-FORM] Recargando datos del documento...');
          this.cargarDocumentoParaAuditor(this.documentoId);
        },
        error: (err) => {
          console.error('[AUDITOR-FORM] Error al subir archivos:', err);
          this.notificationService.error('Error', err.error?.message || 'Error al subir archivos');
          this.subiendoArchivos = false;
          this.isProcessing = false;
        }
      });
  }

  verArchivoAuditor(tipo: string): void {
    console.log('[AUDITOR-FORM] Intentando ver archivo:', tipo);

    if (!this.puedeAccederArchivo(tipo)) {
      console.log('[AUDITOR-FORM] El archivo no está disponible');
      this.notificationService.warning('No disponible', 'El archivo no está disponible');
      return;
    }

    console.log('[AUDITOR-FORM] Descargando archivo para visualización...');
    this.auditorService.descargarArchivoAuditor(this.documentoId, tipo)
      .subscribe({
        next: (blob: Blob) => {
          console.log('[AUDITOR-FORM] Archivo descargado, abriendo...');
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: (error) => {
          console.error('[AUDITOR-FORM] Error al abrir el archivo:', error);
          this.notificationService.error('Error', 'No se pudo abrir el documento');
        }
      });
  }

  descargarArchivoAuditor(tipo: string): void {
    console.log('[AUDITOR-FORM] Intentando descargar archivo:', tipo);

    if (!this.puedeAccederArchivo(tipo)) {
      console.log('[AUDITOR-FORM] El archivo no está disponible para descarga');
      this.notificationService.warning('No disponible', 'El archivo no está disponible');
      return;
    }

    this.isProcessing = true;
    console.log('[AUDITOR-FORM] Iniciando descarga...');

    this.auditorService.descargarArchivoAuditor(this.documentoId, tipo)
      .subscribe({
        next: (blob: Blob) => {
          console.log('[AUDITOR-FORM] Archivo recibido, creando descarga...');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.archivosAuditorFormulario[tipo].nombreArchivo || `${tipo}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          this.notificationService.success('Descarga', 'Archivo descargado correctamente');
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('[AUDITOR-FORM] Error al descargar archivo:', error);
          this.notificationService.error('Error', 'No se pudo descargar el archivo');
          this.isProcessing = false;
        }
      });
  }

  verTodosArchivosAuditor(): void {
    console.log('[AUDITOR-FORM] Intentando ver todos los archivos');

    const subidos = Object.keys(this.archivosAuditorFormulario)
      .filter(key => this.archivosAuditorFormulario[key].subido);

    console.log('[AUDITOR-FORM] Archivos subidos encontrados:', subidos.length);

    if (subidos.length === 0) {
      this.notificationService.info('Sin documentos', 'No hay archivos de auditoría disponibles');
      return;
    }

    console.log('[AUDITOR-FORM] Abriendo archivos:', subidos);
    subidos.forEach(tipo => this.verArchivoAuditor(tipo));

    this.notificationService.success('Abriendo', `Se abrieron ${subidos.length} documentos`);
  }

  descargarTodosArchivosAuditor(): void {
    console.log('[AUDITOR-FORM] Intentando descargar todos los archivos');

    const subidos = Object.keys(this.archivosAuditorFormulario)
      .filter(key => this.archivosAuditorFormulario[key].subido);

    console.log('[AUDITOR-FORM] Archivos para descargar:', subidos.length);

    if (subidos.length === 0) {
      this.notificationService.info('Sin documentos', 'No hay archivos para descargar');
      return;
    }

    this.isProcessing = true;
    let count = 0;

    console.log('[AUDITOR-FORM] Iniciando descarga secuencial...');

    const descargarSiguiente = () => {
      if (count >= subidos.length) {
        console.log('[AUDITOR-FORM] Descarga completa');
        this.isProcessing = false;
        this.notificationService.success('Descarga completa', `${subidos.length} documentos descargados`);
        return;
      }

      const tipo = subidos[count];
      console.log(`[AUDITOR-FORM] Descargando archivo ${count + 1}/${subidos.length}:`, tipo);

      this.descargarArchivoAuditor(tipo);
      count++;
      setTimeout(descargarSiguiente, 1500);
    };

    descargarSiguiente();
  }

  volverALista(): void {
    console.log('[AUDITOR-FORM] Volviendo a la lista');
    this.router.navigate(['/auditor/lista']);
  }

  getEstadoBadgeClass(estado: string): string {
    console.log('[AUDITOR-FORM] getEstadoBadgeClass llamado con:', estado);
    
    if (!estado) {
      console.log('[AUDITOR-FORM] Estado vacío, devolviendo clase por defecto');
      return 'badge bg-light text-dark';
    }
    
    const upper = estado.toUpperCase();
    console.log('[AUDITOR-FORM] Estado en mayúsculas:', upper);
    
    if (upper.includes('EN_REVISION')) {
      console.log('[AUDITOR-FORM] Devolviendo clase bg-info');
      return 'badge bg-info';
    }
    if (upper.includes('APROBADO')) {
      console.log('[AUDITOR-FORM] Devolviendo clase bg-success');
      return 'badge bg-success';
    }
    if (upper.includes('RECHAZADO')) {
      console.log('[AUDITOR-FORM] Devolviendo clase bg-danger');
      return 'badge bg-danger';
    }
    if (upper.includes('OBSERVADO')) {
      console.log('[AUDITOR-FORM] Devolviendo clase bg-warning');
      return 'badge bg-warning';
    }
    
    console.log('[AUDITOR-FORM] Estado no reconocido, clase por defecto');
    return 'badge bg-light text-dark';
  }

  aprobarDocumento(): void {
    console.log('[AUDITOR-FORM] Aprobando documento');

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
        console.error('[AUDITOR-FORM] Error al aprobar:', err);
        this.notificationService.error('Error', err.error?.message || 'No se pudo aprobar el documento');
        this.isProcessing = false;
      }
    });
  }

  observarDocumento(): void {
    console.log('[AUDITOR-FORM] Observando documento');

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
        console.error('[AUDITOR-FORM] Error al observar:', err);
        this.notificationService.error('Error', err.error?.message || 'No se pudo observar el documento');
        this.isProcessing = false;
      }
    });
  }

  rechazarDocumento(): void {
    console.log('[AUDITOR-FORM] Rechazando documento');

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
        console.error('[AUDITOR-FORM] Error al rechazar:', err);
        this.notificationService.error('Error', err.error?.message || 'No se pudo rechazar el documento');
        this.isProcessing = false;
      }
    });
  }

  completarRevision(): void {
    console.log('[AUDITOR-FORM] Completando revisión');

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
        console.error('[AUDITOR-FORM] Error al completar:', err);
        this.notificationService.error('Error', err.error?.message || 'No se pudo completar la revisión');
        this.isProcessing = false;
      }
    });
  }

  liberarDocumento(): void {
    console.log('[AUDITOR-FORM] Liberando documento');

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
        console.error('[AUDITOR-FORM] Error al liberar:', err);
        this.notificationService.error('Error', err.error?.message || 'No se pudo liberar el documento');
        this.isProcessing = false;
      }
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    console.log('[AUDITOR-FORM] Token encontrado:', token ? 'Sí' : 'No');

    return new HttpHeaders({
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  registrarDecision(): void {
    console.log('[AUDITOR-FORM] Registrando decisión:', this.decisionSeleccionada);

    if (!this.decisionSeleccionada) {
      this.notificationService.warning('Advertencia', 'Debe seleccionar una decisión');
      return;
    }

    if (!this.observacionesRevision.trim()) {
      this.notificationService.warning('Advertencia', 'Debe ingresar observaciones');
      return;
    }

    // Validación especial para primer radicado
    if (this.primerRadicadoDelAno && !this.archivosCompletos) {
      console.log('[AUDITOR-FORM] Validación fallida: primer radicado sin archivos completos');
      this.notificationService.error('Error', 'Debe subir todos los documentos requeridos para primer radicado');
      return;
    }

    console.log('[AUDITOR-FORM] Enviando decisión al servidor...');
    this.isProcessing = true;

    const datos = {
      estado: this.decisionSeleccionada,
      observaciones: this.observacionesRevision
    };

    this.auditorService.guardarRevision(this.documentoId, datos)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AUDITOR-FORM] Decisión registrada:', response);
          this.notificationService.success('Éxito', 'Decisión registrada correctamente');
          this.isProcessing = false;
          this.decisionSeleccionada = '';
          this.observacionesRevision = '';
          this.cargarDocumentoParaAuditor(this.documentoId);
        },
        error: (err) => {
          console.error('[AUDITOR-FORM] Error registrando decisión:', err);
          this.notificationService.error('Error', err.error?.message || 'No se pudo registrar la decisión');
          this.isProcessing = false;
        }
      });
  }
}