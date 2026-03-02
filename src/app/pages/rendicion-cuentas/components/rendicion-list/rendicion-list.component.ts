import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RendicionCuentasProceso, RendicionCuentasEstado } from '../../../../core/models/rendicion-cuentas.model';

@Component({
  selector: 'app-rendicion-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rendicion-list.component.html',
  styleUrls: ['./rendicion-list.component.scss']
})
export class RendicionListComponent implements OnInit, OnDestroy {

  documentos: RendicionCuentasProceso[] = [];
  filteredDocumentos: RendicionCuentasProceso[] = [];
  paginatedDocumentos: RendicionCuentasProceso[] = [];

  isLoading = false;
  isProcessing = false;
  errorMessage = '';
  successMessage = '';

  searchTerm = '';

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  usuarioId: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
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

    this.rendicionService.obtenerTodosDocumentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: any[]) => {
          console.log('Documentos recibidos:', docs); // ← útil para depurar
          this.documentos = docs || [];
          this.aplicarBusqueda();
          this.isLoading = false;
        },
        error: (err: any) => {
          this.errorMessage = err.message || 'No se pudieron cargar los documentos';
          console.error('Error al cargar:', err);
          this.isLoading = false;
        }
      });
  }

  aplicarBusqueda(): void {
    let lista = [...this.documentos];

    if (this.searchTerm?.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      lista = lista.filter(doc =>
        (doc.numeroRadicado?.toLowerCase()?.includes(term) ?? false) ||
        (doc.nombreContratista?.toLowerCase()?.includes(term) ?? false) ||
        (doc.numeroContrato?.toLowerCase()?.includes(term) ?? false) ||
        (doc.documentoContratista?.toLowerCase()?.includes(term) ?? false)
      );
    }

    this.filteredDocumentos = lista;
    this.currentPage = 1;
    this.actualizarPaginacion();
  }

  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.aplicarBusqueda();
  }

  actualizarPaginacion(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    this.pages = [];

    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      this.pages.push(i);
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.actualizarPaginacion();
  }

  // ──────────────────────────────────────────────
  //  Lógica de permisos
  // ──────────────────────────────────────────────

  esLibre(doc: RendicionCuentasProceso): boolean {
    // Documentos pendientes de tomar tendrán disponible: true o estado PENDIENTE sin responsable
    return doc.disponible === true ||
           (doc.estado === RendicionCuentasEstado.PENDIENTE && !doc.responsableId) ||
           (doc.estado?.toUpperCase() === 'PENDIENTE' && !doc.responsableId);
  }

  esMiDocumentoEnRevision(doc: RendicionCuentasProceso): boolean {
    return doc.responsableId === this.usuarioId &&
           (doc.estado === RendicionCuentasEstado.EN_REVISION ||
            doc.estado?.toUpperCase().includes('EN_REVISION'));
  }

  // ──────────────────────────────────────────────
  //  Helpers visuales
  // ──────────────────────────────────────────────

  getEstadoBadgeClass(estado?: string): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('APROBADO') || e.includes('COMPLETADO')) return 'bg-success text-white';
    if (e.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (e.includes('RECHAZADO')) return 'bg-danger text-white';
    if (e.includes('EN_REVISION')) return 'bg-info text-white';
    if (e.includes('PENDIENTE')) return 'bg-secondary text-white';
    return 'bg-dark text-white';
  }

  getEstadoTexto(estado?: string): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('APROBADO')) return 'Aprobado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    if (e.includes('EN_REVISION')) return 'En Revisión';
    if (e.includes('PENDIENTE')) return 'Pendiente';
    return estado || '—';
  }

  // ──────────────────────────────────────────────
  //  Acciones
  // ──────────────────────────────────────────────


revisarDocumento(doc: RendicionCuentasProceso): void {
  const id = 
    (doc as any).rendicionId || 
    doc.id || 
    doc.documentoId || 
    '';

  if (!id) {
    this.errorMessage = 'No se encontró ID válido para ver el detalle';
    console.warn('Documento sin ID válido:', doc);
    return;
  }

  this.router.navigate(['/rendicion-cuentas/procesar', id]);
}

tomarDocumento(doc: RendicionCuentasProceso): void {
  const idParaTomar = doc.documentoId || doc.id || '';
  if (!idParaTomar) {
    this.errorMessage = 'No se encontró ID válido para tomar el documento';
    return;
  }

  this.isProcessing = true;

  this.rendicionService.tomarDocumentoParaRevision(idParaTomar)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: any) => {
        this.successMessage = 'Documento tomado correctamente';

        const rendicionIdParaNavegar = 
          res?.rendicionId || 
          res?.data?.rendicionId || 
          (doc as any).rendicionId || 
          doc.id || 
          doc.documentoId || 
          '';

        this.cargarDocumentos();

        if (rendicionIdParaNavegar) {
          setTimeout(() => {
            this.router.navigate(['/rendicion-cuentas/procesar', rendicionIdParaNavegar]);
          }, 1200);
        } else {
          this.errorMessage = 'Documento tomado, pero no se pudo abrir el detalle automáticamente';
        }
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al tomar el documento';
        this.isProcessing = false;
      },
      complete: () => this.isProcessing = false
    });
}

  trackById(index: number, doc: any): string {
    return doc?.rendicionId || doc?.id || doc?.documentoId || index.toString();
  }
}