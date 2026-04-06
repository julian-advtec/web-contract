// src/app/pages/contratistas/components/contratista-list/contratista-list.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { Contratista } from '../../../../core/models/contratista.model';

@Component({
  selector: 'app-contratista-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contratista-list.component.html',
  styleUrls: ['./contratista-list.component.scss']
})
export class ContratistaListComponent implements OnInit {
  @Input() sidebarCollapsed = false;

  Math = Math;

  contratistas: Contratista[] = [];
  filteredContratistas: Contratista[] = [];
  paginatedContratistas: Contratista[] = [];

  isLoading = false;
  searchTerm = '';
  errorMessage = '';
  showError = false;
  showSuccess = false;
  successMessage = '';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  pages: number[] = [];

  filtroTipoContratista = '';
  filtroEstado = '';

  tiposContratista = [
    { value: 'PERSONA_NATURAL', label: 'Persona Natural' },
    { value: 'PERSONA_JURIDICA', label: 'Persona Jurídica' },
    { value: 'CONSORCIO', label: 'Consorcio' },
    { value: 'UNION_TEMPORAL', label: 'Unión Temporal' }
  ];

  estados = [
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
    { value: 'SUSPENDIDO', label: 'Suspendido' }
  ];

  constructor(
    private contratistaService: ContratistasService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarContratistas();
  }

  cargarContratistas(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.showError = false;

    this.contratistaService.obtenerTodos().subscribe({
      next: (contratistas) => {
        this.contratistas = contratistas || [];
        // Ordenar por estado (ACTIVOS primero)
        this.contratistas.sort((a, b) => {
          const estadoOrder = { 'ACTIVO': 1, 'SUSPENDIDO': 2, 'INACTIVO': 3 };
          return (estadoOrder[a.estado as keyof typeof estadoOrder] || 4) - 
                 (estadoOrder[b.estado as keyof typeof estadoOrder] || 4);
        });
        this.filteredContratistas = [...this.contratistas];
        this.updatePagination();
        this.isLoading = false;

        if (this.contratistas.length === 0) {
          this.showSuccess = true;
          this.successMessage = 'No hay contratistas registrados';
          setTimeout(() => this.showSuccess = false, 3000);
        }
      },
      error: (error) => {
        console.error('Error cargando contratistas:', error);
        this.errorMessage = error.message || 'Error al cargar los contratistas';
        this.showError = true;
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let filtrados = [...this.contratistas];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(c =>
        (c.razonSocial || c.nombreCompleto || '').toLowerCase().includes(term) ||
        c.documentoIdentidad.includes(term) ||
        (c.numeroContrato && c.numeroContrato.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    }

    if (this.filtroTipoContratista) {
      filtrados = filtrados.filter(c => c.tipoContratista === this.filtroTipoContratista);
    }

    if (this.filtroEstado) {
      filtrados = filtrados.filter(c => c.estado === this.filtroEstado);
    }

    this.filteredContratistas = filtrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtroTipoContratista = '';
    this.filtroEstado = '';
    this.filteredContratistas = [...this.contratistas];
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredContratistas.length / this.pageSize);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedContratistas();
  }

  updatePaginatedContratistas(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedContratistas = this.filteredContratistas.slice(start, start + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedContratistas();
    }
  }

  getTipoClass(tipo: string | undefined): string {
    const clases: Record<string, string> = {
      'PERSONA_NATURAL': 'bg-primary',
      'PERSONA_JURIDICA': 'bg-success',
      'CONSORCIO': 'bg-warning text-dark',
      'UNION_TEMPORAL': 'bg-info'
    };
    return clases[tipo || ''] || 'bg-secondary';
  }

  getEstadoClass(estado: string | undefined): string {
    const clases: Record<string, string> = {
      'ACTIVO': 'active',
      'INACTIVO': 'inactive',
      'SUSPENDIDO': 'warning'
    };
    return clases[estado || ''] || 'pending';
  }

  getEstadoTexto(estado: string | undefined): string {
    const textos: Record<string, string> = {
      'ACTIVO': 'Activo',
      'INACTIVO': 'Inactivo',
      'SUSPENDIDO': 'Suspendido'
    };
    return textos[estado || ''] || estado || 'N/A';
  }

  getTipoTexto(tipo: string | undefined): string {
    const textos: Record<string, string> = {
      'PERSONA_NATURAL': 'Persona Natural',
      'PERSONA_JURIDICA': 'Persona Jurídica',
      'CONSORCIO': 'Consorcio',
      'UNION_TEMPORAL': 'Unión Temporal'
    };
    return textos[tipo || ''] || tipo || 'N/A';
  }

  // ✅ VER DETALLE
  verDetalle(contratista: Contratista): void {
    if (contratista && contratista.id) {
      console.log('👁️ Ver detalle:', contratista.id);
      this.router.navigate(['/contratistas/ver', contratista.id]);
    } else {
      this.errorMessage = 'No se puede ver el detalle del contratista';
      this.showError = true;
    }
  }

  // ✅ EDITAR
  editarContratista(contratista: Contratista): void {
    if (contratista && contratista.id) {
      console.log('✏️ Editar contratista:', contratista.id);
      this.router.navigate(['/contratistas/editar', contratista.id]);
    } else {
      this.errorMessage = 'No se puede editar el contratista';
      this.showError = true;
    }
  }

  // ✅ VER DOCUMENTOS
  verDocumentos(contratista: Contratista): void {
    if (contratista && contratista.id) {
      console.log('📄 Ver documentos de contratista:', contratista.id);
      this.router.navigate(['/contratistas/documentos', contratista.id]);
    } else {
      this.errorMessage = 'No se pueden ver los documentos del contratista';
      this.showError = true;
    }
  }

  // ✅ DESCARGAR DOCUMENTOS (MÚLTIPLES)
  descargarDocumentoContratista(contratista: Contratista): void {
    if (!contratista || !contratista.id) {
      this.errorMessage = 'No se puede descargar el documento';
      this.showError = true;
      setTimeout(() => this.showError = false, 3000);
      return;
    }

    this.contratistaService.obtenerDocumentos(contratista.id).subscribe({
      next: (documentos) => {
        if (!documentos || documentos.length === 0) {
          this.errorMessage = 'Este contratista no tiene documentos asociados';
          this.showError = true;
          setTimeout(() => this.showError = false, 3000);
          return;
        }

        if (documentos.length === 1) {
          this.descargarDocumento(contratista.id!, documentos[0].id, documentos[0].nombreArchivo);
        } else {
          this.seleccionarDocumentoParaDescargar(contratista, documentos);
        }
      },
      error: (error) => {
        console.error('Error obteniendo documentos:', error);
        this.errorMessage = 'Error al obtener los documentos';
        this.showError = true;
        setTimeout(() => this.showError = false, 3000);
      }
    });
  }

  private descargarDocumento(contratistaId: string, documentoId: string, nombreArchivo: string): void {
    this.contratistaService.descargarDocumento(contratistaId, documentoId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = 'Documento descargado exitosamente';
        this.showSuccess = true;
        setTimeout(() => this.showSuccess = false, 3000);
      },
      error: (error) => {
        console.error('Error descargando documento:', error);
        this.errorMessage = 'Error al descargar el documento';
        this.showError = true;
        setTimeout(() => this.showError = false, 3000);
      }
    });
  }

  private seleccionarDocumentoParaDescargar(contratista: Contratista, documentos: any[]): void {
    const tipos = documentos.map((d, i) => `${i + 1}. ${d.tipo} - ${d.nombreArchivo}`).join('\n');
    const seleccion = prompt(`Seleccione el documento a descargar:\n${tipos}\n\nIngrese el número (1-${documentos.length}):`);

    if (seleccion) {
      const index = parseInt(seleccion) - 1;
      if (index >= 0 && index < documentos.length) {
        this.descargarDocumento(contratista.id!, documentos[index].id, documentos[index].nombreArchivo);
      } else {
        this.errorMessage = 'Selección inválida';
        this.showError = true;
        setTimeout(() => this.showError = false, 3000);
      }
    }
  }

  nuevoContratista(): void {
    this.router.navigate(['/contratistas/crear']);
  }

  dismissError(): void {
    this.showError = false;
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.showSuccess = false;
    this.successMessage = '';
  }
}