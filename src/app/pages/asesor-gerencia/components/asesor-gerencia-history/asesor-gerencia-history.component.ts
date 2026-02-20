import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AsesorGerenciaService } from '../../../../core/services/asesor-gerencia.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-asesor-gerencia-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './asesor-gerencia-history.component.html',
  styleUrls: ['./asesor-gerencia-history.component.scss']
})
export class AsesorGerenciaHistoryComponent implements OnInit, OnDestroy {
  historial: any[] = [];
  filteredHistorial: any[] = [];
  paginatedHistorial: any[] = [];

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

  private destroy$ = new Subject<void>();

  constructor(
    private asesorGerenciaService: AsesorGerenciaService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Asesor Gerencia: Inicializando historial de revisiones...');
    this.cargarUsuarioActual();
    this.loadHistorial();
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
        console.log('👤 Usuario actual de asesor gerencia:', this.usuarioActual);
      } catch (error) {
        console.error('Error parseando usuario:', error);
        this.usuarioActual = 'Asesor Gerencia';
      }
    }
  }

  loadHistorial(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.infoMessage = '';

    this.asesorGerenciaService.getHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📊 Respuesta del historial de revisiones:', response);

          if (response.success) {
            this.historial = response.data || [];
            console.log('✅ Historial cargado con', this.historial.length, 'revisiones');

            // Ordenar por fecha más reciente primero
            this.historial.sort((a, b) => {
              const fechaA = new Date(a.fechaFinRevision || a.fechaActualizacion || a.createdAt);
              const fechaB = new Date(b.fechaFinRevision || b.fechaActualizacion || b.createdAt);
              return fechaB.getTime() - fechaA.getTime();
            });

            this.filteredHistorial = [...this.historial];
            this.updatePagination();

            if (this.filteredHistorial.length > 0) {
              const recientes = this.filteredHistorial.filter(item => this.esRevisionReciente(item));
              const completados = this.filteredHistorial.filter(item => item.estado === 'COMPLETADO_ASESOR_GERENCIA').length;
              const enRevision = this.filteredHistorial.filter(item => item.estado === 'EN_REVISION_ASESOR_GERENCIA').length;
              const observados = this.filteredHistorial.filter(item => item.estado === 'OBSERVADO_ASESOR_GERENCIA').length;
              const rechazados = this.filteredHistorial.filter(item => item.estado === 'RECHAZADO_ASESOR_GERENCIA').length;
              
              this.successMessage = `${this.filteredHistorial.length} revisiones (${completados} completadas, ${enRevision} en proceso, ${observados} observadas, ${rechazados} rechazadas, ${recientes.length} recientes)`;
            } else {
              this.infoMessage = 'No hay revisiones en el historial';
            }
          } else {
            this.error = response.message || 'Error al cargar el historial de revisiones';
            this.notificationService.error('Error', this.error);
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Error de conexión con el servidor: ' + err.message;
          this.loading = false;
          console.error('Error:', err);

          if (err.status === 404 || err.status === 0) {
            this.infoMessage = 'El servicio de historial no está disponible temporalmente';
            this.historial = [];
            this.filteredHistorial = [];
            this.updatePagination();
          } else {
            this.notificationService.error('Error', this.error);
          }
        }
      });
  }

  verDetalleRevision(item: any): void {
    const documentoId = item.documentoId || item.documento?.id;
    
    if (!documentoId) {
      this.notificationService.error('Error', 'No se pudo identificar el documento');
      return;
    }

    const esSoloLectura = item.estado === 'COMPLETADO_ASESOR_GERENCIA' || 
                         item.estado === 'RECHAZADO_ASESOR_GERENCIA' || 
                         item.estado === 'OBSERVADO_ASESOR_GERENCIA';

    this.router.navigate(['/asesor-gerencia/procesar', documentoId], {
      queryParams: {
        desdeHistorial: 'true',
        soloLectura: esSoloLectura ? 'true' : 'false',
        modo: esSoloLectura ? 'consulta' : 'edicion',
        origen: 'historial-gerencia'
      }
    });
  }

  continuarRevision(item: any): void {
    const documentoId = item.documentoId || item.documento?.id;
    
    if (!documentoId) {
      this.notificationService.error('Error', 'No se pudo identificar el documento');
      return;
    }

    if (item.estado !== 'EN_REVISION_ASESOR_GERENCIA' || !this.esMiRevision(item)) {
      this.notificationService.warning('No permitido', 'Solo puedes continuar revisiones en proceso y asignadas a ti');
      return;
    }

    this.router.navigate(['/asesor-gerencia/procesar', documentoId], {
      queryParams: {
        desdeHistorial: 'true',
        soloLectura: 'false',
        modo: 'edicion',
        origen: 'historial-gerencia'
      }
    });
  }

  verAprobacion(item: any): void {
    const documentoId = item.documentoId || item.documento?.id;
    
    if (!documentoId) {
      this.notificationService.error('Error', 'No se pudo identificar el documento');
      return;
    }

    // Asumiendo que tienes un método para descargar/ver aprobación
    this.asesorGerenciaService.descargarArchivo(documentoId, 'aprobacion')
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `aprobacion_${item.documento?.numeroRadicado || 'revision'}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          this.notificationService.success('Éxito', 'Aprobación descargada correctamente');
        },
        error: (err) => {
          this.notificationService.error('Error', 'No se pudo descargar la aprobación');
        }
      });
  }

  getResponsableRevision(item: any): string {
    return item.asesorGerencia || 
           item.usuarioResponsable?.fullName ||
           item.usuarioResponsable?.username ||
           item.documento?.usuarioAsignadoNombre ||
           this.usuarioActual ||
           'Asesor Gerencia';
  }

  getEstadoRevisionBadgeClass(estado: string): string {
    if (!estado) return 'badge-default';

    const upper = estado.toUpperCase();

    if (upper === 'COMPLETADO_ASESOR_GERENCIA') return 'badge-completado';
    if (upper === 'EN_REVISION_ASESOR_GERENCIA') return 'badge-en-revision';
    if (upper === 'OBSERVADO_ASESOR_GERENCIA') return 'badge-warning';
    if (upper === 'RECHAZADO_ASESOR_GERENCIA') return 'badge-rechazado';
    return 'badge-default';
  }

  getEstadoRevisionTexto(estado: string): string {
    if (!estado) return 'Desconocido';
    
    switch (estado.toUpperCase()) {
      case 'COMPLETADO_ASESOR_GERENCIA': return 'Completado Gerencia';
      case 'EN_REVISION_ASESOR_GERENCIA': return 'En Revisión';
      case 'OBSERVADO_ASESOR_GERENCIA': return 'Observado';
      case 'RECHAZADO_ASESOR_GERENCIA': return 'Rechazado';
      default: return estado;
    }
  }

  getAccesoTexto(item: any): string {
    switch (item.estado?.toUpperCase()) {
      case 'COMPLETADO_ASESOR_GERENCIA':
      case 'RECHAZADO_ASESOR_GERENCIA':
        return 'Solo lectura';
      case 'EN_REVISION_ASESOR_GERENCIA':
        return 'Editable';
      default:
        return 'Acceso limitado';
    }
  }

  esMiRevision(item: any): boolean {
    const responsable = this.getResponsableRevision(item);
    return responsable === this.usuarioActual;
  }

  esRevisionReciente(item: any): boolean {
    const fecha = item.fechaFinRevision || item.fechaActualizacion || item.updatedAt;
    if (!fecha) return false;

    try {
      const fechaObj = new Date(fecha);
      const ahora = new Date();
      const diferenciaDias = Math.floor((ahora.getTime() - fechaObj.getTime()) / (1000 * 60 * 60 * 24));
      return diferenciaDias <= 7;
    } catch {
      return false;
    }
  }

  getDuracionProceso(item: any): string {
    const fechaInicio = item.fechaInicioRevision || item.fechaCreacion;
    const fechaFin = item.fechaFinRevision || item.fechaActualizacion || new Date();

    if (!fechaInicio) return 'N/A';

    try {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      const diffMs = fin.getTime() - inicio.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          return `${diffMinutes} min`;
        }
        return `${diffHours} h`;
      } else if (diffDays === 1) {
        return '1 día';
      } else {
        return `${diffDays} días`;
      }
    } catch {
      return 'N/A';
    }
  }

  formatDate(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
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

  getNumeroRadicado(item: any): string {
    return item.documento?.numeroRadicado || 
           item.numeroRadicado || 
           'N/A';
  }

  getNombreContratista(item: any): string {
    return item.documento?.nombreContratista || 
           item.nombreContratista || 
           'N/A';
  }

  getDocumentoContratista(item: any): string {
    return item.documento?.documentoContratista || 
           item.documentoContratista || 
           'N/A';
  }

  getNumeroContrato(item: any): string {
    return item.documento?.numeroContrato || 
           item.numeroContrato || 
           'N/A';
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredHistorial = [...this.historial];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredHistorial = this.historial.filter(item => {
        const doc = item.documento || item;
        return (
          (doc.numeroRadicado?.toLowerCase().includes(term)) ||
          (doc.nombreContratista?.toLowerCase().includes(term)) ||
          (doc.numeroContrato?.toLowerCase().includes(term)) ||
          (doc.documentoContratista?.toLowerCase().includes(term)) ||
          (item.estado?.toLowerCase().includes(term)) ||
          (item.observaciones?.toLowerCase().includes(term))
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredHistorial.length / this.pageSize);

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
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredHistorial.length);
    this.paginatedHistorial = this.filteredHistorial.slice(startIndex, endIndex);
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
    this.loadHistorial();
  }
}