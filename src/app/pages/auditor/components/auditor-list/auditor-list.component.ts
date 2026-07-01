import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-auditor-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './auditor-list.component.html',
  styleUrls: ['./auditor-list.component.scss']
})
export class AuditorListComponent implements OnInit {
  documentos: any[] = [];
  documentosFiltrados: any[] = [];
  documentosPaginados: any[] = [];
  loading = true;
  isProcessing = false;
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  pages: number[] = [];
  errorMessage: string | null = null;
  successMessage: string | null = null;
  sidebarCollapsed = false;

  usuarioActual = '';

  constructor(
    private auditorService: AuditorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarMisAuditorias();
  }

  cargarUsuarioActual(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.usuarioActual = user.fullName || user.username || 'Auditor';
      } catch {
        this.usuarioActual = 'Auditor';
      }
    }
  }

  cargarMisAuditorias(): void {
    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.auditorService.obtenerMisAuditorias().subscribe({
      next: (response: any) => {
        // Extraer datos de la respuesta
        let data: any[] = [];
        if (response?.data && Array.isArray(response.data)) {
          data = response.data;
        } else if (Array.isArray(response)) {
          data = response;
        } else if (response?.documentos && Array.isArray(response.documentos)) {
          data = response.documentos;
        }

        console.log('[AuditorList] Datos CRUDOS recibidos:', data);

        // ✅ MAPEAR CORRECTAMENTE LOS DATOS
        this.documentos = data.map((item: any) => {
          // Si el item tiene un objeto documento anidado, extraerlo
          const doc = item.documento || item;

          // Retornar un objeto plano con todas las propiedades necesarias
          return {
            id: item.id || doc.id,
            numeroRadicado: doc.numeroRadicado || item.numeroRadicado || 'N/A',
            nombreContratista: doc.nombreContratista || item.nombreContratista || 'Sin nombre',
            documentoContratista: doc.documentoContratista || item.documentoContratista || 'Sin documento',
            numeroContrato: doc.numeroContrato || item.numeroContrato || 'Sin contrato',
            // ✅ IMPORTANTE: Tomar las fechas del documento o del item
            fechaInicio: doc.fechaInicio || item.fechaInicio || null,
            fechaFin: doc.fechaFin || item.fechaFin || null,
            fechaRadicacion: doc.fechaRadicacion || item.fechaRadicacion || null,
            estado: doc.estado || item.estado || '',
            auditorEstado: item.auditorEstado || doc.estado || '',
            auditorAsignado: item.auditorAsignado || doc.auditorAsignado || '',
            fechaInicioRevision: item.fechaInicioRevision || doc.fechaInicioRevision || null,
            observacionAuditor: item.observaciones || doc.observaciones || '',
            // Propiedades adicionales
            primerRadicadoDelAno: doc.primerRadicadoDelAno || false,
            tieneActa: doc.tieneActa || false,
            // Mantener el objeto original para referencia
            _original: item
          };
        });

        console.log('[AuditorList] Datos MAPEADOS:', this.documentos);
        if (this.documentos.length > 0) {
          console.log('[AuditorList] Primer documento mapeado:', {
            id: this.documentos[0].id,
            numeroRadicado: this.documentos[0].numeroRadicado,
            fechaInicio: this.documentos[0].fechaInicio,
            fechaFin: this.documentos[0].fechaFin
          });
        }

        // Calcular duración de revisión para cada documento
        this.documentos.forEach(doc => {
          if (doc.fechaInicioRevision) {
            const inicio = new Date(doc.fechaInicioRevision);
            const ahora = new Date();
            const diffMs = ahora.getTime() - inicio.getTime();
            const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (dias === 0) {
              const horas = Math.floor(diffMs / (1000 * 60 * 60));
              doc.duracionRevision = horas < 1 ? 'Menos de 1h' : `${horas}h`;
            } else {
              doc.duracionRevision = dias === 1 ? '1 día' : `${dias} días`;
            }
          } else {
            doc.duracionRevision = 'No iniciada';
          }
        });

        this.aplicarFiltros();
        this.loading = false;

        if (this.documentos.length > 0) {
          const recientes = this.documentos.filter(doc => this.esDocumentoReciente(doc));
          this.successMessage = `Se encontraron ${this.documentos.length} auditorías asignadas (${recientes.length} recientes)`;
        }
      },
      error: (err) => {
        console.error('[AuditorList] Error:', err);
        this.errorMessage = 'No se pudieron cargar tus auditorías asignadas';
        this.notificationService.error('Error', this.errorMessage);
        this.loading = false;
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
        doc.auditorEstado?.toLowerCase().includes(term) ||
        doc.documentoContratista?.toLowerCase().includes(term) ||
        doc.auditorAsignado?.toLowerCase().includes(term)
      );
    }
    this.documentosFiltrados = filtrados;
    this.totalPages = Math.ceil(this.documentosFiltrados.length / this.itemsPerPage);
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.documentosFiltrados.length / this.itemsPerPage);
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

    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.documentosPaginados = this.documentosFiltrados.slice(start, start + this.itemsPerPage);
  }

  cambiarPagina(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  verDetalle(doc: any): void {
    const esMio = doc.auditorAsignado?.toLowerCase().trim() === this.usuarioActual.toLowerCase().trim();
    const esEditable = doc.auditorEstado?.includes('EN_REVISION_AUDITOR') && esMio;

    this.router.navigate(['/auditor/revisar', doc.id], {
      queryParams: {
        modo: esEditable ? 'edicion' : 'consulta',
        soloLectura: esEditable ? 'false' : 'true',
        desdeLista: 'true'
      }
    });
  }

  esDocumentoReciente(doc: any): boolean {
    const fecha = doc.fechaInicioRevision || doc.fechaRadicacion || doc.fechaCreacion;
    if (!fecha) return false;
    try {
      const dias = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
      return dias <= 3;
    } catch {
      return false;
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('APROBADO_AUDITOR') || e.includes('COMPLETADO')) return 'bg-success';
    if (e.includes('OBSERVADO_AUDITOR') || e.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (e.includes('RECHAZADO_AUDITOR') || e.includes('RECHAZADO')) return 'bg-danger';
    if (e.includes('EN_REVISION_AUDITOR') || e.includes('EN_REVISION')) return 'bg-info';
    if (e.includes('APROBADO_SUPERVISOR')) return 'bg-primary';
    if (e.includes('APROBADO')) return 'bg-success';
    if (e.includes('PENDIENTE')) return 'bg-secondary';
    return 'bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('APROBADO_AUDITOR')) return 'Aprobado Auditor';
    if (e.includes('COMPLETADO_AUDITOR')) return 'Completado';
    if (e.includes('OBSERVADO_AUDITOR')) return 'Observado';
    if (e.includes('RECHAZADO_AUDITOR')) return 'Rechazado';
    if (e.includes('EN_REVISION_AUDITOR')) return 'En Revisión';
    if (e.includes('APROBADO_SUPERVISOR')) return 'Aprobado Supervisor';
    if (e.includes('RECHAZADO_SUPERVISOR')) return 'Rechazado Supervisor';
    if (e.includes('APROBADO')) return 'Aprobado';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('COMPLETADO')) return 'Completado';
    if (e.includes('PENDIENTE')) return 'Pendiente';
    return estado || 'Desconocido';
  }
}