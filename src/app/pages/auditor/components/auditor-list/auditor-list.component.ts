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
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  errorMessage: string | null = null;

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

    this.auditorService.obtenerMisAuditorias().subscribe({
      next: (response: any) => {
        this.documentos = response?.data || [];
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
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
        doc.auditorEstado?.toLowerCase().includes(term)
      );
    }
    this.documentosFiltrados = filtrados;
    this.totalPages = Math.ceil(this.documentosFiltrados.length / this.itemsPerPage);
    this.actualizarPaginacion();
  }

  actualizarPaginacion(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.documentosPaginados = this.documentosFiltrados.slice(start, start + this.itemsPerPage);
  }

  cambiarPagina(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.actualizarPaginacion();
    }
  }

  verDetalle(doc: any): void {
    const esMio = doc.auditorAsignado === this.usuarioActual;
    const esEditable = doc.auditorEstado?.includes('EN_REVISION_AUDITOR') && esMio;

    this.router.navigate(['/auditor/revisar', doc.id], {
      queryParams: {
        modo: esEditable ? 'edicion' : 'consulta',
        soloLectura: esEditable ? 'false' : 'true'
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('APROBADO')) return 'bg-success';
    if (e.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (e.includes('RECHAZADO')) return 'bg-danger';
    if (e.includes('EN_REVISION')) return 'bg-info';
    if (e.includes('COMPLETADO')) return 'bg-primary';
    return 'bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('EN_REVISION')) return 'En Revisión';
    if (e.includes('APROBADO')) return 'Aprobado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    if (e.includes('COMPLETADO')) return 'Completado';
    return 'Pendiente';
  }
}