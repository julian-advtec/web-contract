import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SupervisorService } from '../../../../core/services/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Documento } from '../../../../core/models/documento.model';

@Component({
  selector: 'app-supervisor-pending-list',
  templateUrl: './supervisor-pending-list.component.html',
  styleUrls: ['./supervisor-pending-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class SupervisorPendingListComponent implements OnInit, OnDestroy {
  // Lista de documentos
  documentos: Documento[] = [];
  filteredDocumentos: Documento[] = [];
  paginatedDocumentos: Documento[] = [];
  
  // Estados de carga
  isLoading = false;
  cargandoDocumentos = true;
  cargandoEstadisticas = false;
  isProcessing = false;
  isDownloadingAll = false;
  
  // Estadísticas - INICIALIZADAS CON VALORES POR DEFECTO
  estadisticas: any = {
    totalPendientes: 0,
    recientes: 0,
    urgentes: 0,
    aprobados: 0,
    rechazados: 0,
    totales: {
      pendientes: 0,
      aprobados: 0,
      observados: 0,
      rechazados: 0,
      total: 0
    }
  };
  
  // Mensajes de error
  errorMessage = '';
  successMessage = '';
  errorDocumentos = '';
  errorEstadisticas = '';
  
  // Búsqueda
  searchTerm = '';
  
  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];
  
  // Sidebar
  sidebarCollapsed = false;
  
  // Para manejar la desuscripción
  private destroy$ = new Subject<void>();

  constructor(
    private supervisorService: SupervisorService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🚀 Inicializando lista de documentos pendientes...');
    this.cargarDocumentosPendientes();
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar documentos pendientes de revisión
   */
  cargarDocumentosPendientes(): void {
    this.isLoading = true;
    this.cargandoDocumentos = true;
    this.errorDocumentos = '';
    
    console.log('📤 Solicitando documentos pendientes...');
    
    this.supervisorService.obtenerDocumentosPendientes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documentosArray: Documento[]) => {
          console.log('✅ Documentos recibidos:', documentosArray);
          
          this.documentos = documentosArray;
          this.filteredDocumentos = [...documentosArray];
          this.updatePagination();
          console.log(`✅ ${this.documentos.length} documentos cargados correctamente`);
          
          this.isLoading = false;
          this.cargandoDocumentos = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar documentos pendientes:', error);
          this.errorDocumentos = 'Error al cargar documentos pendientes';
          this.errorMessage = this.errorDocumentos;
          this.isLoading = false;
          this.cargandoDocumentos = false;
          this.notificationService.error('Error', this.errorDocumentos);
        }
      });
  }

  /**
   * Cargar estadísticas del supervisor
   */
  cargarEstadisticas(): void {
    this.cargandoEstadisticas = true;
    this.errorEstadisticas = '';
    
    console.log('📊 Solicitando estadísticas...');
    
    this.supervisorService.obtenerEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (estadisticas) => {
          console.log('✅ Estadísticas recibidas:', estadisticas);
          this.estadisticas = estadisticas;
          this.cargandoEstadisticas = false;
        },
        error: (error) => {
          console.error('❌ Error cargando estadísticas:', error);
          this.errorEstadisticas = 'Error al cargar estadísticas';
          this.cargandoEstadisticas = false;
          this.notificationService.error('Error', this.errorEstadisticas);
        }
      });
  }

  /**
   * Formatear fecha para mostrar
   */
  formatDate(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatear fecha corta
   */
  formatDateShort(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES');
  }

  /**
   * Calcular días transcurridos
   */
  getDiasTranscurridos(fecha: Date | string): number {
    if (!fecha) return 0;
    const fechaDoc = new Date(fecha);
    const hoy = new Date();
    const diferenciaMs = hoy.getTime() - fechaDoc.getTime();
    return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Determinar si un documento es urgente
   */
  esDocumentoUrgente(documento: Documento): boolean {
    if (!documento?.fechaRadicacion) return false;
    const diasTranscurridos = this.getDiasTranscurridos(documento.fechaRadicacion);
    return diasTranscurridos > 3;
  }

  /**
   * Obtener clase CSS para el estado
   */
  getEstadoClass(estado: string): string {
    if (!estado) return 'badge-secondary';
    
    const estadoLower = estado.toLowerCase();
    
    if (estadoLower.includes('pendiente')) return 'badge-warning';
    if (estadoLower.includes('aprobado')) return 'badge-success';
    if (estadoLower.includes('observado')) return 'badge-info';
    if (estadoLower.includes('rechazado')) return 'badge-danger';
    if (estadoLower.includes('radicado')) return 'badge-primary';
    if (estadoLower.includes('en_revision') || estadoLower.includes('en revision')) return 'badge-primary';
    
    return 'badge-secondary';
  }

  /**
   * Obtener texto del estado
   */
  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';
    
    const estadoLower = estado.toLowerCase();
    
    if (estadoLower.includes('pendiente')) return 'Pendiente';
    if (estadoLower.includes('aprobado')) return 'Aprobado';
    if (estadoLower.includes('observado')) return 'Observado';
    if (estadoLower.includes('rechazado')) return 'Rechazado';
    if (estadoLower.includes('radicado')) return 'Radicado';
    if (estadoLower.includes('en_revision') || estadoLower.includes('en revision')) return 'En Revisión';
    if (estadoLower.includes('devuelto')) return 'Devuelto';
    
    return estado;
  }

  /**
   * Obtener tooltip para observaciones
   */
  getObservacionTooltip(doc: Documento): string {
    return doc.observacion ? `Observación: ${doc.observacion}` : '';
  }

  /**
   * Obtener número de documentos
   */
  getDocumentCount(doc: Documento): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  /**
   * Abrir todos los documentos
   */
  abrirTodosDocumentos(doc: Documento): void {
    console.log(`📂 Abriendo todos los documentos para ${doc.id}`);
    // Implementar lógica para abrir documentos
  }

  /**
   * Descargar todos los documentos
   */
  descargarTodosDocumentos(doc: Documento): void {
    console.log(`📥 Descargando todos los documentos para ${doc.id}`);
    this.isDownloadingAll = true;
    // Implementar lógica para descargar todos los documentos
    setTimeout(() => {
      this.isDownloadingAll = false;
    }, 2000);
  }

  /**
   * Recargar datos
   */
  recargarDatos(): void {
    console.log('🔄 Recargando datos...');
    this.cargarDocumentosPendientes();
    this.cargarEstadisticas();
  }

  /**
   * Manejar búsqueda
   */
  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado?.toLowerCase().includes(term)) ||
        (doc.nombreContratista?.toLowerCase().includes(term)) ||
        (doc.numeroContrato?.toLowerCase().includes(term)) ||
        (doc.documentoContratista?.toLowerCase().includes(term))
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * Limpiar búsqueda
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredDocumentos = [...this.documentos];
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * Descargar archivo del radicador
   */
  descargarArchivo(documentoId: string, numeroArchivo: number, nombreArchivo?: string): void {
    console.log(`📥 Descargando archivo ${numeroArchivo} del documento ${documentoId}...`);
    
    this.supervisorService.descargarArchivo(documentoId, numeroArchivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Archivo descargado exitosamente');
          this.notificationService.success('Descarga Exitosa', 'El archivo se ha descargado correctamente');
        },
        error: (error) => {
          console.error('❌ Error descargando archivo:', error);
          this.notificationService.error('Error', 'No se pudo descargar el archivo');
        }
      });
  }

  /**
   * Ver archivo en el navegador
   */
  verArchivo(documentoId: string, numeroArchivo: number): void {
    console.log(`👁️ Abriendo archivo ${numeroArchivo} del documento ${documentoId} en el navegador...`);
    this.supervisorService.previsualizarArchivo(documentoId, numeroArchivo);
  }

  /**
   * Ver detalle del documento
   */
  verDetalle(documentoId: string): void {
    console.log(`🔍 Navegando al detalle del documento ${documentoId}`);
    this.router.navigate(['/supervisor/documento', documentoId]);
  }

  /**
   * Revisar documento
   */
  revisarDocumento(documentoId: string): void {
    console.log(`🔍 Navegando a revisión del documento ${documentoId}`);
    this.router.navigate(['/supervisor/revisar', documentoId]);
  }

  /**
   * Devolver documento al radicador
   */
  devolverDocumento(documentoId: string): void {
    console.log(`↩️ Navegando a devolución del documento ${documentoId}`);
    this.router.navigate(['/supervisor/devolver', documentoId]);
  }

  /**
   * Aprobar documento
   */
  aprobarDocumento(doc: Documento): void {
    console.log(`✅ Aprobando documento ${doc.id}...`);
    this.isProcessing = true;
    
    const observaciones = prompt('Ingrese observaciones (opcional):');
    
    this.supervisorService.aprobarDocumento(doc.id, observaciones || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Documento aprobado exitosamente');
          this.successMessage = 'Documento aprobado correctamente';
          this.notificationService.success('Éxito', 'Documento aprobado correctamente');
          this.recargarDatos();
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('❌ Error aprobando documento:', error);
          this.errorMessage = 'No se pudo aprobar el documento';
          this.notificationService.error('Error', 'No se pudo aprobar el documento');
          this.isProcessing = false;
        }
      });
  }

  /**
   * Rechazar documento
   */
  rechazarDocumento(doc: Documento): void {
    console.log(`❌ Rechazando documento ${doc.id}...`);
    this.isProcessing = true;
    
    const motivo = prompt('Ingrese el motivo del rechazo:');
    if (!motivo) {
      this.notificationService.warning('Advertencia', 'Debe ingresar un motivo para rechazar el documento');
      this.isProcessing = false;
      return;
    }
    
    const observaciones = prompt('Ingrese observaciones adicionales (opcional):');
    
    this.supervisorService.rechazarDocumento(doc.id, motivo, observaciones || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Documento rechazado exitosamente');
          this.successMessage = 'Documento rechazado correctamente';
          this.notificationService.success('Éxito', 'Documento rechazado correctamente');
          this.recargarDatos();
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('❌ Error rechazando documento:', error);
          this.errorMessage = 'No se pudo rechazar el documento';
          this.notificationService.error('Error', 'No se pudo rechazar el documento');
          this.isProcessing = false;
        }
      });
  }

  /**
   * Observar documento
   */
  observarDocumento(doc: Documento): void {
    console.log(`🔍 Observando documento ${doc.id}...`);
    this.isProcessing = true;
    
    const observaciones = prompt('Ingrese las observaciones:');
    if (!observaciones) {
      this.notificationService.warning('Advertencia', 'Debe ingresar observaciones para observar el documento');
      this.isProcessing = false;
      return;
    }
    
    const correcciones = prompt('Ingrese las correcciones solicitadas (opcional):');
    
    this.supervisorService.observarDocumento(doc.id, observaciones, correcciones || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Documento observado exitosamente');
          this.successMessage = 'Documento observado correctamente';
          this.notificationService.success('Éxito', 'Documento observado correctamente');
          this.recargarDatos();
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('❌ Error observando documento:', error);
          this.errorMessage = 'No se pudo observar el documento';
          this.notificationService.error('Error', 'No se pudo observar el documento');
          this.isProcessing = false;
        }
      });
  }

  /**
   * Obtener nombre del documento por índice
   */
  obtenerNombreDocumento(documento: Documento, indice: number): string {
    switch (indice) {
      case 1: return documento.descripcionCuentaCobro || 'Cuenta de Cobro';
      case 2: return documento.descripcionSeguridadSocial || 'Seguridad Social';
      case 3: return documento.descripcionInformeActividades || 'Informe de Actividades';
      default: return `Documento ${indice}`;
    }
  }

  /**
   * Obtener descripción del documento por índice
   */
  obtenerDescripcionDocumento(indice: number): string {
    switch (indice) {
      case 1: return 'Cuenta de Cobro';
      case 2: return 'Seguridad Social';
      case 3: return 'Informe de Actividades';
      default: return 'Documento';
    }
  }

  /**
   * Exportar reporte
   */
  exportarReporte(): void {
    console.log('📈 Exportando reporte...');
    this.isProcessing = true;
    
    this.supervisorService.exportarReporte('pdf')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Reporte exportado exitosamente');
          this.successMessage = 'Reporte exportado correctamente';
          this.notificationService.success('Éxito', 'Reporte exportado correctamente');
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('❌ Error exportando reporte:', error);
          this.errorMessage = 'No se pudo exportar el reporte';
          this.notificationService.error('Error', 'No se pudo exportar el reporte');
          this.isProcessing = false;
        }
      });
  }

  /**
   * Actualizar paginación
   */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    
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
    
    // Actualizar documentos paginados
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredDocumentos.length);
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, endIndex);
  }

  /**
   * Cambiar página
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  /**
   * Obtener fin de paginación
   */
  getPaginatedEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredDocumentos.length);
  }

  /**
   * Descartar mensaje de error
   */
  dismissError(): void {
    this.errorMessage = '';
  }

  /**
   * Descartar mensaje de éxito
   */
  dismissSuccess(): void {
    this.successMessage = '';
  }

  /**
   * Método alias para compatibilidad con template
   */
  refreshData(): void {
    this.recargarDatos();
  }

  /**
   * Método alias para compatibilidad
   */
  getEstadoText(estado: string): string {
    return this.getEstadoTexto(estado);
  }
}