// src/app/pages/auditor/components/auditor-list/auditor-list.component.ts
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
  loading = true;
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // Filtros
  filtros = {
    numeroRadicado: '',
    numeroContrato: '',
    documentoContratista: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  };

  constructor(
    private auditorService: AuditorService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    this.loading = true;
    this.auditorService.obtenerDocumentosDisponibles().subscribe({
      next: (documentos) => {
        this.documentos = documentos;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar documentos:', error);
        this.notificationService.error('Error', 'No se pudieron cargar los documentos disponibles');
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    let documentosFiltrados = [...this.documentos];

    // Filtrar por término de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      documentosFiltrados = documentosFiltrados.filter(doc =>
        doc.numeroRadicado?.toLowerCase().includes(term) ||
        doc.numeroContrato?.toLowerCase().includes(term) ||
        doc.nombreContratista?.toLowerCase().includes(term) ||
        doc.documentoContratista?.toLowerCase().includes(term)
      );
    }

    // Filtrar por filtros específicos
    if (this.filtros.numeroRadicado) {
      documentosFiltrados = documentosFiltrados.filter(doc =>
        doc.numeroRadicado?.toLowerCase().includes(this.filtros.numeroRadicado.toLowerCase())
      );
    }

    if (this.filtros.numeroContrato) {
      documentosFiltrados = documentosFiltrados.filter(doc =>
        doc.numeroContrato?.toLowerCase().includes(this.filtros.numeroContrato.toLowerCase())
      );
    }

    if (this.filtros.documentoContratista) {
      documentosFiltrados = documentosFiltrados.filter(doc =>
        doc.documentoContratista?.toLowerCase().includes(this.filtros.documentoContratista.toLowerCase())
      );
    }

    if (this.filtros.estado) {
      documentosFiltrados = documentosFiltrados.filter(doc =>
        doc.estado === this.filtros.estado
      );
    }

    this.documentosFiltrados = documentosFiltrados;
    this.totalPages = Math.ceil(this.documentosFiltrados.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  get documentosPaginados(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.documentosFiltrados.slice(startIndex, startIndex + this.itemsPerPage);
  }

  tomarDocumento(documento: any): void {
    this.notificationService.confirm(
      'Tomar Documento',
      `¿Estás seguro de tomar el documento ${documento.numeroRadicado} para auditoría?`,
      () => {
        this.auditorService.tomarDocumentoParaRevision(documento.id).subscribe({
          next: (response) => {
            this.notificationService.success('Éxito', response.message || 'Documento tomado para auditoría');
            this.router.navigate(['/auditor/en-revision']);
          },
          error: (error) => {
            console.error('Error al tomar documento:', error);
            this.notificationService.error('Error', error.error?.message || 'No se pudo tomar el documento');
          }
        });
      }
    );
  }

  verDetalle(documento: any): void {
    this.router.navigate(['/auditor/documentos', documento.id]);
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtros = {
      numeroRadicado: '',
      numeroContrato: '',
      documentoContratista: '',
      estado: '',
      fechaDesde: '',
      fechaHasta: ''
    };
    this.aplicarFiltros();
  }

  buscarConFiltros(): void {
    this.auditorService.buscarDocumentos(this.filtros).subscribe({
      next: (documentos) => {
        this.documentos = documentos;
        this.aplicarFiltros();
        this.notificationService.success('Búsqueda completada', `Encontrados ${documentos.length} documentos`);
      },
      error: (error) => {
        console.error('Error en búsqueda:', error);
        this.notificationService.error('Error', 'No se pudo realizar la búsqueda');
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'APROBADO_SUPERVISOR':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  }

  getEstadoText(estado: string): string {
    const estados: Record<string, string> = {
      'APROBADO_SUPERVISOR': 'Aprobado por Supervisor',
      'EN_REVISION_AUDITOR': 'En Auditoría',
      'APROBADO_AUDITOR': 'Aprobado por Auditor',
      'OBSERVADO_AUDITOR': 'Observado por Auditor',
      'RECHAZADO_AUDITOR': 'Rechazado por Auditor',
      'COMPLETADO_AUDITOR': 'Completado por Auditor'
    };
    return estados[estado] || estado;
  }

  cambiarPagina(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
}