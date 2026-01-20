import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Documento } from '../../../../core/models/documento.model';

@Component({
  selector: 'app-auditor-pending-list',
  templateUrl: './auditor-pending-list.component.html',
  styleUrls: ['./auditor-pending-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class AuditorPendingListComponent implements OnInit, OnDestroy {
  // Lista de documentos APROBADOS_SUPERVISOR
  documentos: Documento[] = [];
  filteredDocumentos: Documento[] = [];
  paginatedDocumentos: Documento[] = [];

  // Estados de carga
  isLoading = false;
  isProcessing = false;

  // Mensajes
  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  // Búsqueda y paginación
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  // Sidebar
  sidebarCollapsed = false;

  // Usuario actual
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private auditorService: AuditorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Auditor: Inicializando lista de documentos pendientes...');
    this.cargarUsuarioActual();
    this.cargarDocumentosDisponibles();
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
        console.log('👤 Auditor actual:', this.usuarioActual);
      } catch (error) {
        console.error('Error parseando usuario:', error);
        this.usuarioActual = 'Auditor';
      }
    }
  }

  cargarDocumentosDisponibles(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('📋 Auditor: Solicitando documentos disponibles...');

    this.auditorService.obtenerDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documentosArray: Documento[]) => {
          console.log('✅ Documentos disponibles recibidos:', documentosArray);

          // Filtrar solo documentos con estado APROBADO_SUPERVISOR
          const documentosAprobados = documentosArray.filter(doc => {
            const estado = doc.estado?.toUpperCase() || '';
            return estado.includes('APROBADO_SUPERVISOR');
          });

          console.log(`📊 Documentos en estado APROBADO_SUPERVISOR: ${documentosAprobados.length}`);
          this.documentos = documentosAprobados;
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();

          console.log(`✅ ${this.documentos.length} documentos disponibles cargados`);
          this.isLoading = false;

          if (this.documentos.length === 0) {
            this.infoMessage = 'No hay documentos disponibles para auditoría';
          } else {
            this.successMessage = `Se encontraron ${this.documentos.length} documentos para auditoría`;
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          }
        },
        error: (error) => {
          console.error('❌ Error al cargar documentos:', error);
          this.errorMessage = 'Error al cargar documentos: ' + (error.message || 'Error desconocido');
          this.isLoading = false;
          this.notificationService.error('Error', this.errorMessage);
        }
      });
  }

  tomarParaAuditoria(doc: Documento): void {
    console.log(`🤝 Auditor: Tomando documento ${doc.numeroRadicado} para auditoría...`);

    // Verificar estado actual
    if (doc.estado !== 'APROBADO_SUPERVISOR') {
      this.notificationService.warning('Documento no disponible',
        `Este documento ya no está disponible. Estado actual: ${doc.estado}`);
      return;
    }

    this.isProcessing = true;

    const confirmar = confirm(`¿Tomar el documento ${doc.numeroRadicado} para auditoría?\n\nEsto cambiará el estado a "EN REVISIÓN AUDITOR" y otros auditores no podrán acceder a él.`);

    if (!confirmar) {
      this.isProcessing = false;
      return;
    }

    this.auditorService.tomarDocumentoParaAuditoria(doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado: any) => {
          console.log('✅ Respuesta de tomar documento:', resultado);

          // Actualizar estado localmente
          const index = this.documentos.findIndex(d => d.id === doc.id);
          if (index !== -1) {
            this.documentos[index].estado = 'EN_REVISION_AUDITOR';
            this.documentos[index].auditorAsignado = this.usuarioActual;
            this.documentos[index].fechaAsignacionAuditor = new Date();
            this.documentos[index].estadoAuditor = 'EN_REVISION';
            this.documentos[index].ultimoUsuario = `Auditor: ${this.usuarioActual}`;
            this.documentos[index].fechaActualizacion = new Date();
          }

          this.notificationService.success('Éxito', 'Documento tomado para auditoría. Estado actualizado.');
          this.isProcessing = false;

          // Actualizar la lista filtrada y paginada
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();

          // Navegar al formulario de revisión
          setTimeout(() => {
            this.router.navigate(['/auditor/revisar', doc.id]);
          }, 500);
        },
        error: (error: any) => {
          console.error('❌ Error tomando documento:', error);
          this.notificationService.error('Error', error.message || 'No se pudo tomar el documento');
          this.isProcessing = false;
        }
      });
  }

  // Métodos auxiliares
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

  formatDateShort(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getDiasTranscurridos(fecha: Date | string): number {
    if (!fecha) return 0;
    try {
      const fechaDoc = new Date(fecha);
      const hoy = new Date();
      const diferenciaMs = hoy.getTime() - fechaDoc.getTime();
      return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  esDocumentoReciente(doc: Documento): boolean {
    if (!doc?.fechaAprobacionSupervisor) return false;
    const diasTranscurridos = this.getDiasTranscurridos(doc.fechaAprobacionSupervisor);
    return diasTranscurridos < 1; // Menos de 24 horas
  }

  getEstadoClass(estado: string): string {
    if (!estado) return 'badge-secondary';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('APROBADO_SUPERVISOR')) return 'badge-success';
    if (estadoUpper.includes('EN_REVISION_AUDITOR')) return 'badge-warning';
    if (estadoUpper.includes('APROBADO_AUDITOR')) return 'badge-primary';
    if (estadoUpper.includes('OBSERVADO_AUDITOR')) return 'badge-info';
    if (estadoUpper.includes('RECHAZADO_AUDITOR')) return 'badge-danger';
    if (estadoUpper.includes('COMPLETADO_AUDITOR')) return 'badge-primary';

    return 'badge-secondary';
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('APROBADO_SUPERVISOR')) return 'Aprobado Supervisor';
    if (estadoUpper.includes('EN_REVISION_AUDITOR')) return 'En Revisión Auditor';
    if (estadoUpper.includes('APROBADO_AUDITOR')) return 'Aprobado Auditor';
    if (estadoUpper.includes('OBSERVADO_AUDITOR')) return 'Observado Auditor';
    if (estadoUpper.includes('RECHAZADO_AUDITOR')) return 'Rechazado Auditor';
    if (estadoUpper.includes('COMPLETADO_AUDITOR')) return 'Completado Auditor';

    return estado;
  }

  getDiasClass(doc: Documento): string {
    const dias = this.getDiasTranscurridos(doc.fechaAprobacionSupervisor || doc.fechaRadicacion);

    if (dias < 1) return 'text-success'; // Menos de 1 día
    if (dias <= 3) return 'text-primary'; // 1-3 días
    if (dias <= 7) return 'text-warning'; // 4-7 días
    return 'text-danger'; // Más de 7 días
  }

  getDocumentCount(doc: Documento): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc => {
        return (
          (doc.numeroRadicado?.toLowerCase().includes(term)) ||
          (doc.nombreContratista?.toLowerCase().includes(term)) ||
          (doc.numeroContrato?.toLowerCase().includes(term)) ||
          (doc.documentoContratista?.toLowerCase().includes(term))
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  refreshData(): void {
    console.log('🔄 Auditor: Recargando datos...');
    this.cargarDocumentosDisponibles();
  }

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

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }

  // Verificar si es primer radicado del año
  esPrimerRadicado(doc: Documento): boolean {
    return doc.primerRadicadoDelAno === true;
  }

  // Obtener texto para botón de tomar
  getTextoBoton(doc: Documento): string {
    if (doc.estado === 'EN_REVISION_AUDITOR' && doc.auditorAsignado === this.usuarioActual) {
      return 'Continuar Revisión';
    }
    return 'Tomar para Auditoría';
  }

  // Verificar si puede tomar el documento
  puedeTomarDocumento(doc: Documento): boolean {
    if (doc.estado !== 'APROBADO_SUPERVISOR') {
      return false;
    }
    
    // Si ya está en revisión, solo puede continuar el auditor asignado
    if (doc.estado === 'EN_REVISION_AUDITOR') {
      return doc.auditorAsignado === this.usuarioActual;
    }
    
    return true;
  }
}