// lista-rechazados.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Interfaces
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
  comentarios?: string;
  observaciones?: string;
  estado?: string;
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
  fechaCreacion?: Date | string;
  fechaAprobacion?: Date | string;
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

  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.infoMessage = '';

    console.log('📋 Cargando documentos rechazados desde historial...');

    this.auditorService.obtenerHistorial()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        })
      )
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
            console.log('[HISTORIAL] Primer registro completo:', JSON.stringify(historial[0], null, 2));
          }

          // Filtrar solo documentos rechazados/observados
          const estadosRechazo = ['RECHAZADO', 'RECHAZADO_AUDITOR', 'OBSERVADO', 'OBSERVADO_AUDITOR'];
          
          const itemsFiltrados = historial.filter(item => {
            if (!item) return false;
            
            // Verificar en el estado principal
            const estado = (item.estado || '').toUpperCase();
            
            // Verificar en el documento anidado
            const documentoEstado = (item.documento?.estado || '').toUpperCase();
            
            // Incluir si el estado coincide con los de rechazo/observación
            return estadosRechazo.some(est => 
              estado.includes(est) || 
              documentoEstado.includes(est)
            );
          });

          console.log(`[FILTRADO] ${itemsFiltrados.length} documentos rechazados/observados encontrados`);

          // Mapear los items a nuestro formato con datos completos
          this.documentos = itemsFiltrados.map(item => {
            // Obtener el documento
            const doc = item.documento || item;
            
            // Crear objeto base
            const docBase: ItemRechazado = {
              id: item.id || doc.id,
              estado: item.estado || doc.estado || 'RECHAZADO',
              observaciones: item.observaciones || doc.observaciones || doc.observacion || '',
              motivoRechazo: item.motivoRechazo || item.observaciones || doc.comentarios || '',
              fechaRechazo: item.fechaRechazo || item.fechaAprobacion || item.fechaActualizacion || item.fechaCreacion || doc.fechaActualizacion,
              fechaActualizacion: item.fechaActualizacion || item.fechaCreacion || doc.fechaActualizacion,
              fechaCreacion: item.fechaCreacion || doc.fechaCreacion,
              fechaAprobacion: item.fechaAprobacion || doc.fechaAprobacion,
              auditorRevisor: item.auditorRevisor || item.auditor?.fullName || item.auditor?.username || item.usuarioAsignadoNombre || '',
              usuarioAsignadoNombre: item.usuarioAsignadoNombre || item.auditor?.fullName || item.auditor?.username || '',
              rechazadoPor: item.rechazadoPor || item.auditor?.fullName || item.auditor?.username || ''
            };

            // Asignar documento
            docBase.documento = {
              id: doc.id,
              numeroRadicado: doc.numeroRadicado || 'N/A',
              fechaRadicacion: doc.fechaRadicacion,
              nombreContratista: doc.nombreContratista || 'N/A',
              documentoContratista: doc.documentoContratista || 'N/A',
              numeroContrato: doc.numeroContrato || 'N/A',
              fechaInicio: doc.fechaInicio,
              fechaFin: doc.fechaFin,
              cuentaCobro: doc.cuentaCobro,
              seguridadSocial: doc.seguridadSocial,
              informeActividades: doc.informeActividades,
              primerRadicadoDelAno: doc.primerRadicadoDelAno || false,
              comentarios: doc.comentarios || '',
              observaciones: doc.observacion || '',
              estado: doc.estado || ''
            };

            return docBase;
          });

          this.procesarDocumentos();
        },
        error: (err: any) => {
          console.error('[AUDITOR] Error cargando historial:', err);
          this.errorMessage = 'Error al cargar documentos rechazados. Por favor, intenta nuevamente.';
          this.notificationService.error('Error', this.errorMessage);
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
      setTimeout(() => this.successMessage = '', 5000);
    } else {
      this.infoMessage = 'No hay documentos rechazados o observados';
    }

    this.filteredDocumentos = [...this.documentos];
    this.updatePagination();
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de filtrado y búsqueda
  // ───────────────────────────────────────────────────────────────

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    
    if (!term) {
      this.filteredDocumentos = this.filtroActual === 'todos' 
        ? [...this.documentos] 
        : this.documentos.filter(d => this.esMiRechazo(d));
    } else {
      const baseDocs = this.filtroActual === 'todos' 
        ? this.documentos 
        : this.documentos.filter(d => this.esMiRechazo(d));

      this.filteredDocumentos = baseDocs.filter(doc => {
        const radicado = doc.documento?.numeroRadicado || '';
        const contratista = doc.documento?.nombreContratista || '';
        const contrato = doc.documento?.numeroContrato || '';
        const documentoContratista = doc.documento?.documentoContratista || '';
        const motivo = this.getMotivoRechazo(doc) || '';
        const auditor = this.getAuditorRechazo(doc) || '';
        const estado = doc.estado || '';

        return radicado.toLowerCase().includes(term) ||
          contratista.toLowerCase().includes(term) ||
          contrato.toLowerCase().includes(term) ||
          documentoContratista.toLowerCase().includes(term) ||
          motivo.toLowerCase().includes(term) ||
          auditor.toLowerCase().includes(term) ||
          estado.toLowerCase().includes(term);
      });
    }

    this.currentPage = 1;
    this.updatePagination();
  }

  cambiarFiltro(filtro: 'todos' | 'mios'): void {
    if (this.filtroActual === filtro) return;

    this.filtroActual = filtro;
    this.currentPage = 1;
    this.onSearch(); // Reutilizar la lógica de búsqueda
  }

  aplicarFiltroFechas(): void {
    if (!this.filtroFechaDesde || !this.filtroFechaHasta) {
      this.notificationService.warning('Fechas incompletas', 'Selecciona ambas fechas para filtrar');
      return;
    }

    this.currentPage = 1;
    const desde = new Date(this.filtroFechaDesde);
    const hasta = new Date(this.filtroFechaHasta);
    hasta.setHours(23, 59, 59, 999);

    const baseDocs = this.filtroActual === 'todos' 
      ? this.documentos 
      : this.documentos.filter(d => this.esMiRechazo(d));

    this.filteredDocumentos = baseDocs.filter(doc => {
      const fechaDoc = new Date(doc.fechaRechazo || doc.fechaActualizacion || new Date());
      return fechaDoc >= desde && fechaDoc <= hasta;
    });

    this.updatePagination();
  }

  limpiarFiltrosFecha(): void {
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.onSearch();
  }

  getPeriodoLabel(): string {
    if (this.filtroFechaDesde && this.filtroFechaHasta) {
      return `${this.filtroFechaDesde} a ${this.filtroFechaHasta}`;
    }
    return 'Filtrar por fechas';
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de paginación
  // ───────────────────────────────────────────────────────────────

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

  refreshData(): void {
    console.log('🔄 Refrescando lista de rechazados...');
    this.cargarDocumentosRechazados();
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos helpers
  // ───────────────────────────────────────────────────────────────

  esMiRechazo(doc: ItemRechazado): boolean {
    return doc.auditorRevisor === this.usuarioActual ||
           doc.usuarioAsignadoNombre === this.usuarioActual ||
           doc.rechazadoPor === this.usuarioActual;
  }

  getAuditorRechazo(doc: ItemRechazado): string {
    return doc.auditorRevisor || doc.usuarioAsignadoNombre || doc.rechazadoPor || 'Auditor';
  }

  getMotivoRechazo(doc: ItemRechazado): string {
    return doc.motivoRechazo || doc.observaciones || doc.documento?.comentarios || 'Sin motivo especificado';
  }

  getObservaciones(doc: ItemRechazado): string {
    return doc.observaciones || doc.documento?.observaciones || '';
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
    return this.getDiasDesdeRechazo(doc) < 2;
  }

  getTotalRechazadosMios(): number {
    return this.documentos.filter(d => this.esMiRechazo(d)).length;
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de formateo
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
  // Métodos de navegación y acciones
  // ───────────────────────────────────────────────────────────────

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
      this.notificationService.warning('Documento no disponible', `El documento ${index} no está disponible`);
      return;
    }

    const documentoId = doc.documento?.id || doc.id;
    if (documentoId) {
      this.auditorService.previsualizarArchivoRadicado(documentoId, index);
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