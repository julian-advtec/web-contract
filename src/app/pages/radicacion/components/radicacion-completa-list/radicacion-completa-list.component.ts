// src/app/modules/radicacion/components/radicacion-completa-list/radicacion-completa-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RadicacionService } from '../../../../core/services/radicacion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../core/models/user.types';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-radicacion-completa-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './radicacion-completa-list.component.html',
  styleUrls: ['./radicacion-completa-list.component.scss']
})
export class RadicacionCompletaListComponent implements OnInit, OnDestroy {
  // Lista completa de TODOS los documentos del sistema
  todosDocumentos: any[] = [];
  filteredDocumentos: any[] = [];
  paginatedDocumentos: any[] = [];

  loading = false;
  error = '';
  successMessage = '';
  infoMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  // Filtros específicos
  filtroEstado = 'todos';
  filtroRadicador = 'todos';
  filtroFecha = 'todos';

  // Datos derivados
  radicadoresUnicos: string[] = [];

  usuarioActual: any = null;
  sidebarCollapsed = false;
  UserRole = UserRole;

  private destroy$ = new Subject<void>();

  constructor(
    private radicacionService: RadicacionService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarTodosLosDocumentos();
  }

  cargarUsuarioActual(): void {
    this.usuarioActual = this.authService.getCurrentUser();
    if (!this.usuarioActual) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          this.usuarioActual = JSON.parse(userStr);
        } catch (e) {
          console.error('Error parseando usuario', e);
        }
      }
    }
  }

  // Cargar TODOS los documentos del sistema (sin filtro por usuario)
  cargarTodosLosDocumentos(): void {
    this.loading = true;
    this.error = '';
    this.infoMessage = '';

    console.log('[RADICACION-COMPLETA] Cargando TODOS los documentos del sistema...');

    this.radicacionService.getAllDocumentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[RADICACION-COMPLETA] Respuesta recibida:', response);

          let documentos: any[] = [];

          if (response && response.success && response.data) {
            documentos = response.data;
          } else if (Array.isArray(response)) {
            documentos = response;
          } else if (response && response.data && Array.isArray(response.data)) {
            documentos = response.data;
          }

          this.todosDocumentos = documentos;
          this.extraerRadicadoresUnicos();

          console.log(`[RADICACION-COMPLETA] ${this.todosDocumentos.length} documentos cargados`);

          this.aplicarFiltros();

          if (this.todosDocumentos.length === 0) {
            this.infoMessage = 'No hay documentos radicados en el sistema';
          } else {
            this.successMessage = `Se cargaron ${this.todosDocumentos.length} documentos de ${this.radicadoresUnicos.length} radicadores`;
          }

          this.loading = false;
        },
        error: (err: any) => {
          console.error('[RADICACION-COMPLETA] Error:', err);
          this.error = `Error al cargar documentos: ${err.message || 'Error de conexión'}`;
          this.loading = false;
          this.notificationService.error('Error', this.error);
        }
      });
  }

  // Extraer lista única de radicadores para el filtro
  extraerRadicadoresUnicos(): void {
    const radicadoresSet = new Set<string>();

    this.todosDocumentos.forEach(doc => {
      const radicador = doc.nombreRadicador || doc.radicador?.fullName || 'Sin radicador';
      radicadoresSet.add(radicador);
    });

    this.radicadoresUnicos = Array.from(radicadoresSet).sort();
  }

  // Aplicar todos los filtros
  aplicarFiltros(): void {
    let filtered = [...this.todosDocumentos];

    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(doc => {
        return (
          (doc.numeroRadicado?.toLowerCase().includes(term)) ||
          (doc.numeroContrato?.toLowerCase().includes(term)) ||
          (doc.nombreContratista?.toLowerCase().includes(term)) ||
          (doc.documentoContratista?.toLowerCase().includes(term)) ||
          (doc.estado?.toLowerCase().includes(term)) ||
          (doc.nombreRadicador?.toLowerCase().includes(term)) ||
          (doc.radicador?.fullName?.toLowerCase().includes(term)) ||
          (doc.radicador?.username?.toLowerCase().includes(term))
        );
      });
    }

    // Filtro por estado
    if (this.filtroEstado !== 'todos') {
      filtered = filtered.filter(doc => doc.estado === this.filtroEstado);
    }

    // Filtro por radicador
    if (this.filtroRadicador !== 'todos') {
      filtered = filtered.filter(doc => {
        const radicador = doc.nombreRadicador || doc.radicador?.fullName || 'Sin radicador';
        return radicador === this.filtroRadicador;
      });
    }

    // Filtro por fecha
    if (this.filtroFecha !== 'todos') {
      const ahora = new Date();
      filtered = filtered.filter(doc => {
        if (!doc.fechaRadicacion) return true;

        const fecha = new Date(doc.fechaRadicacion);
        const diffDias = Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));

        switch (this.filtroFecha) {
          case 'hoy': return diffDias === 0;
          case 'semana': return diffDias <= 7;
          case 'mes': return diffDias <= 30;
          case 'trimestre': return diffDias <= 90;
          case 'ano': return diffDias <= 365;
          default: return true;
        }
      });
    }

    this.filteredDocumentos = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  onSearch(): void {
    this.aplicarFiltros();
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtroEstado = 'todos';
    this.filtroRadicador = 'todos';
    this.filtroFecha = 'todos';
    this.onFiltroChange();
    this.successMessage = 'Filtros limpiados';
  }

  hayFiltrosActivos(): boolean {
    return !!(this.searchTerm || 
              this.filtroEstado !== 'todos' || 
              this.filtroRadicador !== 'todos' || 
              this.filtroFecha !== 'todos');
  }

  // Paginación
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
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
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredDocumentos.length);
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  // Acciones
  verDetalle(doc: any): void {
    this.router.navigate(['/radicacion/documento', doc.id], {
      queryParams: { modo: 'consulta' }
    });
  }

  verArchivos(doc: any): void {
    // Navegar a vista de documentos o abrir modal
    this.router.navigate(['/radicacion/documento', doc.id, 'archivos']);
  }

  refreshData(): void {
    this.cargarTodosLosDocumentos();
  }

  // Exportar a Excel
  exportToExcel(): void {
    try {
      const dataToExport = this.filteredDocumentos.map(doc => ({
        'Radicado': doc.numeroRadicado || 'N/A',
        'Contrato': doc.numeroContrato || 'N/A',
        'Contratista': doc.nombreContratista || 'N/A',
        'Documento Contratista': doc.documentoContratista || 'N/A',
        'Estado': this.getEstadoTexto(doc.estado),
        'Radicador': doc.nombreRadicador || doc.radicador?.fullName || 'N/A',
        'Fecha Radicación': doc.fechaRadicacion ? new Date(doc.fechaRadicacion).toLocaleDateString('es-CO') : 'N/A',
        'Fecha Inicio': doc.fechaInicio ? new Date(doc.fechaInicio).toLocaleDateString('es-CO') : 'N/A',
        'Fecha Fin': doc.fechaFin ? new Date(doc.fechaFin).toLocaleDateString('es-CO') : 'N/A',
        'Documentos': `${this.getDocumentosSubidos(doc)}/3`,
        'Primer Radicado': doc.primerRadicadoDelAno ? 'SÍ' : 'NO'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Radicados');
      
      const fileName = `radicados_completos_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      this.notificationService.success('Éxito', `Archivo exportado: ${fileName}`);
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      this.notificationService.error('Error', 'No se pudo exportar el archivo');
    }
  }

  // Métodos auxiliares para estadísticas
  getCompletadosCount(): number {
    return this.todosDocumentos.filter(d => 
      d.estado?.includes('COMPLETADO') || 
      d.estado === 'FINALIZADO'
    ).length;
  }

  getPendientesCount(): number {
    return this.todosDocumentos.filter(d => 
      !d.estado?.includes('COMPLETADO') && 
      d.estado !== 'FINALIZADO' &&
      d.estado !== 'RECHAZADO_ASESOR_GERENCIA'
    ).length;
  }

  getDocumentosSubidos(doc: any): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  esDocumentoReciente(doc: any): boolean {
    if (!doc.fechaRadicacion) return false;
    const fecha = new Date(doc.fechaRadicacion);
    const dias = Math.floor((new Date().getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 2; // últimos 2 días
  }

  // Formateo de fechas
  formatDate(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatTimeAgo(fecha: string | Date): string {
    if (!fecha) return '';
    try {
      const fechaDate = new Date(fecha);
      const ahora = new Date();
      const diffMs = ahora.getTime() - fechaDate.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDias > 0) return `hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
      if (diffHoras > 0) return `hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
      if (diffMin > 0) return `hace ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
      return 'hace un momento';
    } catch {
      return '';
    }
  }

  // Badges de estado
  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'badge bg-secondary';

    const e = estado.toUpperCase();

    if (e.includes('COMPLETADO')) return 'badge bg-success';
    if (e.includes('RADICADO')) return 'badge bg-primary';
    if (e.includes('SUPERVISADO')) return 'badge bg-info';
    if (e.includes('EN_REVISION')) return 'badge bg-warning text-dark';
    if (e.includes('OBSERVADO')) return 'badge bg-warning text-dark';
    if (e.includes('RECHAZADO')) return 'badge bg-danger';
    if (e.includes('PENDIENTE')) return 'badge bg-secondary';

    return 'badge bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';

    const e = estado.toUpperCase();

    if (e === 'RADICADO') return 'Radicado';
    if (e === 'SUPERVISADO') return 'Supervisado';
    if (e.includes('COMPLETADO_TESORERIA')) return 'Pendiente Gerencia';
    if (e.includes('COMPLETADO_CONTABILIDAD')) return 'Completado Contabilidad';
    if (e.includes('EN_REVISION_CONTABILIDAD')) return 'En Contabilidad';
    if (e.includes('OBSERVADO_CONTABILIDAD')) return 'Observado Contabilidad';
    if (e.includes('EN_REVISION_TESORERIA')) return 'En Tesorería';
    if (e.includes('OBSERVADO_TESORERIA')) return 'Observado Tesorería';
    if (e.includes('EN_REVISION_ASESOR_GERENCIA')) return 'En Gerencia';
    if (e.includes('OBSERVADO_ASESOR_GERENCIA')) return 'Observado Gerencia';
    if (e.includes('COMPLETADO_ASESOR_GERENCIA')) return 'Completado Gerencia';
    if (e.includes('RECHAZADO_ASESOR_GERENCIA')) return 'Rechazado Gerencia';

    return estado.replace(/_/g, ' ');
  }

  getFechaTexto(filtro: string): string {
    switch (filtro) {
      case 'hoy': return 'Hoy';
      case 'semana': return 'Última semana';
      case 'mes': return 'Último mes';
      case 'trimestre': return 'Último trimestre';
      case 'ano': return 'Último año';
      default: return '';
    }
  }

  // Dismiss alerts
  dismissError(): void { this.error = ''; }
  dismissSuccess(): void { this.successMessage = ''; }
  dismissInfo(): void { this.infoMessage = ''; }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}