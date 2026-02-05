import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DocumentoContable } from '../../../../core/models/documento-contable.model';

@Component({
  selector: 'app-contabilidad-pending-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contabilidad-pending-list.component.html',
  styleUrls: ['./contabilidad-pending-list.component.scss']
})
export class ContabilidadPendingListComponent implements OnInit, OnDestroy {
  documentos: DocumentoContable[] = [];
  filteredDocumentos: DocumentoContable[] = [];
  paginatedDocumentos: DocumentoContable[] = [];

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
    private contabilidadService: ContabilidadService,
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
        this.usuarioActual = user.fullName || user.username || 'Contabilidad';
      } catch {
        this.usuarioActual = 'Contabilidad';
      }
    }
  }

  cargarDocumentosPendientes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.contabilidadService.obtenerDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: DocumentoContable[]) => {
          this.documentos = docs || [];
          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.message || 'No se pudieron cargar los documentos pendientes';
          this.notificationService.error('Error', this.errorMessage);
          this.documentos = [];
          this.filteredDocumentos = [];
          this.updatePagination();
          this.isLoading = false;
        }
      });
  }

  puedeTomarDocumento(doc: DocumentoContable): boolean {
    const estado = (doc.estado || '').toUpperCase();
    const estadosPermitidos = ['APROBADO_AUDITOR', 'COMPLETADO_AUDITOR'];
    
    return estadosPermitidos.some(e => estado.includes(e)) 
           && doc.disponible !== false
           && (!doc.asignacion || !doc.asignacion.enRevision);
  }

  esMiDocumentoEnRevision(doc: DocumentoContable): boolean {
    const estado = (doc.estado || '').toUpperCase();
    const estadosRevision = ['EN_REVISION_CONTABILIDAD', 'EN_PROCESO_CONTABILIDAD'];
    
    return estadosRevision.some(e => estado.includes(e)) &&
           doc.contadorAsignado === this.usuarioActual;
  }

  tomarParaContabilidad(doc: DocumentoContable): void {
    if (!doc.id) {
      this.notificationService.error('Error', 'Documento no válido');
      return;
    }

    const yaEsMio = this.esMiDocumentoEnRevision(doc);

    if (yaEsMio) {
      this.notificationService.showModal({
        title: 'Continuar proceso contable',
        message: `El documento ${doc.numeroRadicado} ya está asignado a ti.\n\n¿Quieres continuar ahora?`,
        type: 'confirm',
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
        onConfirm: () => this.continuarProceso(doc)
      });
      return;
    }

    if (!this.puedeTomarDocumento(doc)) {
      this.notificationService.warning(
        'Documento no disponible',
        `Este documento no puede ser tomado para contabilidad. Estado: ${doc.estado}`
      );
      return;
    }

    this.notificationService.showModal({
      title: 'Tomar para contabilidad',
      message: `¿Deseas tomar el documento ${doc.numeroRadicado} (${doc.nombreContratista || 'sin nombre'})?\n\n` +
               `Se cambiará a EN_REVISION_CONTABILIDAD y se te asignará como contador.`,
      type: 'confirm',
      confirmText: 'Sí, tomar y procesar',
      cancelText: 'No, cancelar',
      onConfirm: () => this.procederTomarDocumento(doc)
    });
  }

  private procederTomarDocumento(doc: DocumentoContable): void {
    this.isProcessing = true;

    this.contabilidadService.tomarDocumentoParaRevision(doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const success = response?.success === true || response?.data?.success === true;

          if (success) {
            const index = this.documentos.findIndex(d => d.id === doc.id);
            if (index !== -1) {
              this.documentos[index] = {
                ...this.documentos[index],
                estado: 'EN_REVISION_CONTABILIDAD',
                contadorAsignado: this.usuarioActual,
                fechaAsignacionContabilidad: new Date().toISOString(),
                disponible: false
              };
            }

            this.filteredDocumentos = [...this.documentos];
            this.updatePagination();

            this.notificationService.success(
              '¡Tomado!',
              `Documento ${doc.numeroRadicado} asignado. Redirigiendo al procesamiento...`
            );

            setTimeout(() => {
              this.router.navigate(['/contabilidad/procesar', doc.id]);
            }, 1500);
          } else {
            const msg = response?.data?.message || response?.message || 'No se pudo tomar el documento';
            this.notificationService.error('Error', msg);
          }
          this.isProcessing = false;
        },
        error: (err) => {
          this.notificationService.error('Error', err.message || 'Error de conexión');
          this.isProcessing = false;
        }
      });
  }

  continuarProceso(doc: DocumentoContable): void {
    this.router.navigate(['/contabilidad/procesar', doc.id]);
  }

  getTextoBoton(doc: DocumentoContable): string {
    if (this.esMiDocumentoEnRevision(doc)) {
      return 'Continuar';
    }
    return this.puedeTomarDocumento(doc) ? 'Procesar' : 'No disponible';
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
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatDateShort(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric'
    });
  }

  getDiasTranscurridos(fecha: Date | string | undefined): number {
    if (!fecha) return 0;
    const fechaDoc = new Date(fecha);
    const hoy = new Date();
    const diferenciaMs = hoy.getTime() - fechaDoc.getTime();
    return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
  }

  getDuracionContrato(inicio: Date | string | undefined, fin: Date | string | undefined): string {
    if (!inicio || !fin) return 'N/A';
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    const diferenciaMs = fechaFin.getTime() - fechaInicio.getTime();
    const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    return `${dias} días`;
  }

  esDocumentoReciente(doc: DocumentoContable): boolean {
    const fechaAprobacion = doc.fechaAprobacionAuditor || doc.fechaRadicacion;
    if (!fechaAprobacion) return false;
    const diasTranscurridos = this.getDiasTranscurridos(fechaAprobacion);
    return diasTranscurridos < 1;
  }

  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'badge-secondary';
    const estadoUpper = estado.toUpperCase();
    if (estadoUpper.includes('APROBADO_AUDITOR') || estadoUpper.includes('COMPLETADO_AUDITOR')) return 'badge-success';
    if (estadoUpper.includes('EN_REVISION_CONTABILIDAD') || estadoUpper.includes('EN_PROCESO_CONTABILIDAD')) return 'badge-warning';
    if (estadoUpper.includes('GLOSADO') || estadoUpper.includes('OBSERVADO')) return 'badge-danger';
    if (estadoUpper.includes('PROCESADO_CONTABILIDAD') || estadoUpper.includes('COMPLETADO_CONTABILIDAD')) return 'badge-primary';
    return 'badge-secondary';
  }

  getEstadoTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    const estadoUpper = estado.toUpperCase();
    if (estadoUpper.includes('APROBADO_AUDITOR')) return 'Aprobado Auditor';
    if (estadoUpper.includes('COMPLETADO_AUDITOR')) return 'Completado Auditor';
    if (estadoUpper.includes('EN_REVISION_CONTABILIDAD')) return 'En Revisión Contable';
    if (estadoUpper.includes('EN_PROCESO_CONTABILIDAD')) return 'En Proceso Contable';
    if (estadoUpper.includes('GLOSADO_CONTABILIDAD')) return 'Glosado';
    if (estadoUpper.includes('OBSERVADO_CONTABILIDAD')) return 'Observado';
    if (estadoUpper.includes('PROCESADO_CONTABILIDAD')) return 'Procesado';
    if (estadoUpper.includes('COMPLETADO_CONTABILIDAD')) return 'Completado';
    return estado;
  }

  getDiasClass(doc: DocumentoContable): string {
    const dias = this.getDiasTranscurridos(doc.fechaAprobacionAuditor || doc.fechaRadicacion);
    if (dias < 1) return 'text-success';
    if (dias <= 3) return 'text-primary';
    if (dias <= 7) return 'text-warning';
    return 'text-danger';
  }

  getTooltipInfo(doc: DocumentoContable): string {
    let info = '';
    if (doc.numeroRadicado) info += `Radicado: ${doc.numeroRadicado}\n`;
    if (doc.nombreContratista) info += `Contratista: ${doc.nombreContratista}\n`;
    if (doc.auditor) info += `Auditor: ${doc.auditor}\n`;
    if (doc.contadorAsignado) info += `Contador: ${doc.contadorAsignado}\n`;
    const dias = this.getDiasTranscurridos(doc.fechaAprobacionAuditor || doc.fechaRadicacion);
    info += `Días desde aprobación: ${dias}\n`;
    if (doc.observacion) info += `Observación: ${doc.observacion.substring(0, 100)}...\n`;
    return info;
  }

  getDocumentCount(doc: DocumentoContable): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  previsualizarDocumentoEspecifico(doc: DocumentoContable, index: number): void {
    if (index < 1 || index > 3) return;
    let existe = false;
    switch (index) {
      case 1: existe = !!doc.cuentaCobro; break;
      case 2: existe = !!doc.seguridadSocial; break;
      case 3: existe = !!doc.informeActividades; break;
    }
    if (!existe) {
      this.notificationService.warning('Sin archivo', 'Este documento no está disponible');
      return;
    }
    this.contabilidadService.previsualizarArchivoRadicado(doc.id, index).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => this.notificationService.error('Error', 'No se pudo previsualizar')
    });
  }

  descargarDocumentoEspecifico(doc: DocumentoContable, index: number): void {
    if (index < 1 || index > 3) return;
    let existe = false;
    let nombre = '';
    switch (index) {
      case 1: existe = !!doc.cuentaCobro; nombre = doc.cuentaCobro || 'cuenta_cobro.pdf'; break;
      case 2: existe = !!doc.seguridadSocial; nombre = doc.seguridadSocial || 'seguridad_social.pdf'; break;
      case 3: existe = !!doc.informeActividades; nombre = doc.informeActividades || 'informe_actividades.pdf'; break;
    }
    if (!existe) {
      this.notificationService.warning('Sin archivo', 'Este documento no está disponible');
      return;
    }
    this.isProcessing = true;
    this.contabilidadService.descargarArchivoRadicado(doc.id, index).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isProcessing = false;
      },
      error: () => {
        this.notificationService.error('Error', 'No se pudo descargar');
        this.isProcessing = false;
      }
    });
  }

  trackById(index: number, doc: DocumentoContable): string {
    return doc.id;
  }
}