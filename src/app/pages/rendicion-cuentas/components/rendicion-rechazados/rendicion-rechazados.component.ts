// src/app/pages/rendicion-cuentas/components/rendicion-rechazados/rendicion-rechazados.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RendicionCuentasProceso, RendicionCuentasEstado } from '../../../../core/models/rendicion-cuentas.model';

@Component({
  selector: 'app-rendicion-rechazados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rendicion-rechazados.component.html',
  styleUrls: ['./rendicion-rechazados.component.scss']
})
export class RendicionRechazadosComponent implements OnInit, OnDestroy {
  documentos: RendicionCuentasProceso[] = [];
  filteredDocumentos: RendicionCuentasProceso[] = [];
  isLoading = true;
  error: string | null = null;
  searchTerm = '';

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    public notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarDocumentosRechazados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.error = null;

    this.rendicionService.obtenerDocumentosPendientes().subscribe({
      next: ({ data }) => {
        // Filtrar solo rechazados (ajusta según tu lógica real)
        this.documentos = data.filter(d => 
          d.estado?.toUpperCase().includes('RECHAZADO') ||
          d.estado === RendicionCuentasEstado.RECHAZADO
        );
        this.filteredDocumentos = [...this.documentos];
        this.updatePagination();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'Error al cargar documentos rechazados';
        this.notificationService.error('Error', this.error || 'Error desconocido');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado?.toLowerCase() || '').includes(term) ||
        (doc.nombreContratista?.toLowerCase() || '').includes(term) ||
        (doc.numeroContrato?.toLowerCase() || '').includes(term) ||
        (doc.estado?.toLowerCase() || '').includes(term)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    const total = this.filteredDocumentos.length;
    this.totalPages = Math.ceil(total / this.pageSize);
    this.pages = [];

    if (this.totalPages > 0) {
      const maxPages = 5;
      let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
      let end = Math.min(this.totalPages, start + maxPages - 1);
      if (end - start + 1 < maxPages) start = Math.max(1, end - maxPages + 1);
      for (let i = start; i <= end; i++) this.pages.push(i);
    }
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  get paginatedDocumentos(): RendicionCuentasProceso[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDocumentos.slice(start, start + this.pageSize);
  }

  verDetalle(id: string): void {
    if (!id) return;
    this.router.navigate(['/rendicion-cuentas/procesar', id], {
      queryParams: { modo: 'consulta', origen: 'rechazados' }
    });
  }

  getEstadoClass(estado?: string): string {
    return this.rendicionService.getEstadoClass(estado || '');
  }

  getEstadoTexto(estado?: string): string {
    return this.rendicionService.getEstadoTexto(estado || '');
  }

  formatDate(fecha?: Date | string): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  trackById(index: number, doc: RendicionCuentasProceso): string {
    return doc.id || index.toString();
  }

  // Métodos que faltaban en el componente (llamados desde el template)
  esReciente(doc: RendicionCuentasProceso): boolean {
    const fecha = doc.fechaCreacion || doc.fechaActualizacion;
    if (!fecha) return false;
    const dias = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 7;
  }

  getTooltipInfo(doc: RendicionCuentasProceso): string {
    return `${doc.numeroRadicado || 'Sin radicado'} - ${doc.nombreContratista || 'Sin contratista'} - Estado: ${doc.estado || 'Desconocido'}`;
  }

  getFechaRechazo(doc: RendicionCuentasProceso): Date | string {
    return doc.fechaCreacion || doc.fechaActualizacion || 'N/A';
  }

  getDiasTranscurridos(fecha?: Date | string): number {
    if (!fecha) return 0;
    return Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
  }

  getDiasClass(doc: RendicionCuentasProceso): string {
    const dias = this.getDiasTranscurridos(this.getFechaRechazo(doc));
    if (dias <= 7) return 'text-success';
    if (dias <= 15) return 'text-warning';
    return 'text-danger';
  }

  getRechazadoClass(estado?: string): string {
    if (!estado) return 'badge-secondary';
    const e = estado.toUpperCase();
    if (e.includes('RECHAZADO')) return 'badge-danger';
    return 'badge-secondary';
  }

  getRechazadoPorNombre(doc: RendicionCuentasProceso): string {
    // Si tienes campo rechazadoPor, úsalo; si no, usa lógica simple
    return doc.responsable?.nombreCompleto || 'Sistema';
  }

  mostrarInfoRechazo(doc: RendicionCuentasProceso): void {
    const motivo = doc.observaciones || 'Sin detalle del motivo de rechazo';
    this.notificationService.info('Motivo del Rechazo', motivo);
  }
}