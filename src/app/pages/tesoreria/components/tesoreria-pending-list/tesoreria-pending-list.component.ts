import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TesoreriaService } from '../../../../core/services/tesoreria.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TesoreriaProceso } from '../../../../core/models/tesoreria.model';

@Component({
  selector: 'app-tesoreria-pending-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './tesoreria-pending-list.component.html',
  styleUrls: ['./tesoreria-pending-list.component.scss']
})
export class TesoreriaPendingListComponent implements OnInit, OnDestroy {
  documentos: TesoreriaProceso[] = [];
  filteredDocumentos: TesoreriaProceso[] = [];
  paginatedDocumentos: TesoreriaProceso[] = [];

  isLoading = false;
  isProcessing = false;
  errorMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private tesoreriaService: TesoreriaService,
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
        this.usuarioActual = user.fullName || user.username || 'Tesoreria';
      } catch {
        this.usuarioActual = 'Tesoreria';
      }
    }
  }

  cargarDocumentosPendientes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.tesoreriaService.obtenerDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: TesoreriaProceso[]) => {
          console.log('[Pendientes] Documentos cargados:', docs?.length || 0);
          this.documentos = docs || [];
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('[Pendientes] Error al cargar:', err);
          this.errorMessage = err.message || 'No se pudieron cargar los documentos pendientes';
          this.notificationService.error('Error', this.errorMessage);
          this.documentos = [];
          this.filteredDocumentos = [];
          this.updatePagination();
          this.isLoading = false;
        }
      });
  }

  puedeTomarDocumento(doc: TesoreriaProceso): boolean {
    const estado = (doc.estado || '').toUpperCase();
    return (
      estado === 'COMPLETADO_CONTABILIDAD' &&
      doc.disponible === true &&
      !doc.tesoreroAsignado
    );
  }

  esMiDocumentoEnRevision(doc: TesoreriaProceso): boolean {
    const estado = (doc.estado || '').toUpperCase();
    return (
      estado === 'EN_REVISION_TESORERIA' &&
      doc.tesoreroAsignado === this.usuarioActual
    );
  }

  tomarParaTesoreria(doc: TesoreriaProceso): void {
    if (!doc?.id) {
      this.notificationService.error('Error', 'Documento sin ID válido');
      return;
    }

    const yaEsMio = this.esMiDocumentoEnRevision(doc);

    if (yaEsMio) {
      this.notificationService.info('Continuar', 'Redirigiendo al formulario...');
      this.router.navigate(['/tesoreria/procesar', doc.id]);
      return;
    }

    if (!this.puedeTomarDocumento(doc)) {
      this.notificationService.warning('No disponible', 'Este documento ya está asignado o no está pendiente');
      return;
    }

    this.notificationService.showModal({
      title: 'Tomar para tesorería',
      message: `¿Tomar el radicado ${doc.numeroRadicado || 'sin radicado'} (${doc.nombreContratista || 'sin nombre'})?\n\nSe te asignará y pasarás al formulario.`,
      type: 'confirm',
      confirmText: 'Sí, tomar y procesar',
      cancelText: 'Cancelar',
      onConfirm: () => this.procederTomarDocumento(doc)
    });
  }

  private procederTomarDocumento(doc: TesoreriaProceso): void {
    this.isProcessing = true;
    console.log('[TOMAR] Intentando tomar documento ID:', doc.id);

    this.tesoreriaService.tomarDocumentoParaRevision(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[TOMAR] Respuesta del backend:', response);

          if (response?.success) {
            // Eliminar de pendientes
            const index = this.documentos.findIndex(d => d.id === doc.id);
            if (index !== -1) {
              this.documentos.splice(index, 1);
              this.filteredDocumentos = [...this.documentos];
              this.updatePagination();
            }

            this.notificationService.success(
              '¡Tomado!',
              `Documento asignado a ti. Redirigiendo al formulario...`
            );

            // Redirigir SOLO si el backend confirmó
            setTimeout(() => {
              this.router.navigate(['/tesoreria/procesar', doc.id]);
            }, 1200);
          } else {
            this.notificationService.error('Error', response?.message || 'Respuesta no confirmada');
          }

          this.isProcessing = false;
        },
        error: (err: any) => {
          console.error('[TOMAR] Error completo:', err);
          const msg = err.error?.message || err.message || 'No se pudo tomar el documento';
          this.notificationService.error('Error al tomar', msg);
          this.isProcessing = false;
        }
      });
  }

  getTextoBoton(doc: TesoreriaProceso): string {
    if (this.esMiDocumentoEnRevision(doc)) {
      return 'Continuar';
    }
    return this.puedeTomarDocumento(doc) ? 'Tomar para Pago' : 'No disponible';
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado?.toLowerCase().includes(term) || false) ||
        (doc.nombreContratista?.toLowerCase().includes(term) || false) ||
        (doc.numeroContrato?.toLowerCase().includes(term) || false) ||
        (doc.documentoContratista?.toLowerCase().includes(term) || false)
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

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  formatDate(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  formatDateShort(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    const diffMs = new Date().getTime() - new Date(fecha).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  esDocumentoReciente(doc: TesoreriaProceso): boolean {
    const fecha = doc.fechaCompletadoContabilidad || doc.fechaRadicacion;
    if (!fecha) return false;
    return this.getDiasTranscurridos(fecha) < 1;
  }

  getTooltipInfo(doc: TesoreriaProceso): string {
    let info = '';
    if (doc.numeroRadicado) info += `Radicado: ${doc.numeroRadicado}\n`;
    if (doc.nombreContratista) info += `Contratista: ${doc.nombreContratista}\n`;
    if (doc.contadorAsignado) info += `Contador: ${doc.contadorAsignado}\n`;
    if (doc.tesoreroAsignado) info += `Tesorero: ${doc.tesoreroAsignado}\n`;
    const dias = this.getDiasTranscurridos(doc.fechaCompletadoContabilidad || doc.fechaRadicacion);
    info += `Días desde completado: ${dias}\n`;
    if (doc.observaciones) info += `Observación: ${doc.observaciones.substring(0, 100)}...\n`;
    return info;
  }

  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'badge-secondary';
    const e = estado.toUpperCase();
    if (e.includes('COMPLETADO_TESORERIA')) return 'badge-success';
    if (e.includes('EN_REVISION_TESORERIA')) return 'badge-warning';
    if (e.includes('OBSERVADO_TESORERIA')) return 'badge-danger';
    if (e.includes('RECHAZADO_TESORERIA')) return 'badge-danger';
    if (e.includes('COMPLETADO_CONTABILIDAD')) return 'badge-info';
    return 'badge-secondary';
  }

  getEstadoTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    const e = estado.toUpperCase();
    if (e.includes('COMPLETADO_TESORERIA')) return 'Completado Tesorería';
    if (e.includes('EN_REVISION_TESORERIA')) return 'En Revisión Tesorería';
    if (e.includes('OBSERVADO_TESORERIA')) return 'Observado Tesorería';
    if (e.includes('RECHAZADO_TESORERIA')) return 'Rechazado Tesorería';
    if (e.includes('COMPLETADO_CONTABILIDAD')) return 'Pendiente Tesorería';
    return estado;
  }

  getDiasClass(doc: TesoreriaProceso): string {
    const dias = this.getDiasTranscurridos(doc.fechaCompletadoContabilidad || doc.fechaRadicacion);
    if (dias < 1) return 'text-success';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  trackById(index: number, doc: TesoreriaProceso): string {
    return doc.id || index.toString();
  }
}