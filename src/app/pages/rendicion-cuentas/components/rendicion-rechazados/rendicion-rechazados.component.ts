// src/app/pages/rendicion-cuentas/components/rendicion-rechazados/rendicion-rechazados.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Interfaz para documentos rechazados/observados
interface DocumentoRechazado {
  id?: string;
  rendicionId?: string;
  documentoId?: string;
  numeroRadicado?: string;
  numeroContrato?: string;
  nombreContratista?: string;
  documentoContratista?: string;
  fechaRadicacion?: Date | string;
  fechaInicioRevision?: Date | string;
  fechaDecision?: Date | string;
  fechaCreacion?: Date | string;
  fechaActualizacion?: Date | string;
  estado?: string;
  observaciones?: string;
  observacionesRendicion?: string;
  motivoRechazo?: string;
  responsableId?: string;
  responsableNombre?: string;
  esMio?: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-rendicion-rechazados',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './rendicion-rechazados.component.html',
  styleUrls: ['./rendicion-rechazados.component.scss']
})
export class RendicionRechazadosComponent implements OnInit, OnDestroy {
  documentos: DocumentoRechazado[] = [];
  filteredDocumentos: DocumentoRechazado[] = [];
  paginatedDocumentos: DocumentoRechazado[] = [];

  isLoading = false;
  errorMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  Math = Math;

  sidebarCollapsed = false;

  // Estados de rechazo/observado (en minúsculas para comparar)
  private estadosRechazo = [
    'rechazado_rendicion_cuentas',
    'rechazado',
    'observado_rendicion_cuentas',
    'observado'
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private rendicionService: RendicionCuentasService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Rendición Rechazados: Inicializando componente...');
    this.cargarDocumentosRechazados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📋 Cargando documentos rechazados/observados...');

    // Intentar primero con obtenerTodosDocumentos
    this.rendicionService.obtenerTodosDocumentos()
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error en obtenerTodosDocumentos:', err);
          return of([]);
        })
      )
      .subscribe({
        next: (docs: any[]) => {
          console.log('[RECHAZADOS] Documentos recibidos:', docs?.length);
          
          if (docs && docs.length > 0) {
            console.log('[RECHAZADOS] Primer documento:', docs[0]);
          }

          if (!Array.isArray(docs) || docs.length === 0) {
            // Si no hay documentos, intentar con el historial
            this.cargarDelHistorial();
            return;
          }

          // Filtrar solo los que están en estados de rechazo/observado
          this.documentos = docs.filter(doc => {
            const estado = (doc.estado || '').toString().toLowerCase();
            return this.estadosRechazo.some(e => estado.includes(e));
          }).map(doc => this.mapearDocumento(doc));

          console.log(`[RECHAZADOS] ${this.documentos.length} documentos rechazados/observados encontrados`);
          
          if (this.documentos.length === 0) {
            // Si no hay rechazados en todos-documentos, intentar con historial
            this.cargarDelHistorial();
          } else {
            this.procesarDocumentos();
          }
        },
        error: (err) => {
          console.error('[RECHAZADOS] Error:', err);
          // Intentar con historial como fallback
          this.cargarDelHistorial();
        }
      });
  }

  // Método de respaldo usando el historial
  private cargarDelHistorial(): void {
    console.log('📋 Intentando cargar desde historial...');
    
    this.rendicionService.obtenerHistorial()
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error en historial:', err);
          return of([]);
        })
      )
      .subscribe({
        next: (historial: any[]) => {
          console.log('[HISTORIAL] Documentos recibidos:', historial?.length);
          
          if (historial && historial.length > 0) {
            console.log('[HISTORIAL] Primer documento:', historial[0]);
          }

          if (!Array.isArray(historial)) {
            this.documentos = [];
            this.procesarDocumentos();
            return;
          }

          // Filtrar solo los que están en estados de rechazo/observado
          this.documentos = historial.filter(item => {
            const estado = (item.estado || '').toString().toLowerCase();
            return this.estadosRechazo.some(e => estado.includes(e));
          }).map(item => this.mapearDocumento(item));

          console.log(`[HISTORIAL] ${this.documentos.length} documentos rechazados/observados encontrados`);
          this.procesarDocumentos();
        },
        error: (err) => {
          console.error('[HISTORIAL] Error:', err);
          this.errorMessage = 'No se pudieron cargar los documentos';
          this.documentos = [];
          this.procesarDocumentos();
        }
      });
  }

  private mapearDocumento(item: any): DocumentoRechazado {
    // Si el item tiene estructura de historial con documento anidado
    if (item.documento) {
      return {
        id: item.documento.id || item.id,
        rendicionId: item.id,
        documentoId: item.documento.id,
        numeroRadicado: item.documento.numeroRadicado || item.numeroRadicado || 'N/A',
        numeroContrato: item.documento.numeroContrato || item.numeroContrato || 'N/A',
        nombreContratista: item.documento.nombreContratista || item.nombreContratista || 'Sin nombre',
        documentoContratista: item.documento.documentoContratista || item.documentoContratista || 'N/A',
        fechaRadicacion: item.documento.fechaRadicacion || item.fechaRadicacion,
        fechaInicioRevision: item.fechaInicioRevision,
        fechaDecision: item.fechaDecision || item.fechaActualizacion || item.fechaCreacion,
        fechaCreacion: item.fechaCreacion,
        fechaActualizacion: item.fechaActualizacion,
        estado: item.estado,
        observaciones: item.observaciones,
        observacionesRendicion: item.observacionesRendicion,
        motivoRechazo: item.motivoRechazo || item.observaciones,
        responsableId: item.responsableId,
        responsableNombre: item.responsableNombre || item.responsable?.fullName || item.responsable?.username || 'Sistema',
        esMio: item.esMio || false
      };
    }
    
    // Si el item tiene estructura directa
    return {
      id: item.id || item.rendicionId,
      rendicionId: item.rendicionId || item.id,
      documentoId: item.documentoId || item.id,
      numeroRadicado: item.numeroRadicado || 'N/A',
      numeroContrato: item.numeroContrato || 'N/A',
      nombreContratista: item.nombreContratista || 'Sin nombre',
      documentoContratista: item.documentoContratista || 'N/A',
      fechaRadicacion: item.fechaRadicacion,
      fechaInicioRevision: item.fechaInicioRevision,
      fechaDecision: item.fechaDecision || item.fechaActualizacion || item.fechaCreacion,
      fechaCreacion: item.fechaCreacion,
      fechaActualizacion: item.fechaActualizacion,
      estado: item.estado,
      observaciones: item.observaciones,
      observacionesRendicion: item.observacionesRendicion,
      motivoRechazo: item.motivoRechazo || item.observaciones,
      responsableId: item.responsableId,
      responsableNombre: item.responsableNombre || item.responsable?.fullName || item.responsable?.username || 'Sistema',
      esMio: item.esMio || false
    };
  }

  procesarDocumentos(): void {
    console.log(`📊 Procesando ${this.documentos.length} documentos rechazados`);
    
    if (this.documentos.length > 0) {
      console.log('📋 Primer documento mapeado:', this.documentos[0]);
    }

    this.filteredDocumentos = [...this.documentos];
    this.updatePagination();
    this.isLoading = false;
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos específicos para rechazados
  // ───────────────────────────────────────────────────────────────

  getMotivoRechazo(doc: DocumentoRechazado): string {
    return doc.observaciones ||
      doc.observacionesRendicion ||
      doc.motivoRechazo ||
      'Sin motivo especificado';
  }

  getFechaRechazo(doc: DocumentoRechazado): Date | string | undefined {
    return doc.fechaDecision || doc.fechaActualizacion || doc.fechaCreacion;
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    try {
      const diffMs = new Date().getTime() - new Date(fecha).getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  getDiasClass(doc: DocumentoRechazado): string {
    const dias = this.getDiasTranscurridos(this.getFechaRechazo(doc));
    if (dias < 2) return 'text-danger fw-bold';
    if (dias <= 7) return 'text-warning';
    if (dias <= 15) return 'text-primary';
    return 'text-secondary';
  }

  esReciente(doc: DocumentoRechazado): boolean {
    const dias = this.getDiasTranscurridos(this.getFechaRechazo(doc));
    return dias < 2;
  }

  esObservado(doc: DocumentoRechazado): boolean {
    const estado = (doc.estado || '').toString().toLowerCase();
    return estado.includes('observado');
  }

  getRechazadoPorNombre(doc: DocumentoRechazado): string {
    return doc.responsableNombre || 'Sistema';
  }

  getRechazadoClass(estado: string | undefined): string {
    const e = (estado || '').toString().toLowerCase();
    if (e.includes('observado')) return 'bg-warning text-dark';
    if (e.includes('rechazado')) return 'bg-danger text-white';
    return 'bg-secondary text-white';
  }

  getEstadoClass(estado: string | undefined): string {
    return this.rendicionService.getEstadoClass(estado || '');
  }

  getEstadoTexto(estado: string | undefined): string {
    return this.rendicionService.getEstadoTexto(estado || '');
  }

  formatDate(fecha: Date | string | undefined): string {
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

  formatDateShort(fecha: Date | string | undefined): string {
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

  getTooltipInfo(doc: DocumentoRechazado): string {
    const fecha = this.getFechaRechazo(doc);
    let info = `📄 Radicado: ${doc.numeroRadicado || 'N/A'}\n`;
    info += `👤 Contratista: ${doc.nombreContratista || 'N/A'}\n`;
    info += `⏱️ Fecha: ${fecha ? new Date(fecha).toLocaleDateString() : 'N/A'}\n`;
    info += `📝 Motivo: ${this.getMotivoRechazo(doc).substring(0, 80)}`;
    if (this.getMotivoRechazo(doc).length > 80) info += '...';
    return info;
  }

  verDetalle(id?: string): void {
    if (!id) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    console.log(`👁️ Ver detalle de documento: ${id}`);
    
    // Buscar el documento para obtener el rendicionId si existe
    const doc = this.documentos.find(d => d.id === id || d.rendicionId === id);
    const rendicionId = doc?.rendicionId || id;

    this.router.navigate(['/rendicion-cuentas/procesar', rendicionId], { 
      queryParams: { 
        modo: 'consulta',
        origen: 'rechazados',
        soloLectura: 'true'
      } 
    }).catch(err => {
      console.error('[VER] Error:', err);
      this.notificationService.error('Redirección fallida', 'Intenta ingresar manualmente');
    });
  }

  mostrarInfoRechazo(doc: DocumentoRechazado): void {
    this.notificationService.info('Motivo del Rechazo', this.getMotivoRechazo(doc));
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de búsqueda y paginación
  // ───────────────────────────────────────────────────────────────

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado || '').toLowerCase().includes(term) ||
        (doc.nombreContratista || '').toLowerCase().includes(term) ||
        (doc.numeroContrato || '').toLowerCase().includes(term) ||
        (doc.documentoContratista || '').toLowerCase().includes(term) ||
        this.getMotivoRechazo(doc).toLowerCase().includes(term) ||
        (doc.responsableNombre || '').toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  refreshData(): void {
    console.log('🔄 Refrescando lista de rechazados...');
    this.cargarDocumentosRechazados();
  }

  updatePagination(): void {
    const total = this.filteredDocumentos?.length || 0;
    this.totalPages = Math.ceil(total / this.pageSize);
    this.pages = [];

    if (this.totalPages > 0) {
      const maxPages = 5;
      let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
      let end = Math.min(this.totalPages, start + maxPages - 1);

      if (end - start + 1 < maxPages) {
        start = Math.max(1, end - maxPages + 1);
      }

      for (let i = start; i <= end; i++) {
        this.pages.push(i);
      }
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  trackById(index: number, doc: DocumentoRechazado): string {
    return doc.id || doc.rendicionId || index.toString();
  }
}