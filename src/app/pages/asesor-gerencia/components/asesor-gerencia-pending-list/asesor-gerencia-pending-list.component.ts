import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AsesorGerenciaService } from '../../../../core/services/asesor-gerencia.service';
import { NotificationService } from '../../../../core/services/notification.service';
// Ajusta el modelo según tu interfaz real (puedes reutilizar el de tesorería o crear uno nuevo)
interface DocumentoGerencia {
  id: string;
  numeroRadicado: string;
  nombreContratista: string;
  documentoContratista: string;
  numeroContrato: string;
  estado: string;
  fechaRadicacion: Date | string;
  fechaCompletadoTesoreria?: Date | string;
  tesoreroAsignado?: string;
  disponible?: boolean;
  enMiRevision?: boolean;
  contadorAsignado?: string; // o tesorero anterior
  fechaAsignacion?: Date | string;
  observaciones?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-asesor-gerencia-pending-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './asesor-gerencia-pending-list.component.html',
  styleUrls: ['./asesor-gerencia-pending-list.component.scss']
})
export class AsesorGerenciaPendingListComponent implements OnInit, OnDestroy {
  documentos: DocumentoGerencia[] = [];
  filteredDocumentos: DocumentoGerencia[] = [];
  paginatedDocumentos: DocumentoGerencia[] = [];

  isLoading = false;
  isProcessing = false;
  errorMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private asesorGerenciaService: AsesorGerenciaService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarDocumentosPendientes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarUsuarioActual(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.usuarioActual = user.fullName || user.username || 'Asesor Gerencia';
      } catch {
        this.usuarioActual = 'Asesor Gerencia';
      }
    }
  }

  cargarDocumentosPendientes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.asesorGerenciaService.getDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: DocumentoGerencia[]) => {
          console.log('[Pendientes Gerencia] Documentos cargados:', docs?.length || 0);
          this.documentos = docs || [];
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('[Pendientes Gerencia] Error al cargar:', err);
          this.errorMessage = err.message || 'No se pudieron cargar los documentos pendientes';
          this.notificationService.error('Error', this.errorMessage);
          this.documentos = [];
          this.filteredDocumentos = [];
          this.updatePagination();
          this.isLoading = false;
        }
      });
  }

  puedeTomarDocumento(doc: DocumentoGerencia): boolean {
    const estado = (doc.estado || '').toUpperCase();
    return (
      estado === 'COMPLETADO_TESORERIA' &&
      doc.disponible === true &&
      !doc.tesoreroAsignado  // o el campo que indique si ya está asignado
    );
  }

  esMiDocumentoEnRevision(doc: DocumentoGerencia): boolean {
    const estado = (doc.estado || '').toUpperCase();
    return (
      estado === 'EN_REVISION_ASESOR_GERENCIA' &&
      doc.tesoreroAsignado === this.usuarioActual  // o el campo de asesor asignado
    );
  }

  tomarParaRevision(doc: DocumentoGerencia): void {
    if (!doc?.id) {
      this.notificationService.error('Error', 'Documento sin ID válido');
      return;
    }

    const yaEsMio = this.esMiDocumentoEnRevision(doc);

    if (yaEsMio) {
      this.notificationService.info('Continuar', 'Redirigiendo al formulario...');
      this.router.navigate(['/asesor-gerencia/procesar', doc.id]);
      return;
    }

    if (!this.puedeTomarDocumento(doc)) {
      this.notificationService.warning('No disponible', 'Este documento ya está asignado o no está pendiente');
      return;
    }

    this.notificationService.showModal({
      title: 'Tomar para revisión gerencial',
      message: `¿Tomar el radicado ${doc.numeroRadicado || 'sin radicado'} (${doc.nombreContratista || 'sin nombre'})?\n\nSe te asignará y pasarás al formulario.`,
      type: 'confirm',
      confirmText: 'Sí, tomar y procesar',
      cancelText: 'Cancelar',
      onConfirm: () => this.procederTomarDocumento(doc)
    });
  }

  private procederTomarDocumento(doc: DocumentoGerencia): void {
    this.isProcessing = true;
    console.log('[TOMAR GERENCIA] Iniciando toma del documento ID:', doc.id);

    this.asesorGerenciaService.tomarDocumento(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[TOMAR GERENCIA] Respuesta exitosa:', response);

          if (response?.success || response?.data?.success) {
            this.notificationService.success(
              '¡Documento tomado!',
              `Asignado a ti. Redirigiendo al formulario de revisión...`
            );

            // Remover de la lista local
            const index = this.documentos.findIndex(d => d.id === doc.id);
            if (index !== -1) {
              this.documentos.splice(index, 1);
              this.filteredDocumentos = [...this.documentos];
              this.updatePagination();
            }

            setTimeout(() => {
              this.router.navigate(['/asesor-gerencia/procesar', doc.id]);
            }, 1500);
          } else {
            this.notificationService.warning('Advertencia', response?.message || 'Toma confirmada pero con advertencia');
          }

          this.isProcessing = false;
        },
        error: (err: any) => {
          console.error('[TOMAR GERENCIA] Error:', err);
          const msg = err.error?.message || err.message || 'No se pudo tomar el documento';
          this.notificationService.error('Error al tomar', msg);
          this.isProcessing = false;
        }
      });
  }

  getTextoBoton(doc: DocumentoGerencia): string {
    if (this.esMiDocumentoEnRevision(doc)) {
      return 'Continuar Revisión';
    }
    return this.puedeTomarDocumento(doc) ? 'Tomar para Revisión' : 'No disponible';
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado?.toLowerCase().includes(term) || false) ||
        (doc.nombreContratista?.toLowerCase().includes(term) || false) ||
        (doc.numeroContrato?.toLowerCase().includes(term) || false) ||
        (doc.documentoContratista?.toLowerCase().includes(term) || false)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  refreshData(): void {
    this.cargarDocumentosPendientes();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    this.pages = [];

    const maxPages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages - 1);

    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }

    for (let i = start; i <= end; i++) {
      this.pages.push(i);
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  formatDate(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  formatDateShort(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    const diffMs = new Date().getTime() - new Date(fecha).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  esDocumentoReciente(doc: DocumentoGerencia): boolean {
    const fecha = doc.fechaCompletadoTesoreria || doc.fechaRadicacion;
    if (!fecha) return false;
    return this.getDiasTranscurridos(fecha) < 1;
  }

  getTooltipInfo(doc: DocumentoGerencia): string {
    let info = '';
    if (doc.numeroRadicado) info += `Radicado: ${doc.numeroRadicado}\n`;
    if (doc.nombreContratista) info += `Contratista: ${doc.nombreContratista}\n`;
    if (doc.tesoreroAsignado) info += `Tesorero anterior: ${doc.tesoreroAsignado}\n`;
    const dias = this.getDiasTranscurridos(doc.fechaCompletadoTesoreria || doc.fechaRadicacion);
    info += `Días desde completado: ${dias}\n`;
    if (doc.observaciones) info += `Observación: ${doc.observaciones.substring(0, 100)}...\n`;
    return info;
  }

  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'badge-secondary';
    const e = estado.toUpperCase();
    if (e.includes('COMPLETADO_ASESOR_GERENCIA')) return 'badge-success';
    if (e.includes('EN_REVISION_ASESOR_GERENCIA')) return 'badge-warning';
    if (e.includes('OBSERVADO_ASESOR_GERENCIA')) return 'badge-danger';
    if (e.includes('RECHAZADO_ASESOR_GERENCIA')) return 'badge-danger';
    if (e.includes('COMPLETADO_TESORERIA')) return 'badge-info';
    return 'badge-secondary';
  }

  getEstadoTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    const e = estado.toUpperCase();
    if (e.includes('COMPLETADO_ASESOR_GERENCIA')) return 'Completado Gerencia';
    if (e.includes('EN_REVISION_ASESOR_GERENCIA')) return 'En Revisión Gerencia';
    if (e.includes('OBSERVADO_ASESOR_GERENCIA')) return 'Observado Gerencia';
    if (e.includes('RECHAZADO_ASESOR_GERENCIA')) return 'Rechazado Gerencia';
    if (e.includes('COMPLETADO_TESORERIA')) return 'Pendiente Gerencia';
    return estado;
  }

  getDiasClass(doc: DocumentoGerencia): string {
    const dias = this.getDiasTranscurridos(doc.fechaCompletadoTesoreria || doc.fechaRadicacion);
    if (dias < 1) return 'text-success';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  trackById(index: number, doc: DocumentoGerencia): string {
    return doc.id || index.toString();
  }
}