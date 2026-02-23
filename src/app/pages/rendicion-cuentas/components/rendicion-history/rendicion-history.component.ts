// src/app/pages/rendicion-cuentas/rendicion-history/rendicion-history.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RendicionCuentasHistorialItem } from '../../../../core/models/rendicion-cuentas.model';

@Component({
  selector: 'app-rendicion-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './rendicion-history.component.html',
  styleUrls: ['./rendicion-history.component.scss']
})
export class RendicionHistoryComponent implements OnInit, OnDestroy {
  historial: RendicionCuentasHistorialItem[] = [];
  filteredHistorial: RendicionCuentasHistorialItem[] = [];
  paginatedHistorial: RendicionCuentasHistorialItem[] = [];

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
    private rendicionService: RendicionCuentasService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.loadHistorial();
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
        this.usuarioActual = user.fullName || user.username || 'Usuario';
      } catch {
        this.usuarioActual = 'Usuario';
      }
    }
  }

  loadHistorial(): void {
    this.loading = true;
    this.error = '';

    this.rendicionService.getHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.historial = data.sort((a, b) => 
            b.fechaCreacion.getTime() - a.fechaCreacion.getTime()
          );
          this.filteredHistorial = [...this.historial];
          this.updatePagination();

          if (this.filteredHistorial.length > 0) {
            const completados = this.filteredHistorial.filter(h => 
              h.estadoNuevo === 'COMPLETADO' || h.estadoNuevo === 'APROBADO'
            ).length;
            this.successMessage = `${this.filteredHistorial.length} registros (${completados} completados)`;
          } else {
            this.infoMessage = 'No hay historial disponible';
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar el historial';
          this.loading = false;
          console.error('Error cargando historial:', err);
        }
      });
  }

  verDetalle(item: RendicionCuentasHistorialItem): void {
    this.router.navigate(['/rendicion-cuentas/procesar', item.documentoId], {
      queryParams: {
        desdeHistorial: 'true',
        soloLectura: 'true',
        modo: 'consulta',
        origen: 'historial'
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    return this.rendicionService.getEstadoClass(estado);
  }

  getEstadoTexto(estado: string): string {
    return this.rendicionService.getEstadoTexto(estado);
  }

  getAccionIcon(accion: string): string {
    switch (accion?.toUpperCase()) {
      case 'APROBAR':
      case 'APROBADO':
        return 'fas fa-check-circle text-success';
      case 'OBSERVAR':
      case 'OBSERVADO':
        return 'fas fa-exclamation-circle text-warning';
      case 'RECHAZAR':
      case 'RECHAZADO':
        return 'fas fa-times-circle text-danger';
      case 'INICIAR_REVISION':
        return 'fas fa-play-circle text-info';
      case 'ASIGNAR':
        return 'fas fa-user-tag text-primary';
      case 'CREAR':
        return 'fas fa-plus-circle text-secondary';
      default:
        return 'fas fa-history';
    }
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredHistorial = [...this.historial];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredHistorial = this.historial.filter(item => 
        (item.documento?.numeroRadicado?.toLowerCase().includes(term)) ||
        (item.documento?.nombreContratista?.toLowerCase().includes(term)) ||
        (item.documento?.numeroContrato?.toLowerCase().includes(term)) ||
        (item.usuarioNombre?.toLowerCase().includes(term)) ||
        (item.estadoNuevo?.toLowerCase().includes(term)) ||
        (item.accion?.toLowerCase().includes(term)) ||
        (item.observacion?.toLowerCase().includes(term))
      );
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

  formatDate(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateOnly(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  refreshData(): void {
    this.loadHistorial();
  }
}