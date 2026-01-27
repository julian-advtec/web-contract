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


    this.route.params.subscribe(params => {
      this.documentoId = params['id'];


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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDocumentoParaAuditor(id: string): void {

    this.isLoading = true;

    // TEMPORAL: Usar endpoint debug
    const debugUrl = `${environment.apiUrl}/auditor/documentos/${id}/debug`;


    this.http.get(debugUrl, { headers: this.getAuthHeaders() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (debugResponse: any) => {


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

          // Intentar con el endpoint normal si debug falla
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

  private procesarRespuestaDebug(debugResponse: any): void {


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

    // Extraer el estado considerando la estructura anidada
    let estadoEncontrado = 'SIN ESTADO';
    let docData = null;

    // Caso 1: Estructura anidada {ok: true, data: {success: true, data: {...}}}
    if (response?.data?.data?.documento) {
      console.log('[AUDITOR-FORM] Caso 1: Estructura anidada detectada');
      docData = response.data.data.documento;
      estadoEncontrado = docData.estado || response.data.data.estado || 'SIN ESTADO';
    }
    // Caso 2: Estructura simple {ok: true, data: {...}}
    else if (response?.data?.documento) {
      console.log('[AUDITOR-FORM] Caso 2: Estructura simple detectada');
      docData = response.data.documento;
      estadoEncontrado = docData.estado || response.data.estado || 'SIN ESTADO';
    }
    // Caso 3: Datos directos {documento: {...}}
    else if (response?.documento) {
      console.log('[AUDITOR-FORM] Caso 3: Datos directos detectados');
      docData = response.documento;
      estadoEncontrado = docData.estado || response.estado || 'SIN ESTADO';
    }
    // Caso 4: Respuesta directa del documento
    else if (response?.estado) {
      console.log('[AUDITOR-FORM] Caso 4: Respuesta directa detectada');
      docData = response;
      estadoEncontrado = response.estado;
    }

    console.log('[AUDITOR-FORM] Estado encontrado:', estadoEncontrado);

    // Asignar valores
    this.estadoDocumento = estadoEncontrado;

    if (docData) {
      this.documentoData = docData;
      this.numeroRadicado = docData.numeroRadicado || '';
      this.nombreContratista = docData.nombreContratista || '';
      this.primerRadicadoDelAno = !!docData.primerRadicadoDelAno;
    }

    // Procesar archivos de auditor - considerando estructura anidada
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

    // Procesar archivos radicados - considerando estructura anidada
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

    // Actualizar banderas de estado
    this.documentoEnRevision = this.estadoDocumento === 'EN_REVISION_AUDITOR';
    this.estaEnRevision = this.documentoEnRevision;

    console.log('[AUDITOR-FORM] Datos procesados FINALES:', {
      estadoDocumento: this.estadoDocumento,
      numeroRadicado: this.numeroRadicado,
      nombreContratista: this.nombreContratista,
      primerRadicadoDelAno: this.primerRadicadoDelAno,
      documentoEnRevision: this.documentoEnRevision,
      estaEnRevision: this.estaEnRevision
    });

    // Forzar la detección de cambios
    this.cdr.detectChanges();

    // Verificar estado después de un breve delay
    setTimeout(() => {
      this.verificarEstado();
      this.verificarArchivosCompletos();
    }, 100);
  }

  private procesarArchivosAuditor(archivos: any[]): void {
    console.log('[AUDITOR-FORM] 🔍 ARCHIVOS RECIBIDOS DEL BACKEND:', archivos);

    // Log detallado
    archivos.forEach((archivo, index) => {
      console.log(`Archivo ${index + 1}:`, {
        tipo: archivo.tipo,
        subido: archivo.subido,
        nombreArchivo: archivo.nombreArchivo,
        rutaServidor: archivo.rutaServidor,
        descripcion: archivo.descripcion
      });
    });

    // Cargar archivos desde la respuesta
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

    console.log('[AUDITOR-FORM] Archivos auditor actualizados:', this.archivosAuditorFormulario);
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
    // Contar archivos que están marcados como subidos O tienen archivo seleccionado
    const archivosListos = Object.values(this.archivosAuditorFormulario)
      .filter(a => a.subido || a.archivo !== null).length;

    console.log('[AUDITOR-FORM] Verificando archivos completos:', {
      primerRadicadoDelAno: this.primerRadicadoDelAno,
      archivosListos: archivosListos,
      totalRequerido: 6,
      todosCompletos: archivosListos === 6
    });

    // Para primer radicado: todos deben estar listos
    if (this.primerRadicadoDelAno) {
      this.archivosCompletos = archivosListos === 6;
    } else {
      this.archivosCompletos = true; // No es obligatorio para no primer radicado
    }

    console.log('[AUDITOR-FORM] Archivos completos:', this.archivosCompletos);
  }

  contarArchivosAuditorSubidos(): number {
    // ✅ CORREGIDO: Contar solo archivos REALMENTE subidos (con ruta o nombre)
    const subidos = Object.values(this.archivosAuditorFormulario)
      .filter(a => {
        const tieneRuta = a.rutaServidor && a.rutaServidor.trim() !== '';
        const tieneNombre = a.nombreArchivo && a.nombreArchivo.trim() !== '';
        return (a.subido && (tieneRuta || tieneNombre)) || a.archivo !== null;
      }).length;

    return subidos;
  }

  hayArchivosSeleccionados(): boolean {
    const haySeleccionados = Object.values(this.archivosAuditorFormulario)
      .some(a => a.archivo !== null);

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


    // 1. El documento debe estar en estado EN_REVISION_AUDITOR
    if (this.estadoDocumento !== 'EN_REVISION_AUDITOR') {
      console.log('[AUDITOR-FORM] ❌ NO puede revisar: No está en EN_REVISION_AUDITOR');
      return false;
    }

    // 2. Si es primer radicado, verificar archivos completos
    if (this.primerRadicadoDelAno && !this.archivosCompletos) {

      return false;
    }


    return true;
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

    // ✅ IMPORTANTE: Marcar como subido cuando se selecciona el archivo
    this.archivosAuditorFormulario[key] = {
      subido: true,
      archivo: file,
      nombreArchivo: file.name,
      rutaServidor: null
    };

    console.log(`[AUDITOR-FORM] Archivo asignado para ${tipo}:`, file.name);
    console.log(`[AUDITOR-FORM] Archivo marcado como subido:`, this.archivosAuditorFormulario[key]);

    // Actualizar estado de archivos completos
    this.verificarArchivosCompletos();

    // Forzar detección de cambios
    this.cdr.detectChanges();
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

    if (!estado || estado === 'SIN ESTADO') {
      console.log('[AUDITOR-FORM] Estado vacío o "SIN ESTADO", devolviendo bg-light');
      return 'badge bg-light text-dark';
    }

    const upper = estado.toUpperCase();
    console.log('[AUDITOR-FORM] Estado en mayúsculas:', upper);

    // Estados específicos del backend
    if (upper.includes('EN_REVISION_AUDITOR')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-info para EN_REVISION_AUDITOR');
      return 'badge bg-info';
    }
    if (upper.includes('APROBADO_SUPERVISOR')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-success para APROBADO_SUPERVISOR');
      return 'badge bg-success';
    }
    if (upper.includes('APROBADO_AUDITOR')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-success para APROBADO_AUDITOR');
      return 'badge bg-success';
    }
    if (upper.includes('RECHAZADO_AUDITOR')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-danger para RECHAZADO_AUDITOR');
      return 'badge bg-danger';
    }
    if (upper.includes('OBSERVADO_AUDITOR')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-warning para OBSERVADO_AUDITOR');
      return 'badge bg-warning';
    }
    if (upper.includes('COMPLETADO_AUDITOR')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-primary para COMPLETADO_AUDITOR');
      return 'badge bg-primary';
    }

    // Estados genéricos
    if (upper.includes('EN_REVISION')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-info para EN_REVISION');
      return 'badge bg-info';
    }
    if (upper.includes('APROBADO')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-success para APROBADO');
      return 'badge bg-success';
    }
    if (upper.includes('RECHAZADO')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-danger para RECHAZADO');
      return 'badge bg-danger';
    }
    if (upper.includes('OBSERVADO')) {
      console.log('[AUDITOR-FORM] Devolviendo bg-warning para OBSERVADO');
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
    const userJson = localStorage.getItem('user');
    const userId = userJson ? JSON.parse(userJson).id : null;

    console.log('[AUDITOR-FORM] Token encontrado:', token ? 'Sí' : 'No');
    console.log('[AUDITOR-FORM] User ID:', userId);

    const headers = new HttpHeaders({
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Agregar header de auditor si existe
    if (userId) {
      return headers.set('X-Auditor-Id', userId);
    }

    return headers;
  }

  // ✅ Método público para contar archivos seleccionados
  contarArchivosSeleccionados(): number {
    return Object.values(this.archivosAuditorFormulario)
      .filter(a => a.archivo !== null).length;
  }

  // ✅ Método público para contar archivos realmente subidos
  contarArchivosRealmenteSubidos(): number {
    // Contar solo archivos que tienen rutaServidor o nombreArchivo (subidos al servidor)
    const subidos = Object.values(this.archivosAuditorFormulario)
      .filter(a => {
        const tieneRuta = a.rutaServidor && a.rutaServidor.trim() !== '';
        const tieneNombre = a.nombreArchivo && a.nombreArchivo.trim() !== '';
        return a.subido && (tieneRuta || tieneNombre);
      }).length;

    console.log('[AUDITOR-FORM] Archivos realmente subidos (con ruta):', subidos);
    return subidos;
  }

  // ✅ Método público para verificar si hay archivos realmente subidos
  archivosRealmenteSubidos(): boolean {
    return this.primerRadicadoDelAno ?
      this.contarArchivosRealmenteSubidos() === 6 : true;
  }

  // ✅ Método principal para registrar decisión
  registrarDecision(): void {
    console.log('[AUDITOR-FORM] Registrando decisión:', this.decisionSeleccionada);

    // Validaciones básicas
    if (!this.decisionSeleccionada || !this.observacionesRevision.trim()) {
      this.notificationService.warning('Advertencia', 'Complete todos los campos requeridos');
      return;
    }

    // Validar archivos para primer radicado
    if (this.primerRadicadoDelAno) {
      const archivosSeleccionados = this.contarArchivosSeleccionados();
      if (archivosSeleccionados < 6) {
        const faltantes = 6 - archivosSeleccionados;
        this.notificationService.error(
          'Archivos obligatorios',
          `Primer radicado requiere los 6 documentos.\n\nFaltan: ${faltantes} documento(s).`
        );
        return;
      }
    }

    this.isProcessing = true;

    // 🔴 PRIMERO: Verificar si hay archivos
    const tieneArchivos = this.contarArchivosSeleccionados() > 0;

    if (tieneArchivos) {
      console.log('[AUDITOR-FORM] Hay archivos, usando método combinado');
      this.enviarRevisionConArchivos();
    } else {
      console.log('[AUDITOR-FORM] No hay archivos, usando método simple');
      this.enviarRevisionSimple();
    }
  }

  private enviarRevisionConArchivos(): void {
    const formData = new FormData();

    // 🔴 IMPORTANTE: Agregar datos como JSON string para evitar problemas de parsing
    const datosRevision = {
      estado: this.decisionSeleccionada,
      observaciones: this.observacionesRevision,
      timestamp: new Date().toISOString()
    };

    formData.append('data', JSON.stringify(datosRevision));

    // Agregar archivos
    let archivosAgregados = 0;
    Object.entries(this.archivosAuditorFormulario).forEach(([tipo, datos]) => {
      if (datos.archivo) {
        formData.append(tipo, datos.archivo);
        archivosAgregados++;
        console.log(`[AUDITOR-FORM] Agregando archivo ${tipo}:`, datos.archivo.name);
      }
    });

    console.log('[AUDITOR-FORM] Enviando FormData con:', {
      archivos: archivosAgregados,
      decision: this.decisionSeleccionada
    });

    this.auditorService.registrarDecisionCompleta(this.documentoId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AUDITOR-FORM] Respuesta exitosa:', response);
          this.notificationService.success('Éxito', 'Decisión registrada correctamente');
          this.finalizarProceso();

          setTimeout(() => {
            this.router.navigate(['/auditor/lista']);
          }, 1500);
        },
        error: (err) => {
          console.error('[AUDITOR-FORM] Error en método combinado:', err);

          // Fallback: intentar método secuencial
          console.log('[AUDITOR-FORM] Intentando método secuencial...');
          this.enviarRevisionSecuencial();
        }
      });
  }

  private enviarRevisionSimple(): void {
    this.auditorService.guardarRevision(this.documentoId, {
      estado: this.decisionSeleccionada,
      observaciones: this.observacionesRevision
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AUDITOR-FORM] Revisión simple exitosa:', response);
          this.notificationService.success('Éxito', 'Decisión registrada');
          this.finalizarProceso();

          setTimeout(() => {
            this.router.navigate(['/auditor/lista']);
          }, 1500);
        },
        error: (err) => {
          console.error('[AUDITOR-FORM] Error en revisión simple:', err);
          this.notificationService.error('Error', err.error?.message || 'Error registrando decisión');
          this.isProcessing = false;
        }
      });
  }

  private enviarRevisionSecuencial(): void {
    // Método 1: Subir archivos primero
    this.subirArchivosPrimero()
      .then(() => {
        // Método 2: Luego enviar decisión
        return this.auditorService.guardarRevision(this.documentoId, {
          estado: this.decisionSeleccionada,
          observaciones: this.observacionesRevision
        }).toPromise();
      })
      .then((response) => {
        console.log('[AUDITOR-FORM] Revisión secuencial exitosa');
        this.notificationService.success('Éxito', 'Decisión registrada');
        this.finalizarProceso();

        setTimeout(() => {
          this.router.navigate(['/auditor/lista']);
        }, 1500);
      })
      .catch((error) => {
        console.error('[AUDITOR-FORM] Error en método secuencial:', error);
        this.notificationService.error('Error', 'No se pudo completar la operación');
        this.isProcessing = false;
      });
  }

  subirArchivosPrimero(): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();

      // ¡Nombres EXACTOS que espera el backend!
      if (this.archivosAuditorFormulario['rp']?.archivo) {
        formData.append('rp', this.archivosAuditorFormulario['rp'].archivo);
      }
      if (this.archivosAuditorFormulario['cdp']?.archivo) {
        formData.append('cdp', this.archivosAuditorFormulario['cdp'].archivo);
      }
      // ... lo mismo para poliza, certificadoBancario, minuta, actaInicio

      if (this.observacionesRevision?.trim()) {
        formData.append('observaciones', this.observacionesRevision.trim());
      }



      this.auditorService.subirArchivosAuditor(this.documentoId, formData)
        .subscribe({
          next: () => {
            console.log('[FRONT] Archivos subidos OK');
            resolve();
          },
          error: err => {
            console.error('[FRONT] Falló subida:', err);
            reject(err);
          }
        });
    });
  }

  private intentarMetodoAlternativo(): void {
    // Método alternativo: subir archivos primero, luego decisión
    console.log('[AUDITOR-FORM] Método alternativo: Subir archivos, luego decisión');

    const tieneArchivos = this.contarArchivosSeleccionados() > 0;

    if (tieneArchivos) {
      // Primero subir archivos
      this.subirArchivosPrimero().then(() => {
        // Luego registrar decisión
        this.registrarDecisionDespuesDeSubida();
      }).catch(error => {
        console.error('[AUDITOR-FORM] Error en método alternativo:', error);
        this.notificationService.error('Error', 'No se pudo completar la operación');
        this.isProcessing = false;
      });
    } else {
      // Si no hay archivos, solo registrar decisión
      this.registrarDecisionDespuesDeSubida();
    }
  }



  private registrarDecisionDespuesDeSubida(): void {
    console.log('[AUDITOR-FORM] Registrando decisión después de subida...');

    this.auditorService.guardarRevision(this.documentoId, {
      estado: this.decisionSeleccionada,
      observaciones: this.observacionesRevision
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('[AUDITOR-FORM] Decisión registrada:', response);
          this.notificationService.success('Éxito', 'Decisión registrada correctamente');
          this.finalizarProceso();

          setTimeout(() => {
            this.router.navigate(['/auditor/lista']);
          }, 1500);
        },
        error: (err) => {
          console.error('[AUDITOR-FORM] Error registrando decisión:', err);
          this.notificationService.error('Error', err.error?.message || 'Error registrando decisión');
          this.isProcessing = false;
        }
      });
  }

  private finalizarProceso(): void {
    this.isProcessing = false;
    this.decisionSeleccionada = '';
    this.observacionesRevision = '';

    // Limpiar archivos seleccionados
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key].archivo = null;
    });
  }

  // Métodos privados auxiliares
  private debugResponseStructure(response: any): void {
    if (!response) {
      console.log('[DEBUG-STRUCTURE] Respuesta es null/undefined');
      return;
    }

    console.log('[DEBUG-STRUCTURE] === INICIO DE ANÁLISIS DE RESPUESTA ===');
    console.log('[DEBUG-STRUCTURE] Tipo de respuesta:', typeof response);
    console.log('[DEBUG-STRUCTURE] ¿Es objeto?', typeof response === 'object');

    // Ver claves principales
    const claves = Object.keys(response);
    console.log('[DEBUG-STRUCTURE] Claves principales:', claves);
    console.log('[DEBUG-STRUCTURE] === FIN DE ANÁLISIS ===');
  }
}