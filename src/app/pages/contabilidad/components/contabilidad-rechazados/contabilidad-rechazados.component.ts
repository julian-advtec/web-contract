import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-contabilidad-rechazados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
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

  constructor(
    private contabilidadService: ContabilidadService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarRechazados();
  }

  cargarRechazados() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.contabilidadService.obtenerRechazadosVisibles().subscribe({
      next: (data: any[]) => {
        console.log('[RECHAZADOS] Documentos recibidos:', data);
        this.documentos = data || [];
        this.filtrarYPaginar();

        this.loading = false;

        if (this.documentos.length === 0) {
          this.successMessage = 'No hay documentos rechazados por roles superiores';
        } else {
          this.successMessage = `Encontrados ${this.documentos.length} documentos rechazados visibles`;
          setTimeout(() => this.successMessage = '', 4000);
        }
      },
      error: (err: any) => {
        console.error('[RECHAZADOS] Error:', err);
        this.errorMessage = err.error?.message || err.message || 'Error al cargar documentos rechazados';
        this.loading = false;
        this.notificationService.error('Error', this.errorMessage);
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
        (this.getRechazadoPor(doc) || '').toLowerCase().includes(term)
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

    return doc.rechazadoPor || 'Sistema / No especificado';
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
    const documentoId = doc.id || doc.documentoId;
    if (!documentoId) {
      this.notificationService.warning('Atención', 'ID de documento no disponible');
      return;
    }

    // Navegar a la vista de procesamiento en modo solo lectura
    this.router.navigate(['/contabilidad/procesar', documentoId], {
      queryParams: {
        origen: 'rechazados',
        soloLectura: 'true',
        modo: 'consulta'
      }
    });
  }

  descargarTodos(doc: any) {
    // Implementar descarga de todos los archivos relacionados
    console.log('Descargar todos los archivos para:', doc.numeroRadicado);
    
    // Ejemplo de descarga secuencial
    const archivos = [
      { tipo: 'cuenta_cobro', existe: doc.cuentaCobro },
      { tipo: 'seguridad_social', existe: doc.seguridadSocial },
      { tipo: 'informe_actividades', existe: doc.informeActividades }
    ];

    archivos.forEach(archivo => {
      if (archivo.existe) {
        // Llamar al servicio de descarga
        // this.descargarArchivo(doc.id, archivo.tipo);
      }
    });

    this.notificationService.info('Info', 'Función de descarga múltiple en desarrollo');
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'N/A';
    }
  }

  formatDateShort(date: any): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch {
      return 'N/A';
    }
  }

  refreshData(): void {
    this.cargarRechazados();
  }
}