// src/app/pages/rendicion-cuentas/components/rendicion-rechazados/rendicion-rechazados.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { RendicionCuentasProceso } from '../../../../core/models/rendicion-cuentas.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-rendicion-rechazados',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './rendicion-rechazados.component.html',
  styleUrls: ['./rendicion-rechazados.component.scss']
})
export class RendicionRechazadosComponent implements OnInit, OnDestroy {
  documentos: RendicionCuentasProceso[] = [];
  filteredDocumentos: RendicionCuentasProceso[] = [];
  paginatedDocumentos: RendicionCuentasProceso[] = [];

  isLoading = false;
  errorMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;

  private estadosRechazo = ['RECHAZADO', 'OBSERVADO', 'RECHAZADO_RENDICION_CUENTAS', 'OBSERVADO_RENDICION_CUENTAS'];
  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDocumentosRechazados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.rendicionService.obtenerDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: RendicionCuentasProceso[]) => {
          this.documentos = docs.filter(d => 
            this.estadosRechazo.includes((d.estado || '').toString().toUpperCase())
          );
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err: any) => {
          this.errorMessage = err.message || 'No se pudieron cargar los documentos';
          this.documentos = [];
          this.filteredDocumentos = [];
          this.updatePagination();
          this.isLoading = false;
        }
      });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado?.toLowerCase()?.includes(term) ?? false) ||
        (doc.nombreContratista?.toLowerCase()?.includes(term) ?? false) ||
        (doc.numeroContrato?.toLowerCase()?.includes(term) ?? false)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  refreshData(): void {
    this.cargarDocumentosRechazados();
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
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getEstadoClass(estado: string | undefined): string {
    return this.rendicionService.getEstadoClass(estado || '');
  }

  getEstadoTexto(estado: string | undefined): string {
    return this.rendicionService.getEstadoTexto(estado || '');
  }

  getMotivoRechazo(doc: RendicionCuentasProceso): string {
    return doc.observaciones || doc.observacionesRendicion || 'Sin motivo especificado';
  }

  esReciente(doc: RendicionCuentasProceso): boolean {
    if (!doc.fechaDecision && !doc.fechaCreacion) return false;
    const fecha = doc.fechaDecision || doc.fechaCreacion;
    const diffMs = new Date().getTime() - new Date(fecha).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays < 1;
  }

  getFechaRechazo(doc: RendicionCuentasProceso): Date | undefined {
    return doc.fechaDecision || doc.fechaCreacion;
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    const diffMs = new Date().getTime() - new Date(fecha).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  getDiasClass(doc: RendicionCuentasProceso): string {
    const dias = this.getDiasTranscurridos(this.getFechaRechazo(doc));
    if (dias < 1) return 'text-success';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  getRechazadoPorNombre(doc: RendicionCuentasProceso): string {
    if (typeof doc.responsable === 'string') {
      return doc.responsable;
    }
    if (doc.responsable && typeof doc.responsable === 'object') {
      return (doc.responsable as any).nombreCompleto || (doc.responsable as any).fullName || 'Sistema';
    }
    return 'Sistema';
  }

  getRechazadoClass(estado: string | undefined): string {
    const e = (estado || '').toString().toUpperCase();
    if (e.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (e.includes('RECHAZADO')) return 'bg-danger';
    return 'bg-secondary';
  }

  getTooltipInfo(doc: RendicionCuentasProceso): string {
    return `Rechazado: ${this.getFechaRechazo(doc)?.toLocaleDateString() || 'N/A'}\nMotivo: ${this.getMotivoRechazo(doc)}`;
  }

  verDetalle(id: string): void {
    this.router.navigate(['/rendicion-cuentas/procesar', id, { modo: 'consulta' }]);
  }

  mostrarInfoRechazo(doc: RendicionCuentasProceso): void {
    this.notificationService.info('Motivo de rechazo', this.getMotivoRechazo(doc));
  }

  trackById(index: number, doc: RendicionCuentasProceso): string {
    return doc.id || index.toString();
  }
}