// src/app/pages/asesor-gerencia/components/asesor-gerencia-rechazados/asesor-gerencia-rechazados.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AsesorGerenciaService } from '../../../../core/services/asesor-gerencia.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Interfaz para manejar propiedades dinámicas
interface DocumentoAsesorExtendido {
  id?: string;
  numeroRadicado?: string;
  fechaRadicacion?: Date | string;
  nombreContratista?: string;
  documentoContratista?: string;
  numeroContrato?: string;
  fechaInicio?: Date | string;
  fechaFin?: Date | string;
  estado?: string;
  cuentaCobro?: string;
  seguridadSocial?: string;
  informeActividades?: string;
  comentarios?: string;
  radicador?: string;
  ultimoUsuario?: string;
  fechaActualizacion?: Date | string;
  updatedAt?: Date | string;
  observacion?: string;
  motivoRechazo?: string;
  observaciones?: string;
  fechaRechazo?: Date | string;
  primerRadicadoDelAno?: boolean;
  [key: string]: any; // Para propiedades dinámicas
}

@Component({
  selector: 'app-asesor-gerencia-rechazados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asesor-gerencia-rechazados.component.html',
  styleUrls: ['./asesor-gerencia-rechazados.component.scss']
})
export class AsesorGerenciaRechazadosComponent implements OnInit, OnDestroy {
  documentos: DocumentoAsesorExtendido[] = [];
  filteredDocumentos: DocumentoAsesorExtendido[] = [];
  paginatedDocumentos: DocumentoAsesorExtendido[] = [];

  isLoading = true;
  isProcessing = false;
  error: string | null = null;
  
  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  searchTerm = '';

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private asesorGerenciaService: AsesorGerenciaService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🚀 Asesor Gerencia Rechazados: Inicializando componente...');
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
        this.usuarioActual = user.fullName || user.username || 'Asesor Gerencia';
        console.log('👤 Usuario actual detectado:', this.usuarioActual);
      } catch {
        this.usuarioActual = 'Asesor Gerencia';
      }
    }
  }

  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.error = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.infoMessage = '';

    console.log('📋 Cargando documentos rechazados visibles...');

    this.asesorGerenciaService.getRechazadosVisibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[RECHAZADOS] Respuesta recibida:', response);
          
          // Extraer el array de documentos de la respuesta
          let docsArray: any[] = [];
          
          if (Array.isArray(response)) {
            docsArray = response;
          } else if (response?.data && Array.isArray(response.data)) {
            docsArray = response.data;
          } else if (response?.documentos && Array.isArray(response.documentos)) {
            docsArray = response.documentos;
          } else if (response?.success && response?.data && Array.isArray(response.data)) {
            docsArray = response.data;
          } else if (response && typeof response === 'object') {
            // Buscar cualquier propiedad que sea array - VERSIÓN CORREGIDA
            const possibleArrays: any[][] = [];
            Object.values(response).forEach((val: any) => {
              if (Array.isArray(val)) {
                possibleArrays.push(val);
              }
            });
            if (possibleArrays.length > 0) {
              docsArray = possibleArrays[0];
            }
          }
          
          console.log(`[RECHAZADOS] ${docsArray.length} documentos encontrados`);
          
          // Mostrar el primer documento para depuración
          if (docsArray.length > 0) {
            console.log('[RECHAZADOS] Primer documento:', docsArray[0]);
          }
          
          // Mapear los documentos a nuestro formato
          this.documentos = docsArray.map(item => this.mapearDocumento(item));
          
          this.procesarDocumentos();
        },
        error: (err) => {
          console.error('[RECHAZADOS] Error:', err);
          const errorMessage = err.message || 'Error al cargar documentos rechazados';
          this.error = errorMessage;
          this.errorMessage = errorMessage;
          this.notificationService.error('Error', errorMessage);
          this.documentos = [];
          this.filteredDocumentos = [];
          this.isLoading = false;
        }
      });
  }

  // Método para mapear cualquier estructura de documento a nuestro formato
  private mapearDocumento(item: any): DocumentoAsesorExtendido {
    // Si el item ya tiene todas las propiedades, usarlo directamente
    if (item.numeroRadicado) {
      return {
        ...item,
        motivoRechazo: item.motivoRechazo || item.observacion || item.observaciones || '',
        fechaRechazo: item.fechaRechazo || item.fechaActualizacion || item.updatedAt
      };
    }
    
    // Si el item tiene documento anidado, combinar propiedades
    if (item.documento) {
      return {
        ...item.documento,
        ...item,
        id: item.documento.id || item.id,
        estado: item.estado || item.documento.estado,
        motivoRechazo: item.motivoRechazo || item.observacion || item.observaciones || item.documento.comentarios || '',
        fechaRechazo: item.fechaRechazo || item.fechaActualizacion || item.fechaCreacion || item.documento.fechaActualizacion
      };
    }
    
    // Si no, usar el item tal cual con valores por defecto
    return {
      ...item,
      motivoRechazo: item.motivoRechazo || item.observacion || item.observaciones || '',
      fechaRechazo: item.fechaRechazo || item.fechaActualizacion || item.updatedAt || item.fechaCreacion
    };
  }

  procesarDocumentos(): void {
    console.log(`📊 Encontrados ${this.documentos.length} documentos rechazados`);

    if (this.documentos.length > 0) {
      this.successMessage = `Se encontraron ${this.documentos.length} documentos rechazados`;
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

  getMotivoRechazo(doc: DocumentoAsesorExtendido): string {
    return doc.motivoRechazo || 
           doc.observacion || 
           doc.observaciones || 
           doc.comentarios || 
           'Sin motivo especificado';
  }

  getDiasDesdeRechazo(doc: DocumentoAsesorExtendido): number {
    const fechaRechazo = doc.fechaRechazo || doc.fechaActualizacion || doc.updatedAt;
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

  esReciente(doc: DocumentoAsesorExtendido): boolean {
    const dias = this.getDiasDesdeRechazo(doc);
    return dias < 2; // Menos de 2 días
  }

  getDiasTranscurridos(fecha?: string | Date): number {
    if (!fecha) return 0;
    try {
      return Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  verDetalle(id?: string): void {
    if (!id) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    console.log(`👁️ Ver documento rechazado: ${id}`);

    this.router.navigate(['/asesor-gerencia/documento', id], { 
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

  mostrarInfoRechazo(doc: DocumentoAsesorExtendido): void {
    const motivo = this.getMotivoRechazo(doc);
    this.notificationService.info('Motivo del Rechazo', motivo);
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de búsqueda y paginación
  // ───────────────────────────────────────────────────────────────

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...(this.documentos || [])];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredDocumentos = (this.documentos || []).filter(doc => {
        return (
          (doc.numeroRadicado || '').toLowerCase().includes(term) ||
          (doc.nombreContratista || '').toLowerCase().includes(term) ||
          (doc.numeroContrato || '').toLowerCase().includes(term) ||
          (doc.documentoContratista || '').toLowerCase().includes(term) ||
          (doc.estado || '').toLowerCase().includes(term) ||
          this.getMotivoRechazo(doc).toLowerCase().includes(term)
        );
      });
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

  formatDate(fecha?: Date | string): string {
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

  formatDateShort(fecha?: Date | string): string {
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

  trackById(index: number, doc: any): string {
    return doc?.id || index.toString();
  }

  getEstadoClass(estado?: string): string {
    if (!estado) return 'bg-secondary';
    const e = estado.toUpperCase();
    
    if (e.includes('RECHAZADO')) return 'bg-danger';
    if (e.includes('OBSERVADO')) return 'bg-warning';
    if (e.includes('APROBADO')) return 'bg-success';
    if (e.includes('COMPLETADO')) return 'bg-success';
    if (e.includes('EN_REVISION')) return 'bg-info';
    
    // Por área
    if (e.includes('TESORERIA')) return 'bg-warning';
    if (e.includes('CONTABILIDAD')) return 'bg-info';
    if (e.includes('RENDICION')) return 'bg-dark';
    if (e.includes('GERENCIA')) return 'bg-primary';
    
    return 'bg-secondary';
  }

  getEstadoTexto(estado?: string): string {
    if (!estado) return 'Desconocido';
    const e = estado.toUpperCase();
    
    if (e.includes('RECHAZADO_GERENCIA')) return 'Rechazado Gerencia';
    if (e.includes('RECHAZADO_TESORERIA')) return 'Rechazado Tesorería';
    if (e.includes('RECHAZADO_CONTABILIDAD')) return 'Rechazado Contabilidad';
    if (e.includes('RECHAZADO_RENDICION')) return 'Rechazado Rendición';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    
    if (e.includes('OBSERVADO_GERENCIA')) return 'Observado Gerencia';
    if (e.includes('OBSERVADO')) return 'Observado';
    
    return estado;
  }

  getRechazadoPor(estado?: string): string {
    if (!estado) return 'Sistema';
    const e = estado.toUpperCase();
    
    if (e.includes('TESORERIA')) return 'Tesorería';
    if (e.includes('CONTABILIDAD')) return 'Contabilidad';
    if (e.includes('RENDICION')) return 'Rendición Cuentas';
    if (e.includes('GERENCIA')) return 'Asesor Gerencia';
    
    return 'Sistema';
  }

  getRechazadoClass(estado?: string): string {
    if (!estado) return 'badge-sistema';
    const e = estado.toUpperCase();
    
    if (e.includes('TESORERIA')) return 'badge-tesoreria';
    if (e.includes('CONTABILIDAD')) return 'badge-contabilidad';
    if (e.includes('RENDICION')) return 'badge-rendicion';
    if (e.includes('GERENCIA')) return 'badge-gerencia';
    
    return 'badge-sistema';
  }

  getDiasClass(doc: DocumentoAsesorExtendido): string {
    const dias = this.getDiasDesdeRechazo(doc);
    
    if (dias < 2) return 'text-danger fw-bold';
    if (dias <= 7) return 'text-success';
    if (dias <= 15) return 'text-warning';
    return 'text-danger';
  }

  getTooltipInfo(doc: DocumentoAsesorExtendido): string {
    let info = `📄 Radicado: ${doc.numeroRadicado || 'N/A'}\n`;
    info += `👤 Contratista: ${doc.nombreContratista || 'N/A'}\n`;
    
    const dias = this.getDiasDesdeRechazo(doc);
    info += `⏱️ Rechazado hace: ${dias} días\n`;
    
    info += `📝 Motivo: ${this.getMotivoRechazo(doc).substring(0, 80)}`;
    
    return info;
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos para mensajes
  // ───────────────────────────────────────────────────────────────

  dismissError(): void {
    this.errorMessage = '';
    this.error = null;
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }
}