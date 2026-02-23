// src/app/pages/rendicion-cuentas/rendicion-list/rendicion-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
  // Lista completa de TODOS los documentos de rendición de cuentas
  todosDocumentos: RendicionCuentasProceso[] = [];
  filteredDocumentos: RendicionCuentasProceso[] = [];
  paginatedDocumentos: RendicionCuentasProceso[] = [];

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

  // Filtros
  filtroEstado = 'todos'; // 'todos', 'pendientes', 'en_revision', 'aprobados', 'observados', 'rechazados', 'completados'
  filtroAsignacion = 'todos'; // 'todos', 'mios', 'sin_asignar', 'de_otros'
  filtroFecha = 'todos'; // 'todos', 'hoy', 'semana', 'mes'

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.loadTodosDocumentos();
  }

  cargarUsuarioActual(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.usuarioActual = user.fullName || user.username || 'Usuario';
    }
  }

  // Cargar TODOS los documentos de rendición de cuentas
  loadTodosDocumentos(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.infoMessage = '';

    console.log('[RENDICIÓN - LISTA COMPLETA] Solicitando TODOS los documentos...');

    // Primero obtenemos los disponibles (PENDIENTE)
    this.rendicionService.obtenerDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (disponibles: RendicionCuentasProceso[]) => {
          console.log('[RENDICIÓN] Disponibles recibidos:', disponibles?.length || 0);

          // Luego obtenemos los que están en revisión (mis documentos)
          this.rendicionService.obtenerMisDocumentos()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (enRevision: RendicionCuentasProceso[]) => {
                console.log('[RENDICIÓN] En revisión recibidos:', enRevision?.length || 0);

                // Finalmente obtenemos el historial (documentos procesados)
                this.rendicionService.getHistorial()
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: (historial: any[]) => {
                      console.log('[RENDICIÓN] Historial recibido:', historial?.length || 0);

                      // Combinar TODOS los documentos
                      this.combinarTodosDocumentos(disponibles || [], enRevision || [], historial || []);

                      this.loading = false;
                    },
                    error: (err: any) => {
                      console.error('[RENDICIÓN] Error cargando historial:', err);
                      this.combinarTodosDocumentos(disponibles || [], enRevision || [], []);
                      this.loading = false;
                    }
                  });
              },
              error: (err: any) => {
                console.error('[RENDICIÓN] Error cargando documentos en revisión:', err);
                this.combinarTodosDocumentos(disponibles || [], [], []);
                this.loading = false;
              }
            });
        },
        error: (err: any) => {
          console.error('[RENDICIÓN] Error cargando documentos disponibles:', err);
          this.error = 'Error de conexión con el servidor: ' + (err.message || 'Desconocido');
          this.loading = false;
          this.notificationService.error('Error', this.error);
        }
      });
  }

  // Combinar todos los documentos en una sola lista
  combinarTodosDocumentos(disponibles: RendicionCuentasProceso[], enRevision: RendicionCuentasProceso[], historial: any[]): void {
    const todos: RendicionCuentasProceso[] = [];
    const idsProcesados = new Set<string>();

    // 1. Agregar documentos disponibles (PENDIENTE)
    disponibles.forEach(doc => {
      if (!idsProcesados.has(doc.id)) {
        todos.push({
          ...doc,
          tipo: 'disponible',
          estadoRendicion: 'DISPONIBLE'
        } as any);
        idsProcesados.add(doc.id);
      }
    });

    // 2. Agregar documentos en revisión por mí
    enRevision.forEach(doc => {
      if (!idsProcesados.has(doc.id)) {
        todos.push({
          ...doc,
          tipo: 'en_revision_mio',
          estadoRendicion: 'EN_REVISION'
        } as any);
        idsProcesados.add(doc.id);
      }
    });

    // 3. Agregar documentos del historial (ya procesados)
    historial.forEach(item => {
      const doc = item.documento || item;
      if (!idsProcesados.has(doc.id)) {
        todos.push({
          ...doc,
          tipo: 'procesado',
          estadoRendicion: item.estadoNuevo || doc.estado,
          observaciones: item.observacion,
          fechaInicioRevision: item.fechaInicioRevision,
          fechaDecision: item.fechaDecision,
          responsableAsignado: item.usuarioNombre,
          fechaFin: item.fechaCreacion
        } as any);
        idsProcesados.add(doc.id);
      }
    });

    console.log('[RENDICIÓN] Total documentos combinados:', todos.length);
    this.todosDocumentos = todos;

    // Aplicar filtros iniciales
    this.aplicarFiltros();
    this.updatePagination();

    if (this.filteredDocumentos.length > 0) {
      const disponiblesCount = this.filteredDocumentos.filter(d => (d as any).tipo === 'disponible').length;
      const enRevisionCount = this.filteredDocumentos.filter(d => (d as any).tipo === 'en_revision_mio').length;
      const procesadosCount = this.filteredDocumentos.filter(d => (d as any).tipo === 'procesado').length;

      this.successMessage = `Se encontraron ${this.filteredDocumentos.length} documentos totales (${disponiblesCount} disponibles, ${enRevisionCount} en revisión, ${procesadosCount} procesados)`;
    } else {
      this.infoMessage = 'No hay documentos en el sistema';
    }
  }

  // Tomar documento para revisión
  tomarDocumento(documento: any): void {
    if (this.isProcessing) return;

    if (documento.tipo !== 'disponible') {
      this.notificationService.warning('Advertencia', 'Este documento no está disponible para tomar');
      return;
    }

    this.isProcessing = true;
    const documentoId = documento.id;

    console.log(`[RENDICIÓN] Tomando documento ${documentoId}...`);

    this.rendicionService.tomarDocumentoParaRevision(documentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[RENDICIÓN] Documento tomado:', response);
          this.notificationService.success('Éxito', 'Documento tomado para revisión');

          // Actualizar el documento en la lista
          const index = this.todosDocumentos.findIndex(d => d.id === documentoId);
          if (index !== -1) {
            (this.todosDocumentos[index] as any).tipo = 'en_revision_mio';
            (this.todosDocumentos[index] as any).estadoRendicion = 'EN_REVISION';
            this.aplicarFiltros();
            this.updatePagination();
          }

          this.isProcessing = false;
        },
        error: (err: any) => {
          console.error('[RENDICIÓN] Error tomando documento:', err);
          this.notificationService.error('Error', err.message || 'No se pudo tomar el documento');
          this.isProcessing = false;
        }
      });
  }

  // Ir a procesar/revisar documento
  revisarDocumento(documento: any): void {
    const documentoId = documento.id;
    const soyElResponsable = documento.tipo === 'en_revision_mio' ||
      (documento.responsableAsignado && 
        this.compararNombres(documento.responsableAsignado, this.usuarioActual));

    const queryParams: any = { desdeLista: 'true' };

    // Si está en revisión y soy yo el asignado, permitir edición
    if (documento.estadoRendicion?.includes('EN_REVISION') && soyElResponsable) {
      queryParams.soloLectura = 'false';
      queryParams.modo = 'edicion';
    } else {
      // En cualquier otro caso, solo lectura
      queryParams.soloLectura = 'true';
      queryParams.modo = 'consulta';
    }

    this.router.navigate(['/rendicion-cuentas/procesar', documentoId], { queryParams });
  }

  // Ver detalle del documento
  verDetalle(documento: any): void {
    const documentoId = documento.id;
    this.router.navigate(['/rendicion-cuentas/documento', documentoId], { queryParams: { modo: 'consulta' } });
  }

  // Métodos auxiliares
  esMiDocumento(item: any): boolean {
    const responsableAsignado = item.responsableAsignado || item.responsable?.nombreCompleto || '';
    return this.compararNombres(responsableAsignado, this.usuarioActual);
  }

  compararNombres(nombre1: string, nombre2: string): boolean {
    if (!nombre1 || !nombre2) return false;
    const normalizar = (nombre: string) => nombre.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalizar(nombre1);
    const n2 = normalizar(nombre2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }

  esDocumentoReciente(item: any): boolean {
    const fecha = item.fechaCreacion || item.fechaActualizacion;
    if (!fecha) return false;
    const dias = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 7;
  }

  getEstadoBadgeClass(estado: string): string {
    return this.rendicionService.getEstadoClass(estado);
  }

  getEstadoTexto(estado: string): string {
    return this.rendicionService.getEstadoTexto(estado);
  }

  getTipoDocumentoTexto(documento: any): string {
    switch (documento.tipo) {
      case 'disponible': return 'Disponible';
      case 'en_revision_mio': return 'En Proceso (Mío)';
      case 'procesado': return 'Procesado';
      default: return 'Desconocido';
    }
  }

  getTipoDocumentoBadgeClass(documento: any): string {
    switch (documento.tipo) {
      case 'disponible': return 'badge bg-primary';
      case 'en_revision_mio': return 'badge bg-success';
      case 'procesado':
        const estado = documento.estadoRendicion || '';
        if (estado.includes('APROBADO') || estado.includes('COMPLETADO')) return 'badge bg-info';
        if (estado.includes('OBSERVADO')) return 'badge bg-warning';
        if (estado.includes('RECHAZADO')) return 'badge bg-danger';
        return 'badge bg-secondary';
      default: return 'badge bg-light text-dark';
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

  formatDateShort(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getDocumentCount(item: any): number {
    return item.informesPresentados?.length || item.documentosAdjuntos?.length || 0;
  }

  // Aplicar filtros
  aplicarFiltros(): void {
    let filtered = [...this.todosDocumentos];

    // Filtro por estado de rendición
    if (this.filtroEstado !== 'todos') {
      switch (this.filtroEstado) {
        case 'pendientes':
          filtered = filtered.filter(doc => 
            doc.estado === 'PENDIENTE' || (doc as any).tipo === 'disponible'
          );
          break;
        case 'en_revision':
          filtered = filtered.filter(doc => 
            doc.estado === 'EN_REVISION' || (doc as any).tipo === 'en_revision_mio'
          );
          break;
        case 'aprobados':
          filtered = filtered.filter(doc => 
            doc.estado === 'APROBADO'
          );
          break;
        case 'observados':
          filtered = filtered.filter(doc => 
            doc.estado === 'OBSERVADO'
          );
          break;
        case 'rechazados':
          filtered = filtered.filter(doc => 
            doc.estado === 'RECHAZADO'
          );
          break;
        case 'completados':
          filtered = filtered.filter(doc => 
            doc.estado === 'COMPLETADO'
          );
          break;
      }
    }

    // Filtro por asignación
    if (this.filtroAsignacion !== 'todos') {
      switch (this.filtroAsignacion) {
        case 'mios':
          filtered = filtered.filter(doc => this.esMiDocumento(doc));
          break;
        case 'sin_asignar':
          filtered = filtered.filter(doc => (doc as any).tipo === 'disponible');
          break;
        case 'de_otros':
          filtered = filtered.filter(doc => 
            (doc as any).tipo === 'en_revision_mio' && !this.esMiDocumento(doc)
          );
          break;
      }
    }

    // Filtro por fecha
    if (this.filtroFecha !== 'todos') {
      const ahora = new Date();
      filtered = filtered.filter(doc => {
        const fechaDoc = doc.fechaCreacion || doc.fechaActualizacion;
        if (!fechaDoc) return true;

        const fecha = new Date(fechaDoc);
        const diffDias = Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));

        switch (this.filtroFecha) {
          case 'hoy': return diffDias === 0;
          case 'semana': return diffDias <= 7;
          case 'mes': return diffDias <= 30;
          default: return true;
        }
      });
    }

    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        return (
          (item.numeroRadicado?.toLowerCase().includes(term)) ||
          (item.nombreContratista?.toLowerCase().includes(term)) ||
          (item.numeroContrato?.toLowerCase().includes(term)) ||
          (item.estado?.toLowerCase().includes(term)) ||
          (item.observaciones?.toLowerCase().includes(term))
        );
      });
    }

    this.filteredDocumentos = filtered;
    this.currentPage = 1;
  }

  onSearch(): void {
    this.aplicarFiltros();
    this.updatePagination();
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
    this.updatePagination();
  }

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
    this.loadTodosDocumentos();
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroAsignacion = 'todos';
    this.filtroFecha = 'todos';
    this.searchTerm = '';
    this.onFiltroChange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Métodos auxiliares para el template
  getDisponiblesCount(): number {
    return this.todosDocumentos.filter(d => (d as any).tipo === 'disponible').length;
  }

  getEnRevisionCount(): number {
    return this.todosDocumentos.filter(d => (d as any).tipo === 'en_revision_mio').length;
  }

  getProcesadosCount(): number {
    return this.todosDocumentos.filter(d => (d as any).tipo === 'procesado').length;
  }

  getNumeroRadicado(documento: any): string {
    return documento.numeroRadicado || 'N/A';
  }

  getFechaRadicacion(documento: any): string | Date {
    return documento.fechaCreacion;
  }

  getNombreContratista(documento: any): string {
    return documento.nombreContratista || 'Sin nombre';
  }

  getDocumentoContratista(documento: any): string {
    return documento.documentoContratista || 'Sin documento';
  }

  getNumeroContrato(documento: any): string {
    return documento.numeroContrato || 'Sin contrato';
  }

  getFechaInicio(documento: any): string | Date {
    return documento.fechaInicio;
  }

  getFechaFin(documento: any): string | Date {
    return documento.fechaFin;
  }

  getEstado(documento: any): string {
    return documento.estado;
  }

  getObservacion(documento: any): string {
    return documento.observaciones;
  }

  getObservacionCorta(documento: any): string {
    const observacion = documento.observaciones;
    return observacion && observacion.length > 25 ?
      observacion.substring(0, 25) + '...' :
      observacion || '';
  }

  esConsultable(documento: any): boolean {
    return documento.tipo === 'procesado' ||
      (documento.tipo === 'en_revision_mio' && !this.esMiDocumento(documento));
  }
}