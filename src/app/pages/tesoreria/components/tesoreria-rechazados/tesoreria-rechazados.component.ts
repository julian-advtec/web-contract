import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TesoreriaService } from '../../../../core/services/tesoreria.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-tesoreria-rechazados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tesoreria-rechazados.component.html',
  styleUrls: ['./tesoreria-rechazados.component.scss']
})
export class TesoreriaRechazadosComponent implements OnInit, OnDestroy {
  documentos: any[] = [];
  filteredDocumentos: any[] = [];
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
    private tesoreriaService: TesoreriaService,
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

    this.tesoreriaService.obtenerRechazadosVisibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[Rechazados] Respuesta del servidor:', response);
          
          // Extraer el array de documentos de la respuesta
          let docsArray = [];
          
          if (Array.isArray(response)) {
            docsArray = response;
          } else if (response?.data && Array.isArray(response.data)) {
            docsArray = response.data;
          } else if (response?.documentos && Array.isArray(response.documentos)) {
            docsArray = response.documentos;
          } else if (response?.success && response?.data && Array.isArray(response.data)) {
            docsArray = response.data;
          } else {
            docsArray = [];
            console.warn('[Rechazados] Formato de respuesta no reconocido:', response);
          }
          
          this.documentos = Array.isArray(docsArray) ? docsArray : [];
          this.filteredDocumentos = [...this.documentos];
          
          console.log('[Rechazados] Documentos procesados:', this.documentos.length);
          
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('[Rechazados] Error:', err);
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
        (doc.estado?.toLowerCase() || '').includes(term)
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

  get paginatedDocumentos(): any[] {
    const docs = this.filteredDocumentos || [];
    const start = (this.currentPage - 1) * this.pageSize;
    return docs.slice(start, start + this.pageSize);
  }

  verDetalle(id: string): void {
    if (!id) {
      this.notificationService.warning('Advertencia', 'ID de documento no válido');
      return;
    }
    this.router.navigate(['/tesoreria/documento', id], { 
      queryParams: { 
        modo: 'consulta',
        origen: 'rechazados'
      } 
    });
  }


  getEstadoClass(estado?: string): string {
    if (!estado) return 'bg-secondary';
    const e = estado.toUpperCase();
    if (e.includes('RECHAZADO') || e.includes('OBSERVADO')) return 'bg-danger';
    if (e.includes('TESORERIA')) return 'bg-warning';
    if (e.includes('ASESOR')) return 'bg-info';
    if (e.includes('RENDICION')) return 'bg-dark';
    return 'bg-secondary';
  }

  getEstadoTexto(estado?: string): string {
    if (!estado) return 'Desconocido';
    const e = estado.toUpperCase();
    if (e.includes('RECHAZADO_TESORERIA')) return 'Rechazado Tesorería';
    if (e.includes('OBSERVADO_TESORERIA')) return 'Observado Tesorería';
    if (e.includes('RECHAZADO_ASESOR')) return 'Rechazado Asesor';
    if (e.includes('RECHAZADO_RENDICION')) return 'Rechazado Rendición';
    return estado;
  }

  getRechazadoPor(estado?: string): string {
    if (!estado) return 'Sistema';
    const e = estado.toUpperCase();
    if (e.includes('TESORERIA')) return 'Tesorería';
    if (e.includes('ASESOR')) return 'Asesor Gerencia';
    if (e.includes('RENDICION')) return 'Rendición Cuentas';
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
    const motivo = doc.observacion || doc.motivoRechazo || doc.observaciones || 'Sin detalle';
    this.notificationService.info('Motivo del Rechazo', motivo);
  }

  // Métodos para mantener consistencia con pendientes
esReciente(doc: any): boolean {
  const fecha = doc.fechaRadicacion || doc.fechaActualizacion;
  if (!fecha) return false;
  const dias = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
  return dias <= 7;
}

getTooltipInfo(doc: any): string {
  return `${doc.numeroRadicado} - ${doc.nombreContratista} - ${doc.estado}`;
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
  if (e.includes('TESORERIA')) return 'badge-tesoreria';
  if (e.includes('ASESOR')) return 'badge-asesor';
  if (e.includes('RENDICION')) return 'badge-rendicion';
  return 'badge-sistema';
}
}