// src/app/pages/rendicion-cuentas/components/rendicion-list/rendicion-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RendicionCuentasProceso, RendicionCuentasEstado } from '../../../../core/models/rendicion-cuentas.model';

@Component({
  selector: 'app-rendicion-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
  infoMessage = '';

  searchTerm = '';
  filtroEstado = 'todos';
  filtroAsignacion = 'todos';
  filtroFecha = 'todos';

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;
  usuarioId = '';
  usuarioRol = '';
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarDocumentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarUsuarioActual(): void {
    const user = this.authService.getCurrentUser();
    this.usuarioId = user?.id || '';
    this.usuarioRol = user?.role || '';
    this.usuarioActual = user?.fullName || user?.username || '';
  }

  cargarDocumentos(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.rendicionService.obtenerTodosDocumentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: any[]) => {
          console.log('📋 Documentos cargados:', docs);
          this.documentos = docs || [];
          this.aplicarFiltros();
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
    this.aplicarFiltros();
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let filtrados = [...this.documentos];

    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtrados = filtrados.filter(doc =>
        (doc.numeroRadicado?.toLowerCase()?.includes(term) ?? false) ||
        (doc.nombreContratista?.toLowerCase()?.includes(term) ?? false) ||
        (doc.numeroContrato?.toLowerCase()?.includes(term) ?? false)
      );
    }

    // Filtro por estado
    if (this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(doc => {
        const estado = (doc.estado || '').toString().toLowerCase();
        switch (this.filtroEstado) {
          case 'pendientes':
            return estado === 'pendiente';
          case 'en_revision':
            return estado === 'en_revision';
          case 'aprobados':
            return estado === 'aprobado' || estado === 'completado';
          case 'observados':
            return estado === 'observado';
          case 'rechazados':
            return estado === 'rechazado';
          case 'completados':
            return estado === 'completado';
          default:
            return true;
        }
      });
    }

    // Filtro por asignación
    if (this.filtroAsignacion !== 'todos') {
      filtrados = filtrados.filter(doc => {
        switch (this.filtroAsignacion) {
          case 'mios':
            return doc.responsableId === this.usuarioId;
          case 'sin_asignar':
            return !doc.responsableId;
          case 'de_otros':
            return doc.responsableId && doc.responsableId !== this.usuarioId;
          default:
            return true;
        }
      });
    }

    // Filtro por fecha
    if (this.filtroFecha !== 'todos') {
      const hoy = new Date();
      filtrados = filtrados.filter(doc => {
        const fecha = doc.fechaCreacion ? new Date(doc.fechaCreacion) : new Date();
        const diffDays = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (this.filtroFecha) {
          case 'hoy':
            return diffDays === 0;
          case 'semana':
            return diffDays <= 7;
          case 'mes':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    this.filteredDocumentos = filtrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtroEstado = 'todos';
    this.filtroAsignacion = 'todos';
    this.filtroFecha = 'todos';
    this.aplicarFiltros();
  }

  refreshData(): void {
    this.cargarDocumentos();
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

  // Métodos de conteo para el resumen
  getDisponiblesCount(): number {
    return this.documentos.filter(d => 
      d.estado === RendicionCuentasEstado.PENDIENTE && !d.responsableId
    ).length;
  }

  getEnRevisionCount(): number {
    return this.documentos.filter(d => 
      d.estado === RendicionCuentasEstado.EN_REVISION
    ).length;
  }

  getProcesadosCount(): number {
    return this.documentos.filter(d => 
      d.estado === RendicionCuentasEstado.APROBADO ||
      d.estado === RendicionCuentasEstado.OBSERVADO ||
      d.estado === RendicionCuentasEstado.RECHAZADO ||
      d.estado === RendicionCuentasEstado.COMPLETADO
    ).length;
  }

  // Métodos de utilidad para el template
  getNumeroRadicado(doc: any): string {
    return doc.numeroRadicado || 'N/A';
  }

  getFechaRadicacion(doc: any): Date | undefined {
    return doc.fechaCreacion;
  }

  getNombreContratista(doc: any): string {
    return doc.nombreContratista || 'N/A';
  }

  getDocumentoContratista(doc: any): string {
    return doc.documentoContratista || '';
  }

  getNumeroContrato(doc: any): string {
    return doc.numeroContrato || 'N/A';
  }

  getEstado(doc: any): string {
    return (doc.estado || '').toString();
  }

  getObservacion(doc: any): string {
    return doc.observaciones || doc.observacionesRendicion || '';
  }

  getObservacionCorta(doc: any): string {
    const obs = this.getObservacion(doc);
    return obs.length > 50 ? obs.substring(0, 50) + '...' : obs;
  }

  getTipoDocumentoBadgeClass(doc: any): string {
    return 'badge-info';
  }

  getTipoDocumentoTexto(doc: any): string {
    return doc.informesPresentados?.length ? 'Con informes' : 'Sin informes';
  }

  getDocumentCount(doc: any): number {
    return (doc.informesPresentados?.length || 0) + (doc.documentosAdjuntos?.length || 0);
  }

  esDocumentoReciente(doc: any): boolean {
    if (!doc.fechaCreacion) return false;
    const diffMs = new Date().getTime() - new Date(doc.fechaCreacion).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays < 1;
  }

  esMiDocumento(doc: any): boolean {
    return doc.responsableId === this.usuarioId;
  }

  esConsultable(doc: any): boolean {
    if (doc.estado !== RendicionCuentasEstado.PENDIENTE) {
      return true;
    }
    if (doc.responsableId && doc.responsableId !== this.usuarioId) {
      return true;
    }
    return false;
  }

  formatDateOnly(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatDate(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getEstadoBadgeClass(estado: string | undefined): string {
    return this.rendicionService.getEstadoClass(estado || '');
  }

  getEstadoTexto(estado: string | undefined): string {
    return this.rendicionService.getEstadoTexto(estado || '');
  }

  // MÉTODO ÚNICO para tomar documento
  tomarDocumento(doc: any): void {
    this.isProcessing = true;
    this.rendicionService.tomarDocumentoParaRevision(doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.successMessage = 'Documento tomado correctamente';
          this.cargarDocumentos();
          this.isProcessing = false;
          setTimeout(() => this.router.navigate(['/rendicion-cuentas/procesar', doc.rendicionId]), 1500);
        },
        error: (err) => {
          this.errorMessage = err.message || 'Error al tomar el documento';
          this.isProcessing = false;
        }
      });
  }

  // MÉTODO ÚNICO para revisar documento
  revisarDocumento(doc: any): void {
    const id = doc.rendicionId || doc.id;
    this.router.navigate(['/rendicion-cuentas/procesar', id]);
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }

  trackById(index: number, doc: any): string {
    return doc.id || index.toString();
  }
}