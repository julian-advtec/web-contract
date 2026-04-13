// src/app/pages/supervisor/components/supervisor-list/supervisor-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupervisorService } from '../../../../core/services/supervisor/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-supervisor-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './supervisor-list.component.html',
  styleUrls: ['./supervisor-list.component.scss']
})
export class SupervisorListComponent implements OnInit, OnDestroy {
  documentos: any[] = [];
  documentosFiltrados: any[] = [];
  documentosPaginados: any[] = [];

  loading = false;
  isProcessing = false;
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  errorMessage: string | null = null;
  successMessage: string = '';
  infoMessage: string = '';

  sidebarCollapsed = false;
  usuarioActual = '';
  pages: number[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private supervisorService: SupervisorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarMisSupervisiones();
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
        this.usuarioActual = user.fullName || user.username || 'Supervisor';
        console.log('👤 Supervisor actual:', this.usuarioActual);
      } catch {
        this.usuarioActual = 'Supervisor';
      }
    }
  }

  cargarMisSupervisiones(): void {
    this.loading = true;
    this.errorMessage = null;
    this.successMessage = '';
    this.infoMessage = '';

    this.supervisorService.obtenerMisSupervisiones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documentos: any[]) => {
          this.documentos = documentos || [];
          console.log('📊 Mis supervisiones cargadas:', this.documentos.length);

          if (this.documentos.length === 0) {
            this.infoMessage = 'No tienes supervisiones asignadas';
          } else {
            const enRevision = this.documentos.filter(d =>
              d.estado === 'EN_REVISION' || d.supervisorEstado === 'EN_REVISION'
            ).length;
            this.successMessage = `Tienes ${this.documentos.length} supervisiones (${enRevision} en revisión)`;
          }

          this.aplicarFiltros();
          this.loading = false;
        },
        error: (err: any) => {
          this.errorMessage = 'No se pudieron cargar tus supervisiones';
          this.notificationService.error('Error', this.errorMessage);
          this.loading = false;
          console.error('Error cargando mis supervisiones:', err);
        }
      });
  }

  aplicarFiltros(): void {
    let filtrados = [...this.documentos];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(doc =>
        doc.numeroRadicado?.toLowerCase().includes(term) ||
        doc.nombreContratista?.toLowerCase().includes(term) ||
        doc.numeroContrato?.toLowerCase().includes(term) ||
        doc.supervisorEstado?.toLowerCase().includes(term) ||
        doc.estado?.toLowerCase().includes(term)
      );
    }
    this.documentosFiltrados = filtrados;
    this.totalPages = Math.ceil(this.documentosFiltrados.length / this.itemsPerPage);
    this.updatePagination();
  }

  // ========================
  // MÉTODOS DE PAGINACIÓN (NUEVOS)
  // ========================

  updatePagination(): void {
    this.totalPages = Math.ceil(this.documentosFiltrados.length / this.itemsPerPage);

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

    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.documentosPaginados = this.documentosFiltrados.slice(start, start + this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  // ========================
  // MÉTODOS DE BÚSQUEDA (NUEVOS)
  // ========================

  onSearch(): void {
    this.aplicarFiltros();
  }

  // ========================
  // MÉTODOS DE ACCIÓN (NUEVOS)
  // ========================

  refreshData(): void {
    this.cargarMisSupervisiones();
  }

  dismissError(): void {
    this.errorMessage = null;
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }

  // ========================
  // MÉTODOS DE UTILIDAD (NUEVOS)
  // ========================

  esDocumentoReciente(doc: any): boolean {
    const fecha = doc.fechaInicioRevision || doc.fechaRadicacion || doc.fechaActualizacion;
    if (!fecha) return false;

    try {
      const fechaDoc = new Date(fecha);
      const ahora = new Date();
      const diffDays = Math.floor((ahora.getTime() - fechaDoc.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 2; // Menos de 2 días
    } catch {
      return false;
    }
  }

  getDocumentCount(doc: any): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  getDiasTranscurridos(fecha: Date | string): number {
    if (!fecha) return 0;
    try {
      const fechaDoc = new Date(fecha);
      const hoy = new Date();
      const diffMs = hoy.getTime() - fechaDoc.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  getDiasClass(doc: any): string {
    const dias = this.getDiasTranscurridos(doc.fechaInicioRevision);
    if (dias < 2) return 'text-success';
    if (dias <= 5) return 'text-warning';
    return 'text-danger';
  }

  // ========================
  // MÉTODOS DE FORMATEO (NUEVOS)
  // ========================

  formatDateOnly(fecha: Date | string): string {
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

  formatDateTime(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  formatDateShort(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return 'N/A';
    }
  }

  // ========================
  // MÉTODOS DE NAVEGACIÓN (MODIFICADOS)
  // ========================

 verDetalle(doc: any): void {
    if (!doc?.id) {
        this.notificationService.error('Error', 'ID de documento no válido');
        return;
    }

    // ✅ Determinar modo según el estado del documento
    const estadoDocumento = (doc.estado || doc.supervisorEstado || '').toUpperCase();
    const esAprobado = estadoDocumento === 'APROBADO' || estadoDocumento === 'APROBADO_SUPERVISOR';
    const esRechazado = estadoDocumento === 'RECHAZADO' || estadoDocumento === 'RECHAZADO_SUPERVISOR';
    const esObservado = estadoDocumento === 'OBSERVADO' || estadoDocumento === 'OBSERVADO_SUPERVISOR';
    
    let modo = 'consulta';
    let soloLectura = 'true';
    
    // Solo permitir edición si el documento está EN_REVISION o es OBSERVADO (para correcciones)
    if (estadoDocumento.includes('EN_REVISION') || esObservado) {
        modo = 'edicion';
        soloLectura = 'false';
        console.log('✏️ Documento editable - Modo edición');
    } else if (esAprobado) {
        modo = 'consulta';
        soloLectura = 'true';
        this.notificationService.info('Documento aprobado', 'Este documento ya fue aprobado. Solo puede visualizarse en modo consulta.');
        console.log('🔒 Documento aprobado - Modo solo lectura');
    } else if (esRechazado) {
        modo = 'consulta';
        soloLectura = 'true';
        this.notificationService.info('Documento rechazado', 'Este documento fue rechazado. Solo puede visualizarse en modo consulta.');
        console.log('🔒 Documento rechazado - Modo solo lectura');
    }

    const queryParams: any = {
        modo: modo,
        soloLectura: soloLectura,
        desdeLista: 'mis-supervisiones',
        _t: Date.now()
    };

    console.log(`🚀 Navegando a documento ${doc.id} - Modo: ${modo}, Solo lectura: ${soloLectura}`);

    this.router.navigate(['/supervisor/revisar', doc.id], {
        queryParams,
        replaceUrl: true
    }).then(success => {
        console.log('✅ Navegación exitosa:', success);
    }).catch(error => {
        console.error('❌ Error en navegación:', error);
    });
}
  // ========================
  // MÉTODOS DE ESTADO (EXISTENTES)
  // ========================

  getEstadoBadgeClass(estado: string): string {
    const e = (estado || '').toUpperCase();

    if (e.includes('EN_REVISION')) return 'bg-info';
    if (e.includes('APROBADO')) return 'bg-success';
    if (e.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (e.includes('RECHAZADO')) return 'bg-danger';
    if (e.includes('DISPONIBLE')) return 'bg-secondary';

    return 'bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    const e = (estado || '').toUpperCase();

    if (e.includes('EN_REVISION')) return 'En Revisión';
    if (e.includes('APROBADO')) return 'Aprobado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    if (e.includes('DISPONIBLE')) return 'Disponible';

    return estado || 'Desconocido';
  }
}