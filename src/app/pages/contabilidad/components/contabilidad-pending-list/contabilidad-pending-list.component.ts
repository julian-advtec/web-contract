import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DocumentoContable } from '../../../../core/models/documento-contable.model';

@Component({
  selector: 'app-contabilidad-pending-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contabilidad-pending-list.component.html',
  styleUrls: ['./contabilidad-pending-list.component.scss']
})
export class ContabilidadPendingListComponent implements OnInit, OnDestroy {
  documentos: DocumentoContable[] = [];
  filteredDocumentos: DocumentoContable[] = [];
  paginatedDocumentos: DocumentoContable[] = [];

  isLoading = false;
  isProcessing = false;
  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private contabilidadService: ContabilidadService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarDocumentosPendientes();
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
        this.usuarioActual = user.fullName || user.username || 'Contabilidad';
      } catch {
        this.usuarioActual = 'Contabilidad';
      }
    }
  }

  cargarDocumentosPendientes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.infoMessage = '';

    this.contabilidadService.obtenerDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: DocumentoContable[]) => {
          this.documentos = docs || [];
          
          console.log('[PENDIENTES] Documentos cargados:', this.documentos.length);
          
          if (this.documentos.length > 0) {
            this.successMessage = `Se encontraron ${this.documentos.length} documentos pendientes`;
            setTimeout(() => this.successMessage = '', 4000);
          } else {
            this.infoMessage = 'No hay documentos pendientes de contabilidad';
          }

          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('[PENDIENTES] Error cargando:', err);
          this.errorMessage = err.error?.message || err.message || 'Error al cargar documentos pendientes';
          this.notificationService.error('Error', this.errorMessage);
          this.documentos = [];
          this.filteredDocumentos = [];
          this.updatePagination();
          this.isLoading = false;
        }
      });
  }

  puedeTomarDocumento(doc: DocumentoContable): boolean {
    const estado = (doc.estado || '').toUpperCase();
    const estadosPermitidos = ['APROBADO_AUDITOR', 'COMPLETADO_AUDITOR'];
    return estadosPermitidos.some(e => estado.includes(e)) && doc.disponible !== false;
  }

  esMiDocumentoEnRevision(doc: DocumentoContable): boolean {
    const estado = (doc.estado || '').toUpperCase();
    const estadosRevision = ['EN_REVISION_CONTABILIDAD', 'EN_PROCESO_CONTABILIDAD'];
    return estadosRevision.some(e => estado.includes(e));
  }

  tomarParaContabilidad(doc: DocumentoContable): void {
    if (!doc.id) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    const yaEsMio = this.esMiDocumentoEnRevision(doc);

    if (yaEsMio) {
      this.notificationService.showModal({
        title: 'Continuar proceso',
        message: `El documento ${doc.numeroRadicado} ya está en revisión.\n\n¿Quieres continuar ahora?`,
        type: 'confirm',
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
        onConfirm: () => this.continuarProceso(doc)
      });
      return;
    }

    if (!this.puedeTomarDocumento(doc)) {
      this.notificationService.warning(
        'No disponible',
        `El documento no está disponible para tomar (Estado: ${doc.estado || 'desconocido'})`
      );
      return;
    }

    this.notificationService.showModal({
      title: 'Tomar documento',
      message: `¿Deseas tomar el documento ${doc.numeroRadicado} (${doc.nombreContratista || 'sin nombre'})?\n\n` +
               `Se asignará a ti para revisión contable.`,
      type: 'confirm',
      confirmText: 'Sí, tomar',
      cancelText: 'No, cancelar',
      onConfirm: () => this.procederTomarDocumento(doc)
    });
  }

  private procederTomarDocumento(doc: DocumentoContable): void {
    this.isProcessing = true;

    this.contabilidadService.tomarDocumentoParaRevision(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.success) {
            // Actualizar el documento en la lista
            const idx = this.documentos.findIndex(d => d.id === doc.id);
            if (idx !== -1) {
              this.documentos[idx] = {
                ...this.documentos[idx],
                estado: 'EN_REVISION_CONTABILIDAD',
                disponible: false
              };
              this.filteredDocumentos = [...this.documentos];
              this.updatePagination();
            }

            this.notificationService.success(
              '¡Documento tomado!',
              `Redirigiendo al procesamiento de ${doc.numeroRadicado}...`
            );

            setTimeout(() => {
              this.router.navigate(['/contabilidad/procesar', doc.id], {
                queryParams: { modo: 'edicion', soloLectura: 'false' }
              });
            }, 1500);
          } else {
            this.notificationService.error('Error', res?.message || 'No se pudo tomar el documento');
          }
          this.isProcessing = false;
        },
        error: (err: any) => {
          let msg = 'No se pudo tomar el documento';
          if (err.status === 404) msg = 'Endpoint no encontrado o documento inválido';
          if (err.status === 409) msg = err.error?.message || 'El documento ya está siendo revisado';
          if (err.status === 403) msg = 'No tienes permisos para realizar esta acción';

          this.notificationService.error('Error', msg);
          this.isProcessing = false;
        }
      });
  }

  continuarProceso(doc: DocumentoContable): void {
    this.router.navigate(['/contabilidad/procesar', doc.id], {
      queryParams: { modo: 'edicion', soloLectura: 'false' }
    });
  }

  getTextoBoton(doc: DocumentoContable): string {
    return this.esMiDocumentoEnRevision(doc) ? 'Continuar' : 'Procesar';
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado || '').toLowerCase().includes(term) ||
        (doc.nombreContratista || '').toLowerCase().includes(term) ||
        (doc.numeroContrato || '').toLowerCase().includes(term) ||
        (doc.documentoContratista || '').toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  refreshData(): void {
    this.cargarDocumentosPendientes();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    this.pages = [];

    const maxPages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages - 1);

    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }

    for (let i = start; i <= end; i++) {
      this.pages.push(i);
    }

    const startIdx = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIdx, startIdx + this.pageSize);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagination();
  }

  formatDate(fecha: any): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatDateShort(fecha: any): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-CO', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getDiasTranscurridos(fecha: any): number {
    if (!fecha) return 0;
    try {
      const diffMs = Date.now() - new Date(fecha).getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  getDuracionContrato(inicio: any, fin: any): string {
    if (!inicio || !fin) return 'N/A';
    try {
      const diffMs = new Date(fin).getTime() - new Date(inicio).getTime();
      const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return `${dias} días`;
    } catch {
      return 'N/A';
    }
  }

  esDocumentoReciente(doc: DocumentoContable): boolean {
    const fechaRef = doc.fechaAprobacionAuditor || doc.fechaRadicacion;
    return this.getDiasTranscurridos(fechaRef) <= 1;
  }

  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'badge bg-secondary';
    
    const e = estado.toUpperCase();
    
    if (e.includes('APROBADO_AUDITOR') || e.includes('COMPLETADO_AUDITOR')) {
      return 'badge bg-success';
    }
    if (e.includes('EN_REVISION_CONTABILIDAD')) {
      return 'badge bg-warning text-dark';
    }
    if (e.includes('GLOSADO') || e.includes('OBSERVADO')) {
      return 'badge bg-danger';
    }
    if (e.includes('PROCESADO') || e.includes('COMPLETADO')) {
      return 'badge bg-primary';
    }
    
    return 'badge bg-secondary';
  }

  getEstadoTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    
    const e = estado.toUpperCase();
    
    if (e.includes('APROBADO_AUDITOR')) return 'Aprobado por Auditor';
    if (e.includes('COMPLETADO_AUDITOR')) return 'Completado Auditor';
    if (e.includes('EN_REVISION_CONTABILIDAD')) return 'En Revisión';
    if (e.includes('GLOSADO')) return 'Glosado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('PROCESADO')) return 'Procesado';
    if (e.includes('COMPLETADO')) return 'Completado';
    
    return estado.replace(/_/g, ' ');
  }

  getDiasClass(doc: DocumentoContable): string {
    const dias = this.getDiasTranscurridos(doc.fechaAprobacionAuditor || doc.fechaRadicacion);
    
    if (dias <= 1) return 'text-success fw-bold';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  getTooltipInfo(doc: DocumentoContable): string {
    const lines = [
      `Radicado: ${doc.numeroRadicado || 'N/A'}`,
      `Contratista: ${doc.nombreContratista || 'N/A'}`,
      `Contrato: ${doc.numeroContrato || 'N/A'}`,
      `Auditor: ${doc.auditor || 'No asignado'}`,
      `Días desde aprobación: ${this.getDiasTranscurridos(doc.fechaAprobacionAuditor || doc.fechaRadicacion)}`,
      doc.observacion ? `Observación: ${doc.observacion.substring(0, 100)}${doc.observacion.length > 100 ? '...' : ''}` : ''
    ];
    
    return lines.filter(Boolean).join('\n');
  }

  getDocumentCount(doc: DocumentoContable): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  previsualizarDocumentoEspecifico(doc: DocumentoContable, index: number): void {
    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    const tipos = ['cuentaCobro', 'seguridadSocial', 'informeActividades'] as const;
    const tipo = tipos[index - 1];
    const nombreArchivo = doc[tipo];

    if (!nombreArchivo) {
      this.notificationService.warning('Documento no disponible', 'Este documento no está disponible para previsualizar');
      return;
    }

    this.contabilidadService.previsualizarArchivoRadicado(doc.id!, index)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        },
        error: (error: any) => {
          console.error('Error al previsualizar:', error);
          this.notificationService.error('Error', 'No se pudo previsualizar el documento');
        }
      });
  }

  descargarDocumentoEspecifico(doc: DocumentoContable, index: number): void {
    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    const tipos = ['cuentaCobro', 'seguridadSocial', 'informeActividades'] as const;
    const tipo = tipos[index - 1];
    const nombres = ['cuenta_cobro.pdf', 'seguridad_social.pdf', 'informe_actividades.pdf'];
    const nombreArchivo = doc[tipo];

    if (!nombreArchivo) {
      this.notificationService.warning('Documento no disponible', 'Este documento no está disponible para descarga');
      return;
    }

    this.isProcessing = true;

    this.contabilidadService.descargarArchivoRadicado(doc.id!, index)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombres[index - 1];
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.isProcessing = false;
          this.notificationService.success('Descarga completada', `Documento "${nombres[index - 1]}" descargado`);
        },
        error: (error: any) => {
          console.error('Error al descargar:', error);
          this.notificationService.error('Error', 'No se pudo descargar el documento');
          this.isProcessing = false;
        }
      });
  }

  trackById(index: number, doc: DocumentoContable): string {
    return doc.id || index.toString();
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }
}