import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-auditor-pending-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './auditor-pending-list.component.html',
  styleUrls: ['./auditor-pending-list.component.scss']
})
export class AuditorPendingListComponent implements OnInit, OnDestroy {
  documentos: any[] = [];
  filteredDocumentos: any[] = [];
  paginatedDocumentos: any[] = [];

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
    private auditorService: AuditorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

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
        this.usuarioActual = user.fullName || user.username || 'Auditor';
      } catch {
        this.usuarioActual = 'Auditor';
      }
    }
  }

  cargarDocumentosPendientes(): void {
    this.isLoading = true;
    this.auditorService.obtenerPendientesParaAuditoria().subscribe({
      next: (docs: any[]) => {
        this.documentos = docs || [];
        this.filteredDocumentos = [...this.documentos];
        this.updatePagination();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'No se pudieron cargar los documentos pendientes';
        this.notificationService.error('Error', this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  puedeTomarDocumento(doc: any): boolean {
    const estado = (doc.estado || '').toUpperCase();
    return estado.includes('APROBADO_SUPERVISOR') && !doc.auditorAsignado;
  }

  esMiDocumentoEnRevision(doc: any): boolean {
    const estado = (doc.estado || '').toUpperCase();
    return doc.auditorAsignado === this.usuarioActual &&
           (doc.enAuditoria || doc.enRevision || estado.includes('EN_REVISION_AUDITOR'));
  }

  tomarParaAuditoria(doc: any): void {
    const yaEsMio = this.esMiDocumentoEnRevision(doc);

    if (yaEsMio) {
      this.notificationService.showModal({
        title: 'Continuar auditoría',
        message: `El documento ${doc.numeroRadicado} ya está asignado a ti.\n\n¿Quieres continuar ahora?`,
        type: 'confirm',
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
        onConfirm: () => this.continuarAuditoria(doc)
      });
      return;
    }

    if (doc.auditorAsignado && doc.auditorAsignado !== this.usuarioActual) {
      this.notificationService.warning(
        'Documento ocupado',
        `Ya está siendo auditado por ${doc.auditorAsignado}`
      );
      return;
    }

    this.notificationService.showModal({
      title: 'Tomar para auditoría',
      message: `¿Deseas tomar el documento ${doc.numeroRadicado} (${doc.nombreContratista || 'sin nombre'})?\n\n` +
               `Se cambiará a EN_REVISION_AUDITOR y se te asignará como auditor.`,
      type: 'confirm',
      confirmText: 'Sí, tomar y auditar',
      cancelText: 'No, cancelar',
      onConfirm: () => this.procederTomarDocumento(doc)
    });
  }

  private procederTomarDocumento(doc: any): void {
    this.isProcessing = true;

    this.auditorService.tomarDocumentoParaRevision(doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado) => {
          const index = this.documentos.findIndex(d => d.id === doc.id);
          if (index !== -1) {
            this.documentos[index] = {
              ...this.documentos[index],
              estado: 'EN_REVISION_AUDITOR',
              auditorAsignado: this.usuarioActual,
              enAuditoria: true,
              enRevision: true,
              fechaAsignacionAuditoria: new Date().toISOString()
            };
          }

          this.notificationService.success(
            '¡Tomado!',
            `Documento ${doc.numeroRadicado} asignado. Redirigiendo...`
          );

          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();

          this.router.navigate(['/auditor/revisar', doc.id], {
            queryParams: { modo: 'edicion', soloLectura: 'false' }
          });
        },
        error: (err) => {
          let msg = 'No se pudo tomar el documento';
          if (err.status === 404) msg = 'Endpoint no encontrado o documento inválido';
          if (err.status === 409) msg = err.error?.message || 'Ya está asignado a otro auditor';
          if (err.status === 403) msg = 'No tienes permisos';

          this.notificationService.error('Error', msg);
          this.isProcessing = false;
        },
        complete: () => this.isProcessing = false
      });
  }

  continuarAuditoria(doc: any): void {
    this.router.navigate(['/auditor/revisar', doc.id], {
      queryParams: { modo: 'edicion', soloLectura: 'false' }
    });
  }

  getTextoBoton(doc: any): string {
    return this.esMiDocumentoEnRevision(doc) ? 'Continuar' : 'Auditar';
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc =>
        doc.numeroRadicado?.toLowerCase().includes(term) ||
        doc.nombreContratista?.toLowerCase().includes(term) ||
        doc.numeroContrato?.toLowerCase().includes(term)
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

    for (let i = start; i <= end; i++) {
      this.pages.push(i);
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  formatDate(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatDateShort(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getDiasTranscurridos(fecha: Date | string): number {
    if (!fecha) return 0;
    try {
      const fechaDoc = new Date(fecha);
      const hoy = new Date();
      const diferenciaMs = hoy.getTime() - fechaDoc.getTime();
      return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  getDuracionContrato(inicio: Date | string, fin: Date | string): string {
    if (!inicio || !fin) return 'N/A';
    try {
      const fechaInicio = new Date(inicio);
      const fechaFin = new Date(fin);
      const diferenciaMs = fechaFin.getTime() - fechaInicio.getTime();
      const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
      return `${dias} días`;
    } catch {
      return 'N/A';
    }
  }

  esDocumentoReciente(doc: any): boolean {
    const fechaAprobacion = doc['fechaAprobacion'] || doc['fechaRevision'] || doc.fechaActualizacion;
    if (!fechaAprobacion) return false;
    const diasTranscurridos = this.getDiasTranscurridos(fechaAprobacion);
    return diasTranscurridos < 1;
  }

  getEstadoClass(estado: string): string {
    if (!estado) return 'badge-secondary';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('APROBADO_SUPERVISOR') || estadoUpper.includes('APROBADO')) return 'badge-success';
    if (estadoUpper.includes('PENDIENTE') || estadoUpper.includes('EN_AUDITORIA')) return 'badge-warning';
    if (estadoUpper.includes('OBSERVADO')) return 'badge-info';
    if (estadoUpper.includes('RECHAZADO')) return 'badge-danger';
    if (estadoUpper.includes('RADICADO')) return 'badge-primary';

    return 'badge-secondary';
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('APROBADO_SUPERVISOR')) return 'Aprobado Supervisor';
    if (estadoUpper.includes('APROBADO')) return 'Aprobado';
    if (estadoUpper.includes('PENDIENTE')) return 'Pendiente';
    if (estadoUpper.includes('EN_AUDITORIA') || estadoUpper.includes('EN_AUDITORÍA')) return 'En Auditoría';
    if (estadoUpper.includes('OBSERVADO')) return 'Observado';
    if (estadoUpper.includes('RECHAZADO')) return 'Rechazado';
    if (estadoUpper.includes('RADICADO')) return 'Radicado';

    return estado;
  }

  getDiasClass(doc: any): string {
    const fechaReferencia = doc['fechaAprobacion'] || doc['fechaRevision'] || doc.fechaRadicacion;
    const dias = this.getDiasTranscurridos(fechaReferencia);

    if (dias < 1) return 'text-success';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  getTooltipInfo(doc: any): string {
    let info = '';

    if (doc.numeroRadicado) {
      info += `Radicado: ${doc.numeroRadicado}\n`;
    }

    if (doc.nombreContratista) {
      info += `Contratista: ${doc.nombreContratista}\n`;
    }

    if (doc.supervisorAsignado) {
      info += `Supervisor: ${doc.supervisorAsignado}\n`;
    }

    const dias = this.getDiasTranscurridos(doc['fechaAprobacion'] || doc.fechaRadicacion);
    info += `Días desde aprobación: ${dias}\n`;

    info += `Documentos: ${this.getDocumentCount(doc)}`;

    return info;
  }

  getDocumentCount(doc: any): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  previsualizarDocumentoEspecifico(doc: any, index: number): void {
    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    let existeDocumento = false;
    switch (index) {
      case 1: existeDocumento = !!doc.cuentaCobro; break;
      case 2: existeDocumento = !!doc.seguridadSocial; break;
      case 3: existeDocumento = !!doc.informeActividades; break;
    }

    if (!existeDocumento) {
      this.notificationService.warning('Documento no disponible', `El documento ${index} no está disponible`);
      return;
    }

    this.auditorService.descargarArchivoRadicado(doc.id, index)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: (error: any) => {
          this.notificationService.error('Error', 'No se pudo previsualizar el documento');
        }
      });
  }

  descargarDocumentoEspecifico(doc: any, index: number): void {
    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    let existeDocumento = false;
    let nombreDocumento = '';

    switch (index) {
      case 1:
        existeDocumento = !!doc.cuentaCobro;
        nombreDocumento = doc.cuentaCobro || 'cuenta_cobro.pdf';
        break;
      case 2:
        existeDocumento = !!doc.seguridadSocial;
        nombreDocumento = doc.seguridadSocial || 'seguridad_social.pdf';
        break;
      case 3:
        existeDocumento = !!doc.informeActividades;
        nombreDocumento = doc.informeActividades || 'informe_actividades.pdf';
        break;
    }

    if (!existeDocumento) {
      this.notificationService.warning('Documento no disponible', `El documento ${index} no está disponible para descarga`);
      return;
    }

    this.isProcessing = true;

    this.auditorService.descargarArchivoRadicado(doc.id, index)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreDocumento;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.isProcessing = false;
          this.notificationService.success('Descarga completada', `Documento "${nombreDocumento}" descargado`);
        },
        error: (error: any) => {
          this.notificationService.error('Error', 'No se pudo descargar el documento');
          this.isProcessing = false;
        }
      });
  }
}