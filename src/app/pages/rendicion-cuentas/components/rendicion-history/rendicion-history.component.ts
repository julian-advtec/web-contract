// src/app/pages/rendicion-cuentas/components/rendicion-history/rendicion-history.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';

@Component({
  selector: 'app-rendicion-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './rendicion-history.component.html',
  styleUrls: ['./rendicion-history.component.scss']
})
export class RendicionHistoryComponent implements OnInit, OnDestroy {
  historial: any[] = [];
  filteredHistorial: any[] = [];
  paginatedHistorial: any[] = [];

  isLoading = false;
  errorMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  usuarioId = '';
  usuarioNombre = '';
  sidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarHistorial();
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
        this.usuarioId = user.id || user.userId || '';
        this.usuarioNombre = user.fullName || user.name || user.username || 'Usuario';
      } catch (error) {
        console.error('Error parsing user:', error);
        this.usuarioId = '';
        this.usuarioNombre = 'Usuario';
      }
    }
  }

  cargarHistorial(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.rendicionService.obtenerHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          console.log('📋 Historial RAW recibido:', JSON.stringify(data, null, 2));
          
          this.historial = (data || []).map(item => ({
            id: item.id || item.rendicionId || item.documentoId,
            rendicionId: item.rendicionId || item.id,
            documentoId: item.documentoId || item.documento?.id,
            numeroRadicado: item.numeroRadicado || item.documento?.numeroRadicado,
            nombreContratista: item.nombreContratista || item.documento?.nombreContratista,
            numeroContrato: item.numeroContrato || item.documento?.numeroContrato,
            documentoContratista: item.documentoContratista || item.documento?.documentoContratista,
            estado: item.estado || item.documento?.estado,
            responsableNombre: item.responsableNombre || item.responsable?.nombre,
            responsableId: item.responsableId || item.responsable?.id,
            fechaCreacion: item.fechaCreacion || item.createdAt,
            fechaInicioRevision: item.fechaInicioRevision || item.fechaAsignacion,
            fechaDecision: item.fechaDecision || item.fechaActualizacion,
            esMio: (item.responsableId || item.responsable?.id) === this.usuarioId,
            disponible: item.disponible !== false
          }));
          
          this.historial.sort((a, b) => 
            new Date(b.fechaCreacion || b.fechaInicioRevision).getTime() - 
            new Date(a.fechaCreacion || a.fechaInicioRevision).getTime()
          );
          
          this.filteredHistorial = [...this.historial];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('❌ Error cargando historial:', err);
          this.errorMessage = err.message || 'Error al cargar el historial';
          this.historial = [];
          this.filteredHistorial = [];
          this.updatePagination();
          this.isLoading = false;
        }
      });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredHistorial = [...this.historial];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredHistorial = this.historial.filter(item =>
        (item.numeroRadicado?.toLowerCase()?.includes(term) ?? false) ||
        (item.nombreContratista?.toLowerCase()?.includes(term) ?? false) ||
        (item.estado?.toLowerCase()?.includes(term) ?? false) ||
        (item.responsableNombre?.toLowerCase()?.includes(term) ?? false)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  refreshData(): void {
    this.cargarHistorial();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredHistorial.length / this.pageSize);
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
    this.paginatedHistorial = this.filteredHistorial.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  formatDate(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const e = estado?.toUpperCase() || '';
    if (e.includes('APROBADO') || e.includes('COMPLETADO')) return 'badge-success';
    if (e.includes('OBSERVADO')) return 'badge-warning';
    if (e.includes('RECHAZADO')) return 'badge-danger';
    if (e.includes('EN_REVISION')) return 'badge-info';
    if (e.includes('PENDIENTE')) return 'badge-secondary';
    return 'badge-dark';
  }

  getEstadoTexto(estado: string): string {
    const e = estado?.toUpperCase() || '';
    if (e.includes('APROBADO')) return 'Aprobado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    if (e.includes('COMPLETADO')) return 'Completado';
    if (e.includes('EN_REVISION')) return 'En Revisión';
    if (e.includes('PENDIENTE')) return 'Pendiente';
    return estado || 'Desconocido';
  }

  getAccionIcon(accion: string): string {
    const a = accion?.toUpperCase() || '';
    if (a.includes('APROBADO')) return 'fa-check-circle';
    if (a.includes('OBSERVADO')) return 'fa-exclamation-triangle';
    if (a.includes('RECHAZADO')) return 'fa-times-circle';
    if (a.includes('TOMAR')) return 'fa-hand-pointer';
    if (a.includes('INICIAR')) return 'fa-play';
    if (a.includes('CREAR')) return 'fa-plus-circle';
    return 'fa-history';
  }

  // ✅ CORREGIDO: Usar documentoId en lugar de rendicionId para navegación
  verDetalle(item: any): void {
    // Usar documentoId (ID del documento radicado) para la navegación
    const documentoId = item.documentoId;
    
    if (documentoId) {
      console.log('🔍 Navegando a detalle con documentoId:', documentoId);
      this.router.navigate(['/rendicion-cuentas/procesar', documentoId], { 
        queryParams: { modo: 'consulta' }
      });
    } else {
      console.error('❌ No se encontró documentoId para navegar');
      // Fallback: intentar con rendicionId
      const rendicionId = item.rendicionId || item.id;
      if (rendicionId) {
        console.warn('⚠️ Usando rendicionId como fallback:', rendicionId);
        this.router.navigate(['/rendicion-cuentas/procesar', rendicionId], { 
          queryParams: { modo: 'consulta' }
        });
      }
    }
  }

  trackById(index: number, item: any): string {
    return item.id || index.toString();
  }

  esReciente(item: any): boolean {
    const fecha = item.fechaDecision || item.fechaInicioRevision || item.fechaCreacion;
    if (!fecha) return false;
    return this.getDiasTranscurridos(fecha) < 1;
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    const diffMs = new Date().getTime() - new Date(fecha).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  getDiasClass(fecha: Date | string | undefined): string {
    const dias = this.getDiasTranscurridos(fecha);
    if (dias < 1) return 'text-success';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  formatDateShort(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  }

  getEstadoClass(estado: string): string {
    const e = estado?.toUpperCase() || '';
    if (e.includes('APROBADO') || e.includes('COMPLETADO')) return 'badge-success';
    if (e.includes('OBSERVADO')) return 'badge-warning';
    if (e.includes('EN_REVISION')) return 'badge-info';
    if (e.includes('RECHAZADO')) return 'badge-danger';
    if (e.includes('PENDIENTE')) return 'badge-secondary';
    return 'badge-dark';
  }
}