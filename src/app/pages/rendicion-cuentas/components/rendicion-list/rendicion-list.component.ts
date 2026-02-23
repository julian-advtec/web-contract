// src/app/pages/rendicion-cuentas/components/rendicion-list/rendicion-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
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

  // Filtros usados en el HTML
  filtroEstado = 'todos';
  filtroAsignacion = 'todos';
  filtroFecha = 'todos';
  searchTerm = '';

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
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

  cargarDocumentos(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.rendicionService.obtenerDocumentosPendientes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ data }) => {
          this.documentos = data || [];
          this.filteredDocumentos = [...this.documentos];
          this.aplicarFiltros();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.message || 'No se pudieron cargar los documentos';
          this.notificationService.error('Error', this.errorMessage);
          this.isLoading = false;
        }
      });
  }

  aplicarFiltros(): void {
    let docs = [...this.documentos];

    // Filtro por estado
    if (this.filtroEstado !== 'todos') {
      const estadoBuscado = this.filtroEstado.toUpperCase();
      docs = docs.filter(d => (d.estado || '').toString().toUpperCase().includes(estadoBuscado));
    }

    // Filtro por asignación
    if (this.filtroAsignacion !== 'todos') {
      if (this.filtroAsignacion === 'mios') {
        docs = docs.filter(d => d.responsableId === this.usuarioActual);
      } else if (this.filtroAsignacion === 'sin_asignar') {
        docs = docs.filter(d => !d.responsableId);
      } else if (this.filtroAsignacion === 'de_otros') {
        docs = docs.filter(d => d.responsableId && d.responsableId !== this.usuarioActual);
      }
    }

    // Filtro por fecha
    if (this.filtroFecha !== 'todos') {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (this.filtroFecha === 'hoy') {
        docs = docs.filter(d => new Date(d.fechaCreacion || 0).toDateString() === hoy.toDateString());
      } else if (this.filtroFecha === 'semana') {
        const semana = new Date(hoy);
        semana.setDate(semana.getDate() - 7);
        docs = docs.filter(d => new Date(d.fechaCreacion || 0) >= semana);
      } else if (this.filtroFecha === 'mes') {
        const mes = new Date(hoy);
        mes.setMonth(mes.getMonth() - 1);
        docs = docs.filter(d => new Date(d.fechaCreacion || 0) >= mes);
      }
    }

    // Búsqueda por texto
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      docs = docs.filter(d =>
        (d.numeroRadicado?.toLowerCase()?.includes(term) ?? false) ||
        (d.nombreContratista?.toLowerCase()?.includes(term) ?? false) ||
        (d.numeroContrato?.toLowerCase()?.includes(term) ?? false) ||
        (d.estado?.toString().toLowerCase()?.includes(term) ?? false)
      );
    }

    this.filteredDocumentos = docs;
    this.currentPage = 1;
    this.updatePagination();
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroAsignacion = 'todos';
    this.filtroFecha = 'todos';
    this.searchTerm = '';
    this.aplicarFiltros();
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  onSearch(): void {
    this.aplicarFiltros();
  }

  refreshData(): void {
    this.cargarDocumentos();
  }

  // Métodos requeridos por el template
  getDisponiblesCount(): number {
    return this.documentos.filter(d => d.estado === RendicionCuentasEstado.PENDIENTE && !d.responsableId).length;
  }

  getEnRevisionCount(): number {
    return this.documentos.filter(d => d.estado === RendicionCuentasEstado.EN_REVISION).length;
  }

  getProcesadosCount(): number {
    return this.documentos.filter(d => 
      d.estado === RendicionCuentasEstado.APROBADO || d.estado === RendicionCuentasEstado.COMPLETADO
    ).length;
  }

  esDocumentoReciente(doc: RendicionCuentasProceso): boolean {
    const fecha = doc.fechaCompletadoContabilidad || doc.fechaCreacion;
    if (!fecha) return false;
    return this.getDiasTranscurridos(fecha) < 1;
  }

  esMiDocumento(doc: RendicionCuentasProceso): boolean {
    return doc.responsableId === this.usuarioActual;
  }

  getNumeroRadicado(doc: RendicionCuentasProceso): string {
    return doc.numeroRadicado || '—';
  }

  getFechaRadicacion(doc: RendicionCuentasProceso): Date | string {
    return doc.fechaCreacion || 'N/A';
  }

  getNombreContratista(doc: RendicionCuentasProceso): string {
    return doc.nombreContratista || 'Sin contratista';
  }

  getDocumentoContratista(doc: RendicionCuentasProceso): string {
    return doc.documentoContratista || '—';
  }

  getNumeroContrato(doc: RendicionCuentasProceso): string {
    return doc.numeroContrato || '—';
  }

  getEstado(doc: RendicionCuentasProceso): string {
    return doc.estado?.toString() || 'DESCONOCIDO';
  }

  getObservacion(doc: RendicionCuentasProceso): string | null {
    return doc.observaciones || null;
  }

  getObservacionCorta(doc: RendicionCuentasProceso): string {
    const obs = doc.observaciones || '';
    return obs.length > 50 ? obs.substring(0, 47) + '...' : obs;
  }

  getEstadoBadgeClass(estado: string): string {
    return this.rendicionService.getEstadoClass(estado);
  }

  getEstadoTexto(estado: string): string {
    return this.rendicionService.getEstadoTexto(estado);
  }

  getTipoDocumentoBadgeClass(doc: RendicionCuentasProceso): string {
    const e = (doc.estado || '').toString().toUpperCase();
    if (e.includes('PENDIENTE')) return 'bg-warning text-dark';
    if (e.includes('EN_REVISION')) return 'bg-info';
    if (e.includes('APROBADO') || e.includes('COMPLETADO')) return 'bg-success';
    if (e.includes('OBSERVADO')) return 'bg-warning';
    if (e.includes('RECHAZADO')) return 'bg-danger';
    return 'bg-secondary';
  }

  getTipoDocumentoTexto(doc: RendicionCuentasProceso): string {
    return doc.estado?.toString() || 'Sin tipo';
  }

  esConsultable(doc: RendicionCuentasProceso): boolean {
    return !!doc.id && doc.estado !== RendicionCuentasEstado.PENDIENTE;
  }

  getDocumentCount(doc: RendicionCuentasProceso): number {
    return (doc.documentosAdjuntos?.length || 0) + (doc.informesPresentados?.length || 0);
  }

  tomarDocumento(doc: RendicionCuentasProceso): void {
    this.tomarParaRevision(doc);
  }

  revisarDocumento(doc: RendicionCuentasProceso): void {
    if (!doc.id) return;
    this.router.navigate(['/rendicion-cuentas/procesar', doc.id]);
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

  // Métodos de acción (ya existentes)
  puedeTomarDocumento(doc: RendicionCuentasProceso): boolean {
    return doc.estado === RendicionCuentasEstado.PENDIENTE && !doc.responsableId;
  }

  esMiDocumentoEnRevision(doc: RendicionCuentasProceso): boolean {
    return doc.estado === RendicionCuentasEstado.EN_REVISION && doc.responsableId === this.usuarioActual;
  }

  tomarParaRevision(doc: RendicionCuentasProceso): void {
    if (!doc?.id) {
      this.notificationService.error('Error', 'Documento sin ID válido');
      return;
    }

    const yaEsMio = this.esMiDocumentoEnRevision(doc);

    if (yaEsMio) {
      this.router.navigate(['/rendicion-cuentas/procesar', doc.id]);
      return;
    }

    if (!this.puedeTomarDocumento(doc)) {
      this.notificationService.warning('No disponible', 'Documento no disponible para tomar');
      return;
    }

    this.notificationService.showModal({
      title: 'Tomar documento',
      message: `¿Tomar el radicado ${doc.numeroRadicado || 'sin radicado'}?`,
      type: 'confirm',
      confirmText: 'Sí, tomar',
      cancelText: 'Cancelar',
      onConfirm: () => this.procederTomarDocumento(doc)
    });
  }

  private procederTomarDocumento(doc: RendicionCuentasProceso): void {
    this.isProcessing = true;

    this.rendicionService.tomarDocumentoParaRevision(doc.id!)
      .subscribe({
        next: () => {
          this.notificationService.success('Éxito', 'Documento tomado');
          this.cargarDocumentos(); // refrescar
          this.isProcessing = false;
        },
        error: (err) => {
          this.notificationService.error('Error', err.message || 'No se pudo tomar');
          this.isProcessing = false;
        }
      });
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
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  formatDateOnly(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    return Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
  }

  getDiasClass(doc: RendicionCuentasProceso): string {
    const dias = this.getDiasTranscurridos(doc.fechaCreacion);
    if (dias < 1) return 'text-success';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  trackById(index: number, doc: RendicionCuentasProceso): string {
    return doc.id || index.toString();
  }
}