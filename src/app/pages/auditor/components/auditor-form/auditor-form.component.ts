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

  observacionesRevision = '';
  decisionSeleccionada = '';

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
    rp: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    cdp: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    poliza: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    certificadoBancario: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    minuta: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    actaInicio: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null }
  };

  tabActivo: 'auditoria' | 'contratista' | 'decision' = 'auditoria';

  // Documentos del contratista (todos)
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
    console.log('AUDITOR - Iniciando ngOnInit...');
    console.log('Inputs recibidos:', {
      documentoId: this.documentoId,
      modo: this.modo,
      soloLectura: this.soloLectura
    });

    this.esModoContabilidad = this.modo === 'contabilidad';
    this.esModoGeneral = this.modo === 'general';

    if (this.soloLectura === true || this.esModoContabilidad || this.esModoGeneral) {
      this.soloLectura = true;
      console.log('[AUDITOR] Forzado soloLectura = true');
    }

    // ✅ Obtener ID con prioridad: @Input > ruta > rendición
    let idParaCargar: string | null = this.documentoId;
    
    if (!idParaCargar) {
      const idFromRoute = this.route.snapshot.paramMap.get('id');
      if (idFromRoute) {
        idParaCargar = idFromRoute;
        console.log('[AUDITOR] ID desde ruta:', idParaCargar);
      }
    } else {
      console.log('[AUDITOR] Usando documentoId recibido:', idParaCargar);
    }

    if (idParaCargar) {
      // ✅ Siempre intentar primero como documentoId (usa el ID directamente)
      // Solo si falla, intentar como rendiciónId
      this.cargarDocumentoParaAuditor(idParaCargar);
    } else {
      console.warn('[AUDITOR] No se encontró ID válido');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  esModoSoloLectura(): boolean {
    if (this.esModoContabilidad || this.esModoGeneral || this.soloLectura === true) {
      return true;
    }

    if (this.estadoDocumento === 'EN_REVISION_AUDITOR') {
      return false;
    }

    const esEstadoFinal = [
      'APROBADO_AUDITOR',
      'COMPLETADO_AUDITOR',
      'RECHAZADO_AUDITOR',
      'OBSERVADO_AUDITOR'
    ].includes(this.estadoDocumento);

    return esEstadoFinal || this.soloLectura;
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

  // ==================== CARGA PRINCIPAL ====================

  cargarDocumentoParaAuditor(id: string): void {
    if (!id) {
      console.warn('[AUDITOR] No se recibió ID válido');
      return;
    }

    console.log('[AUDITOR] Cargando documento con ID:', id);
    this.isLoading = true;

    this.auditorService.obtenerDocumentoParaVista(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        
        // ✅ Si el documento no se encuentra, intentar como rendiciónId
        if (!data || !data.documento) {
          console.log('[AUDITOR] Documento no encontrado, intentando como rendiciónId...');
          this.cargarViaRendicion(id);
          return;
        }
        
        this.documentoData = data?.documento || null;
        this.numeroRadicado = data?.documento?.numeroRadicado || '';
        this.nombreContratista = data?.documento?.nombreContratista || '';
        this.estadoDocumento = data?.documento?.estado || '';
        this.primerRadicadoDelAno = !!data?.documento?.primerRadicadoDelAno;
        this.contratistaId = data?.documento?.contratistaId || null;
        this.numeroContrato = data?.documento?.numeroContrato || '';

        if (this.estadoDocumento === 'EN_REVISION_AUDITOR') {
          this.soloLectura = false;
        }

        if (data?.auditor) {
          const aud = data.auditor;
          this.decisionAuditor = this.mapearEstadoAuditor(aud.estado);
          this.observacionAuditor = aud.observaciones || '';
          this.fechaDecisionAuditor = aud.fechaAprobacion || aud.fechaFinRevision || null;
          this.nombreAuditor = aud.auditor?.nombre || 'Auditor';
        }

        this.cargarTodosLosDocumentos();

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
        console.error('[AUDITOR] Error cargando documento:', err);
        
        // ✅ Si hay error 404, intentar como rendiciónId
        if (err.status === 404) {
          console.log('[AUDITOR] Error 404, intentando como rendiciónId...');
          this.cargarViaRendicion(id);
        } else {
          this.notificationService.error('Error', 'No se pudo cargar el documento');
          this.isLoading = false;
        }
      }
    });
  }

  private cargarViaRendicion(rendicionId: string): void {
    this.isLoading = true;
    
    this.rendicionService.obtenerDetalleRendicion(rendicionId).subscribe({
      next: (data: any) => {
        const documentoIdReal = data.documento?.id || data.documentoId;
        if (documentoIdReal) {
          console.log('[AUDITOR] ✅ DocumentoId real obtenido:', documentoIdReal);
          this.cargarDocumentoParaAuditor(documentoIdReal);
        } else {
          console.error('[AUDITOR] No se pudo obtener documentoId real');
          this.notificationService.error('Error', 'No se pudo identificar el documento asociado a esta rendición');
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('[AUDITOR] Error cargando rendición:', err);
        this.notificationService.error('Error', 'No se pudo cargar el documento');
        this.isLoading = false;
      }
    });
  }

  cargarTodosLosDocumentos(): void {
    // Reiniciar estado
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key] = {
        subido: false,
        archivo: null,
        nombreArchivo: '',
        rutaServidor: null,
        fuente: null
      };
    });

    // 1. Cargar documentos desde el CONTRATO (RP, CDP, MINUTA, ACTA_INICIO)
    if (this.numeroContrato) {
      this.cargarDocumentosDesdeContrato();
    }

    // 2. Cargar contratista con sus documentos (PÓLIZA, CERTIFICADO_BANCARIO, MINUTA, ACTA_INICIO)
    if (this.numeroContrato) {
      this.cargarContratistaConDocumentos();
    }
  }

  cargarContratistaConDocumentos(): void {
    this.cargandoDocumentosContratista = true;
    
    this.auditorService.obtenerContratistaPorNumeroContrato(this.numeroContrato).subscribe({
      next: (contratista: any) => {
        if (contratista && contratista.id) {
          this.contratistaId = contratista.id;
          
          const documentos = contratista.documentos || [];
          this.documentosContratista = documentos;
          
          console.log(`[CONTRATISTA] ✅ Contratista encontrado: ${contratista.razonSocial || contratista.nombre}`);
          console.log(`[CONTRATISTA] 📎 Documentos recibidos: ${documentos.length}`);
          
          const mapeoTipos: Record<string, string[]> = {
            poliza: ['POLIZA', 'POLIZA_CUMPLIMIENTO', 'GARANTIA', 'PÓLIZA'],
            certificadoBancario: ['CERTIFICADO_BANCARIO', 'CERTIFICADO BANCARIO', 'CERTIFICADO'],
            minuta: ['MINUTA', 'MINUTA_CONTRATO'],
            actaInicio: ['ACTA_INICIO', 'ACTA DE INICIO', 'ACTA_INICIO_CONTRATO']
          };

          const claves = Object.keys(mapeoTipos);
          
          for (let i = 0; i < claves.length; i++) {
            const clave = claves[i];
            const tiposBuscados = mapeoTipos[clave];
            
            const documento = documentos.find((doc: any) => {
              if (!doc.tipo) return false;
              const tipoDoc = doc.tipo.toUpperCase();
              return tiposBuscados.some((tb: string) => tipoDoc.includes(tb) || tipoDoc === tb);
            });

            if (documento && documento.rutaArchivo) {
              this.archivosAuditorFormulario[clave] = {
                subido: true,
                archivo: null,
                nombreArchivo: documento.nombreArchivo,
                rutaServidor: documento.rutaArchivo,
                fuente: 'contratista',
                metadata: {
                  id: documento.id,
                  tipo: documento.tipo,
                  fechaSubida: documento.fechaSubida
                }
              };
              console.log(`[CONTRATISTA] ✅ ${clave} cargado:`, documento.nombreArchivo);
            } else {
              console.log(`[CONTRATISTA] ❌ No se encontró ${clave} en contratista`);
            }
          }

          this.verificarArchivosCompletos();
        } else {
          console.warn('[CONTRATISTA] ❌ No se encontró contratista');
          this.documentosContratista = [];
        }
        
        this.cargandoDocumentosContratista = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('[CONTRATISTA] Error:', error);
        this.documentosContratista = [];
        this.cargandoDocumentosContratista = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarDocumentosDesdeContrato(): void {
    this.auditorService.obtenerContratoPorNumero(this.numeroContrato).subscribe({
      next: (response: any) => {
        const contrato = response?.data || response;
        console.log('[CONTRATO] Datos del contrato:', contrato);

        const documentosContrato = contrato?.documentos || [];
        
        // Buscar RP
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
          console.log('[CONTRATO] ✅ RP cargado');
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

        // Buscar CDP
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
          console.log('[CONTRATO] ✅ CDP cargado');
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

        // Buscar MINUTA
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
          console.log('[CONTRATO] ✅ MINUTA cargada');
        }

        // Buscar ACTA_INICIO
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
          console.log('[CONTRATO] ✅ ACTA_INICIO cargada');
        }

        this.verificarArchivosCompletos();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[CONTRATO] Error:', error);
      }
    });
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

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

  verArchivoAuditor(tipo: string): void {
    if (!this.puedeAccederArchivo(tipo)) {
      this.notificationService.warning('No disponible', 'Archivo no disponible');
      return;
    }
    this.auditorService.previsualizarArchivoAuditor(this.documentoId!, tipo);
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

    console.log('[AUDITOR] Verificación archivos:', {
      primerRadicado: this.primerRadicadoDelAno,
      subidos: subidosConfirmados,
      completos: this.archivosCompletos
    });
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

  // ==================== DOCUMENTOS DEL CONTRATISTA (TAB 2) ====================

  cargarDocumentosContratista(): void {
    if (!this.contratistaId) {
      this.notificationService.warning('Sin documentos', 'No hay contratista asociado');
      return;
    }

    this.cargandoDocumentosContratista = true;

    this.contratistasService.obtenerDocumentos(this.contratistaId).subscribe({
      next: (documentos: any[]) => {
        this.documentosContratista = documentos || [];
        console.log(`✅ Documentos del contratista (TAB2): ${this.documentosContratista.length}`);
        this.cargandoDocumentosContratista = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error cargando documentos del contratista:', error);
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
        console.error('Error visualizando documento:', error);
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
        console.error('Error descargando documento:', error);
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
}