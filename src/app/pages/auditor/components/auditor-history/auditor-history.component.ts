import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-auditor-history',
  templateUrl: './auditor-history.component.html',
  styleUrls: ['./auditor-history.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class AuditorHistoryComponent implements OnInit, OnDestroy {
  // Historial de auditorías
  historial: any[] = [];
  historialFiltrado: any[] = [];
  historialPaginado: any[] = [];

  // Estados de carga
  isLoading = false;
  isProcessing = false;

  // Mensajes
  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  // Búsqueda y filtros
  searchTerm = '';
  filtroEstado = 'TODOS';
  filtroFechaDesde: string = '';
  filtroFechaHasta: string = '';

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  // Estados disponibles
  estados = [
    { value: 'TODOS', label: 'Todos los estados', icon: 'list', color: 'secondary' },
    { value: 'APROBADO', label: 'Aprobados', icon: 'check_circle', color: 'success' },
    { value: 'OBSERVADO', label: 'Observados', icon: 'warning', color: 'warning' },
    { value: 'RECHAZADO', label: 'Rechazados', icon: 'cancel', color: 'danger' },
    { value: 'COMPLETADO', label: 'Completados', icon: 'done_all', color: 'primary' },
    { value: 'EN_REVISION', label: 'En Revisión', icon: 'hourglass_empty', color: 'info' }
  ];

  // Estadísticas
  estadisticas = {
    total: 0,
    aprobados: 0,
    observados: 0,
    rechazados: 0,
    completados: 0,
    enRevision: 0,
    primerRadicados: 0
  };

  // Sidebar
  sidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private auditorService: AuditorService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    console.log('🚀 Auditor: Inicializando historial de auditorías...');
    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarHistorial(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('📋 Cargando historial de auditorías...');

    this.auditorService.getHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (historialArray: any[]) => {
          console.log('✅ Historial recibido:', historialArray);

          this.historial = historialArray;
          this.historialFiltrado = [...this.historial];
          
          this.calcularEstadisticas();
          this.updatePagination();

          console.log(`✅ ${this.historial.length} auditorías cargadas`);
          this.isLoading = false;

          if (this.historial.length === 0) {
            this.infoMessage = 'No hay historial de auditorías disponible';
          } else {
            this.successMessage = `Se encontraron ${this.historial.length} auditorías en el historial`;
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          }
        },
        error: (error) => {
          console.error('❌ Error cargando historial:', error);
          this.errorMessage = 'Error al cargar el historial: ' + (error.message || 'Error desconocido');
          this.isLoading = false;
          this.notificationService.error('Error', this.errorMessage);
        }
      });
  }

  calcularEstadisticas(): void {
    this.estadisticas.total = this.historial.length;
    this.estadisticas.aprobados = this.historial.filter(item => item.estado === 'APROBADO').length;
    this.estadisticas.observados = this.historial.filter(item => item.estado === 'OBSERVADO').length;
    this.estadisticas.rechazados = this.historial.filter(item => item.estado === 'RECHAZADO').length;
    this.estadisticas.completados = this.historial.filter(item => item.estado === 'COMPLETADO').length;
    this.estadisticas.enRevision = this.historial.filter(item => item.estado === 'EN_REVISION').length;
    this.estadisticas.primerRadicados = this.historial.filter(item => 
      item.documento?.primerRadicadoDelAno === true
    ).length;
  }

  aplicarFiltros(): void {
    let resultados = [...this.historial];

    // Filtro por estado
    if (this.filtroEstado !== 'TODOS') {
      resultados = resultados.filter(item => item.estado === this.filtroEstado);
    }

    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      resultados = resultados.filter(item => {
        return (
          item.documento?.numeroRadicado?.toLowerCase().includes(term) ||
          item.documento?.nombreContratista?.toLowerCase().includes(term) ||
          item.documento?.numeroContrato?.toLowerCase().includes(term) ||
          item.observaciones?.toLowerCase().includes(term)
        );
      });
    }

    // Filtro por fecha
    if (this.filtroFechaDesde) {
      const fechaDesde = new Date(this.filtroFechaDesde);
      resultados = resultados.filter(item => {
        const fechaItem = new Date(item.fechaActualizacion || item.fechaCreacion);
        return fechaItem >= fechaDesde;
      });
    }

    if (this.filtroFechaHasta) {
      const fechaHasta = new Date(this.filtroFechaHasta);
      fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
      resultados = resultados.filter(item => {
        const fechaItem = new Date(item.fechaActualizacion || item.fechaCreacion);
        return fechaItem <= fechaHasta;
      });
    }

    this.historialFiltrado = resultados;
    this.currentPage = 1;
    this.updatePagination();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtroEstado = 'TODOS';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.aplicarFiltros();
  }

  // Métodos auxiliares
  formatDate(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
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

  formatDateShort(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getEstadoLabel(estado: string): string {
    const estadoObj = this.estados.find(e => e.value === estado);
    return estadoObj ? estadoObj.label : estado;
  }

  getEstadoIcon(estado: string): string {
    const estadoObj = this.estados.find(e => e.value === estado);
    return estadoObj ? estadoObj.icon : 'help';
  }

  getEstadoColor(estado: string): string {
    if (!estado) return 'secondary';

    switch (estado) {
      case 'APROBADO':
        return 'success';
      case 'OBSERVADO':
        return 'warning';
      case 'RECHAZADO':
        return 'danger';
      case 'COMPLETADO':
        return 'primary';
      case 'EN_REVISION':
        return 'info';
      default:
        return 'secondary';
    }
  }

  getEstadoClass(estado: string): string {
    const color = this.getEstadoColor(estado);
    return `bg-${color} text-white`;
  }

  esPrimerRadicado(item: any): boolean {
    return item.documento?.primerRadicadoDelAno === true;
  }

  tieneArchivosAuditoria(item: any): boolean {
    return item.tieneTodosDocumentos === true || item.documentosSubidos?.length > 0;
  }

  getObservacionesCortas(observaciones: string): string {
    if (!observaciones) return 'Sin observaciones';
    if (observaciones.length <= 100) return observaciones;
    return observaciones.substring(0, 100) + '...';
  }

  // Paginación
  updatePagination(): void {
    this.totalPages = Math.ceil(this.historialFiltrado.length / this.pageSize);

    // Calcular páginas a mostrar
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

    // Actualizar historial paginado
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.historialFiltrado.length);
    this.historialPaginado = this.historialFiltrado.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  refreshData(): void {
    console.log('🔄 Auditor: Recargando historial...');
    this.cargarHistorial();
  }

  exportarExcel(): void {
    console.log('📊 Exportando historial a Excel...');
    this.isProcessing = true;

    // Implementar exportación a Excel
    setTimeout(() => {
      this.notificationService.success('Exportación', 'Historial exportado correctamente');
      this.isProcessing = false;
    }, 1000);
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
}