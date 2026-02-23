// src/app/pages/rendicion-cuentas/rendicion-rechazados/rendicion-rechazados.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RendicionCuentasProceso } from '../../../../core/models/rendicion-cuentas.model';

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
    this.error = null;

    // Obtener documentos rechazados del historial
    this.rendicionService.getHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (historial: any[]) => {
          // Filtrar solo los rechazados
          const rechazados = historial
            .filter(item => 
              item.estadoNuevo?.toUpperCase().includes('RECHAZADO') ||
              item.estadoNuevo?.toUpperCase().includes('RECHAZADO_RENDICION') ||
              item.estadoNuevo?.toUpperCase() === 'RECHAZADO'
            )
            .map(item => ({
              id: item.documentoId,
              documentoId: item.documentoId,
              numeroRadicado: item.documento?.numeroRadicado,
              nombreContratista: item.documento?.nombreContratista,
              documentoContratista: item.documento?.documentoContratista,
              numeroContrato: item.documento?.numeroContrato,
              estado: item.estadoNuevo,
              fechaRechazo: item.fechaCreacion,
              fechaActualizacion: item.fechaCreacion,
              observacion: item.observacion,
              rechazadoPor: item.usuarioNombre || 'Sistema'
            }));

          this.documentos = rechazados;
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err) => {
          const errorMessage = err.message || 'Error al cargar rechazados';
          this.error = errorMessage;
          this.notificationService.error('Error', errorMessage);
          this.documentos = [];
          this.filteredDocumentos = [];
          this.isLoading = false;
        }
      });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...(this.documentos || [])];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredDocumentos = (this.documentos || []).filter(doc =>
        (doc.numeroRadicado?.toLowerCase() || '').includes(term) ||
        (doc.nombreContratista?.toLowerCase() || '').includes(term) ||
        (doc.numeroContrato?.toLowerCase() || '').includes(term) ||
        (doc.estado?.toLowerCase() || '').includes(term) ||
        (doc.rechazadoPor?.toLowerCase() || '').includes(term)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    const total = this.filteredDocumentos?.length || 0;
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
    const docs = this.filteredDocumentos || [];
    const start = (this.currentPage - 1) * this.pageSize;
    return docs.slice(start, start + this.pageSize);
  }

  verDetalle(id: string): void {
    if (!id) return;
    this.router.navigate(['/rendicion-cuentas/procesar', id], { 
      queryParams: { 
        modo: 'consulta',
        origen: 'rechazados'
      } 
    });
  }

  getEstadoClass(estado?: string): string {
    return this.rendicionService.getEstadoClass(estado || '');
  }

  getEstadoTexto(estado?: string): string {
    return this.rendicionService.getEstadoTexto(estado || '');
  }

  getRechazadoPor(estado?: string): string {
    if (!estado) return 'Sistema';
    const e = estado.toUpperCase();
    if (e.includes('RENDICION')) return 'Rendición de Cuentas';
    if (e.includes('GERENCIA')) return 'Gerencia';
    if (e.includes('TESORERIA')) return 'Tesorería';
    if (e.includes('CONTABILIDAD')) return 'Contabilidad';
    return 'Sistema';
  }

  formatDate(fecha?: Date | string): string {
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

  formatDateShort(fecha?: Date | string): string {
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

  trackById(index: number, doc: any): string {
    return doc?.id || index.toString();
  }

  mostrarInfoRechazo(doc: any): void {
    const motivo = doc.observacion || doc.motivoRechazo || 'Sin detalle del motivo de rechazo';
    this.notificationService.info('Motivo del Rechazo', motivo);
  }

  esReciente(doc: any): boolean {
    const fecha = doc.fechaRechazo || doc.fechaActualizacion;
    if (!fecha) return false;
    const dias = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 7;
  }

  getTooltipInfo(doc: any): string {
    return `${doc.numeroRadicado} - ${doc.nombreContratista} - Rechazado por ${doc.rechazadoPor}`;
  }

  getDiasTranscurridos(fecha?: string): number {
    if (!fecha) return 0;
    return Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
  }

  getDiasClass(doc: any): string {
    const dias = this.getDiasTranscurridos(doc.fechaRechazo || doc.fechaActualizacion);
    if (dias <= 7) return 'text-success';
    if (dias <= 15) return 'text-warning';
    return 'text-danger';
  }

  getRechazadoClass(estado?: string): string {
    if (!estado) return 'badge-sistema';
    const e = estado.toUpperCase();
    if (e.includes('RENDICION')) return 'badge-rendicion';
    if (e.includes('GERENCIA')) return 'badge-gerencia';
    if (e.includes('TESORERIA')) return 'badge-tesoreria';
    if (e.includes('CONTABILIDAD')) return 'badge-contabilidad';
    return 'badge-sistema';
  }
}