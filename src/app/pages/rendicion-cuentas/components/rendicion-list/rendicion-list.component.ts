import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';

@Component({
  selector: 'app-rendicion-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rendicion-list.component.html',
  styleUrls: ['./rendicion-list.component.scss']
})
export class RendicionListComponent implements OnInit, OnDestroy {
  documentos: any[] = [];
  filteredDocumentos: any[] = [];
  paginatedDocumentos: any[] = [];

  isLoading = false;
  isProcessing = false;
  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  usuarioId = ''; // Se llenará con el ID real del usuario logueado

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Obtener ID del usuario logueado (ajusta según tu authService)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.usuarioId = user?.id || '';

    this.cargarDocumentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDocumentos(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('[Lista Completa] Cargando TODOS los documentos...');

    this.rendicionService.obtenerTodosDocumentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs) => {
          console.log('[Lista Completa] Documentos recibidos del servicio:', docs?.length || 0);

          if (docs && docs.length > 0) {
            console.log('[Lista Completa] Primer documento:', docs[0]);
          }

          this.documentos = docs || [];
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();

          if (this.documentos.length === 0) {
            this.successMessage = 'No se encontraron documentos';
          } else {
            this.successMessage = `Se encontraron ${this.documentos.length} documentos`;
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error('[Lista Completa] Error:', err);
          this.errorMessage = 'No se pudieron cargar los documentos';
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

  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    this.pages = [];
    const maxPages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages - 1);
    if (end - start + 1 < maxPages) start = Math.max(1, end - maxPages + 1);
    for (let i = start; i <= end; i++) this.pages.push(i);

    const startIdx = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIdx, startIdx + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  trackById(index: number, doc: any): string {
    return doc?.id || index.toString();
  }

  esReciente(doc: any): boolean {
    const fecha = doc.fechaCreacion;
    if (!fecha) return false;
    const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 7;
  }

  esMiDocumento(doc: any): boolean {
    return doc.responsableId === this.usuarioId;
  }

  esLibre(doc: any): boolean {
    return !doc.responsableId && (doc.estado === 'PENDIENTE' || doc.disponible === true);
  }

  esMiDocumentoEnRevision(doc: any): boolean {
    return this.esMiDocumento(doc) && doc.estado?.toUpperCase().includes('EN_REVISION');
  }

  getEstadoBadgeClass(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('APROBADO')) return 'bg-success';
    if (e.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (e.includes('RECHAZADO')) return 'bg-danger';
    if (e.includes('PENDIENTE')) return 'bg-warning';
    if (e.includes('EN REVISION')) return 'bg-info';
    return 'bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('EN REVISION')) return 'En Revisión';
    if (e.includes('APROBADO')) return 'Aprobado';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('PENDIENTE')) return 'Pendiente';
    return estado || '—';
  }

  getDiasTranscurridos(fecha: string | Date): number {
    if (!fecha) return 0;
    const diff = Date.now() - new Date(fecha).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getDiasClass(doc: any): string {
    const dias = this.getDiasTranscurridos(doc.fechaCreacion);
    if (dias <= 2) return 'text-danger fw-bold';
    if (dias <= 7) return 'text-warning';
    return 'text-muted';
  }

  formatDate(fecha: string | Date): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  tomarDocumento(doc: any): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    console.log('Tomando documento:', doc.id);

    // Aquí llamas a tu servicio real cuando lo tengas implementado
    // this.rendicionService.tomarDocumento(doc.id).subscribe(...)

    setTimeout(() => {
      this.isProcessing = false;
      this.successMessage = 'Documento tomado correctamente';
      this.cargarDocumentos();
    }, 1500);
  }

  procesarDocumento(doc: any): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    console.log('Procesando documento:', doc.id);

    setTimeout(() => {
      this.isProcessing = false;
      this.router.navigate(['/rendicion-cuentas/procesar', doc.id]);
    }, 800);
  }

  verDocumento(doc: any): void {
    this.router.navigate(['/rendicion-cuentas/documento', doc.id], {
      queryParams: { modo: 'consulta' }
    });
  }

  refreshData(): void {
    this.cargarDocumentos();
  }

  getFechaRelevante(doc: any): Date | string | undefined {
    return doc.fechaRadicacion || doc.fechaDecision || doc.fechaActualizacion || doc.fechaCreacion;
  }
}