// src/app/pages/auditor/components/lista-rechazados/lista-rechazados.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Interfaces locales para manejar la estructura de datos
interface DocumentoAuditor {
  id?: string;
  numeroRadicado?: string;
  fechaRadicacion?: Date | string;
  nombreContratista?: string;
  documentoContratista?: string;
  numeroContrato?: string;
  fechaInicio?: Date | string;
  fechaFin?: Date | string;
  cuentaCobro?: string;
  seguridadSocial?: string;
  informeActividades?: string;
  primerRadicadoDelAno?: boolean;
  [key: string]: any;
}

interface ItemRechazado {
  id?: string;
  documento?: DocumentoAuditor;
  estado?: string;
  observaciones?: string;
  motivoRechazo?: string;
  fechaRechazo?: Date | string;
  fechaActualizacion?: Date | string;
  auditorRevisor?: string;
  usuarioAsignadoNombre?: string;
  rechazadoPor?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-lista-rechazados',
  templateUrl: './lista-rechazados.component.html',
  styleUrls: ['./lista-rechazados.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class ListaRechazadosComponent implements OnInit, OnDestroy {
  documentos: ItemRechazado[] = [];
  filteredDocumentos: ItemRechazado[] = [];
  paginatedDocumentos: ItemRechazado[] = [];

  isLoading = false;
  isProcessing = false;

  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  searchTerm = '';
  filtroActual: 'todos' | 'mios' = 'todos';

  filtroFechaDesde: string = '';
  filtroFechaHasta: string = '';

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private auditorService: AuditorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Auditor Rechazados: Inicializando componente...');
    this.cargarUsuarioActual();
    this.cargarDocumentosRechazados();
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
        this.usuarioActual = user.fullName || user.username || 'Auditor';
        console.log('👤 Usuario actual:', this.usuarioActual);
      } catch {
        this.usuarioActual = 'Auditor';
      }
    }
  }

  // ✅ VERSIÓN CORREGIDA - Con validación de array
  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📋 Cargando documentos rechazados desde historial...');

    this.auditorService.obtenerHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (historial: any[]) => {
          console.log('[HISTORIAL] Datos recibidos:', historial);
          
          // Verificar que historial sea un array
          if (!Array.isArray(historial)) {
            console.warn('[HISTORIAL] No es un array, usando array vacío');
            this.documentos = [];
            this.procesarDocumentos();
            return;
          }

          console.log(`[HISTORIAL] ${historial.length} registros recibidos`);
          
          // Mostrar el primer registro para depuración
          if (historial.length > 0) {
            console.log('[HISTORIAL] Primer registro:', historial[0]);
          }

          // Filtrar solo documentos rechazados/observados del historial
          const itemsFiltrados = historial.filter(item => {
            // Asegurarse de que item existe
            if (!item) return false;
            
            const estado = (item.estado || '').toUpperCase();
            
            // Verificar en el item principal o en el documento anidado
            const documentoEstado = (item.documento?.estado || '').toUpperCase();
            
            // Incluir estados de rechazo y observación
            return estado.includes('RECHAZADO') || 
                   estado === 'OBSERVADO' ||
                   estado.includes('OBSERVADO') ||
                   documentoEstado.includes('RECHAZADO') ||
                   documentoEstado === 'OBSERVADO' ||
                   documentoEstado.includes('OBSERVADO');
          });

          console.log(`[FILTRADO] ${itemsFiltrados.length} documentos rechazados/observados encontrados`);

          // Mapear los items a nuestro formato
          this.documentos = itemsFiltrados.map(item => {
            // Crear objeto base con las propiedades del item
            const docBase: ItemRechazado = {
              id: item.id,
              estado: item.estado || item.documento?.estado || 'RECHAZADO',
              observaciones: item.observaciones || item.documento?.observaciones || '',
              motivoRechazo: item.motivoRechazo || item.observaciones || '',
              fechaRechazo: item.fechaAprobacion || item.fechaActualizacion || item.updatedAt || item.fechaCreacion,
              fechaActualizacion: item.fechaActualizacion || item.updatedAt || item.fechaCreacion,
              auditorRevisor: item.auditor || item.auditorRevisor || item.usuarioAsignadoNombre || item.rechazadoPor,
              usuarioAsignadoNombre: item.usuarioAsignadoNombre,
              rechazadoPor: item.rechazadoPor
            };

            // Si el documento viene anidado, lo asignamos
            if (item.documento) {
              docBase.documento = {
                id: item.documento.id,
                numeroRadicado: item.documento.numeroRadicado,
                fechaRadicacion: item.documento.fechaRadicacion,
                nombreContratista: item.documento.nombreContratista,
                documentoContratista: item.documento.documentoContratista,
                numeroContrato: item.documento.numeroContrato,
                fechaInicio: item.documento.fechaInicio,
                fechaFin: item.documento.fechaFin,
                cuentaCobro: item.documento.cuentaCobro,
                seguridadSocial: item.documento.seguridadSocial,
                informeActividades: item.documento.informeActividades,
                primerRadicadoDelAno: item.documento.primerRadicadoDelAno
              };
            } 
            // Si hay campos directos del documento en el item
            else if (item.numeroRadicado) {
              docBase.documento = {
                id: item.id || item.documentoId,
                numeroRadicado: item.numeroRadicado || 'N/A',
                fechaRadicacion: item.fechaRadicacion || new Date(),
                nombreContratista: item.nombreContratista || 'N/A',
                documentoContratista: item.documentoContratista || 'N/A',
                numeroContrato: item.numeroContrato || 'N/A',
                fechaInicio: item.fechaInicio,
                fechaFin: item.fechaFin,
                cuentaCobro: item.cuentaCobro,
                seguridadSocial: item.seguridadSocial,
                informeActividades: item.informeActividades,
                primerRadicadoDelAno: item.primerRadicadoDelAno
              };
            }

            return docBase;
          });

          this.procesarDocumentos();
        },
        error: (err: any) => {
          console.error('[AUDITOR] Error cargando historial:', err);
          this.errorMessage = 'Error al cargar documentos rechazados';
          this.notificationService.error('Error', this.errorMessage);
          this.isLoading = false;
          this.documentos = [];
          this.procesarDocumentos();
        }
      });
  }

  procesarDocumentos(): void {
    console.log(`📊 Encontrados ${this.documentos.length} documentos rechazados/observados`);

    if (this.documentos.length > 0) {
      const misRechazos = this.documentos.filter(d => this.esMiRechazo(d)).length;
      this.successMessage = `Se encontraron ${this.documentos.length} documentos (${misRechazos} tuyos)`;
      setTimeout(() => this.successMessage = '', 4000);
    } else {
      this.infoMessage = 'No hay documentos rechazados';
    }

    this.filteredDocumentos = [...this.documentos];
    this.updatePagination();
    this.isLoading = false;
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos específicos para rechazados
  // ───────────────────────────────────────────────────────────────

  esMiRechazo(doc: ItemRechazado): boolean {
    return doc.auditorRevisor === this.usuarioActual ||
           doc.usuarioAsignadoNombre === this.usuarioActual ||
           doc.rechazadoPor === this.usuarioActual;
  }

  getAuditorRechazo(doc: ItemRechazado): string {
    return doc.auditorRevisor ||
           doc.usuarioAsignadoNombre ||
           doc.rechazadoPor ||
           'Auditor';
  }

  getMotivoRechazo(doc: ItemRechazado): string {
    return doc.motivoRechazo ||
           doc.observaciones ||
           (doc.documento ? doc.documento['comentarios'] : '') ||
           'Sin motivo especificado';
  }

  getObservaciones(doc: ItemRechazado): string {
    return doc.observaciones || (doc.documento ? doc.documento['comentarios'] : '') || '';
  }

  getDiasDesdeRechazo(doc: ItemRechazado): number {
    const fechaRechazo = doc.fechaRechazo || doc.fechaActualizacion;
    if (!fechaRechazo) return 0;

    try {
      const fechaDoc = new Date(fechaRechazo);
      const hoy = new Date();
      const diferenciaMs = hoy.getTime() - fechaDoc.getTime();
      return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  esDocumentoReciente(doc: ItemRechazado): boolean {
    const dias = this.getDiasDesdeRechazo(doc);
    return dias < 2; // Menos de 2 días
  }

  getTotalRechazadosMios(): number {
    return this.documentos.filter(d => this.esMiRechazo(d)).length;
  }

  // ───────────────────────────────────────────────────────────────
  // Filtros
  // ───────────────────────────────────────────────────────────────

  cambiarFiltro(filtro: 'todos' | 'mios'): void {
    if (this.filtroActual === filtro) return;

    this.filtroActual = filtro;
    this.currentPage = 1;

    if (filtro === 'todos') {
      this.filteredDocumentos = [...this.documentos];
    } else {
      this.filteredDocumentos = this.documentos.filter(d => this.esMiRechazo(d));
    }

    this.updatePagination();
  }

  aplicarFiltroFechas(): void {
    if (!this.filtroFechaDesde || !this.filtroFechaHasta) {
      this.notificationService.warning('Fechas incompletas',
        'Selecciona ambas fechas para filtrar');
      return;
    }

    this.currentPage = 1;
    const desde = new Date(this.filtroFechaDesde);
    const hasta = new Date(this.filtroFechaHasta);
    hasta.setHours(23, 59, 59, 999);

    this.filteredDocumentos = this.documentos.filter(doc => {
      const fechaDoc = new Date(doc.fechaRechazo || doc.fechaActualizacion || new Date());
      return fechaDoc >= desde && fechaDoc <= hasta;
    });

    this.updatePagination();
  }

  limpiarFiltrosFecha(): void {
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';

    if (this.filtroActual === 'todos') {
      this.filteredDocumentos = [...this.documentos];
    } else {
      this.filteredDocumentos = this.documentos.filter(d => this.esMiRechazo(d));
    }

    this.currentPage = 1;
    this.updatePagination();
  }

  getPeriodoLabel(): string {
    if (this.filtroFechaDesde && this.filtroFechaHasta) {
      return `${this.filtroFechaDesde} a ${this.filtroFechaHasta}`;
    }
    return 'Filtrar por fechas';
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      if (this.filtroActual === 'todos') {
        this.filteredDocumentos = [...this.documentos];
      } else {
        this.filteredDocumentos = this.documentos.filter(d => this.esMiRechazo(d));
      }
    } else {
      const term = this.searchTerm.toLowerCase();
      const baseDocs = this.filtroActual === 'todos' ? this.documentos : this.documentos.filter(d => this.esMiRechazo(d));

      this.filteredDocumentos = baseDocs.filter(doc => {
        const radicado = doc.documento?.numeroRadicado || '';
        const contratista = doc.documento?.nombreContratista || '';
        const contrato = doc.documento?.numeroContrato || '';
        const documentoContratista = doc.documento?.documentoContratista || '';
        const motivo = this.getMotivoRechazo(doc) || '';
        const auditor = this.getAuditorRechazo(doc) || '';

        return radicado.toLowerCase().includes(term) ||
          contratista.toLowerCase().includes(term) ||
          contrato.toLowerCase().includes(term) ||
          documentoContratista.toLowerCase().includes(term) ||
          motivo.toLowerCase().includes(term) ||
          auditor.toLowerCase().includes(term);
      });
    }

    this.currentPage = 1;
    this.updatePagination();
  }

  verDetalle(doc: ItemRechazado): void {
    const documentoId = doc.documento?.id || doc.id;

    if (!documentoId) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    console.log(`👁️ Ver documento rechazado: ${doc.documento?.numeroRadicado || 'N/A'} (${documentoId})`);

    this.router.navigate(['/auditor/revisar', documentoId], {
      queryParams: {
        soloLectura: 'true',
        modo: 'consulta',
        desde: 'rechazados'
      }
    }).catch(err => {
      console.error('[VER] Error:', err);
      this.notificationService.error('Redirección fallida', 'Intenta ingresar manualmente');
    });
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de paginación y refresco
  // ───────────────────────────────────────────────────────────────

  refreshData(): void {
    console.log('🔄 Refrescando lista de rechazados...');
    this.cargarDocumentosRechazados();
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

    const startIdx = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIdx, startIdx + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de formateo y helpers
  // ───────────────────────────────────────────────────────────────

  formatDate(fecha: Date | string | undefined): string {
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

  getDuracionContrato(inicio: Date | string | undefined, fin: Date | string | undefined): string {
    if (!inicio || !fin) return 'N/A';
    try {
      const fechaInicio = new Date(inicio);
      const fechaFin = new Date(fin);
      const diferenciaMs = fechaFin.getTime() - fechaInicio.getTime();
      const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
      return `${dias} días`;
    } catch {
      return 'N/A';
    }
  }

  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'badge-secondary';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('RECHAZADO')) return 'badge-danger';
    if (estadoUpper.includes('OBSERVADO')) return 'badge-warning';
    if (estadoUpper.includes('APROBADO')) return 'badge-success';
    if (estadoUpper.includes('EN_REVISION')) return 'badge-info';

    return 'badge-secondary';
  }

  getEstadoIcon(estado: string | undefined): string {
    if (!estado) return 'fa-question-circle';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('RECHAZADO')) return 'fa-times-circle';
    if (estadoUpper.includes('OBSERVADO')) return 'fa-exclamation-triangle';
    if (estadoUpper.includes('APROBADO')) return 'fa-check-circle';
    if (estadoUpper.includes('EN_REVISION')) return 'fa-hourglass-half';

    return 'fa-circle';
  }

  getEstadoTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper === 'RECHAZADO_AUDITOR') return 'Rechazado (Auditor)';
    if (estadoUpper === 'RECHAZADO') return 'Rechazado';
    if (estadoUpper === 'OBSERVADO_AUDITOR') return 'Observado (Auditor)';
    if (estadoUpper === 'OBSERVADO') return 'Observado';
    if (estadoUpper === 'APROBADO_AUDITOR') return 'Aprobado (Auditor)';
    if (estadoUpper === 'APROBADO') return 'Aprobado';
    if (estadoUpper.includes('EN_REVISION')) return 'En Revisión';

    return estado;
  }

  getDiasClass(doc: ItemRechazado): string {
    const dias = this.getDiasDesdeRechazo(doc);

    if (dias < 2) return 'text-danger';
    if (dias <= 7) return 'text-warning';
    if (dias <= 15) return 'text-primary';
    return 'text-secondary';
  }

  getTooltipInfo(doc: ItemRechazado): string {
    let info = '';

    if (doc.documento?.numeroRadicado) {
      info += `Radicado: ${doc.documento.numeroRadicado}\n`;
    }

    if (doc.documento?.nombreContratista) {
      info += `Contratista: ${doc.documento.nombreContratista}\n`;
    }

    const dias = this.getDiasDesdeRechazo(doc);
    info += `Rechazado hace: ${dias} días\n`;

    info += `Motivo: ${this.getMotivoRechazo(doc).substring(0, 50)}`;

    if (doc.documento?.primerRadicadoDelAno) {
      info += `\n⭐ Primer radicado del año`;
    }

    return info;
  }

  getDocumentCount(doc: ItemRechazado): number {
    let count = 0;
    if (doc.documento?.cuentaCobro) count++;
    if (doc.documento?.seguridadSocial) count++;
    if (doc.documento?.informeActividades) count++;
    return count;
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos para archivos
  // ───────────────────────────────────────────────────────────────

  previsualizarDocumentoRadicado(doc: ItemRechazado, index: number): void {
    console.log(`👁️ Previsualizando documento ${doc.documento?.numeroRadicado}, archivo ${index}`);

    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    let existeDocumento = false;

    switch (index) {
      case 1:
        existeDocumento = !!doc.documento?.cuentaCobro;
        break;
      case 2:
        existeDocumento = !!doc.documento?.seguridadSocial;
        break;
      case 3:
        existeDocumento = !!doc.documento?.informeActividades;
        break;
    }

    if (!existeDocumento) {
      this.notificationService.warning('Documento no disponible',
        `El documento ${index} no está disponible`);
      return;
    }

    const documentoId = doc.documento?.id || doc.id;
    if (documentoId) {
      this.auditorService.previsualizarArchivoRadicado(documentoId, index);
    } else {
      this.notificationService.error('Error', 'ID de documento no válido');
    }
  }

  previsualizarArchivoAuditor(doc: ItemRechazado, tipo: string): void {
    const documentoId = doc.documento?.id || doc.id;
    if (documentoId) {
      this.auditorService.previsualizarArchivoAuditor(documentoId, tipo);
    } else {
      this.notificationService.error('Error', 'ID de documento no válido');
    }
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos para mensajes
  // ───────────────────────────────────────────────────────────────

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