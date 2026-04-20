// src/app/pages/rendicion-cuentas/rendicion-pending-list/rendicion-pending-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RendicionCuentasProceso } from '../../../../core/models/rendicion-cuentas.model';

// ✅ Definir la interfaz aquí
interface DocumentoPendiente {
  id: string;
  documentoId: string;
  numeroRadicado?: string;        // ← opcional
  nombreContratista?: string;      // ← opcional
  numeroContrato?: string;         // ← opcional
  documentoContratista?: string;   // ← opcional
  estado?: string;                 // ← opcional
  fechaCreacion?: Date;            // ← opcional
  disponible?: boolean;            // ← opcional
  responsableId?: string;
  radicador?: string;
}

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
      next: (docs) => {
        console.log('📋 Documentos pendientes RAW:', JSON.stringify(docs, null, 2));
        console.log('📋 Documentos pendientes recibidos:', docs.length);
        
        // ✅ Mapear los datos correctamente con todas las propiedades requeridas
        this.documentos = docs.map(doc => ({
          id: doc.id || '',
          documentoId: doc.id || '',
          rendicionId: '',
          numeroRadicado: doc.numeroRadicado || '',
          nombreContratista: doc.nombreContratista || '',
          numeroContrato: doc.numeroContrato || '',
          documentoContratista: doc.documentoContratista || '',
          estado: doc.estado || 'PENDIENTE',
          fechaCreacion: doc.fechaCreacion ? new Date(doc.fechaCreacion) : new Date(),
          fechaActualizacion: doc.fechaActualizacion ? new Date(doc.fechaActualizacion) : new Date(),
          disponible: doc.disponible === true,
          responsableId: doc.responsableId || '',
          responsable: undefined,
          responsableNombre: '',
          fechaAsignacion: undefined,
          fechaInicioRevision: undefined,
          fechaDecision: undefined,
          observaciones: '',
          observacionesRendicion: '',
          contadorAsignado: '',
          fechaCompletadoContabilidad: undefined,
          informesPresentados: [],
          documentosAdjuntos: [],
          montoRendido: 0,
          montoAprobado: 0,
          nombreCompleto: doc.nombreContratista || '',
          radicado: doc.numeroRadicado || '',
          fechaRadicacion: doc.fechaRadicacion ? new Date(doc.fechaRadicacion) : undefined
        }));
        
        this.filteredDocumentos = [...this.documentos];
        this.updatePagination();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.errorMessage = err.message || 'No se pudieron cargar los documentos';
        this.documentos = [];
        this.filteredDocumentos = [];
        this.updatePagination();
        this.isLoading = false;
      }
    });
}

  puedeTomarDocumento(doc: RendicionCuentasProceso): boolean {
    // Un documento se puede tomar si está disponible y no está en revisión por otro
    return doc.disponible === true;
  }

  esMiDocumentoEnRevision(doc: RendicionCuentasProceso): boolean {
    return doc.estado === 'EN_REVISION' && doc.responsableId === this.usuarioId;
  }

  tomarParaRevision(doc: RendicionCuentasProceso): void {
    if (!doc?.documentoId) {
      this.notificationService.error('Error', 'Documento sin ID válido');
      return;
    }

    // Si ya es mi documento, solo navegar
    if (this.esMiDocumentoEnRevision(doc)) {
      this.router.navigate(['/rendicion-cuentas/procesar', doc.id]);

      return;
    }

    this.notificationService.showModal({
      title: 'Tomar para revisión',
      message: `¿Deseas tomar el radicado ${doc.numeroRadicado} para revisión?`,
      type: 'confirm',
      confirmText: 'Sí, tomar',
      onConfirm: () => this.procederTomarDocumento(doc)
    });
  }

private procederTomarDocumento(doc: any): void {
  this.isProcessing = true;
  
  this.rendicionService.tomarDocumento(doc.documentoId).subscribe({
    next: (response: any) => {
      this.notificationService.success('Éxito', 'Documento tomado correctamente');
      
      const documentoId = doc.documentoId;
      console.log('[TomarDocumento] documentoId:', documentoId);
      
      if (documentoId) {
        this.router.navigate(['/rendicion-cuentas/procesar', documentoId], {
          queryParams: { modo: 'edicion', tomar: 'true' }
        });
      } else {
        this.cargarDocumentosPendientes();
      }
      
      this.isProcessing = false;
    },
    error: (err: any) => {
      this.notificationService.error('Error', err.message || 'No se pudo tomar el documento');
      this.isProcessing = false;
    }
  });
}

  getTextoBoton(doc: RendicionCuentasProceso): string {
    if (this.esMiDocumentoEnRevision(doc)) return 'Continuar Revisión';
    if (this.puedeTomarDocumento(doc)) return 'Tomar para Revisión';
    return 'No disponible';
  }

  // ==================== PAGINACIÓN Y FILTROS ====================

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado?.toLowerCase().includes(term) || false) ||
        (doc.nombreContratista?.toLowerCase().includes(term) || false) ||
        (doc.numeroContrato?.toLowerCase().includes(term) || false) ||
        (doc.documentoContratista?.toLowerCase().includes(term) || false)
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

  // ==================== MÉTODOS AUXILIARES ====================

  formatDate(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatDateShort(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    const diffMs = new Date().getTime() - new Date(fecha).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  esDocumentoReciente(doc: RendicionCuentasProceso): boolean {
    const fecha = doc.fechaCreacion;
    if (!fecha) return false;
    return this.getDiasTranscurridos(fecha) < 1;
  }

  getTooltipInfo(doc: RendicionCuentasProceso): string {
    let info = '';
    if (doc.numeroRadicado) info += `Radicado: ${doc.numeroRadicado}\n`;
    if (doc.nombreContratista) info += `Contratista: ${doc.nombreContratista}\n`;
    if (doc.responsableId) info += `Responsable: ${doc.responsable || doc.responsableId}\n`;
    const dias = this.getDiasTranscurridos(doc.fechaCreacion);
    info += `Días desde creación: ${dias}`;
    return info;
  }

  getEstadoClass(estado: string | undefined): string {
    return this.rendicionService.getEstadoClass(estado);
  }

  getEstadoTexto(estado: string | undefined): string {
    return this.rendicionService.getEstadoTexto(estado);
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