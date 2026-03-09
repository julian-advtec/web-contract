import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AsesorGerenciaService } from '../../../../core/services/asesor-gerencia.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-asesor-gerencia-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './asesor-gerencia-list.component.html',
  styleUrls: ['./asesor-gerencia-list.component.scss']
})
export class AsesorGerenciaListComponent implements OnInit, OnDestroy {
  // Lista completa de TODOS los documentos de asesor gerencia
  todosDocumentos: any[] = [];
  filteredDocumentos: any[] = [];
  paginatedDocumentos: any[] = [];

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

  // Filtros para asesor gerencia
  filtroEstado = 'todos'; // 'todos', 'pendientes', 'en_revision', 'completado', 'observados', 'rechazados'
  filtroAsignacion = 'todos'; // 'todos', 'mios', 'sin_asignar', 'de_otros'
  filtroFecha = 'todos'; // 'todos', 'hoy', 'semana', 'mes'

  private destroy$ = new Subject<void>();

  constructor(
    private asesorGerenciaService: AsesorGerenciaService,
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
      this.usuarioActual = user.fullName || user.username || 'Asesor Gerencia';
    }
  }

  // Cargar TODOS los documentos de asesor gerencia
loadTodosDocumentos(): void {
  this.loading = true;
  this.error = '';
  this.successMessage = '';
  this.infoMessage = '';

  console.log('[GERENCIA - LISTA COMPLETA] Solicitando TODOS los documentos...');

  this.asesorGerenciaService.getTodosDocumentos()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (documentos: any[]) => {
        console.log('[GERENCIA] Documentos recibidos (raw):', documentos);
        
        if (!documentos || documentos.length === 0) {
          console.log('[GERENCIA] No se recibieron documentos');
          this.todosDocumentos = [];
          this.loading = false;
          this.infoMessage = 'No hay documentos en el sistema';
          this.aplicarFiltros();
          this.updatePagination();
          return;
        }
        
        // Mapear los documentos al formato esperado por el template
        this.todosDocumentos = documentos.map((item: any) => {
          console.log('[GERENCIA] Procesando item:', item);
          
          return {
            id: item.documentoId || item.id,
            documentoId: item.documentoId,
            numeroRadicado: item.numeroRadicado || 'N/A',
            numeroContrato: item.numeroContrato || 'N/A',
            nombreContratista: item.nombreContratista || 'N/A',
            documentoContratista: item.documentoContratista || 'N/A',
            fechaRadicacion: item.fechaRadicacion || null,
            fechaInicio: item.fechaInicio || null,
            fechaFin: item.fechaFin || null,
            estado: item.estadoDocumento || item.estado || 'N/A',
            observacion: item.observaciones || '',
            radicador: item.radicador || 'Sistema',
            estadoGerencia: item.estadoGerencia || 'DISPONIBLE',
            tipo: this.determinarTipoDocumento({
              estadoGerencia: item.estadoGerencia,
              esMio: item.esMio
            }),
            asignacion: {
              asesorAsignado: item.asesor || null,
              enRevision: item.estadoGerencia === 'EN_REVISION'
            },
            asesorRevisor: item.asesor || null,
            fechaInicioRevision: item.fechaInicioRevision || null,
            fechaFinRevision: item.fechaFinRevision || null,
            aprobacionPath: item.aprobacionPath || null,
            comprobanteFirmadoPath: item.comprobanteFirmadoPath || null,
            firmaAplicada: item.firmaAplicada || false,
            esMio: item.esMio || false
          };
        });

        console.log('[GERENCIA] Documentos mapeados:', this.todosDocumentos.length);

        this.loading = false;
        this.aplicarFiltros();
        this.updatePagination();

        if (this.todosDocumentos.length > 0) {
          const disponiblesCount = this.todosDocumentos.filter(d => d.tipo === 'disponible').length;
          const enRevisionCount = this.todosDocumentos.filter(d => d.tipo === 'en_revision_mio').length;
          const procesadosCount = this.todosDocumentos.filter(d => d.tipo === 'procesado').length;

          this.successMessage = `Se encontraron ${this.todosDocumentos.length} documentos totales (${disponiblesCount} disponibles, ${enRevisionCount} en revisión, ${procesadosCount} procesados)`;
        } else {
          this.infoMessage = 'No hay documentos en el sistema';
        }
      },
      error: (err: any) => {
        console.error('[GERENCIA] Error cargando documentos:', err);
        this.error = 'Error de conexión con el servidor: ' + (err.message || 'Desconocido');
        this.loading = false;
        this.notificationService.error('Error', this.error);
      }
    });
}

// Modificar el método determinarTipoDocumento
determinarTipoDocumento(item: any): string {
  if (item.estadoGerencia === 'EN_REVISION') {
    return item.esMio ? 'en_revision_mio' : 'procesado';
  } else if (item.estadoGerencia === 'DISPONIBLE' || !item.estadoGerencia) {
    return 'disponible';
  } else {
    return 'procesado';
  }
}



  // Combinar todos los documentos en una sola lista
  combinarTodosDocumentos(disponibles: any[], enRevision: any[], historial: any[]): void {
    const todos: any[] = [];
    const idsProcesados = new Set<string>();

    // 1. Agregar documentos disponibles (COMPLETADO_TESORERIA)
    disponibles.forEach(doc => {
      if (!idsProcesados.has(doc.id)) {
        todos.push({
          ...doc,
          tipo: 'disponible',
          estadoGerencia: 'DISPONIBLE'
        });
        idsProcesados.add(doc.id);
      }
    });

    // 2. Agregar documentos en revisión por mí
    enRevision.forEach(doc => {
      if (!idsProcesados.has(doc.id)) {
        todos.push({
          ...doc,
          tipo: 'en_revision_mio',
          estadoGerencia: 'EN_REVISION',
          asignacion: { enRevision: true, asesorAsignado: this.usuarioActual }
        });
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
          estadoGerencia: item.estado || doc.estado,
          observaciones: item.observaciones,
          fechaInicioRevision: item.fechaInicioRevision,
          fechaFinRevision: item.fechaFinRevision,
          asesorRevisor: item.asesor,
          aprobacionPath: item.aprobacionPath,
          fechaFin: item.fechaFinRevision,
          asignacion: {
            enRevision: item.estado?.includes('EN_REVISION'),
            asesorAsignado: item.asesor
          }
        });
        idsProcesados.add(doc.id);
      }
    });

    console.log('[GERENCIA] Total documentos combinados:', todos.length);
    this.todosDocumentos = todos;

    // Aplicar filtros iniciales
    this.aplicarFiltros();
    this.updatePagination();

    if (this.filteredDocumentos.length > 0) {
      const disponiblesCount = this.filteredDocumentos.filter(d => d.tipo === 'disponible').length;
      const enRevisionCount = this.filteredDocumentos.filter(d => d.tipo === 'en_revision_mio').length;
      const procesadosCount = this.filteredDocumentos.filter(d => d.tipo === 'procesado').length;

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

    console.log(`[GERENCIA] Tomando documento ${documentoId}...`);

    this.asesorGerenciaService.tomarDocumento(documentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[GERENCIA] Documento tomado:', response);
          this.notificationService.success('Éxito', 'Documento tomado para revisión gerencial');

          // Actualizar el documento en la lista
          const index = this.todosDocumentos.findIndex(d => d.id === documentoId);
          if (index !== -1) {
            this.todosDocumentos[index] = {
              ...this.todosDocumentos[index],
              tipo: 'en_revision_mio',
              estadoGerencia: 'EN_REVISION',
              asignacion: {
                ...this.todosDocumentos[index].asignacion,
                enRevision: true,
                asesorAsignado: this.usuarioActual
              }
            };
            this.aplicarFiltros();
            this.updatePagination();
          }

          this.isProcessing = false;
        },
        error: (err: any) => {
          console.error('[GERENCIA] Error tomando documento:', err);
          this.notificationService.error('Error', err.message || 'No se pudo tomar el documento');
          this.isProcessing = false;
        }
      });
  }

  // Ir a procesar/revisar documento
  revisarDocumento(documento: any): void {
    const documentoId = documento.id;
    const soyElAsesor = documento.tipo === 'en_revision_mio' ||
      (documento.asignacion?.asesorAsignado &&
        this.compararNombres(documento.asignacion.asesorAsignado, this.usuarioActual));

    const queryParams: any = { desdeLista: 'true' };

    // Si está en revisión y soy yo el asignado, permitir edición
    if (documento.estadoGerencia?.includes('EN_REVISION') && soyElAsesor) {
      queryParams.soloLectura = 'false';
      queryParams.modo = 'edicion';
    } else {
      // En cualquier otro caso, solo lectura
      queryParams.soloLectura = 'true';
      queryParams.modo = 'consulta';
    }

    this.router.navigate(['/asesor-gerencia/procesar', documentoId], { queryParams });
  }

  // Ver detalle del documento
  verDetalle(documento: any): void {
    const documentoId = documento.id;
    this.router.navigate(['/asesor-gerencia/documento', documentoId], { queryParams: { modo: 'consulta' } });
  }

  // Métodos auxiliares
  esMiDocumento(item: any): boolean {
    const asesorAsignado = item.asignacion?.asesorAsignado || item.asesorRevisor || '';
    return this.compararNombres(asesorAsignado, this.usuarioActual);
  }

  compararNombres(nombre1: string, nombre2: string): boolean {
    if (!nombre1 || !nombre2) return false;
    const normalizar = (nombre: string) => nombre.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalizar(nombre1);
    const n2 = normalizar(nombre2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }

  esDocumentoReciente(item: any): boolean {
    const fecha = item.fechaRadicacion || item.fechaCreacion || item.fechaActualizacion;
    if (!fecha) return false;
    const dias = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 7;
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'badge bg-light text-dark';
    const e = estado.toUpperCase();
    if (e.includes('COMPLETADO_ASESOR_GERENCIA')) return 'badge bg-success';
    if (e.includes('OBSERVADO_ASESOR_GERENCIA')) return 'badge bg-warning text-dark';
    if (e.includes('RECHAZADO_ASESOR_GERENCIA')) return 'badge bg-danger';
    if (e.includes('EN_REVISION_ASESOR_GERENCIA')) return 'badge bg-secondary';
    if (e.includes('COMPLETADO_TESORERIA')) return 'badge bg-info';
    if (e.includes('DISPONIBLE')) return 'badge bg-light text-dark border';
    return 'badge bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';
    const e = estado.toUpperCase();
    if (e.includes('COMPLETADO_ASESOR_GERENCIA')) return 'Revisión Finalizada';
    if (e.includes('OBSERVADO_ASESOR_GERENCIA')) return 'Observado';
    if (e.includes('RECHAZADO_ASESOR_GERENCIA')) return 'Rechazado';
    if (e.includes('EN_REVISION_ASESOR_GERENCIA')) return 'En Revisión';
    if (e.includes('COMPLETADO_TESORERIA')) return 'Pendiente Gerencia';
    if (e.includes('DISPONIBLE')) return 'Disponible';
    return estado.replace(/_/g, ' ');
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
        const estado = documento.estadoGerencia || '';
        if (estado.includes('COMPLETADO')) return 'badge bg-info';
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
    let count = 0;
    if (item.cuentaCobro) count++;
    if (item.seguridadSocial) count++;
    if (item.informeActividades) count++;
    return count;
  }

  // Aplicar filtros
  aplicarFiltros(): void {
    let filtered = [...this.todosDocumentos];

    // Filtro por estado de gerencia
    if (this.filtroEstado !== 'todos') {
      switch (this.filtroEstado) {
        case 'pendientes':
          filtered = filtered.filter(doc =>
            doc.estado?.includes('COMPLETADO_TESORERIA')
          );
          break;
        case 'en_revision':
          filtered = filtered.filter(doc =>
            doc.estadoGerencia?.includes('EN_REVISION') ||
            doc.tipo === 'en_revision_mio'
          );
          break;
        case 'completado':
          filtered = filtered.filter(doc =>
            doc.estadoGerencia?.includes('COMPLETADO_ASESOR_GERENCIA')
          );
          break;
        case 'observados':
          filtered = filtered.filter(doc =>
            doc.estadoGerencia?.includes('OBSERVADO_ASESOR_GERENCIA')
          );
          break;
        case 'rechazados':
          filtered = filtered.filter(doc =>
            doc.estadoGerencia?.includes('RECHAZADO_ASESOR_GERENCIA')
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
          filtered = filtered.filter(doc => doc.tipo === 'disponible');
          break;
        case 'de_otros':
          filtered = filtered.filter(doc =>
            doc.tipo === 'en_revision_mio' && !this.esMiDocumento(doc)
          );
          break;
      }
    }

    // Filtro por fecha
    if (this.filtroFecha !== 'todos') {
      const ahora = new Date();
      filtered = filtered.filter(doc => {
        const fechaDoc = doc.fechaRadicacion || doc.fechaCreacion || doc.fechaActualizacion;
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
          (item.estadoGerencia?.toLowerCase().includes(term)) ||
          (item.observacion?.toLowerCase().includes(term)) ||
          (item.observaciones?.toLowerCase().includes(term)) ||
          (item.radicador?.toLowerCase().includes(term))
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
    return this.todosDocumentos.filter(d => d.tipo === 'disponible').length;
  }

  getEnRevisionCount(): number {
    return this.todosDocumentos.filter(d => d.tipo === 'en_revision_mio').length;
  }

  getProcesadosCount(): number {
    return this.todosDocumentos.filter(d => d.tipo === 'procesado').length;
  }

  getNumeroRadicado(documento: any): string {
    return documento.numeroRadicado || 'N/A';
  }

  getFechaRadicacion(documento: any): string | Date {
    return documento.fechaRadicacion || documento.fechaCreacion;
  }

  getRadicador(documento: any): string {
    return documento.radicador || 'Sin radicador';
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
    return documento.observacion;
  }

  getObservacionCorta(documento: any): string {
    const observacion = documento.observacion;
    return observacion && observacion.length > 25 ?
      observacion.substring(0, 25) + '...' :
      observacion || '';
  }

  getAsesorRevisor(documento: any): string {
    return documento.asesorRevisor || documento.asesorAsignado || '';
  }

  esConsultable(documento: any): boolean {
    return documento.tipo === 'procesado' ||
      (documento.tipo === 'en_revision_mio' && !this.esMiDocumento(documento));
  }
}