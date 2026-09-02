// formulario-aprobacion-list.component.ts

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { FormulariosPublicosService } from '../../../../core/services/formularios-publicos.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

interface FormularioAprobacion {
  id: string;
  contratistaId: string;
  contratistaNombre: string;
  contratistaDocumento: string;
  tipoContratista: string;
  estado: string;
  completado: boolean;
  totalDocumentos: number;
  fechaCompletado: string;
  createdAt: string;
  estadoGrupos: any;
  representanteLegal: string;
  documentoRepresentante: string;
  objetivoContrato: string;
  cargo: string;
  telefono: string;
  direccion: string;
  departamento: string;
  ciudad: string;
}

@Component({
  selector: 'app-formulario-aprobacion-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingSpinnerComponent,
    PaginationComponent
  ],
  templateUrl: './formulario-aprobacion-list.component.html',
  styleUrls: ['./formulario-aprobacion-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormularioAprobacionListComponent implements OnInit {
  formularios: FormularioAprobacion[] = [];
  filteredFormularios: FormularioAprobacion[] = [];
  paginatedItems: FormularioAprobacion[] = [];

  isLoading = false;
  searchTerm = '';
  filtroEstado = 'TODOS';

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  estados = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'EN_REVISION', label: 'En Revisión' },
    { value: 'APROBADO', label: 'Aprobado' },
    { value: 'RECHAZADO', label: 'Rechazado' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private formularioService: FormulariosPublicosService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarFormularios();
  }

  cargarFormularios(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    const sub = this.formularioService.listarPendientesAprobacion().subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log('📦 Respuesta de listarPendientesAprobacion:', response);
        const data = this.extraerFormularios(response);
        console.log('📦 Datos extraídos:', data);
        this.formularios = this.mapToFormularios(data);
        this.aplicarFiltros();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Error:', error);
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.push(sub);
  }

  private extraerFormularios(response: any): any[] {
    if (!response) return [];

    // ✅ Extraer correctamente el array de formularios
    if (response?.data?.data?.data) {
      return response.data.data.data;
    }
    if (response?.data?.data) {
      return response.data.data;
    }
    if (response?.data) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  private mapToFormularios(data: any[]): FormularioAprobacion[] {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map((f: any) => ({
      id: f.id ?? '',
      contratistaId: f.contratistaId ?? '',
      contratistaNombre: f.contratistaNombre || f.contratista?.razonSocial || f.representanteLegal || 'N/A',
      contratistaDocumento: f.contratistaDocumento || f.contratista?.documentoIdentidad || f.documentoRepresentante || 'N/A',
      tipoContratista: f.tipoContratista || f.contratista?.tipoContratista || '',
      estado: f.estado || 'PENDIENTE',
      completado: f.completado ?? false,
      totalDocumentos: f.totalDocumentos ?? 0,
      fechaCompletado: f.fechaCompletado || f.createdAt || '',
      createdAt: f.createdAt || '',
      estadoGrupos: f.estadoGrupos || {},
      representanteLegal: f.representanteLegal || '',
      documentoRepresentante: f.documentoRepresentante || '',
      objetivoContrato: f.objetivoContrato || '',
      cargo: f.cargo || '',
      telefono: f.telefono || '',
      direccion: f.direccion || '',
      departamento: f.departamento || '',
      ciudad: f.ciudad || ''
    }));
  }

  aplicarFiltros(): void {
    let filtrados = [...this.formularios];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(f =>
        f.contratistaNombre.toLowerCase().includes(term) ||
        f.contratistaDocumento.includes(term) ||
        f.id.includes(term) ||
        f.representanteLegal.toLowerCase().includes(term)
      );
    }

    if (this.filtroEstado !== 'TODOS') {
      filtrados = filtrados.filter(f => f.estado === this.filtroEstado);
    }

    filtrados.sort((a, b) => {
      const fechaA = new Date(a.createdAt).getTime();
      const fechaB = new Date(b.createdAt).getTime();
      return fechaB - fechaA;
    });

    this.filteredFormularios = filtrados;
    this.currentPage = 1;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  onSearch(): void {
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtroEstado = 'TODOS';
    this.aplicarFiltros();
  }

  private updatePagination(): void {
    const total = this.filteredFormularios.length;
    this.totalItems = total;
    this.totalPages = Math.ceil(total / this.pageSize);
    
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedItems = this.filteredFormularios.slice(start, start + this.pageSize);
    this.cdr.markForCheck();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * ✅ NAVEGACIÓN - Guarda en el service y navega CON QUERY PARAMS
   */
  verDetalle(formulario: FormularioAprobacion): void {
    console.log('🔍 verDetalle llamado con formulario:', formulario);
    
    if (formulario && formulario.id && formulario.contratistaId) {
      console.log('🔍 Navegando a editar con fromAprobacion=true');
      console.log('📦 Datos del formulario:', formulario);

      // ✅ Guardar en el service ANTES de navegar
      this.formularioService.setFromAprobacion(true);
      this.formularioService.setFormularioData({
        contratistaNombre: formulario.contratistaNombre,
        contratistaDocumento: formulario.contratistaDocumento,
        tipoContratista: formulario.tipoContratista,
        representanteLegal: formulario.representanteLegal,
        documentoRepresentante: formulario.documentoRepresentante,
        objetivoContrato: formulario.objetivoContrato,
        cargo: formulario.cargo,
        telefono: formulario.telefono,
        direccion: formulario.direccion,
        departamento: formulario.departamento,
        ciudad: formulario.ciudad,
        estadoFormulario: formulario.estado,
        estadoGrupos: formulario.estadoGrupos,
        totalDocumentos: formulario.totalDocumentos,
        fechaCompletado: formulario.fechaCompletado,
        idFormulario: formulario.id
      });

      console.log('✅ State guardado en service - fromAprobacion:', this.formularioService.getFromAprobacion());
      console.log('✅ State guardado en service - formularioData:', this.formularioService.getFormularioData());

      // ✅ Navegar CON queryParams incluyendo formularioId
      const navigationUrl = `/contratistas/editar/${formulario.contratistaId}`;
      console.log('🔍 Navegando a:', navigationUrl);
      
      this.router.navigate([navigationUrl], {
        queryParams: { 
          fromAprobacion: 'true',
          formularioId: formulario.id
        }
      }).then(success => {
        console.log('✅ Navegación exitosa:', success);
      }).catch(error => {
        console.error('❌ Error en navegación:', error);
      });
    } else {
      console.warn('⚠️ No se pudo navegar: faltan datos del formulario', formulario);
    }
  }

  getEstadoClass(estado: string): string {
    const clases: Record<string, string> = {
      'PENDIENTE': 'estado-pendiente',
      'EN_REVISION': 'estado-en_revision',
      'APROBADO': 'estado-aprobado',
      'RECHAZADO': 'estado-rechazado'
    };
    return clases[estado] || 'estado-pendiente';
  }

  getEstadoTexto(estado: string): string {
    const textos: Record<string, string> = {
      'PENDIENTE': 'Pendiente',
      'EN_REVISION': 'En Revisión',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado'
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
    return tipo ? (textos[tipo] || tipo) : '';
  }

  trackByFormularioId(index: number, formulario: FormularioAprobacion): string {
    return formulario.id;
  }
}