// src/app/pages/rendicion-cuentas/rendicion-pending-list/rendicion-pending-list.component.ts
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
  selector: 'app-rendicion-pending-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './rendicion-pending-list.component.html',
  styleUrls: ['./rendicion-pending-list.component.scss']
})
export class RendicionPendingListComponent implements OnInit, OnDestroy {
  documentos: RendicionCuentasProceso[] = [];
  filteredDocumentos: RendicionCuentasProceso[] = [];
  paginatedDocumentos: RendicionCuentasProceso[] = [];

  isLoading = false;
  isProcessing = false;
  errorMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;
  usuarioId = '';
  usuarioNombre = '';

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarDocumentosPendientes();
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
        this.usuarioId = user.id;
        this.usuarioNombre = user.fullName || user.username || 'Usuario';
      } catch {
        this.usuarioId = '';
        this.usuarioNombre = 'Usuario';
      }
    }
  }

  cargarDocumentosPendientes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.rendicionService.obtenerDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: RendicionCuentasProceso[]) => {
          console.log('Documentos recibidos:', docs); // ← Para debug
          this.documentos = docs || [];
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.message || 'No se pudieron cargar los documentos pendientes';
          this.notificationService.error('Error', this.errorMessage);
          this.documentos = [];
          this.filteredDocumentos = [];
          this.updatePagination();
          this.isLoading = false;
        }
      });
  }

  puedeTomarDocumento(doc: RendicionCuentasProceso): boolean {
    // Usar la propiedad 'disponible' que viene del backend
    return doc.disponible === true;
  }

  esMiDocumentoEnRevision(doc: RendicionCuentasProceso): boolean {
    // Verificar que el documento está EN_REVISION y el responsable soy yo
    return doc.estado === RendicionCuentasEstado.EN_REVISION && 
           doc.responsableId === this.usuarioId;
  }

tomarParaRevision(doc: RendicionCuentasProceso): void {
  if (!doc?.id) {
    this.notificationService.error('Error', 'Documento sin ID válido');
    return;
  }

  console.log('📤 Tomando documento con ID:', doc.id); // Debe ser el ID del documento original
  
  this.notificationService.showModal({
    title: 'Tomar para revisión',
    message: `¿Tomar el radicado ${doc.numeroRadicado || 'sin radicado'}?`,
    type: 'confirm',
    confirmText: 'Sí, tomar',
    onConfirm: () => this.procederTomarDocumento(doc)
  });
}

private procederTomarDocumento(doc: RendicionCuentasProceso): void {
  this.isProcessing = true;
  
  this.rendicionService.tomarDocumentoParaRevision(doc.id).subscribe({
    next: (response) => {
      this.notificationService.success('Documento tomado');
      // Después de tomar, navegar al formulario con el ID de rendición que devuelve el backend
      if (response.rendicionId) {
        this.router.navigate(['/rendicion-cuentas/procesar', response.rendicionId]);
      }
    },
    error: (err) => {
      this.notificationService.error('Error', err.message);
      this.isProcessing = false;
    }
  });
}

  getTextoBoton(doc: RendicionCuentasProceso): string {
    if (this.esMiDocumentoEnRevision(doc)) return 'Continuar';
    return this.puedeTomarDocumento(doc) ? 'Tomar para Revisión' : 'No disponible';
  }

  // ... resto de métodos sin cambios
  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado?.toLowerCase()?.includes(term) ?? false) ||
        (doc.nombreContratista?.toLowerCase()?.includes(term) ?? false) ||
        (doc.numeroContrato?.toLowerCase()?.includes(term) ?? false) ||
        (doc.documentoContratista?.toLowerCase()?.includes(term) ?? false)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  refreshData(): void {
    this.cargarDocumentosPendientes();
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

  formatDateShort(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    const diffMs = new Date().getTime() - new Date(fecha).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  esDocumentoReciente(doc: RendicionCuentasProceso): boolean {
    const fecha = doc.fechaCompletadoContabilidad || doc.fechaCreacion;
    if (!fecha) return false;
    return this.getDiasTranscurridos(fecha) < 1;
  }

  getTooltipInfo(doc: RendicionCuentasProceso): string {
    let info = '';
    if (doc.numeroRadicado) info += `Radicado: ${doc.numeroRadicado}\n`;
    if (doc.nombreContratista) info += `Contratista: ${doc.nombreContratista}\n`;
    if (doc.responsableId) info += `Responsable ID: ${doc.responsableId}\n`;
    const dias = this.getDiasTranscurridos(doc.fechaCreacion);
    info += `Días desde creación: ${dias}\n`;
    if (doc.observaciones) info += `Observación: ${doc.observaciones.substring(0, 100)}...\n`;
    return info;
  }

  getEstadoClass(estado: string | undefined): string {
    return this.rendicionService.getEstadoClass(estado || '');
  }

  getEstadoTexto(estado: string | undefined): string {
    return this.rendicionService.getEstadoTexto(estado || '');
  }

  getDiasClass(doc: RendicionCuentasProceso): string {
    const dias = this.getDiasTranscurridos(doc.fechaCompletadoContabilidad || doc.fechaCreacion);
    if (dias < 1) return 'text-success';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  trackById(index: number, doc: RendicionCuentasProceso): string {
    return doc.id || index.toString();
  }
}