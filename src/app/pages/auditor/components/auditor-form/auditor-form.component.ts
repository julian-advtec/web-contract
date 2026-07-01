import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorService } from '../../../../core/services/auditor.service';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { RadicacionFormComponent } from '../../../radicacion/components/radicacion-form/radicacion-form.component';

interface ArchivoAuditor {
  subido: boolean;
  archivo: File | null;
  nombreArchivo: string;
  rutaServidor: string | null;
  fuente: 'contrato' | 'contratista' | null;
  metadata?: any;
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
    RadicacionFormComponent,
    FormsModule
  ],
  templateUrl: './auditor-form.component.html',
  styleUrls: ['./auditor-form.component.scss']
})
export class AuditorFormComponent implements OnInit, OnDestroy {
  @Input() documentoId: string | null = null;
  @Input() modo: 'auditoria' | 'contabilidad' | 'general' = 'auditoria';
  @Input() soloLectura: boolean = false;

  isLoading = false;
  isProcessing = false;
  subiendoArchivos = false;

  documentoEnRevision = false;
  estaEnRevision = false;
  isDownloadingAll = false;

  documentoData: any = null;
  numeroRadicado: string = '';
  nombreContratista: string = '';
  estadoDocumento: string = '';
  primerRadicadoDelAno = false;
  contratistaId: string | null = null;
  numeroContrato: string = '';

  emailContratista: string = '';
telefonoContratista: string = '';

  observacionesRevision = '';
  decisionSeleccionada = '';

  decisionAuditor: string = '';
  observacionAuditor: string = '';
  fechaDecisionAuditor: Date | null = null;
  nombreAuditor: string = 'Auditor';

  nombreAuditorAsignado: string = '';
  usuarioActual: string = '';
  esAdmin: boolean = false;

  tieneActaSupervision: boolean = false;
  actaSupervisionNombre: string = '';
  actaSupervisionPath: string = '';

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
    rp: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    cdp: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    poliza: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    certificadoBancario: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    minuta: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    actaInicio: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null }
  };

  tabActivo: 'auditoria' | 'contratista' | 'decision' = 'auditoria';

  documentosContratista: any[] = [];
  cargandoDocumentosContratista = false;

  archivosCompletos = false;

  private destroy$ = new Subject<void>();

  esModoContabilidad = false;
  esModoGeneral = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auditorService: AuditorService,
    private contratistasService: ContratistasService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private rendicionService: RendicionCuentasService
  ) { }

ngOnInit(): void {
  this.cargarUsuarioActual();
  this.esModoContabilidad = this.modo === 'contabilidad';
  this.esModoGeneral = this.modo === 'general';

  // ✅ No forzar solo lectura para auditor_cuentas
  // Solo forzar para contabilidad y general
  if (this.esModoContabilidad || this.esModoGeneral) {
    this.soloLectura = true;
  }

  let idParaCargar: string | null = this.documentoId;

  if (!idParaCargar) {
    const idFromRoute = this.route.snapshot.paramMap.get('id');
    if (idFromRoute) {
      idParaCargar = idFromRoute;
    }
  }

  if (idParaCargar) {
    this.cargarDocumentoParaAuditor(idParaCargar);
  }
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarUsuarioActual(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.usuarioActual = user.fullName || user.username || '';
        this.esAdmin = user.role === 'admin';
      } catch (e) {
        // Error silencioso
      }
    }
  }

  estaEnModoEdicion(): boolean {
    if (this.soloLectura === true) {
      return false;
    }

    if (this.esModoContabilidad || this.esModoGeneral) {
      return false;
    }

    if (!this.estadoDocumento) {
      return false;
    }

    const estado = this.estadoDocumento.toUpperCase();

    const estadosEditables = [
      'RADICADO',
      'EN_REVISION_AUDITOR',
      'EN_REVISION_ASESOR_GERENCIA',
      'EN_REVISION_RENDICION_CUENTAS'
    ];

    const estadosFinales = [
      'APROBADO', 'APROBADO_AUDITOR', 'APROBADO_SUPERVISOR', 'APROBADO_ASESOR_GERENCIA',
      'COMPLETADO', 'COMPLETADO_AUDITOR', 'COMPLETADO_TESORERIA',
      'RECHAZADO', 'RECHAZADO_AUDITOR', 'RECHAZADO_SUPERVISOR', 'RECHAZADO_TESORERIA',
      'OBSERVADO', 'OBSERVADO_AUDITOR', 'OBSERVADO_TESORERIA',
      'PAGADO', 'ANULADO'
    ];

    if (estadosFinales.some(e => estado.includes(e))) {
      return false;
    }

    const esEstadoEditable = estadosEditables.some(e => estado === e);
    const esMiAuditoria = !this.nombreAuditorAsignado ||
      this.nombreAuditorAsignado === this.usuarioActual ||
      this.esAdmin;

    return esEstadoEditable && esMiAuditoria;
  }

  esModoSoloLectura(): boolean {
    if (this.esModoContabilidad || this.esModoGeneral) {
      return true;
    }

    if (this.soloLectura === true) {
      return true;
    }

    const enModoEdicion = this.estaEnModoEdicion();
    if (enModoEdicion) {
      return false;
    }

    return true;
  }

cargarDocumentoParaAuditor(id: string): void {
  if (!id) {
    return;
  }

  this.isLoading = true;
  this.documentoId = id;

  this.auditorService.obtenerDocumentoParaVista(id).subscribe({
    next: (res: any) => {
      const data = res?.data || res;
      const documento = data?.documento || data;

      if (!documento || !documento.id) {
        this.cargarViaRendicion(id);
        return;
      }

      this.documentoData = documento;
      this.numeroRadicado = documento.numeroRadicado || '';
      this.nombreContratista = documento.nombreContratista || '';
      this.estadoDocumento = documento.estado || '';
      this.primerRadicadoDelAno = !!documento.primerRadicadoDelAno;
      this.contratistaId = documento.contratistaId || null;
      this.numeroContrato = documento.numeroContrato || '';
      this.documentoData.documentoRadicadoId = documento.id;

      this.emailContratista = documento.emailContratista || '';
      this.telefonoContratista = documento.telefonoContratista || '';

      this.tieneActaSupervision = !!documento.actaSupervisionPath;
      this.actaSupervisionNombre = documento.actaSupervisionNombre || '';
      this.actaSupervisionPath = documento.actaSupervisionPath || '';

      this.nombreAuditorAsignado = documento.auditorAsignado || data.auditor?.nombreAuditor || '';

      // Cargar archivos del auditor
      if (data.archivosAuditor && Array.isArray(data.archivosAuditor)) {
        
        
        for (const archivo of data.archivosAuditor) {
          const key = archivo.tipo;
          if (this.archivosAuditorFormulario[key]) {
            this.archivosAuditorFormulario[key] = {
              subido: archivo.subido === true,
              archivo: null,
              nombreArchivo: archivo.nombreArchivo || '',
              rutaServidor: archivo.rutaServidor || null,
              fuente: archivo.fuente || null
            };
          }
        }
      }

      // ✅ CARGAR DOCUMENTOS DEL CONTRATISTA (después de tener numeroContrato y contratistaId)
      if (this.numeroContrato) {
       
        this.cargarContratistaConDocumentos();
      } else {
        console.warn('[AUDITOR] No hay numeroContrato, no se pueden cargar documentos del contratista');
      }

      // Determinar si puede editar
      if (this.estadoDocumento === 'EN_REVISION_AUDITOR') {
        const esAuditorAsignado = this.nombreAuditorAsignado === this.usuarioActual || 
                                 !this.nombreAuditorAsignado || 
                                 this.esAdmin;
        
        if (esAuditorAsignado && !this.esModoContabilidad && !this.esModoGeneral) {
          this.soloLectura = false;
          this.documentoEnRevision = true;
          this.estaEnRevision = true;
        } else {
          this.soloLectura = true;
          this.documentoEnRevision = false;
          this.estaEnRevision = false;
        }
      } else if (this.estadoDocumento === 'RADICADO' && !this.nombreAuditorAsignado) {
        if (!this.esModoContabilidad && !this.esModoGeneral) {
          this.soloLectura = false;
          this.documentoEnRevision = true;
          this.estaEnRevision = true;
        }
      } else {
        this.soloLectura = true;
        this.documentoEnRevision = false;
        this.estaEnRevision = false;
      }

      this.cargarDecisionAuditor(data, documento);
      this.verificarArchivosCompletos();

      this.cdr.detectChanges();
      this.isLoading = false;
    },
    error: (err) => {
      if (err.status === 404) {
        this.cargarViaRendicion(id);
      } else {
        console.error('[AUDITOR] Error cargando documento:', err);
        this.notificationService.error('Error', 'No se pudo cargar el documento');
        this.isLoading = false;
      }
    }
  });
}

  forzarModoEdicionSiEsNecesario(): void {
    if (this.estadoDocumento === 'RADICADO' &&
      this.nombreAuditorAsignado === this.usuarioActual) {
      this.soloLectura = false;
      this.documentoEnRevision = true;
      this.estaEnRevision = true;
      this.cdr.detectChanges();
    }
  }

  getRazonNoEditable(): string {
    if (this.soloLectura) {
      return 'El documento se abrió en modo solo lectura';
    }

    if (this.esModoContabilidad) {
      return 'Modo contabilidad - solo consulta';
    }

    if (this.esModoGeneral) {
      return 'Modo general - solo consulta';
    }

    if (!this.estadoDocumento) {
      return 'No se pudo determinar el estado del documento';
    }

    const estado = this.estadoDocumento.toUpperCase();

    const estadosFinales = ['APROBADO', 'APROBADO_AUDITOR', 'APROBADO_SUPERVISOR',
      'COMPLETADO', 'COMPLETADO_AUDITOR', 'RECHAZADO',
      'RECHAZADO_AUDITOR', 'RECHAZADO_SUPERVISOR',
      'OBSERVADO', 'OBSERVADO_AUDITOR', 'PAGADO', 'ANULADO'];

    if (estadosFinales.some(e => estado.includes(e))) {
      return 'Este documento ya fue procesado y está en estado final';
    }

    if (this.nombreAuditorAsignado && this.nombreAuditorAsignado !== this.usuarioActual && !this.esAdmin) {
      return `Este documento está asignado a otro auditor: ${this.nombreAuditorAsignado}`;
    }

    return 'No tienes permisos para editar este documento';
  }

  private cargarDecisionAuditor(data: any, documento: any): void {
    this.decisionAuditor = '';
    this.observacionAuditor = '';
    this.fechaDecisionAuditor = null;
    this.nombreAuditor = 'Auditor';

    if (data?.auditor) {
      const aud = data.auditor;
      this.decisionAuditor = this.mapearEstadoAuditor(aud.estado || aud.decision);
      this.observacionAuditor = aud.observaciones || aud.observacion || '';
      this.fechaDecisionAuditor = aud.fechaAprobacion || aud.fechaFinRevision || aud.fechaDecision || null;
      this.nombreAuditor = aud.auditor?.nombre || aud.nombreAuditor || 'Auditor';
    }

    if (!this.decisionAuditor && documento) {
      if (documento.auditoria) {
        this.decisionAuditor = this.mapearEstadoAuditor(documento.auditoria.estado || documento.auditoria.decision);
        this.observacionAuditor = documento.auditoria.observaciones || documento.auditoria.observacion || '';
        this.fechaDecisionAuditor = documento.auditoria.fechaDecision || documento.auditoria.fecha;
      }

      if (!this.decisionAuditor && documento.revisionAuditor) {
        this.decisionAuditor = this.mapearEstadoAuditor(documento.revisionAuditor.estado);
        this.observacionAuditor = documento.revisionAuditor.observaciones || '';
      }
    }
  }

  private cargarViaRendicion(rendicionId: string): void {
    this.isLoading = true;

    this.rendicionService.obtenerDetalleRendicion(rendicionId).subscribe({
      next: (data: any) => {
        const documentoIdReal = data.documento?.id || data.documentoId;
        if (documentoIdReal) {
          this.documentoId = documentoIdReal;
          this.cargarDocumentoParaAuditor(documentoIdReal);
        } else {
          this.notificationService.error('Error', 'No se pudo identificar el documento asociado a esta rendición');
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.notificationService.error('Error', 'No se pudo cargar el documento');
        this.isLoading = false;
      }
    });
  }

  cargarTodosLosDocumentos(): void {
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key] = {
        subido: false,
        archivo: null,
        nombreArchivo: '',
        rutaServidor: null,
        fuente: null
      };
    });

    if (this.numeroContrato) {
      this.cargarDocumentosDesdeContrato();
    }

    if (this.numeroContrato) {
      this.cargarContratistaConDocumentos();
    }
  }

cargarContratistaConDocumentos(): void {
  if (!this.numeroContrato) {
    console.warn('[AUDITOR] No hay número de contrato para buscar documentos del contratista');
    this.documentosContratista = [];
    this.cargandoDocumentosContratista = false;
    return;
  }

  
  this.cargandoDocumentosContratista = true;

  this.auditorService.obtenerContratistaPorNumeroContrato(this.numeroContrato).subscribe({
    next: (contratista: any) => {
      
      
      if (contratista && contratista.id) {
        this.contratistaId = contratista.id;
        const documentos = contratista.documentos || [];
        this.documentosContratista = documentos;
        
        
        
        // Mapear documentos del contratista a los tipos de archivo de auditoría
        const mapeoTipos: Record<string, string[]> = {
          poliza: ['POLIZA', 'POLIZA_CUMPLIMIENTO', 'GARANTIA', 'PÓLIZA', 'GARANTIA_CUMPLIMIENTO'],
          certificadoBancario: ['CERTIFICADO_BANCARIO', 'CERTIFICADO BANCARIO', 'CERTIFICADO_BANCARIO_CUENTA', 'CERTIFICADO'],
          minuta: ['MINUTA', 'MINUTA_CONTRATO'],
          actaInicio: ['ACTA_INICIO', 'ACTA DE INICIO', 'ACTA_INICIO_CONTRATO']
        };

        // Actualizar los archivos del auditor con documentos del contratista
        for (const [clave, tiposBuscados] of Object.entries(mapeoTipos)) {
          const documentoEncontrado = documentos.find((doc: any) => {
            if (!doc.tipo) return false;
            const tipoDoc = doc.tipo.toUpperCase();
            return tiposBuscados.some(tb => tipoDoc.includes(tb) || tipoDoc === tb);
          });

          if (documentoEncontrado && documentoEncontrado.rutaArchivo) {
            this.archivosAuditorFormulario[clave] = {
              subido: true,
              archivo: null,
              nombreArchivo: documentoEncontrado.nombreArchivo,
              rutaServidor: documentoEncontrado.rutaArchivo,
              fuente: 'contratista',
              metadata: {
                id: documentoEncontrado.id,
                tipo: documentoEncontrado.tipo,
                fechaSubida: documentoEncontrado.fechaSubida
              }
            };
            
          }
        }
      } else {
        console.warn('[AUDITOR] No se encontró contratista para el contrato:', this.numeroContrato);
        this.documentosContratista = [];
      }
      
      this.cargandoDocumentosContratista = false;
      this.verificarArchivosCompletos();
      this.cdr.detectChanges();
    },
    error: (error: any) => {
      console.error('[AUDITOR] Error cargando contratista:', error);
      this.documentosContratista = [];
      this.cargandoDocumentosContratista = false;
      this.cdr.detectChanges();
    }
  });
}
recargarDocumentosContratista(): void {
 
  this.cargarContratistaConDocumentos();
}

  cargarDocumentosDesdeContrato(): void {
    this.auditorService.obtenerContratoPorNumero(this.numeroContrato).subscribe({
      next: (response: any) => {
        const contrato = response?.data || response;
        const documentosContrato = contrato?.documentos || [];

        const rpDoc = documentosContrato.find((d: any) =>
          d.tipoDocumento === 'RP' || d.tipoDocumento === 'RP_DOCUMENTO'
        );

        if (rpDoc && rpDoc.rutaArchivo) {
          this.archivosAuditorFormulario['rp'] = {
            subido: true,
            archivo: null,
            nombreArchivo: rpDoc.nombreArchivo,
            rutaServidor: rpDoc.rutaArchivo,
            fuente: 'contrato',
            metadata: { tipo: 'RP', id: rpDoc.id, esArchivo: true }
          };
        } else if (contrato?.rp) {
          this.archivosAuditorFormulario['rp'] = {
            subido: true,
            archivo: null,
            nombreArchivo: `RP_${contrato.rp}`,
            rutaServidor: null,
            fuente: 'contrato',
            metadata: { numero: contrato.rp, soloNumero: true }
          };
        }

        const cdpDoc = documentosContrato.find((d: any) =>
          d.tipoDocumento === 'CDP' || d.tipoDocumento === 'CDP_DOCUMENTO'
        );

        if (cdpDoc && cdpDoc.rutaArchivo) {
          this.archivosAuditorFormulario['cdp'] = {
            subido: true,
            archivo: null,
            nombreArchivo: cdpDoc.nombreArchivo,
            rutaServidor: cdpDoc.rutaArchivo,
            fuente: 'contrato',
            metadata: { tipo: 'CDP', id: cdpDoc.id, esArchivo: true }
          };
        } else if (contrato?.cdp) {
          this.archivosAuditorFormulario['cdp'] = {
            subido: true,
            archivo: null,
            nombreArchivo: `CDP_${contrato.cdp}`,
            rutaServidor: null,
            fuente: 'contrato',
            metadata: { numero: contrato.cdp, soloNumero: true }
          };
        }

        const minutaDoc = documentosContrato.find((d: any) =>
          d.tipoDocumento === 'MINUTA' || d.tipoDocumento === 'MINUTA_CONTRATO'
        );

        if (minutaDoc && minutaDoc.rutaArchivo) {
          this.archivosAuditorFormulario['minuta'] = {
            subido: true,
            archivo: null,
            nombreArchivo: minutaDoc.nombreArchivo,
            rutaServidor: minutaDoc.rutaArchivo,
            fuente: 'contrato',
            metadata: { tipo: 'MINUTA', id: minutaDoc.id, esArchivo: true }
          };
        }

        const actaDoc = documentosContrato.find((d: any) =>
          d.tipoDocumento === 'ACTA_INICIO' || d.tipoDocumento === 'ACTA_DE_INICIO'
        );

        if (actaDoc && actaDoc.rutaArchivo) {
          this.archivosAuditorFormulario['actaInicio'] = {
            subido: true,
            archivo: null,
            nombreArchivo: actaDoc.nombreArchivo,
            rutaServidor: actaDoc.rutaArchivo,
            fuente: 'contrato',
            metadata: { tipo: 'ACTA_INICIO', id: actaDoc.id, esArchivo: true }
          };
        }

        this.verificarArchivosCompletos();
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Error silencioso
      }
    });
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
    if (upper.includes('APROBADO_AUDITOR')) return 'badge bg-success';
    if (upper.includes('RECHAZADO_AUDITOR')) return 'badge bg-danger';
    if (upper.includes('OBSERVADO_AUDITOR')) return 'badge bg-warning';
    if (upper.includes('COMPLETADO_AUDITOR')) return 'badge bg-primary';
    return 'badge bg-light text-dark';
  }

  getIconoArchivo(nombreArchivo: string): string {
    if (!nombreArchivo) return 'fas fa-file';
    const extension = nombreArchivo.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return 'fas fa-file-pdf text-danger';
      case 'doc': case 'docx': return 'fas fa-file-word text-primary';
      case 'jpg': case 'jpeg': case 'png': return 'fas fa-file-image text-success';
      case 'xls': case 'xlsx': return 'fas fa-file-excel text-success';
      default: return 'fas fa-file text-secondary';
    }
  }

  getTamanoFormateado(bytes: number): string {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getNombreArchivoSimple(ruta: string): string {
    if (!ruta) return 'Sin nombre';
    const partes = ruta.split(/[\\/]/);
    return partes[partes.length - 1] || ruta;
  }

  getFuenteDocumento(key: string): string {
    const fuente = this.archivosAuditorFormulario[key]?.fuente;
    if (fuente === 'contrato') return 'Contrato';
    if (fuente === 'contratista') return 'Contratista';
    return 'No disponible';
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

  getDecisionParaMostrar(): string {
    if (this.decisionAuditor) {
      return this.decisionAuditor;
    }
    if (this.estadoDocumento) {
      const estadoUpper = this.estadoDocumento.toUpperCase();
      if (estadoUpper.includes('APROBADO')) return 'APROBADO';
      if (estadoUpper.includes('COMPLETADO')) return 'COMPLETADO';
      if (estadoUpper.includes('RECHAZADO')) return 'RECHAZADO';
      if (estadoUpper.includes('OBSERVADO')) return 'OBSERVADO';
    }
    return 'No registrada';
  }

  getObservacionParaMostrar(): string {
    if (this.observacionAuditor) {
      return this.observacionAuditor;
    }
    return 'Sin observaciones';
  }

verArchivoAuditor(tipo: string): void {
  if (!this.puedeAccederArchivo(tipo)) {
    this.notificationService.warning('No disponible', 'Archivo no disponible');
    return;
  }

  // 🔧 Si es comprobante extra, abrir en nueva pestaña directamente
  if (tipo === 'comprobanteExtra') {
    this.abrirComprobanteExtraEnNuevaPestana(tipo);
    return;
  }

  // Para otros tipos de archivo, usar el método existente
  this.auditorService.previsualizarArchivoAuditor(this.documentoId!, tipo);
}

private abrirComprobanteExtraEnNuevaPestana(tipo: string): void {
  if (!this.documentoId) {
    this.notificationService.warning('Sin documento', 'No hay ID para consultar');
    return;
  }

  // Obtener el token
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const cleanToken = token?.startsWith('Bearer ') ? token.slice(7) : token;

  // Construir URL pública para previsualización
  const baseUrl = this.auditorService['apiUrl'] || 'http://localhost:3001/api/auditor';
  const url = `${baseUrl}/documentos/${this.documentoId}/archivo/${tipo}?download=false&token=${encodeURIComponent(cleanToken || '')}`;
  
  
  
  // Abrir en nueva pestaña
  const newWindow = window.open(url, '_blank');
  
  if (!newWindow) {
    this.notificationService.warning('Bloqueador de popups', 'Por favor permite ventanas emergentes para este sitio');
  }
}


descargarArchivoAuditor(tipo: string): void {
  if (!this.puedeAccederArchivo(tipo)) {
    this.notificationService.warning('No disponible', 'Archivo no disponible');
    return;
  }
  this.auditorService.descargarArchivoAuditorDirecto(this.documentoId!, tipo);
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

  puedeAccederArchivo(tipo: string): boolean {
    const arch = this.archivosAuditorFormulario[tipo];
    return arch?.subido === true && (!!arch.rutaServidor?.trim() || !!arch.nombreArchivo?.trim());
  }

  hayArchivosAuditorSubidos(): boolean {
    return Object.values(this.archivosAuditorFormulario).some(
      arch => arch.subido === true && (!!arch.rutaServidor?.trim() || !!arch.nombreArchivo?.trim())
    );
  }

  contarArchivosRealmenteSubidos(): number {
    return Object.values(this.archivosAuditorFormulario)
      .filter(a => a.subido === true && (a.rutaServidor || a.nombreArchivo))
      .length;
  }

  private getArchivosSubidosAuditor(): string[] {
    return Object.keys(this.archivosAuditorFormulario).filter(key => {
      const arch = this.archivosAuditorFormulario[key];
      return arch.subido === true && (arch.nombreArchivo?.trim() || arch.rutaServidor?.trim());
    });
  }

  descargarTodosArchivosAuditor(): void {
    const subidos = this.getArchivosSubidosAuditor();
    if (subidos.length === 0) {
      this.notificationService.info('Sin documentos', 'No hay archivos disponibles');
      return;
    }
    this.auditorService.descargarTodosArchivosAuditor(this.documentoId!);
  }

  abrirTodosArchivosAuditor(): void {
    const subidos = this.getArchivosSubidosAuditor();
    if (subidos.length === 0) return;
    subidos.forEach((tipo, i) => {
      setTimeout(() => this.verArchivoAuditor(tipo), i * 700);
    });
  }

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

    if (this.decisionSeleccionada === 'APROBADO' && this.primerRadicadoDelAno && !this.archivosCompletos) {
      this.notificationService.warning('Atención', 'No se puede aprobar. Faltan documentos requeridos.');
      return;
    }

    this.isProcessing = true;

    const datosRevision = {
      estado: this.decisionSeleccionada,
      observaciones: this.observacionesRevision.trim() || 'Sin observaciones adicionales'
    };

    this.auditorService.guardarRevision(this.documentoId!, datosRevision).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Decisión registrada correctamente');
        this.observacionesRevision = '';
        this.decisionSeleccionada = '';
        if (this.documentoId) {
          this.cargarDocumentoParaAuditor(this.documentoId);
        }
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
    if (!this.documentoId) return;

    this.isProcessing = true;
    this.auditorService.liberarDocumento(this.documentoId).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Documento liberado');
        this.cargarDocumentoParaAuditor(this.documentoId!);
        this.isProcessing = false;
      },
      error: err => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo liberar el documento');
        this.isProcessing = false;
      }
    });
  }

  verificarArchivosCompletos(): void {
    if (!this.primerRadicadoDelAno) {
      this.archivosCompletos = true;
      return;
    }

    const subidosConfirmados = Object.values(this.archivosAuditorFormulario)
      .filter(a => a.subido === true && (a.rutaServidor || a.nombreArchivo))
      .length;

    this.archivosCompletos = subidosConfirmados === 6;
  }

  puedeRegistrarDecision(): boolean {
    if (this.estadoDocumento !== 'EN_REVISION_AUDITOR') return false;
    if (!this.decisionSeleccionada) return false;
    if (this.primerRadicadoDelAno && this.decisionSeleccionada === 'APROBADO') {
      if (!this.archivosCompletos) return false;
    }
    if (['OBSERVADO', 'RECHAZADO'].includes(this.decisionSeleccionada) &&
      !this.observacionesRevision?.trim()) {
      return false;
    }
    return true;
  }

  verificarEstado(): void {
    this.cargarTodosLosDocumentos();
  }

  recargarEstadoCompleto(): void {
    if (this.documentoId) {
      this.cargarDocumentoParaAuditor(this.documentoId);
    }
  }

  cargarDocumentosContratista(): void {
    if (!this.contratistaId) {
      this.notificationService.warning('Sin documentos', 'No hay contratista asociado');
      return;
    }

    this.cargandoDocumentosContratista = true;

    this.contratistasService.obtenerDocumentos(this.contratistaId).subscribe({
      next: (documentos: any[]) => {
        this.documentosContratista = documentos || [];
        this.cargandoDocumentosContratista = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.documentosContratista = [];
        this.cargandoDocumentosContratista = false;
        this.notificationService.error('Error', 'No se pudieron cargar los documentos');
        this.cdr.detectChanges();
      }
    });
  }

  verDocumentoContratista(documento: any): void {
    if (!this.contratistaId || !documento.id) {
      this.notificationService.warning('Error', 'No se puede visualizar el documento');
      return;
    }

    this.contratistasService.descargarDocumento(this.contratistaId, documento.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      },
      error: (error: any) => {
        this.notificationService.error('Error', 'No se pudo visualizar el documento');
      }
    });
  }

  descargarDocumentoContratista(documento: any): void {
    if (!this.contratistaId || !documento.id) {
      this.notificationService.warning('Error', 'No se puede descargar el documento');
      return;
    }

    this.isProcessing = true;
    const nombreArchivo = this.getNombreArchivoSimple(documento.nombreArchivo) || `documento_${documento.tipo}.pdf`;

    this.contratistasService.descargarDocumento(this.contratistaId, documento.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notificationService.success('Descarga completada', `"${nombreArchivo}" descargado`);
        this.isProcessing = false;
      },
      error: (error: any) => {
        this.notificationService.error('Error', 'No se pudo descargar el documento');
        this.isProcessing = false;
      }
    });
  }

  abrirTodosDocumentosContratista(): void {
    if (this.documentosContratista.length === 0) {
      this.notificationService.warning('Sin documentos', 'No hay documentos para abrir');
      return;
    }
    this.documentosContratista.forEach((doc, index) => {
      setTimeout(() => this.verDocumentoContratista(doc), index * 500);
    });
  }

  descargarTodosDocumentosContratista(): void {
    if (this.documentosContratista.length === 0) {
      this.notificationService.warning('Sin documentos', 'No hay documentos para descargar');
      return;
    }

    this.isProcessing = true;
    this.isDownloadingAll = true;

    let descargados = 0;
    let errores = 0;

    this.documentosContratista.forEach((doc, index) => {
      setTimeout(() => {
        const nombreArchivo = this.getNombreArchivoSimple(doc.nombreArchivo) || `documento_${doc.tipo}.pdf`;

        this.contratistasService.descargarDocumento(this.contratistaId!, doc.id).subscribe({
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
            this.verificarFinDescargaContratista(descargados, errores, this.documentosContratista.length);
          },
          error: () => {
            errores++;
            this.verificarFinDescargaContratista(descargados, errores, this.documentosContratista.length);
          }
        });
      }, index * 800);
    });
  }

  private verificarFinDescargaContratista(descargados: number, errores: number, total: number): void {
    if (descargados + errores === total) {
      this.isProcessing = false;
      this.isDownloadingAll = false;
      if (errores === 0) {
        this.notificationService.success('Descarga completada', `Todos los ${total} documentos descargados`);
      } else {
        this.notificationService.warning('Descarga parcial', `${descargados} descargados, ${errores} errores`);
      }
    }
  }

  verActaSupervision(): void {
    if (!this.documentoId || !this.tieneActaSupervision) {
      this.notificationService.warning('No disponible', 'El acta de supervisión no está disponible');
      return;
    }

    this.auditorService.verActaSupervision(this.documentoId, this.tieneActaSupervision);
  }

  descargarActaSupervision(): void {
    if (!this.documentoId || !this.tieneActaSupervision) {
      this.notificationService.warning('No disponible', 'El acta de supervisión no está disponible para descarga');
      return;
    }

    this.auditorService.descargarActaSupervision(this.documentoId, this.tieneActaSupervision);
  }

  debugActaData(): void {
    // Método de depuración eliminado
  }

  
}