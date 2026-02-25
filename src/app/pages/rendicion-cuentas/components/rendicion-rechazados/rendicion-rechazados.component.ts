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

   Math = Math;

  sidebarCollapsed = false;

  // Estados de rechazo/observado (en minúsculas para comparar)
  private estadosRechazo = [
    'rechazado_rendicion_cuentas',
    'rechazado',
    'observado_rendicion_cuentas',
    'observado'
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    private notificationService: NotificationService,
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
    this.errorMessage = '';

    // CAMBIO IMPORTANTE: Usar obtenerTodosDocumentos() en lugar de obtenerDocumentosDisponibles()
    this.rendicionService.obtenerTodosDocumentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: any[]) => {
          console.log('📥 Documentos recibidos para rechazados:', docs);

          // Filtrar solo los que están en estados de rechazo/observado
          this.documentos = docs.filter(doc => {
            const estado = (doc.estado || '').toString().toLowerCase();
            return this.estadosRechazo.some(e => estado.includes(e));
          });

          console.log('📊 Documentos rechazados filtrados:', this.documentos.length);

          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('❌ Error cargando documentos rechazados:', err);
          this.errorMessage = err.message || 'No se pudieron cargar los documentos rechazados';
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
      const term = this.searchTerm.toLowerCase().trim();
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

  getEstadoClass(estado: string | undefined): string {
    return this.rendicionService.getEstadoClass(estado || '');
  }

  getEstadoTexto(estado: string | undefined): string {
    return this.rendicionService.getEstadoTexto(estado || '');
  }

  getMotivoRechazo(doc: any): string {
    // Buscar en diferentes campos posibles
    return doc.observaciones ||
      doc.observacionesRendicion ||
      doc.motivoRechazo ||
      'Sin motivo especificado';
  }

  esReciente(doc: any): boolean {
    if (!doc.fechaDecision && !doc.fechaCreacion) return false;
    const fecha = doc.fechaDecision || doc.fechaCreacion;
    try {
      const diffMs = new Date().getTime() - new Date(fecha).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays < 2; // Menos de 2 días
    } catch {
      return false;
    }
  }

  getFechaRechazo(doc: any): Date | undefined {
    return doc.fechaDecision || doc.fechaCreacion;
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    try {
      const diffMs = new Date().getTime() - new Date(fecha).getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  getDiasClass(doc: any): string {
    const dias = this.getDiasTranscurridos(this.getFechaRechazo(doc));
    if (dias < 1) return 'text-success';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  getRechazadoPorNombre(doc: any): string {
    // Intentar obtener el nombre del responsable de varias formas
    if (typeof doc.responsable === 'string') {
      return doc.responsable;
    }

    if (doc.responsable && typeof doc.responsable === 'object') {
      return (doc.responsable as any).nombreCompleto ||
        (doc.responsable as any).fullName ||
        (doc.responsable as any).username ||
        'Sistema';
    }

    if (doc.responsableNombre) {
      return doc.responsableNombre;
    }

    return 'Sistema';
  }

  getRechazadoClass(estado: string | undefined): string {
    const e = (estado || '').toString().toLowerCase();
    if (e.includes('observado')) return 'bg-warning text-dark';
    if (e.includes('rechazado')) return 'bg-danger text-white';
    return 'bg-secondary text-white';
  }

  getTooltipInfo(doc: any): string {
    const fecha = this.getFechaRechazo(doc);
    return `Rechazado: ${fecha ? new Date(fecha).toLocaleDateString() : 'N/A'}\nMotivo: ${this.getMotivoRechazo(doc)}`;
  }

  verDetalle(id: string): void {
    this.router.navigate(['/rendicion-cuentas/procesar', id, { modo: 'consulta' }]);
  }

  mostrarInfoRechazo(doc: any): void {
    this.notificationService.info('Motivo de rechazo', this.getMotivoRechazo(doc));
  }

  trackById(index: number, doc: any): string {
    return doc.id || doc.rendicionId || index.toString();
  }

  esObservado(doc: any): boolean {
    const estado = (doc.estado || '').toString().toLowerCase();
    return estado.includes('observado');
  }
}