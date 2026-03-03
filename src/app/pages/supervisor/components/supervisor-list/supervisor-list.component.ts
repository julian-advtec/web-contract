// src/app/pages/supervisor/components/supervisor-list/supervisor-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupervisorService } from '../../../../core/services/supervisor/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-supervisor-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './supervisor-list.component.html',
  styleUrls: ['./supervisor-list.component.scss']
})
export class SupervisorListComponent implements OnInit {
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
    private supervisorService: SupervisorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarMisSupervisiones();
  }

  cargarUsuarioActual(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.usuarioActual = user.fullName || user.username || 'Supervisor';
      } catch {
        this.usuarioActual = 'Supervisor';
      }
    }
  }

  cargarMisSupervisiones(): void {
    this.loading = true;
    this.errorMessage = null;

    // AHORA SÍ EXISTE EL MÉTODO
    this.supervisorService.obtenerMisSupervisiones().subscribe({
      next: (documentos: any[]) => {
        this.documentos = documentos || [];
        console.log('📊 Mis supervisiones cargadas:', this.documentos.length);
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err: any) => {  // <-- Aquí especificamos el tipo 'any'
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
    const esMiDocumento = doc.supervisorAsignado === this.usuarioActual;
    // Solo editable si está EN_REVISION y es mío
    const esEditable = doc.supervisorEstado === 'EN_REVISION' && esMiDocumento;

    this.router.navigate(['/supervisor/revisar', doc.id], {
      queryParams: {
        modo: esEditable ? 'edicion' : 'consulta',
        soloLectura: esEditable ? 'false' : 'true'
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const e = (estado || '').toUpperCase();
    
    if (e === 'EN_REVISION') return 'bg-info';
    if (e === 'APROBADO') return 'bg-success';
    if (e === 'OBSERVADO') return 'bg-warning text-dark';
    if (e === 'RECHAZADO') return 'bg-danger';
    if (e === 'DISPONIBLE') return 'bg-secondary';
    
    return 'bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    const e = (estado || '').toUpperCase();
    
    if (e === 'EN_REVISION') return 'En Revisión';
    if (e === 'APROBADO') return 'Aprobado';
    if (e === 'OBSERVADO') return 'Observado';
    if (e === 'RECHAZADO') return 'Rechazado';
    if (e === 'DISPONIBLE') return 'Disponible';
    
    return estado || 'Desconocido';
  }
}