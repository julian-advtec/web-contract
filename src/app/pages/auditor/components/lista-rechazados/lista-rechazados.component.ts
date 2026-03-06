// src/app/pages/auditor/components/lista-rechazados/lista-rechazados.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuditorService } from '../../../../core/services/auditor.service';
import { AuditorEstadisticasService } from '../../../../core/services/auditor-estadisticas.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorRechazadoResponse } from '../../../../core/models/auditor-estadisticas.model';

@Component({
  selector: 'app-lista-rechazados',
  templateUrl: './lista-rechazados.component.html',
  styleUrls: ['./lista-rechazados.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class ListaRechazadosComponent implements OnInit, OnDestroy {
  documentos: AuditorRechazadoResponse[] = [];
  filteredDocumentos: AuditorRechazadoResponse[] = [];
  paginatedDocumentos: AuditorRechazadoResponse[] = [];

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
  usuarioActual: { id: string; nombre: string } = { id: '', nombre: '' };

  private destroy$ = new Subject<void>();

  constructor(
    private auditorService: AuditorService,
    private estadisticasService: AuditorEstadisticasService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

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
        this.usuarioActual = {
          id: user.id || '',
          nombre: user.fullName || user.username || 'Auditor'
        };
        console.log('👤 Usuario actual:', this.usuarioActual);
      } catch {
        this.usuarioActual = { id: '', nombre: 'Auditor' };
      }
    }
  }

  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📋 Cargando documentos rechazados...');

    const filtros: any = {
      soloMios: this.filtroActual === 'mios',
    };

    if (this.filtroFechaDesde && this.filtroFechaHasta) {
      filtros.desde = new Date(this.filtroFechaDesde);
      filtros.hasta = new Date(this.filtroFechaHasta);
      filtros.hasta.setHours(23, 59, 59, 999);
    }

    this.estadisticasService.obtenerRechazados(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log(`[RECHAZADOS] Recibidos ${data.length} documentos`);
          this.documentos = data;
          this.procesarDocumentos();
        },
        error: (err) => {
          console.error('[RECHAZADOS] Error:', err);
          this.errorMessage = 'Error al cargar documentos rechazados';
          this.notificationService.error('Error', this.errorMessage);
          this.isLoading = false;
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
    this.aplicarFiltroBusqueda();
  }

  // ───────────────────────────────────────────────────────────────
  // Filtros
  // ───────────────────────────────────────────────────────────────

  cambiarFiltro(filtro: 'todos' | 'mios'): void {
    if (this.filtroActual === filtro) return;
    
    this.filtroActual = filtro;
    this.currentPage = 1;
    this.cargarDocumentosRechazados();
  }

  aplicarFiltroFechas(): void {
    if (this.filtroFechaDesde && this.filtroFechaHasta) {
      this.currentPage = 1;
      this.cargarDocumentosRechazados();
    }
  }

  limpiarFiltrosFecha(): void {
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.currentPage = 1;
    this.cargarDocumentosRechazados();
  }

  getPeriodoLabel(): string {
    if (this.filtroFechaDesde && this.filtroFechaHasta) {
      return `${this.filtroFechaDesde} a ${this.filtroFechaHasta}`;
    }
    return 'Filtrar por fechas';
  }

  onSearch(): void {
    this.aplicarFiltroBusqueda();
  }

  aplicarFiltroBusqueda(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc => {
        return (
          doc.documento.numeroRadicado?.toLowerCase().includes(term) ||
          doc.documento.nombreContratista?.toLowerCase().includes(term) ||
          doc.documento.numeroContrato?.toLowerCase().includes(term) ||
          doc.documento.documentoContratista?.toLowerCase().includes(term) ||
          this.getMotivoRechazo(doc).toLowerCase().includes(term) ||
          this.getAuditorRechazo(doc).toLowerCase().includes(term)
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos específicos para rechazados
  // ───────────────────────────────────────────────────────────────

  esMiRechazo(doc: AuditorRechazadoResponse): boolean {
    return doc.auditorRevisor === this.usuarioActual.nombre;
  }

  getAuditorRechazo(doc: AuditorRechazadoResponse): string {
    return doc.auditorRevisor || 'Auditor';
  }

  getMotivoRechazo(doc: AuditorRechazadoResponse): string {
    return doc.observaciones || 
           doc.documento.comentarios || 
           'Sin motivo especificado';
  }

  getDiasDesdeRechazo(doc: AuditorRechazadoResponse): number {
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

  esDocumentoReciente(doc: AuditorRechazadoResponse): boolean {
    const dias = this.getDiasDesdeRechazo(doc);
    return dias < 2; // Menos de 2 días
  }

  getTotalRechazadosMios(): number {
    return this.documentos.filter(d => this.esMiRechazo(d)).length;
  }

  verDetalle(doc: AuditorRechazadoResponse): void {
    if (!doc?.documento?.id) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    console.log(`👁️ Ver documento rechazado: ${doc.documento.numeroRadicado} (${doc.documento.id})`);

    // Navegar en modo consulta/solo lectura
    this.router.navigate(['/auditor/revisar', doc.documento.id], {
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

  formatDate(fecha: Date | string): string {
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

  getDuracionContrato(inicio: Date | string, fin: Date | string): string {
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

  getEstadoClass(estado: string): string {
    if (!estado) return 'badge-secondary';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper === 'RECHAZADO' || estadoUpper === 'RECHAZADO_AUDITOR') 
      return 'badge-danger';
    if (estadoUpper === 'OBSERVADO' || estadoUpper === 'OBSERVADO_AUDITOR') 
      return 'badge-warning';
    if (estadoUpper === 'APROBADO' || estadoUpper === 'APROBADO_AUDITOR') 
      return 'badge-success';
    if (estadoUpper === 'COMPLETADO') 
      return 'badge-info';
    if (estadoUpper.includes('EN_REVISION')) 
      return 'badge-primary';

    return 'badge-secondary';
  }

  getEstadoIcon(estado: string): string {
    if (!estado) return 'fa-question-circle';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('RECHAZADO')) return 'fa-times-circle';
    if (estadoUpper.includes('OBSERVADO')) return 'fa-exclamation-triangle';
    if (estadoUpper.includes('APROBADO')) return 'fa-check-circle';
    if (estadoUpper.includes('COMPLETADO')) return 'fa-flag-checkered';
    if (estadoUpper.includes('EN_REVISION')) return 'fa-hourglass-half';

    return 'fa-circle';
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper === 'RECHAZADO') return 'Rechazado';
    if (estadoUpper === 'RECHAZADO_AUDITOR') return 'Rechazado (Auditor)';
    if (estadoUpper === 'OBSERVADO') return 'Observado';
    if (estadoUpper === 'OBSERVADO_AUDITOR') return 'Observado (Auditor)';
    if (estadoUpper === 'APROBADO') return 'Aprobado';
    if (estadoUpper === 'APROBADO_AUDITOR') return 'Aprobado (Auditor)';
    if (estadoUpper === 'COMPLETADO') return 'Completado';
    if (estadoUpper === 'EN_REVISION') return 'En Revisión';

    return estado;
  }

  getDiasClass(doc: AuditorRechazadoResponse): string {
    const dias = this.getDiasDesdeRechazo(doc);

    if (dias < 2) return 'text-danger';      // Reciente
    if (dias <= 7) return 'text-warning';     // 2-7 días
    if (dias <= 15) return 'text-primary';    // 8-15 días
    return 'text-secondary';                   // Más de 15 días
  }

  getTooltipInfo(doc: AuditorRechazadoResponse): string {
    let info = '';

    if (doc.documento.numeroRadicado) {
      info += `Radicado: ${doc.documento.numeroRadicado}\n`;
    }

    if (doc.documento.nombreContratista) {
      info += `Contratista: ${doc.documento.nombreContratista}\n`;
    }

    const dias = this.getDiasDesdeRechazo(doc);
    info += `Rechazado hace: ${dias} días\n`;

    info += `Motivo: ${this.getMotivoRechazo(doc).substring(0, 50)}`;

    if (doc.documento.primerRadicadoDelAno) {
      info += `\n⭐ Primer radicado del año`;
    }

    return info;
  }

  getDocumentCount(doc: AuditorRechazadoResponse): number {
    let count = 0;
    if (doc.documento.cuentaCobro) count++;
    if (doc.documento.seguridadSocial) count++;
    if (doc.documento.informeActividades) count++;
    return count;
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos para archivos
  // ───────────────────────────────────────────────────────────────

  previsualizarDocumentoRadicado(doc: AuditorRechazadoResponse, index: number): void {
    console.log(`👁️ Previsualizando documento ${doc.documento.numeroRadicado}, archivo ${index}`);

    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    let existeDocumento = false;

    switch (index) {
      case 1:
        existeDocumento = !!doc.documento.cuentaCobro;
        break;
      case 2:
        existeDocumento = !!doc.documento.seguridadSocial;
        break;
      case 3:
        existeDocumento = !!doc.documento.informeActividades;
        break;
    }

    if (!existeDocumento) {
      this.notificationService.warning('Documento no disponible',
        `El documento ${index} no está disponible`);
      return;
    }

    // Usar el método de previsualización
    this.auditorService.previsualizarArchivoRadicado(doc.documento.id, index);
  }

  previsualizarArchivoAuditor(doc: AuditorRechazadoResponse, tipo: string): void {
    if (!doc.archivos[tipo as keyof typeof doc.archivos]) {
      this.notificationService.warning('Documento no disponible',
        `El archivo de tipo ${tipo} no está disponible`);
      return;
    }

    this.auditorService.previsualizarArchivoAuditor(doc.documento.id, tipo);
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