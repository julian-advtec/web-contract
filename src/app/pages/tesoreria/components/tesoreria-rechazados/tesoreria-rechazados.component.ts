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

  sidebarCollapsed = false;  // ← declarado aquí para el binding en HTML

  private destroy$ = new Subject<void>();

  constructor(
    private tesoreriaService: TesoreriaService,
    public notificationService: NotificationService,  // ← public para usarlo en template
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
        next: (docs) => {
          this.documentos = docs || [];
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err.message || 'Error al cargar rechazados';
          this.notificationService.error('Error', this.error || 'Desconocido');
          this.isLoading = false;
        }
      });
  }

  get totalRechazados(): number {
    return this.filteredDocumentos.length;
  }

  get porTesoreria(): number {
    return this.filteredDocumentos.filter(d => d.estado?.toUpperCase().includes('TESORERIA')).length;
  }

  get porAsesor(): number {
    return this.filteredDocumentos.filter(d => d.estado?.toUpperCase().includes('ASESOR')).length;
  }

  get porRendicion(): number {
    return this.filteredDocumentos.filter(d => d.estado?.toUpperCase().includes('RENDICION')).length;
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredDocumentos = this.documentos.filter(doc =>
        doc.numeroRadicado?.toLowerCase().includes(term) ||
        doc.nombreContratista?.toLowerCase().includes(term) ||
        doc.numeroContrato?.toLowerCase().includes(term) ||
        doc.estado?.toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    this.pages = [];
    const maxPages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages - 1);
    if (end - start + 1 < maxPages) start = Math.max(1, end - maxPages + 1);
    for (let i = start; i <= end; i++) this.pages.push(i);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  get paginatedDocumentos(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDocumentos.slice(start, start + this.pageSize);
  }

  verDetalle(id: string): void {
    this.router.navigate(['/tesoreria/documento', id], { queryParams: { modo: 'consulta' } });
  }

  refreshData(): void {
    this.cargarDocumentosRechazados();
  }

  getEstadoClass(estado?: string): string {
    if (!estado) return 'badge-secondary';
    const e = estado.toUpperCase();
    if (e.includes('RECHAZADO') || e.includes('OBSERVADO')) return 'badge-danger';
    if (e.includes('TESORERIA')) return 'badge-warning';
    if (e.includes('ASESOR')) return 'badge-info';
    if (e.includes('RENDICION')) return 'badge-dark';
    return 'badge-secondary';
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
    return fecha ? new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A';
  }

  formatDateShort(fecha?: Date | string): string {
    return fecha ? new Date(fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : 'N/A';
  }

  getContadorInfo(doc: any): string {
    return doc.contadorAsignado ? `Contador: ${doc.contadorAsignado}` : 'Sin contador';
  }

  trackById(index: number, doc: any): string {
    return doc.id || index.toString();
  }

  // Wrapper para notificación desde template (evita error TS2341)
  mostrarInfoRechazo(doc: any): void {
    this.notificationService.info('Detalle rechazo', doc.observacion || doc.motivoRechazo || 'Sin detalle');
  }
}