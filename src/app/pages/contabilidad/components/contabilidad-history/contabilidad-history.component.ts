// src/app/pages/contabilidad/components/contabilidad-history/contabilidad-history.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-contabilidad-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contabilidad-history.component.html',
  styleUrls: ['./contabilidad-history.component.scss']
})
export class ContabilidadHistoryComponent implements OnInit, OnDestroy {
  historial: any[] = [];
  filteredHistorial: any[] = [];
  paginatedHistorial: any[] = [];

  loading = false;
  isProcessing = false;
  error = '';
  successMessage = '';
  infoMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  usuarioActual = '';
  sidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private contabilidadService: ContabilidadService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Contabilidad: Inicializando historial de procesamientos...');
    this.cargarUsuarioActual();
    this.loadHistorial();
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
        this.usuarioActual = user.fullName || user.username || 'Contabilidad';
        console.log('👤 Usuario actual de contabilidad:', this.usuarioActual);
      } catch (error) {
        console.error('Error parseando usuario:', error);
        this.usuarioActual = 'Contabilidad';
      }
    }
  }

  loadHistorial(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.infoMessage = '';

    this.contabilidadService.getHistorial()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (data: any[]) => {
          console.log('📊 Respuesta del historial:', data);
          
          this.historial = data || [];
          console.log('✅ Historial cargado con', this.historial.length, 'registros');

          // Enriquecer cada item con el estado del documento
          this.historial = this.historial.map(item => ({
            ...item,
            estadoDocumento: item.documento?.estado || item.estado || 'PROCESADO',
            estadoContabilidad: this.determinarEstadoContabilidad(item)
          }));

          this.filteredHistorial = [...this.historial];
          this.updatePagination();

          if (this.filteredHistorial.length > 0) {
            const recientes = this.filteredHistorial.filter(item => this.esDocumentoReciente(item));
            this.successMessage = `Se encontraron ${this.filteredHistorial.length} procesamientos (${recientes.length} recientes)`;
            setTimeout(() => this.successMessage = '', 4000);
          } else {
            this.infoMessage = 'No hay procesamientos en el historial';
          }
        },
        error: (err: any) => {
          this.error = err.message || 'Error al cargar el historial';
          console.error('Error:', err);

          if (err.status === 404 || err.status === 0) {
            this.infoMessage = 'El servicio de historial no está disponible temporalmente';
            this.historial = [];
            this.filteredHistorial = [];
            this.updatePagination();
          } else {
            this.notificationService.error('Error', this.error);
          }
        }
      });
  }

  /**
   * Determina el estado de contabilidad según el estado del documento
   */
  determinarEstadoContabilidad(item: any): string {
    const estadoDoc = item.documento?.estado || item.estado || '';
    const estadoUpper = estadoDoc.toUpperCase();

    if (estadoUpper.includes('COMPLETADO')) return 'COMPLETADO';
    if (estadoUpper.includes('PROCESADO')) return 'PROCESADO';
    if (estadoUpper.includes('GLOSADO')) return 'GLOSADO';
    if (estadoUpper.includes('OBSERVADO')) return 'OBSERVADO';
    if (estadoUpper.includes('RECHAZADO')) return 'RECHAZADO';
    if (estadoUpper.includes('EN_REVISION')) return 'EN_REVISION';
    
    return 'PROCESADO';
  }

  consultarDocumento(item: any): void {
    const documentoId = item.documento?.id || item.id || item.documentoId;
    
    if (!documentoId) {
      this.notificationService.error('Error', 'ID de documento no disponible');
      return;
    }

    // Determinar modo según estado
    const estado = item.estadoDocumento || item.estado || '';
    const esEditable = estado.includes('EN_REVISION') || estado.includes('PENDIENTE');
    
    const queryParams = {
      desdeHistorial: 'true',
      origen: 'historial-contabilidad',
      modo: esEditable ? 'edicion' : 'consulta',
      soloLectura: esEditable ? 'false' : 'true'
    };

    console.log('[consultarDocumento] Navegando:', { documentoId, queryParams });

    this.router.navigate(['/contabilidad/procesar', documentoId], { queryParams });
  }

  // ==================== MÉTODOS GETTERS ====================

  getContadorRevisor(item: any): string {
    return item.contadorRevisor ||
           item.documento?.contadorRevisor ||
           item.contador?.fullName ||
           item.contador?.username ||
           this.usuarioActual ||
           'Contador';
  }

  getNumeroRadicado(item: any): string {
    return item.documento?.numeroRadicado || item.numeroRadicado || 'N/A';
  }

  getNombreContratista(item: any): string {
    return item.documento?.nombreContratista || item.nombreContratista || 'N/A';
  }

  getDocumentoContratista(item: any): string {
    return item.documento?.documentoContratista || item.documentoContratista || 'N/A';
  }

  getNumeroContrato(item: any): string {
    return item.documento?.numeroContrato || item.numeroContrato || 'N/A';
  }

  getDuracionRevision(item: any): string {
    const fechaInicio = item.fechaInicioRevision || item.documento?.fechaInicio || item.createdAt;
    const fechaFin = item.fechaActualizacion || item.updatedAt || new Date();

    if (!fechaInicio) return 'N/A';

    try {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      const diffMs = fin.getTime() - inicio.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return '1 día';
      return `${diffDays} días`;
    } catch {
      return 'N/A';
    }
  }

  // ==================== MÉTODOS DE ESTADO ====================

  /**
   * Retorna la clase CSS para el badge del ESTADO DEL DOCUMENTO (COMPLETO)
   */
  getEstadoDocumentoBadgeClass(estado: string | undefined): string {
    if (!estado) return 'badge bg-secondary estado-default';
    
    const e = estado.toUpperCase();
    
    // Estados de Supervisor
    if (e === 'APROBADO_SUPERVISOR') return 'badge bg-success estado-aprobado-supervisor';
    if (e === 'OBSERVADO_SUPERVISOR') return 'badge bg-warning estado-observado';
    if (e === 'RECHAZADO_SUPERVISOR') return 'badge bg-danger estado-rechazado';
    if (e === 'EN_REVISION_SUPERVISOR') return 'badge bg-primary estado-en-revision-auditor';
    
    // Estados de Auditor
    if (e === 'EN_REVISION_AUDITOR') return 'badge bg-primary estado-en-revision-auditor';
    if (e === 'APROBADO_AUDITOR') return 'badge bg-success estado-aprobado-supervisor';
    if (e === 'OBSERVADO_AUDITOR') return 'badge bg-warning estado-observado';
    if (e === 'RECHAZADO_AUDITOR') return 'badge bg-danger estado-rechazado';
    if (e === 'COMPLETADO_AUDITOR') return 'badge bg-success estado-completado';
    
    // Estados de Contabilidad
    if (e === 'EN_REVISION_CONTABILIDAD') return 'badge bg-primary estado-en-revision-auditor';
    if (e === 'APROBADO_CONTABILIDAD') return 'badge bg-success estado-aprobado-supervisor';
    if (e === 'OBSERVADO_CONTABILIDAD') return 'badge bg-warning estado-observado';
    if (e === 'RECHAZADO_CONTABILIDAD') return 'badge bg-danger estado-rechazado';
    if (e === 'COMPLETADO_CONTABILIDAD') return 'badge bg-success estado-completado';
    if (e === 'GLOSADO_CONTABILIDAD') return 'badge bg-purple estado-glosado';
    if (e === 'PROCESADO_CONTABILIDAD') return 'badge bg-success estado-procesado';
    
    // Estados finales
    if (e === 'COMPLETADO') return 'badge bg-success estado-completado';
    if (e === 'PROCESADO') return 'badge bg-success estado-procesado';
    if (e === 'RECHAZADO') return 'badge bg-danger estado-rechazado';
    if (e === 'OBSERVADO') return 'badge bg-warning estado-observado';
    if (e === 'GLOSADO') return 'badge bg-purple estado-glosado';
    if (e === 'RADICADO') return 'badge bg-secondary estado-default';
    
    return 'badge bg-secondary estado-default';
  }

  /**
   * Retorna el texto legible del ESTADO DEL DOCUMENTO (COMPLETO)
   */
  getEstadoDocumentoTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    
    const e = estado.toUpperCase();
    
    const mapeo: Record<string, string> = {
      'APROBADO_SUPERVISOR': 'Aprobado Supervisor',
      'OBSERVADO_SUPERVISOR': 'Observado Supervisor',
      'RECHAZADO_SUPERVISOR': 'Rechazado Supervisor',
      'EN_REVISION_SUPERVISOR': 'En Revisión Supervisor',
      'EN_REVISION_AUDITOR': 'En Revisión Auditor',
      'APROBADO_AUDITOR': 'Aprobado Auditor',
      'OBSERVADO_AUDITOR': 'Observado Auditor',
      'RECHAZADO_AUDITOR': 'Rechazado Auditor',
      'COMPLETADO_AUDITOR': 'Completado Auditor',
      'EN_REVISION_CONTABILIDAD': 'En Revisión Contabilidad',
      'APROBADO_CONTABILIDAD': 'Aprobado Contabilidad',
      'OBSERVADO_CONTABILIDAD': 'Observado Contabilidad',
      'RECHAZADO_CONTABILIDAD': 'Rechazado Contabilidad',
      'COMPLETADO_CONTABILIDAD': 'Completado Contabilidad',
      'GLOSADO_CONTABILIDAD': 'Glosado Contabilidad',
      'PROCESADO_CONTABILIDAD': 'Procesado Contabilidad',
      'COMPLETADO': 'Completado',
      'PROCESADO': 'Procesado',
      'RECHAZADO': 'Rechazado',
      'OBSERVADO': 'Observado',
      'GLOSADO': 'Glosado',
      'RADICADO': 'Radicado'
    };
    
    return mapeo[e] || estado.replace(/_/g, ' ');
  }

  /**
   * Retorna la clase CSS para el badge del ESTADO DE CONTABILIDAD
   */
  getEstadoContabilidadBadgeClass(estado: string | undefined): string {
    if (!estado) return 'badge bg-secondary';
    
    const e = estado.toUpperCase();
    
    if (e === 'DISPONIBLE') return 'badge bg-info';
    if (e === 'EN_REVISION') return 'badge bg-primary';
    if (e === 'COMPLETADO' || e === 'APROBADO') return 'badge bg-success';
    if (e === 'OBSERVADO') return 'badge bg-warning text-dark';
    if (e === 'RECHAZADO') return 'badge bg-danger';
    if (e === 'GLOSADO') return 'badge bg-purple';
    if (e === 'PROCESADO') return 'badge bg-success';
    
    return 'badge bg-secondary';
  }

  /**
   * Retorna el texto legible del ESTADO DE CONTABILIDAD
   */
  getEstadoContabilidadTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    
    const e = estado.toUpperCase();
    
    const mapeo: Record<string, string> = {
      'DISPONIBLE': 'Disponible',
      'EN_REVISION': 'En Revisión',
      'COMPLETADO': 'Completado',
      'APROBADO': 'Aprobado',
      'OBSERVADO': 'Observado',
      'RECHAZADO': 'Rechazado',
      'GLOSADO': 'Glosado',
      'PROCESADO': 'Procesado'
    };
    
    return mapeo[e] || estado;
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  esDocumentoReciente(item: any): boolean {
    const fechaActualizacion = item.fechaActualizacion || item.updatedAt;
    if (!fechaActualizacion) return false;

    try {
      const fechaDoc = new Date(fechaActualizacion);
      const ahora = new Date();
      const diferenciaDias = Math.floor((ahora.getTime() - fechaDoc.getTime()) / (1000 * 60 * 60 * 24));
      return diferenciaDias <= 7;
    } catch {
      return false;
    }
  }

  formatDateOnly(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatDateShort(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  // ==================== FILTROS Y PAGINACIÓN ====================

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredHistorial = [...this.historial];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredHistorial = this.historial.filter(item => {
        const doc = item.documento || item;
        return (
          (doc.numeroRadicado?.toLowerCase().includes(term)) ||
          (doc.nombreContratista?.toLowerCase().includes(term)) ||
          (doc.numeroContrato?.toLowerCase().includes(term)) ||
          (doc.documentoContratista?.toLowerCase().includes(term)) ||
          (item.estadoDocumento?.toLowerCase().includes(term)) ||
          (item.estadoContabilidad?.toLowerCase().includes(term)) ||
          (item.contadorRevisor?.toLowerCase().includes(term))
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredHistorial.length / this.pageSize);

    this.pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredHistorial.length);
    this.paginatedHistorial = this.filteredHistorial.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  dismissError(): void {
    this.error = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }

  refreshData(): void {
    this.loadHistorial();
  }
}