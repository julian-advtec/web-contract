import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ← Necesario para ngModel
import { ContabilidadService } from '../../../../core/services/contabilidad.service';

@Component({
  selector: 'app-contabilidad-rechazados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule   // ← AGREGAR ESTO OBLIGATORIO para ngModel
  ],
  templateUrl: './contabilidad-rechazados.component.html',
  styleUrls: ['./contabilidad-rechazados.component.scss']
})
export class ContabilidadRechazadosComponent implements OnInit {
  documentos: any[] = [];
  filteredDocumentos: any[] = [];
  paginatedDocumentos: any[] = [];

  loading = true;
  searchTerm = '';
  errorMessage = '';
  successMessage = '';

  currentPage = 1;
  pageSize = 12;
  totalPages = 1;
  pages: number[] = [];

  sidebarCollapsed = false;

  constructor(private contabilidadService: ContabilidadService) {}

  ngOnInit() {
    this.cargarRechazados();
  }

  cargarRechazados() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.contabilidadService.obtenerRechazadosVisibles().subscribe({
      next: (res: any) => {
        this.documentos = res.data || [];
        this.filtrarYPaginar();

        this.loading = false;

        if (this.documentos.length === 0) {
          this.successMessage = 'No hay documentos rechazados por roles superiores';
        } else {
          this.successMessage = `Encontrados ${this.documentos.length} documentos rechazados visibles`;
          setTimeout(() => this.successMessage = '', 4000);
        }
      },
      error: (err: any) => {  // ← Tipado explícito para evitar error TS
        console.error('[RECHAZADOS] Error:', err);
        this.errorMessage = err.error?.message || err.message || 'Error al cargar documentos rechazados';
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.currentPage = 1;
    this.filtrarYPaginar();
  }

  filtrarYPaginar() {
    let lista = [...this.documentos];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      lista = lista.filter(doc =>
        (doc.numeroRadicado || '').toLowerCase().includes(term) ||
        (doc.nombreContratista || '').toLowerCase().includes(term) ||
        (doc.numeroContrato || '').toLowerCase().includes(term) ||
        (doc.observacion || '').toLowerCase().includes(term) ||
        (doc.motivoRechazo || '').toLowerCase().includes(term) ||
        (doc.ultimoUsuario || '').toLowerCase().includes(term) ||
        (doc.rechazadoPor || '').toLowerCase().includes(term)
      );
    }

    this.filteredDocumentos = lista;
    this.totalPages = Math.ceil(lista.length / this.pageSize);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = lista.slice(start, start + this.pageSize);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.filtrarYPaginar();
  }

  getRechazadoPor(doc: any): string {
    const estado = (doc.estado || '').toUpperCase();

    if (estado.includes('SUPERVISOR')) return 'Supervisor';
    if (estado.includes('AUDITOR') || estado.includes('AUDITOR_CUENTAS')) return 'Auditoría Cuentas';
    if (estado.includes('CONTABILIDAD')) return 'Contabilidad';
    if (estado.includes('TESORERIA')) return 'Tesorería';
    if (estado.includes('ASESOR')) return 'Asesor Gerencia';
    if (estado.includes('RENDICION')) return 'Rendición Cuentas';

    return 'Sistema / No especificado';
  }

  getRechazadoPorClass(doc: any): string {
    const rol = this.getRechazadoPor(doc).toLowerCase();
    if (rol.includes('supervisor')) return 'bg-warning text-dark';
    if (rol.includes('auditor')) return 'bg-info text-dark';
    if (rol.includes('contabilidad')) return 'bg-danger text-white';
    if (rol.includes('tesoreria')) return 'bg-primary text-white';
    if (rol.includes('asesor')) return 'bg-purple text-white';
    if (rol.includes('rendicion')) return 'bg-dark text-white';
    return 'bg-secondary text-white';
  }

  getDocumentCount(doc: any): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  verDetalle(doc: any) {
    console.log('Ver detalle:', doc);
    // Aquí puedes navegar o abrir modal
  }

  descargarTodos(doc: any) {
    console.log('Descargar todos:', doc.numeroRadicado);
    // Implementa descarga múltiple
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-CO', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  }

  formatDateShort(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}