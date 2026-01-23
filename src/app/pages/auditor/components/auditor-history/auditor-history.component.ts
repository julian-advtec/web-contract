import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-auditor-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './auditor-history.component.html',
  styleUrls: ['./auditor-history.component.scss']
})
export class AuditorHistoryComponent implements OnInit, OnDestroy {
  historial: any[] = [];
  filteredHistorial: any[] = [];
  paginatedHistorial: any[] = [];

  loading = false;
  isProcessing = false;
  error = '';
  successMessage = '';
  infoMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  usuarioActual = '';
  sidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private auditorService: AuditorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.loadHistorial();
  }

  cargarUsuarioActual(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.usuarioActual = user.fullName || user.username || 'Auditor';
    }
  }

  revisarNuevamente(item: any): void {
    let documentoId = item.documento?.id || item.id || item.documentoId;
    if (!documentoId) {
      this.notificationService.error('Error', 'ID no disponible');
      return;
    }

    const estado = (item.estado || '').toUpperCase();
    const auditorAsignado = this.getAuditorAsignado(item);
    const soyElAuditor = auditorAsignado.toLowerCase().trim() === this.usuarioActual.toLowerCase().trim();

    const queryParams: any = { desdeHistorial: 'true' };

    const estadosFinales = ['APROBADO_AUDITOR', 'COMPLETADO_AUDITOR', 'RECHAZADO_AUDITOR', 'OBSERVADO_AUDITOR'];

    if (estadosFinales.some(e => estado.includes(e))) {
      queryParams.soloLectura = 'true';
      queryParams.modo = 'consulta';
    } else if (estado.includes('EN_REVISION_AUDITOR') && soyElAuditor) {
      queryParams.soloLectura = 'false';
      queryParams.modo = 'edicion';
    } else {
      queryParams.soloLectura = 'true';
      queryParams.modo = 'consulta';
    }

    this.router.navigate(['/auditor/revisar', documentoId], { queryParams });
  }

  getAuditorAsignado(item: any): string {
    return item.auditorAsignado || item.documento?.auditorAsignado || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

 

  esMiDocumento(item: any): boolean {
    const auditorAsignado = this.getAuditorAsignado(item);
    return this.compararNombres(auditorAsignado, this.usuarioActual);
  }

  compararNombres(nombre1: string, nombre2: string): boolean {
    if (!nombre1 || !nombre2) return false;
    const normalizar = (nombre: string) => nombre.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalizar(nombre1);
    const n2 = normalizar(nombre2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }

 

  esDocumentoReciente(item: any): boolean {
    const fecha = item.fechaActualizacion || item.updatedAt || item.fechaAprobacion || item.fechaCreacion;
    if (!fecha) return false;
    const dias = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 7;
  }

  tieneDocumentos(item: any): boolean {
    const doc = item.documento || item;
    return !!(doc.cuentaCobro || doc.seguridadSocial || doc.informeActividades);
  }

  getDuracionRevision(item: any): string {
    const inicio = item.fechaInicioRevision || item.fechaCreacion || item.createdAt;
    const fin = item.fechaActualizacion || item.updatedAt || new Date();
    if (!inicio) return 'N/A';
    const diffMs = new Date(fin).getTime() - new Date(inicio).getTime();
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return dias === 0 ? 'Hoy' : dias === 1 ? '1 día' : `${dias} días`;
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'badge bg-light text-dark';
    const e = estado.toUpperCase();
    if (e.includes('APROBADO_AUDITOR') || e.includes('COMPLETADO_AUDITOR')) return 'badge bg-success';
    if (e.includes('OBSERVADO_AUDITOR')) return 'badge bg-warning text-dark';
    if (e.includes('RECHAZADO_AUDITOR')) return 'badge bg-danger';
    if (e.includes('EN_REVISION_AUDITOR')) return 'badge bg-info';
    if (e.includes('APROBADO_SUPERVISOR')) return 'badge bg-primary';
    return 'badge bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';
    const e = estado.toUpperCase();
    if (e.includes('APROBADO_AUDITOR')) return 'Aprobado Auditor';
    if (e.includes('COMPLETADO_AUDITOR')) return 'Completado';
    if (e.includes('OBSERVADO_AUDITOR')) return 'Observado';
    if (e.includes('RECHAZADO_AUDITOR')) return 'Rechazado';
    if (e.includes('EN_REVISION_AUDITOR')) return 'En Revisión';
    if (e.includes('APROBADO_SUPERVISOR')) return 'Aprobado Supervisor';
    return estado;
  }

  formatDate(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatDateOnly(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
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
      return new Date(fecha).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getDocumentCount(item: any): number {
    const doc = item.documento || item;
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredHistorial = [...this.historial];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredHistorial = this.historial.filter(item => {
        const doc = item.documento || item;
        return (
          (doc.numeroRadicado?.toLowerCase().includes(term)) ||
          (doc.nombreContratista?.toLowerCase().includes(term)) ||
          (doc.numeroContrato?.toLowerCase().includes(term)) ||
          (item.estado?.toLowerCase().includes(term)) ||
          (item.observaciones?.toLowerCase().includes(term)) ||
          (this.getAuditorAsignado(item)?.toLowerCase().includes(term))
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredHistorial.length / this.pageSize);
    this.pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredHistorial.length);
    this.paginatedHistorial = this.filteredHistorial.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  dismissError(): void {
    this.error = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }

  refreshData(): void {
    this.loadHistorial();
  }

  loadHistorial(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.infoMessage = '';

    console.log('[FRONT - HISTORIAL] Solicitando historial al backend...');

    this.auditorService.obtenerHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[FRONT - HISTORIAL] Respuesta completa del backend:', response);

          this.historial = response.data || [];
          console.log('[FRONT - HISTORIAL] Registros recibidos:', this.historial.length);

          if (this.historial.length > 0) {
            console.log('[FRONT - HISTORIAL] Primer registro recibido:', this.historial[0]);
          }

          this.filteredHistorial = [...this.historial];
          this.updatePagination();

          if (this.filteredHistorial.length > 0) {
            const recientes = this.filteredHistorial.filter(item => this.esDocumentoReciente(item));
            this.successMessage = `Se encontraron ${this.filteredHistorial.length} auditorías (${recientes.length} recientes)`;
          } else {
            this.infoMessage = 'No hay auditorías en el historial';
          }

          this.loading = false;
        },
        error: (err: any) => {
          console.error('[FRONT - HISTORIAL] Error en la petición:', err);
          this.error = 'Error de conexión con el servidor: ' + (err.message || 'Desconocido');
          this.loading = false;
          this.notificationService.error('Error', this.error);
        }
      });
  }
}