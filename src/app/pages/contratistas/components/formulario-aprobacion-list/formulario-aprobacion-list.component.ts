// src/app/pages/contratistas/components/formulario-aprobacion-list/formulario-aprobacion-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FormulariosPublicosService } from '../../../../core/services/formularios-publicos.service';

// ✅ Definir interfaces para mejor tipado
interface EstadoGrupo {
  label: string;
  completado: boolean;
  documentosSubidos: number;
  totalRequeridos: number;
  combinadoExiste: boolean;
  combinadoId: string | null;
  tipos: string[];
}

interface FormularioAprobacion {
  id: string;
  contratistaId: string;
  contratistaNombre: string;
  contratistaDocumento: string;
  estado: string;
  completado: boolean;
  totalDocumentos: number;
  fechaCompletado: string;
  createdAt: string;
  estadoGrupos: { [key: string]: EstadoGrupo };
  contratista?: {
    tipoContratista?: string;
  };
  representanteLegal?: string;
  documentoRepresentante?: string;
}

@Component({
  selector: 'app-formulario-aprobacion-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './formulario-aprobacion-list.component.html',
  styleUrls: ['./formulario-aprobacion-list.component.scss']
})
export class FormularioAprobacionListComponent implements OnInit {
  formularios: FormularioAprobacion[] = [];
  filteredFormularios: FormularioAprobacion[] = [];
  paginatedFormularios: FormularioAprobacion[] = [];

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

  filtroEstado = 'TODOS';
  estados = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'COMPLETADO', label: 'Completado' },
    { value: 'EN_REVISION', label: 'En Revisión' },
    { value: 'APROBADO', label: 'Aprobado' },
    { value: 'RECHAZADO', label: 'Rechazado' },
  ];

  constructor(
    private formularioService: FormulariosPublicosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarFormularios();
  }

  cargarFormularios(): void {
    this.isLoading = true;
    this.showError = false;
    this.formularios = [];
    this.filteredFormularios = [];
    this.paginatedFormularios = [];

    this.formularioService.listarPendientesAprobacion().subscribe({
      next: (response: any) => {
        console.log('📦 Respuesta COMPLETA:', response);
        
        // ✅ Extraer los datos - la estructura correcta es:
        // response.data.data.data (¡tres niveles!)
        let data: any[] = [];
        
        // Caso 1: response.data.data.data (la estructura actual)
        if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
          console.log(`✅ Datos extraídos de response.data.data.data: ${data.length}`);
        } 
        // Caso 2: response.data.data (si es array directamente)
        else if (response?.data?.data && Array.isArray(response.data.data)) {
          data = response.data.data;
          console.log(`✅ Datos extraídos de response.data.data: ${data.length}`);
        }
        // Caso 3: response.data (si es array)
        else if (response?.data && Array.isArray(response.data)) {
          data = response.data;
          console.log(`✅ Datos extraídos de response.data: ${data.length}`);
        }
        // Caso 4: response (si es array)
        else if (Array.isArray(response)) {
          data = response;
          console.log(`✅ Datos extraídos de response: ${data.length}`);
        }
        // Caso 5: Buscar en cualquier propiedad que sea array
        else {
          for (const key in response) {
            if (response[key] && typeof response[key] === 'object' && !Array.isArray(response[key])) {
              for (const subKey in response[key]) {
                if (Array.isArray(response[key][subKey]) && response[key][subKey].length > 0) {
                  data = response[key][subKey];
                  console.log(`✅ Datos extraídos de response.${key}.${subKey}: ${data.length}`);
                  break;
                }
              }
            }
            if (data.length > 0) break;
          }
        }
        
        // ✅ Asignar los datos (siempre como array)
        this.formularios = data || [];
        console.log(`✅ ${this.formularios.length} formularios cargados`);
        
        // ✅ Mostrar el primer formulario para verificar
        if (this.formularios.length > 0) {
          console.log('📋 Primer formulario:', this.formularios[0]);
          console.log('📋 Estado del primer formulario:', this.formularios[0].estado);
        }
        
        // ✅ Actualizar listas filtradas y paginadas
        this.filteredFormularios = [...this.formularios];
        this.aplicarFiltros();
        this.isLoading = false;

        if (this.formularios.length > 0) {
          this.showSuccess = true;
          this.successMessage = `${this.formularios.length} formularios encontrados`;
          setTimeout(() => this.showSuccess = false, 3000);
        } else {
          this.showSuccess = true;
          this.successMessage = 'No hay formularios pendientes de aprobación';
          setTimeout(() => this.showSuccess = false, 3000);
        }
      },
      error: (error) => {
        console.error('❌ Error cargando formularios:', error);
        this.errorMessage = error.message || 'Error al cargar los formularios';
        this.showError = true;
        this.isLoading = false;
        this.formularios = [];
        this.filteredFormularios = [];
        this.paginatedFormularios = [];
      }
    });
  }

  // ✅ Método para obtener las keys de los grupos
  getGrupoKeys(estadoGrupos: any): string[] {
    return estadoGrupos ? Object.keys(estadoGrupos) : [];
  }

  // ✅ Método para saber si un grupo está completo
  isGrupoCompleto(estadoGrupos: any, key: string): boolean {
    return estadoGrupos && estadoGrupos[key] ? estadoGrupos[key].completado : false;
  }

  // ✅ Método para saber si el combinado existe
  hasCombinadoExiste(estadoGrupos: any, key: string): boolean {
    return estadoGrupos && estadoGrupos[key] ? estadoGrupos[key].combinadoExiste : false;
  }

  aplicarFiltros(): void {
    const baseArray = Array.isArray(this.formularios) ? this.formularios : [];
    let filtrados = [...baseArray];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(f =>
        (f.contratistaNombre || '').toLowerCase().includes(term) ||
        (f.contratistaDocumento || '').includes(term) ||
        (f.id || '').toLowerCase().includes(term) ||
        (f.representanteLegal || '').toLowerCase().includes(term)
      );
    }

    if (this.filtroEstado !== 'TODOS') {
      filtrados = filtrados.filter(f => f.estado === this.filtroEstado);
    }

    this.filteredFormularios = filtrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    const baseArray = Array.isArray(this.filteredFormularios) ? this.filteredFormularios : [];
    this.totalPages = Math.ceil(baseArray.length / this.pageSize) || 1;
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedFormularios();
  }

  updatePaginatedFormularios(): void {
    const baseArray = Array.isArray(this.filteredFormularios) ? this.filteredFormularios : [];
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedFormularios = baseArray.slice(start, start + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedFormularios();
    }
  }

  verDetalle(formulario: FormularioAprobacion): void {
    if (formulario && formulario.id) {
      this.router.navigate(['/contratistas/formularios-aprobacion', formulario.id]);
    }
  }

  getEstadoClass(estado: string): string {
    const clases: Record<string, string> = {
      'COMPLETADO': 'bg-info text-white',
      'EN_REVISION': 'bg-warning text-dark',
      'APROBADO': 'bg-success text-white',
      'RECHAZADO': 'bg-danger text-white',
      'PENDIENTE': 'bg-secondary text-white'
    };
    return clases[estado] || 'bg-secondary text-white';
  }

  getEstadoTexto(estado: string): string {
    const textos: Record<string, string> = {
      'COMPLETADO': 'Completado',
      'EN_REVISION': 'En Revisión',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'PENDIENTE': 'Pendiente'
    };
    return textos[estado] || estado;
  }

  getTipoContratistaTexto(tipo: string | undefined): string {
    const textos: Record<string, string> = {
      'PERSONA_NATURAL': 'Persona Natural',
      'PERSONA_JURIDICA': 'Persona Jurídica',
      'CONSORCIO': 'Consorcio',
      'UNION_TEMPORAL': 'Unión Temporal'
    };
    return tipo ? (textos[tipo] || tipo) : 'N/A';
  }

  onSearch(): void {
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtroEstado = 'TODOS';
    this.aplicarFiltros();
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