// src/app/pages/contratistas/components/contratista-list/contratista-list.component.ts
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ContratistasService } from '../../../../core/services/contratistas.service';
import { PaginationService } from '../../../../core/services/common/pagination.service';
import { FilterService } from '../../../../core/services/common/filter.service';
import { ErrorHandlerService } from '../../../../core/services/common/error-handler.service';
import { UiFeedbackService } from '../../../../core/services/common/ui-feedback.service';

import { Contratista } from '../../../../core/models/contratista.model';

import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-contratista-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingSpinnerComponent,
    ConfirmDialogComponent,
    PaginationComponent
  ],
  templateUrl: './contratista-list.component.html',
  styleUrls: ['./contratista-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContratistaListComponent implements OnInit {
  contratistas: Contratista[] = [];
  filteredContratistas: Contratista[] = [];
  paginatedItems: Contratista[] = [];

  isLoading = false;
  searchTerm = '';

  filtros = {
    tipoContratista: '',
    estado: 'TODOS'
  };

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  tiposContratista = [
    { value: 'PERSONA_NATURAL', label: 'Persona Natural' },
    { value: 'PERSONA_JURIDICA', label: 'Persona Jurídica' },
    { value: 'CONSORCIO', label: 'Consorcio' },
    { value: 'UNION_TEMPORAL', label: 'Unión Temporal' }
  ];

  estados = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
    { value: 'SUSPENDIDO', label: 'Suspendido' }
  ];

  showConfirmDialog = false;
  confirmDialogData = {
    title: '',
    message: '',
    type: 'primary' as 'primary' | 'danger' | 'warning'
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private contratistaService: ContratistasService,
    private paginationService: PaginationService,
    private filterService: FilterService,
    private errorHandler: ErrorHandlerService,
    private uiFeedback: UiFeedbackService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarContratistas();
  }

  cargarContratistas(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    const sub = this.contratistaService.obtenerTodos().subscribe({
      next: (contratistas) => {
        this.contratistas = contratistas || [];
        this.ordenarPorFecha();
        this.aplicarFiltros();
        this.isLoading = false;
        this.cdr.markForCheck();

        if (this.contratistas.length === 0) {
          this.uiFeedback.info('No hay contratistas registrados');
        }
      },
      error: (error) => {
        this.isLoading = false;
        const message = this.errorHandler.handleError(error, 'Cargar Contratistas');
        this.uiFeedback.error(message);
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.push(sub);
  }

  private ordenarPorFecha(): void {
    this.contratistas.sort((a, b) => {
      const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
      const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
      return fechaB - fechaA;
    });
  }

  aplicarFiltros(): void {
    const filtrados = this.filterService.filterItems(this.contratistas, {
      searchTerm: this.searchTerm,
      searchFields: ['razonSocial', 'nombreCompleto', 'documentoIdentidad', 'numeroContrato', 'email'],
      filters: {
        tipoContratista: this.filtros.tipoContratista,
        estado: this.filtros.estado === 'TODOS' ? '' : this.filtros.estado
      },
      sortField: 'fechaCreacion',
      sortDirection: 'desc'
    });

    this.filteredContratistas = filtrados;
    this.currentPage = 1;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  onSearch(): void {
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtros.tipoContratista = '';
    this.filtros.estado = 'TODOS';
    this.aplicarFiltros();
  }

  private updatePagination(): void {
    const result = this.paginationService.paginate(
      this.filteredContratistas,
      this.currentPage,
      this.pageSize
    );
    this.paginatedItems = result.items;
    this.totalItems = result.totalItems;
    this.totalPages = result.totalPages;
    this.currentPage = result.currentPage;
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

  verDetalle(contratista: Contratista): void {
    if (this.validarContratista(contratista)) {
      this.router.navigate(['/contratistas/ver', contratista.id]);
    }
  }

  editarContratista(contratista: Contratista): void {
    if (this.validarContratista(contratista)) {
      this.router.navigate(['/contratistas/editar', contratista.id]);
    }
  }

  nuevoContratista(): void {
    this.router.navigate(['/contratistas/crear']);
  }

  private validarContratista(contratista: Contratista | null | undefined): boolean {
    if (!contratista) {
      this.uiFeedback.error('Contratista no válido');
      return false;
    }
    if (!contratista.id) {
      this.uiFeedback.error('ID de contratista no disponible');
      return false;
    }
    return true;
  }

  descargarTodosDocumentos(contratista: Contratista): void {
    if (!this.validarContratista(contratista)) return;

    this.isLoading = true;
    this.cdr.markForCheck();
    this.uiFeedback.info('Preparando descarga de documentos...');

    const sub = this.contratistaService.descargarTodosDocumentos(contratista.id!).subscribe({
      next: (blob: Blob) => {
        this.isLoading = false;
        this.descargarArchivo(blob, contratista);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        const message = this.errorHandler.handleError(error, 'Descarga de documentos');
        this.uiFeedback.error(message);
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.push(sub);
  }

  private descargarArchivo(blob: Blob, contratista: Contratista): void {
    if (blob.size === 0) {
      this.uiFeedback.warning('El archivo ZIP está vacío');
      return;
    }

    const url = window.URL.createObjectURL(blob);
    const nombre = (contratista.razonSocial || contratista.nombreCompleto || 'contratista')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50);
    const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `documentos_${nombre}_${fecha}.zip`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
    this.uiFeedback.success(`Documentos descargados (${sizeMB} MB)`);
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

  getTipoTexto(tipo: string | undefined): string {
    const textos: Record<string, string> = {
      'PERSONA_NATURAL': 'Persona Natural',
      'PERSONA_JURIDICA': 'Persona Jurídica',
      'CONSORCIO': 'Consorcio',
      'UNION_TEMPORAL': 'Unión Temporal'
    };
    return textos[tipo || ''] || tipo || 'N/A';
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

  trackByContratistaId(index: number, contratista: Contratista): string {
    return contratista.id;
  }
}