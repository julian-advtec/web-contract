import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DocumentoContable } from '../../../../core/models/documento-contable.model';

@Component({
  selector: 'app-contabilidad-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contabilidad-list.component.html',
  styleUrls: ['./contabilidad-list.component.scss']
})
export class ContabilidadListComponent implements OnInit, OnDestroy {
  documentos: any[] = [];
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

  filtroEstado = 'todos';
  filtroAsignacion = 'todos';
  filtroFecha = 'todos';

  private destroy$ = new Subject<void>();

  constructor(
    private contabilidadService: ContabilidadService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

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
        this.usuarioActual = user.fullName || user.username || 'Contador';
      } catch {
        this.usuarioActual = 'Contador';
      }
    }
  }

  cargarDocumentos(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.infoMessage = '';

    // Cargar disponibles, en revisión e historial en paralelo
    Promise.all([
      this.contabilidadService.obtenerDocumentosDisponibles().pipe(takeUntil(this.destroy$)).toPromise(),
      this.contabilidadService.obtenerDocumentosEnRevision().pipe(takeUntil(this.destroy$)).toPromise(),
      this.contabilidadService.getHistorial().pipe(takeUntil(this.destroy$)).toPromise()
    ]).then(([disponibles, enRevision, historial]) => {
      console.log('📊 Disponibles:', disponibles);
      console.log('📊 En revisión:', enRevision);
      console.log('📊 Historial:', historial);
      
      this.combinarDocumentos(disponibles || [], enRevision || [], historial || []);
      this.loading = false;
    }).catch((err) => {
      console.error('Error cargando documentos:', err);
      this.error = 'Error al cargar los documentos';
      this.notificationService.error('Error', this.error);
      this.loading = false;
    });
  }

  combinarDocumentos(disponibles: any[], enRevision: any[], historial: any[]): void {
    const todos: any[] = [];
    const idsProcesados = new Set<string>();

    // Procesar disponibles (documentos que vienen de obtenerDocumentosDisponibles)
    disponibles.forEach((doc: any) => {
      if (!doc?.id || idsProcesados.has(doc.id)) return;
      todos.push({
        ...doc,
        tipo: 'disponible',
        estadoContabilidad: 'DISPONIBLE', // Para contabilidad están disponibles
        estadoDocumento: doc.estado || 'APROBADO_AUDITOR',
        contadorAsignado: null,
        puedeTomar: true,
        esMio: false,
        fechaReferencia: doc.fechaRadicacion || doc.fechaCreacion
      });
      idsProcesados.add(doc.id);
    });

    // Procesar en revisión (documentos que el usuario tiene en su contabilidad_documentos con estado EN_REVISION)
    enRevision.forEach((doc: any) => {
      if (!doc?.id || idsProcesados.has(doc.id)) return;
      
      // Determinar el estado real según el documento principal
      let estadoContabilidad = 'EN_REVISION';
      if (doc.estado?.includes('EN_REVISION_CONTABILIDAD')) {
        estadoContabilidad = 'EN_REVISION';
      } else if (doc.estado?.includes('COMPLETADO_CONTABILIDAD')) {
        estadoContabilidad = 'COMPLETADO';
      } else if (doc.estado?.includes('RECHAZADO_CONTABILIDAD')) {
        estadoContabilidad = 'RECHAZADO';
      } else if (doc.estado?.includes('OBSERVADO_CONTABILIDAD')) {
        estadoContabilidad = 'OBSERVADO';
      } else if (doc.estado?.includes('GLOSADO_CONTABILIDAD')) {
        estadoContabilidad = 'GLOSADO';
      } else if (doc.estado?.includes('PROCESADO_CONTABILIDAD')) {
        estadoContabilidad = 'PROCESADO';
      }

      todos.push({
        ...doc,
        tipo: 'en_revision',
        estadoContabilidad: estadoContabilidad,
        estadoDocumento: doc.estado || 'EN_REVISION',
        contadorAsignado: this.usuarioActual,
        puedeTomar: false,
        esMio: true,
        tieneGlosa: doc.tieneGlosa,
        tipoCausacion: doc.tipoCausacion,
        observaciones: doc.observaciones || doc.observacion || '',
        fechaInicioRevision: doc.fechaInicioRevision || doc.fechaAsignacion,
        fechaFinRevision: doc.fechaFinRevision,
        fechaReferencia: doc.fechaAsignacion || doc.fechaInicioRevision || doc.fechaRadicacion
      });
      idsProcesados.add(doc.id);
    });

    // Procesar historial (documentos ya procesados)
  historial.forEach((item: any) => {
    const doc = item.documento || item;
    if (!doc?.id || idsProcesados.has(doc.id)) return;
    
    // Determinar estado simplificado (solo 3 opciones)
    let estadoSimplificado = 'PROCESADO';
    const estadoOriginal = item.estado || doc.estado || '';
    const observaciones = item.observaciones || doc.observacion || '';
    
    if (estadoOriginal.includes('COMPLETADO') || 
        estadoOriginal.includes('APROBADO') ||
        estadoOriginal === 'COMPLETADO' ||
        estadoOriginal === 'APROBADO') {
        estadoSimplificado = 'COMPLETADO';
    } 
    else if (estadoOriginal.includes('RECHAZADO') || 
             estadoOriginal === 'RECHAZADO' ||
             observaciones.toUpperCase().includes('RECHAZ')) {
        estadoSimplificado = 'RECHAZADO';
    } 
    else if (estadoOriginal.includes('OBSERVADO') || 
             estadoOriginal === 'OBSERVADO' ||
             observaciones.toUpperCase().includes('OBSERV')) {
        estadoSimplificado = 'OBSERVADO';
    }

    todos.push({
        ...doc,
        tipo: 'procesado',
        estadoContabilidad: estadoSimplificado,
        estadoDocumento: doc.estado || item.estadoDocumento,
        tieneGlosa: item.tieneGlosa ?? doc.tieneGlosa,
        tipoCausacion: item.tipoCausacion ?? doc.tipoCausacion,
        observaciones: item.observaciones || doc.observacion || '',
        fechaInicioRevision: item.fechaInicioRevision || doc.fechaInicioRevision,
        fechaFinRevision: item.fechaFinRevision || doc.fechaFinRevision,
        contadorRevisor: item.contadorRevisor || item.contadorAsignado || doc.contadorRevisor,
        contadorAsignado: item.contadorRevisor || item.contadorAsignado || doc.contadorAsignado,
        puedeTomar: false,
        esMio: this.esMiDocumento({
            contadorRevisor: item.contadorRevisor,
            contadorAsignado: item.contadorAsignado
        }),
        fechaReferencia: item.fechaFinRevision || item.fechaActualizacion || doc.fechaRadicacion
    });
    idsProcesados.add(doc.id);
});

    // Ordenar: primero en revisión (míos), luego disponibles, luego procesados
    this.documentos = [
      ...todos.filter(d => d.tipo === 'en_revision'),
      ...todos.filter(d => d.tipo === 'disponible'),
      ...todos.filter(d => d.tipo === 'procesado')
    ];

    console.log(`[CONTABILIDAD-LIST] Documentos cargados: ${this.documentos.length}`);
    console.table(this.documentos.map(d => ({
      radicado: d.numeroRadicado,
      tipo: d.tipo,
      estadoCont: d.estadoContabilidad,
      estadoDoc: d.estadoDocumento,
      tieneGlosa: d.tieneGlosa
    })));
    
    this.aplicarFiltros();
  }

  // ==================== MÉTODOS GETTERS ====================

  getDisponiblesCount(): number {
    return this.documentos.filter(d => d.tipo === 'disponible').length;
  }

  getEnRevisionCount(): number {
    return this.documentos.filter(d => d.tipo === 'en_revision').length;
  }

  getProcesadosCount(): number {
    return this.documentos.filter(d => d.tipo === 'procesado').length;
  }

  getNumeroRadicado(documento: any): string {
    return documento.numeroRadicado || 'N/A';
  }

  getFechaRadicacion(documento: any): string | Date {
    return documento.fechaRadicacion || documento.fechaCreacion;
  }

  getRadicador(documento: any): string {
    return documento.radicador || 'Sistema';
  }

  getNombreContratista(documento: any): string {
    return documento.nombreContratista || 'Sin nombre';
  }

  getDocumentoContratista(documento: any): string {
    return documento.documentoContratista || 'N/A';
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
    return documento.estado || '';
  }

  getObservacion(documento: any): string {
    return documento.observacion || '';
  }

  getObservacionCorta(documento: any): string {
    const obs = documento.observacion || '';
    return obs.length > 25 ? obs.substring(0, 25) + '...' : obs;
  }

  getContadorRevisor(documento: any): string {
    return documento.contadorRevisor || documento.contadorAsignado || '';
  }

  // ==================== MÉTODOS DE NEGOCIO ====================

  esMiDocumento(item: any): boolean {
    const contadorAsignado = item.contadorAsignado || item.contadorRevisor || '';
    return this.compararNombres(contadorAsignado, this.usuarioActual);
  }

  compararNombres(nombre1: string, nombre2: string): boolean {
    if (!nombre1 || !nombre2) return false;
    const normalizar = (nombre: string) => nombre.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalizar(nombre1);
    const n2 = normalizar(nombre2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }

  tomarDocumento(documento: any): void {
    if (this.isProcessing) return;
    
    if (documento.tipo !== 'disponible') {
      this.notificationService.warning('Advertencia', 'Este documento no está disponible para tomar');
      return;
    }

    this.notificationService.showModal({
      title: 'Tomar documento',
      message: `¿Deseas tomar el documento ${documento.numeroRadicado || 'N/A'} para revisión contable?`,
      type: 'confirm',
      confirmText: 'Sí, tomar',
      cancelText: 'Cancelar',
      onConfirm: () => this.procederTomarDocumento(documento)
    });
  }

  procederTomarDocumento(documento: any): void {
    this.isProcessing = true;

    this.contabilidadService.tomarDocumentoParaRevision(documento.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.notificationService.success('Éxito', 'Documento tomado para revisión');
          
          // Actualizar el documento en la lista
          const index = this.documentos.findIndex(d => d.id === documento.id);
          if (index !== -1) {
            this.documentos[index] = {
              ...this.documentos[index],
              tipo: 'en_revision',
              estadoContabilidad: 'EN_REVISION',
              estadoDocumento: 'EN_REVISION_CONTABILIDAD',
              contadorAsignado: this.usuarioActual,
              esMio: true,
              puedeTomar: false
            };
          }

          this.aplicarFiltros();
          this.isProcessing = false;

          // Redirigir a la revisión
          setTimeout(() => {
            this.router.navigate(['/contabilidad/procesar', documento.id], {
              queryParams: { modo: 'edicion', soloLectura: 'false' }
            });
          }, 1500);
        },
        error: (err: any) => {
          this.notificationService.error('Error', err.message || 'No se pudo tomar el documento');
          this.isProcessing = false;
        }
      });
  }

  verDocumento(documento: any): void {
    const documentoId = documento.id;
    const esMio = documento.tipo === 'en_revision' || documento.esMio;
    const esEditable = documento.tipo === 'en_revision' && esMio;

    this.router.navigate(['/contabilidad/procesar', documentoId], {
      queryParams: {
        modo: esEditable ? 'edicion' : 'consulta',
        soloLectura: esEditable ? 'false' : 'true',
        origen: 'lista'
      }
    });
  }

  getTextoBoton(documento: any): string {
    if (documento.tipo === 'disponible') return 'Tomar';
    if (documento.tipo === 'en_revision') return 'Revisar';
    return 'Consultar';
  }

  getClaseBoton(documento: any): string {
    if (documento.tipo === 'disponible') return 'btn-success';
    if (documento.tipo === 'en_revision') return 'btn-primary';
    return 'btn-info';
  }

  esDocumentoReciente(item: any): boolean {
    const fecha = item.fechaRadicacion || item.fechaCreacion || item.fechaActualizacion;
    if (!fecha) return false;
    const dias = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 7;
  }

// ==================== MÉTODOS DE ESTADO SIMPLIFICADOS ====================

/**
 * Retorna la clase CSS para el badge según el estado
 * Solo 3 estados principales: Aprobado, Rechazado, Observado
 */
getEstadoBadgeClass(estado: string | undefined): string {
    if (!estado) return 'badge bg-secondary';
    
    const e = estado.toUpperCase();
    
    // Aprobado/Completado - Verde
    if (e === 'COMPLETADO' || e.includes('COMPLETADO') || 
        e === 'APROBADO' || e.includes('APROBADO') ||
        e === 'PROCESADO' || e.includes('PROCESADO')) {
        return 'badge bg-success';
    }
    
    // Rechazado - Rojo
    if (e === 'RECHAZADO' || e.includes('RECHAZADO')) {
        return 'badge bg-danger';
    }
    
    // Observado - Amarillo
    if (e === 'OBSERVADO' || e.includes('OBSERVADO')) {
        return 'badge bg-warning text-dark';
    }
    
    // En Revisión - Azul
    if (e === 'EN_REVISION' || e.includes('EN_REVISION')) {
        return 'badge bg-primary';
    }
    
    // Disponible - Celeste
    if (e === 'DISPONIBLE') {
        return 'badge bg-info';
    }
    
    return 'badge bg-secondary';
}

/**
 * Retorna el texto legible del estado
 * Solo 3 estados principales: Aprobado, Rechazado, Observado
 */
getEstadoTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    
    const e = estado.toUpperCase();
    
    // Aprobado/Completado
    if (e === 'COMPLETADO' || e.includes('COMPLETADO') || 
        e === 'APROBADO' || e.includes('APROBADO') ||
        e === 'PROCESADO' || e.includes('PROCESADO')) {
        return 'Aprobado';
    }
    
    // Rechazado
    if (e === 'RECHAZADO' || e.includes('RECHAZADO')) {
        return 'Rechazado';
    }
    
    // Observado
    if (e === 'OBSERVADO' || e.includes('OBSERVADO')) {
        return 'Observado';
    }
    
    // En Revisión
    if (e === 'EN_REVISION' || e.includes('EN_REVISION')) {
        return 'En Revisión';
    }
    
    // Disponible
    if (e === 'DISPONIBLE') {
        return 'Disponible';
    }
    
    return estado;
}

  getTipoDocumentoTexto(documento: any): string {
    switch (documento.tipo) {
      case 'disponible': return 'Disponible';
      case 'en_revision': return 'En Revisión (Mío)';
      case 'procesado': return 'Procesado';
      default: return 'Desconocido';
    }
  }

  getTieneGlosaTexto(item: any): string {
    if (item.tieneGlosa === true) return 'Con Glosa';
    if (item.tieneGlosa === false) return 'Sin Glosa';
    return 'No definido';
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

aplicarFiltros(): void {
    let filtered = [...this.documentos];

    // Filtro por estado - VERSIÓN SIMPLIFICADA
    if (this.filtroEstado !== 'todos') {
        switch (this.filtroEstado) {
            case 'disponibles':
                filtered = filtered.filter(doc => doc.tipo === 'disponible');
                break;
            case 'en_revision':
                filtered = filtered.filter(doc => doc.tipo === 'en_revision');
                break;
            case 'aprobados':
                filtered = filtered.filter(doc => 
                    doc.estadoContabilidad === 'COMPLETADO' || 
                    doc.estadoContabilidad === 'APROBADO' ||
                    doc.estadoContabilidad?.includes('COMPLETADO') ||
                    doc.estadoContabilidad?.includes('APROBADO')
                );
                break;
            case 'observados':
                filtered = filtered.filter(doc => 
                    doc.estadoContabilidad === 'OBSERVADO' || 
                    doc.estadoContabilidad?.includes('OBSERVADO')
                );
                break;
            case 'rechazados':
                filtered = filtered.filter(doc => 
                    doc.estadoContabilidad === 'RECHAZADO' || 
                    doc.estadoContabilidad?.includes('RECHAZADO')
                );
                break;
        }
    }

    // Filtro por asignación
    if (this.filtroAsignacion !== 'todos') {
        switch (this.filtroAsignacion) {
            case 'mios':
                filtered = filtered.filter(doc => doc.esMio);
                break;
            case 'disponibles':
                filtered = filtered.filter(doc => doc.tipo === 'disponible');
                break;
        }
    }

    // Filtro por fecha
    if (this.filtroFecha !== 'todos') {
        const ahora = new Date();
        filtered = filtered.filter(doc => {
            const fechaDoc = doc.fechaReferencia || doc.fechaRadicacion || doc.fechaCreacion;
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
                (item.estadoContabilidad?.toLowerCase().includes(term)) ||
                (item.observacion?.toLowerCase().includes(term))
            );
        });
    }

    this.filteredDocumentos = filtered;
    this.currentPage = 1;
    this.updatePagination();

    if (this.filteredDocumentos.length === 0) {
        this.infoMessage = 'No hay documentos con los filtros aplicados';
    } else {
        this.successMessage = `Mostrando ${this.filteredDocumentos.length} documentos`;
        setTimeout(() => this.successMessage = '', 3000);
    }
}

  onSearch(): void {
    this.aplicarFiltros();
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    this.pages = [];
    
    if (this.totalPages <= 1) {
      if (this.totalPages === 1) this.pages.push(1);
    } else {
      const maxPagesToShow = 5;
      let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
      
      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        this.pages.push(i);
      }
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
    this.cargarDocumentos();
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroAsignacion = 'todos';
    this.filtroFecha = 'todos';
    this.searchTerm = '';
    this.aplicarFiltros();
  }

  trackById(index: number, item: any): string {
    return item.id || index.toString();
  }
}