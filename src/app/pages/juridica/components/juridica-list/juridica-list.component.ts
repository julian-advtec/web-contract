// src/app/pages/juridica/components/juridica-list/juridica-list.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { JuridicaService } from '../../../../core/services/juridica.service';
import { Contrato } from '../../../../core/models/juridica.model';

@Component({
  selector: 'app-juridica-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './juridica-list.component.html',
  styleUrls: ['./juridica-list.component.scss']
})
export class JuridicaListComponent implements OnInit {
  @Input() sidebarCollapsed = false;
  
  Math = Math;
  
  contratos: Contrato[] = [];
  filteredContratos: Contrato[] = [];
  paginatedContratos: Contrato[] = [];

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

  // Filtros
  filtroVigencia = '';
  filtroEstado = '';
  vigencias: string[] = [];

  constructor(
    private juridicaService: JuridicaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarContratos();
  }

  cargarContratos(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.showError = false;

    this.juridicaService.obtenerContratos().subscribe({
      next: (contratos) => {
        this.contratos = contratos || [];
        this.generarVigencias();
        this.filteredContratos = [...this.contratos];
        this.updatePagination();
        this.isLoading = false;

        if (this.contratos.length === 0) {
          this.showSuccess = true;
          this.successMessage = 'No hay contratos registrados';
          setTimeout(() => this.showSuccess = false, 3000);
        }
      },
      error: (error) => {
        console.error('Error cargando contratos:', error);
        this.errorMessage = 'Error al cargar los contratos';
        this.showError = true;
        this.isLoading = false;
      }
    });
  }

  generarVigencias(): void {
    const años = new Set(this.contratos.map(c => c.vigencia));
    this.vigencias = Array.from(años).sort().reverse();
  }

  onSearch(): void {
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let filtrados = [...this.contratos];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(c =>
        c.numeroContrato.toLowerCase().includes(term) ||
        c.proveedor.nombreRazonSocial.toLowerCase().includes(term) ||
        c.proveedor.numeroIdentificacion.includes(term) ||
        c.objeto.toLowerCase().includes(term)
      );
    }

    if (this.filtroVigencia) {
      filtrados = filtrados.filter(c => c.vigencia === this.filtroVigencia);
    }

    if (this.filtroEstado) {
      filtrados = filtrados.filter(c => c.estado === this.filtroEstado);
    }

    this.filteredContratos = filtrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtroVigencia = '';
    this.filtroEstado = '';
    this.filteredContratos = [...this.contratos];
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredContratos.length / this.pageSize);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedContratos();
  }

  updatePaginatedContratos(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedContratos = this.filteredContratos.slice(start, start + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedContratos();
    }
  }

  getEstadoSimplificado(estado: string): string {
    const estadosActivos = ['FIRMADO', 'EN_EJECUCION', 'BORRADOR', 'EN_APROBACION'];
    const estadosInactivos = ['TERMINADO', 'LIQUIDADO', 'SUSPENDIDO'];
    
    if (estadosActivos.includes(estado)) {
      return 'ACTIVO';
    }
    if (estadosInactivos.includes(estado)) {
      return 'INACTIVO';
    }
    return 'ACTIVO';
  }

  getDiasRestantes(fechaTerminacion: Date | string): number | null {
    if (!fechaTerminacion) return null;
    const hoy = new Date();
    const fin = new Date(fechaTerminacion);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  formatearFecha(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO');
  }

  verDetalle(contrato: Contrato): void {
    this.router.navigate(['/juridica/ver', contrato.id]);
  }

  nuevoContrato(): void {
    this.router.navigate(['/juridica/crear']);
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