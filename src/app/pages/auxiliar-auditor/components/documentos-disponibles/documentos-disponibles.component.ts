// src/app/pages/auxiliar-auditor/components/documentos-disponibles/documentos-disponibles.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuxiliarAuditorService } from '../../../../core/services/auxiliar-auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-documentos-disponibles',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './documentos-disponibles.component.html',
  styleUrls: ['./documentos-disponibles.component.scss']
})
export class DocumentosDisponiblesComponent implements OnInit, OnDestroy {
  documentos: any[] = [];
  filteredDocumentos: any[] = [];
  paginatedDocumentos: any[] = [];
  isLoading = false;
  searchTerm = '';
  
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  pages: number[] = [];

  errorMessage = '';
  showError = false;
  successMessage = '';
  showSuccess = false;

  private destroy$ = new Subject<void>();

  constructor(
    private auxiliarService: AuxiliarAuditorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarDocumentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

 cargarDocumentos(): void {
  this.isLoading = true;
  this.errorMessage = '';
  this.showError = false;

  console.log('📥 Solicitando documentos disponibles para auxiliar auditor...');

  this.auxiliarService.obtenerDocumentosDisponibles()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        console.log('✅ Documentos recibidos:', response);
        
        let documentos = [];
        
        // ✅ CORRECCIÓN: Manejar la estructura anidada
        if (response && response.data) {
          // Si response.data tiene la propiedad 'data' (estructura anidada)
          if (response.data.data && Array.isArray(response.data.data)) {
            documentos = response.data.data;
          }
          // Si response.data es directamente el array
          else if (Array.isArray(response.data)) {
            documentos = response.data;
          }
          // Si response.data tiene 'success' y 'data'
          else if (response.data.success && response.data.data) {
            documentos = response.data.data;
          }
        }
        // Si response es directamente el array
        else if (Array.isArray(response)) {
          documentos = response;
        }
        // Si response tiene success y data directamente
        else if (response && response.success && response.data) {
          documentos = response.data;
        }

        console.log('📦 Documentos extraídos:', documentos.length);
        
        this.documentos = documentos;
        this.filteredDocumentos = [...documentos];
        this.updatePagination();
        this.isLoading = false;

        if (documentos.length === 0) {
          this.showSuccess = true;
          this.successMessage = 'No hay documentos pendientes de acta de supervisión';
          setTimeout(() => this.showSuccess = false, 3000);
        } else {
          this.showSuccess = true;
          this.successMessage = `${documentos.length} documento(s) requieren acta de supervisión`;
          setTimeout(() => this.showSuccess = false, 3000);
        }
      },
      error: (error) => {
        console.error('❌ Error cargando documentos:', error);
        this.errorMessage = `Error al cargar documentos: ${error.message || 'Error desconocido'}`;
        this.showError = true;
        this.isLoading = false;
      }
    });
}

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredDocumentos = this.documentos.filter(doc =>
        doc.numeroRadicado?.toLowerCase().includes(term) ||
        doc.nombreContratista?.toLowerCase().includes(term) ||
        doc.numeroContrato?.toLowerCase().includes(term) ||
        doc.documentoContratista?.toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedDocumentos();
  }

  updatePaginatedDocumentos(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePaginatedDocumentos();
  }

  verDetalle(doc: any): void {
    this.router.navigate(['/auxiliar-auditor/detalle', doc.id]);
  }

  formatDate(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
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