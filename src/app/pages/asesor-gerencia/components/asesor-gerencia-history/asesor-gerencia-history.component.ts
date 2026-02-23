import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AsesorGerenciaService } from '../../../../core/services/asesor-gerencia.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-asesor-gerencia-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './asesor-gerencia-history.component.html',
  styleUrls: ['./asesor-gerencia-history.component.scss']
})
export class AsesorGerenciaHistoryComponent implements OnInit, OnDestroy {
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
    private asesorGerenciaService: AsesorGerenciaService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
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
        this.usuarioActual = user.fullName || user.username || 'Asesor Gerencia';
      } catch (error) {
        this.usuarioActual = 'Asesor Gerencia';
      }
    }
  }

  private normalizarEstado(estadoRaw: string | undefined): string {
    if (!estadoRaw) return 'DESCONOCIDO';
    
    const upper = estadoRaw.toUpperCase().trim();
    
    if (upper.includes('COMPLETADO') || upper.includes('APROBADO')) {
      return 'COMPLETADO_ASESOR_GERENCIA';
    }
    if (upper.includes('EN_REVISION') || upper.includes('PENDIENTE') || upper.includes('EN PROCESO')) {
      return 'EN_REVISION_ASESOR_GERENCIA';
    }
    if (upper.includes('OBSERVADO')) {
      return 'OBSERVADO_ASESOR_GERENCIA';
    }
    if (upper.includes('RECHAZADO')) {
      return 'RECHAZADO_ASESOR_GERENCIA';
    }
    
    return upper.replace(/_/g, ' ');
  }

  loadHistorial(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.infoMessage = '';

    this.asesorGerenciaService.getHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let dataArray = [];
          if (Array.isArray(response)) {
            dataArray = response;
          } else if (response?.data && Array.isArray(response.data)) {
            dataArray = response.data;
          } else if (response?.historial && Array.isArray(response.historial)) {
            dataArray = response.historial;
          } else if (response?.ok && response?.data && Array.isArray(response.data)) {
            dataArray = response.data;
          } else if (response?.success && response?.data && Array.isArray(response.data)) {
            dataArray = response.data;
          }

          this.historial = Array.isArray(dataArray) ? dataArray.map(item => {
            const estadoNormal = this.normalizarEstado(
              item.estado || 
              item.estadoGerencia || 
              item.estadoDocumento || 
              item.estadoRevision
            );
            return {
              ...item,
              estado: estadoNormal
            };
          }) : [];

          this.historial.sort((a, b) => {
            const fechaA = new Date(a.fechaFinRevision || a.fechaActualizacion || a.fechaCreacion || 0);
            const fechaB = new Date(b.fechaFinRevision || b.fechaActualizacion || b.fechaCreacion || 0);
            return fechaB.getTime() - fechaA.getTime();
          });

          this.filteredHistorial = [...this.historial];
          this.updatePagination();

          if (this.filteredHistorial.length > 0) {
            const recientes = this.filteredHistorial.filter(item => this.esRevisionReciente(item));
            const completados = this.filteredHistorial.filter(item => 
              item.estado === 'COMPLETADO_ASESOR_GERENCIA'
            ).length;
            const enRevision = this.filteredHistorial.filter(item => 
              item.estado === 'EN_REVISION_ASESOR_GERENCIA'
            ).length;
            const observados = this.filteredHistorial.filter(item => 
              item.estado === 'OBSERVADO_ASESOR_GERENCIA'
            ).length;
            const rechazados = this.filteredHistorial.filter(item => 
              item.estado === 'RECHAZADO_ASESOR_GERENCIA'
            ).length;
            
            this.successMessage = `${this.filteredHistorial.length} revisiones (${completados} completadas, ${enRevision} en proceso, ${observados} observadas, ${rechazados} rechazadas, ${recientes.length} recientes)`;
          } else {
            this.infoMessage = 'No hay revisiones en el historial';
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Error de conexión con el servidor';
          this.loading = false;
          if (err.status !== 404 && err.status !== 0) {
            this.notificationService.error('Error', this.error);
          }
        }
      });
  }

  verDetalleRevision(item: any): void {
    const documentoId = item.documentoId || item.documento?.id;
    if (!documentoId) return;

    const esEnRevision = item.estado === 'EN_REVISION_ASESOR_GERENCIA';
    const esMiRevision = this.esMiRevision(item);
    const esEditable = esEnRevision && esMiRevision;

    this.router.navigate(['/asesor-gerencia/procesar', documentoId], {
      queryParams: {
        desdeHistorial: 'true',
        soloLectura: esEditable ? 'false' : 'true',
        modo: esEditable ? 'edicion' : 'consulta',
        origen: 'historial-gerencia'
      }
    });
  }

continuarRevision(item: any): void {
  const documentoId = item.documentoId || item.documento?.id;
  if (!documentoId) return;

  if (item.estado !== 'EN_REVISION_ASESOR_GERENCIA' || !this.esMiRevision(item)) {
    this.notificationService.warning('No permitido', 'Este documento no está en revisión o no te pertenece');
    return;
  }

  // Siempre forzar edición cuando es continuar revisión
  this.router.navigate(['/asesor-gerencia/procesar', documentoId], {
    queryParams: {
      desdeHistorial: 'true',
      soloLectura: 'false',          // Forzado a edición
      modo: 'edicion',               // Explícito
      origen: 'historial-gerencia-continuar',
      forceEdit: 'true'              // Parámetro extra para que el form lo respete
    }
  });
}

  verAprobacion(item: any): void {
    const documentoId = item.documentoId || item.documento?.id;
    if (!documentoId) return;

    // Solo ver en modal (sin descargar)
    this.router.navigate(['/asesor-gerencia/procesar', documentoId], {
      queryParams: {
        desdeHistorial: 'true',
        soloLectura: 'true',
        modo: 'consulta',
        verAprobacion: 'true',
        origen: 'historial-gerencia'
      }
    });
  }

  getResponsableRevision(item: any): string {
    return item.asesorGerencia || 
           item.usuarioResponsable?.fullName ||
           item.usuarioResponsable?.username ||
           item.documento?.usuarioAsignadoNombre ||
           this.usuarioActual ||
           'Asesor Gerencia';
  }

  getEstadoRevisionBadgeClass(estado: string | undefined): string {
    const estadoNormal = this.normalizarEstado(estado);
    
    switch (estadoNormal) {
      case 'COMPLETADO_ASESOR_GERENCIA':
        return 'badge-completado bg-success text-white';
      case 'EN_REVISION_ASESOR_GERENCIA':
        return 'badge-en-revision bg-warning text-dark';
      case 'OBSERVADO_ASESOR_GERENCIA':
        return 'badge-observado bg-warning text-dark';
      case 'RECHAZADO_ASESOR_GERENCIA':
        return 'badge-rechazado bg-danger text-white';
      default:
        return 'badge-default bg-secondary text-white';
    }
  }

  getEstadoRevisionTexto(estado: string | undefined): string {
    const estadoNormal = this.normalizarEstado(estado);
    
    switch (estadoNormal) {
      case 'COMPLETADO_ASESOR_GERENCIA':
        return 'Completado Gerencia';
      case 'EN_REVISION_ASESOR_GERENCIA':
        return 'En Revisión';
      case 'OBSERVADO_ASESOR_GERENCIA':
        return 'Observado';
      case 'RECHAZADO_ASESOR_GERENCIA':
        return 'Rechazado';
      default:
        return estadoNormal;
    }
  }

  getAccesoTexto(item: any): string {
    const estado = this.normalizarEstado(item.estado);
    switch (estado) {
      case 'COMPLETADO_ASESOR_GERENCIA':
      case 'RECHAZADO_ASESOR_GERENCIA':
        return 'Solo lectura';
      case 'EN_REVISION_ASESOR_GERENCIA':
        return this.esMiRevision(item) ? 'Editable' : 'Solo lectura';
      default:
        return 'Acceso limitado';
    }
  }

  esMiRevision(item: any): boolean {
    return this.getResponsableRevision(item) === this.usuarioActual;
  }

  esRevisionReciente(item: any): boolean {
    const fecha = item.fechaFinRevision || item.fechaActualizacion || item.updatedAt;
    if (!fecha) return false;
    try {
      const fechaObj = new Date(fecha);
      const ahora = new Date();
      return Math.floor((ahora.getTime() - fechaObj.getTime()) / (1000 * 60 * 60 * 24)) <= 7;
    } catch {
      return false;
    }
  }

  getDuracionProceso(item: any): string {
    const inicio = item.fechaInicioRevision || item.fechaCreacion;
    const fin = item.fechaFinRevision || item.fechaActualizacion || new Date();
    if (!inicio) return 'N/A';
    try {
      const diffMs = new Date(fin).getTime() - new Date(inicio).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) return `${Math.floor(diffMs / (1000 * 60))} min`;
        return `${diffHours} h`;
      } else if (diffDays === 1) return '1 día';
      return `${diffDays} días`;
    } catch {
      return 'N/A';
    }
  }

  formatDate(fecha: Date | string): string {
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

  formatDateOnly(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
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
          (item.estado?.toLowerCase().includes(term)) ||
          (item.observaciones?.toLowerCase().includes(term))
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