// src/app/pages/supervisor/components/supervisor-rejected-list/supervisor-rejected-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SupervisorService } from '../../../../core/services/supervisor/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Documento } from '../../../../core/models/documento.model';

// Interfaz extendida para manejar propiedades dinámicas
interface DocumentoExtendido extends Documento {
  [key: string]: any; // Para propiedades dinámicas
}

@Component({
  selector: 'app-supervisor-rejected-list',
  templateUrl: './supervisor-rejected-list.component.html',
  styleUrls: ['./supervisor-rejected-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class SupervisorRejectedListComponent implements OnInit, OnDestroy {
  documentos: DocumentoExtendido[] = [];
  filteredDocumentos: DocumentoExtendido[] = [];
  paginatedDocumentos: DocumentoExtendido[] = [];

  isLoading = false;
  isProcessing = false;

  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  sidebarCollapsed = false;
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private supervisorService: SupervisorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Supervisor Rejected: Inicializando componente...');
    this.cargarUsuarioActual();
    this.cargarDocumentosRechazados();
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
        this.usuarioActual = user.fullName || user.username || 'Supervisor';
        console.log('👤 Usuario actual detectado:', this.usuarioActual);
      } catch {
        this.usuarioActual = 'Supervisor';
      }
    }
  }

  // ✅ VERSIÓN CORREGIDA - Usando SOLO historial
  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.infoMessage = '';

    console.log('📋 Cargando documentos rechazados desde historial...');

    this.supervisorService.obtenerHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (historial: any[]) => {
          console.log('[HISTORIAL] Datos recibidos:', historial?.length);
          
          // Filtrar solo documentos rechazados del historial
          const itemsRechazados = historial.filter(item => {
            const estado = (item.estado || '').toUpperCase();
            return estado.includes('RECHAZADO_SUPERVISOR') || 
                   estado === 'RECHAZADO' ||
                   estado.includes('RECHAZADO');
          });

          console.log(`[FILTRADO] ${itemsRechazados.length} documentos rechazados encontrados`);

          // Mapear los items a documentos
          this.documentos = itemsRechazados.map(item => {
            // Extraer el documento del item (puede venir en diferentes formatos)
            const doc = item.documento || item;
            
            // Añadir propiedades adicionales si existen en el item
            const docExtendido = { ...doc } as DocumentoExtendido;
            
            // Propiedades específicas de rechazo
            if (item.fechaAprobacion && !docExtendido['fechaRechazo']) {
              docExtendido['fechaRechazo'] = item.fechaAprobacion;
            }
            if (item.observacion && !docExtendido['observaciones']) {
              docExtendido['observaciones'] = item.observacion;
            }
            if (item.supervisorRevisor && !docExtendido['supervisorRechazo']) {
              docExtendido['supervisorRechazo'] = item.supervisorRevisor;
            }
            
            return docExtendido;
          });

          this.procesarDocumentos();
        },
        error: (err: any) => {
          console.error('[SUPERVISOR] Error cargando historial:', err);
          this.errorMessage = 'Error al cargar documentos rechazados';
          this.notificationService.error('Error', this.errorMessage);
          this.isLoading = false;
        }
      });
  }

  procesarDocumentos(): void {
    console.log(`📊 Encontrados ${this.documentos.length} documentos rechazados`);

    if (this.documentos.length > 0) {
      this.successMessage = `Se encontraron ${this.documentos.length} documentos rechazados`;
      setTimeout(() => this.successMessage = '', 4000);
    } else {
      this.infoMessage = 'No hay documentos rechazados';
    }

    this.filteredDocumentos = [...this.documentos];
    this.updatePagination();
    this.isLoading = false;
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos específicos para rechazados
  // ───────────────────────────────────────────────────────────────

  getSupervisorRechazo(doc: DocumentoExtendido): string {
    return doc['supervisorRechazo'] || 
           doc['rechazadoPor'] || 
           doc['usuarioAsignadoNombre'] || 
           doc['ultimoUsuario'] ||
           'Supervisor';
  }

  getMotivoRechazo(doc: DocumentoExtendido): string {
    return doc['motivoRechazo'] || 
           doc['observaciones'] || 
           doc['comentarios'] || 
           'Sin motivo especificado';
  }

  getDiasDesdeRechazo(doc: DocumentoExtendido): number {
    const fechaRechazo = doc['fechaRechazo'] || doc.fechaActualizacion || doc.updatedAt;
    if (!fechaRechazo) return 0;

    try {
      const fechaDoc = new Date(fechaRechazo);
      const hoy = new Date();
      const diferenciaMs = hoy.getTime() - fechaDoc.getTime();
      return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  getObservaciones(doc: DocumentoExtendido): string {
    return doc['observaciones'] || doc['comentarios'] || '';
  }

  verDetalle(doc: DocumentoExtendido): void {
    if (!doc?.id) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    console.log(`👁️ Ver documento rechazado: ${doc.numeroRadicado} (${doc.id})`);

    // Siempre en modo consulta/solo lectura
    this.router.navigate(['/supervisor/revisar', doc.id], {
      queryParams: {
        soloLectura: 'true',
        modo: 'consulta',
        desde: 'rechazados'
      }
    }).then(ok => {
      console.log('[VER] Navegación:', ok ? 'exitosa' : 'fallida');
    }).catch(err => {
      console.error('[VER] Error:', err);
      this.notificationService.error('Redirección fallida', 'Intenta ingresar manualmente');
    });
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de utilidad
  // ───────────────────────────────────────────────────────────────

  refreshData(): void {
    console.log('🔄 Refrescando lista de rechazados...');
    this.cargarDocumentosRechazados();
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

    const startIdx = (this.currentPage - 1) * this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIdx, startIdx + this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDocumentos = this.documentos.filter(doc => {
        return (
          (doc.numeroRadicado?.toLowerCase().includes(term)) ||
          (doc.nombreContratista?.toLowerCase().includes(term)) ||
          (doc.numeroContrato?.toLowerCase().includes(term)) ||
          (doc.documentoContratista?.toLowerCase().includes(term)) ||
          (this.getMotivoRechazo(doc)?.toLowerCase().includes(term)) ||
          (this.getSupervisorRechazo(doc)?.toLowerCase().includes(term))
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de formateo y helpers
  // ───────────────────────────────────────────────────────────────

  formatDate(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatDateShort(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getDiasTranscurridos(fecha: Date | string): number {
    if (!fecha) return 0;
    try {
      const fechaDoc = new Date(fecha);
      const hoy = new Date();
      const diferenciaMs = hoy.getTime() - fechaDoc.getTime();
      return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  getDuracionContrato(inicio: Date | string, fin: Date | string): string {
    if (!inicio || !fin) return 'N/A';
    try {
      const fechaInicio = new Date(inicio);
      const fechaFin = new Date(fin);
      const diferenciaMs = fechaFin.getTime() - fechaInicio.getTime();
      const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
      return `${dias} días`;
    } catch {
      return 'N/A';
    }
  }

  esDocumentoReciente(doc: DocumentoExtendido): boolean {
    const fechaRechazo = doc['fechaRechazo'] || doc.fechaActualizacion || doc.updatedAt;
    if (!fechaRechazo) return false;
    const diasTranscurridos = this.getDiasDesdeRechazo(doc);
    return diasTranscurridos < 2; // Menos de 2 días
  }

  getEstadoClass(estado: string): string {
    if (!estado) return 'badge-secondary';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('RECHAZADO')) return 'badge-danger';
    if (estadoUpper.includes('APROBADO')) return 'badge-success';
    if (estadoUpper.includes('OBSERVADO')) return 'badge-warning';
    if (estadoUpper.includes('EN_REVISION')) return 'badge-info';

    return 'badge-secondary';
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('RECHAZADO_SUPERVISOR')) return 'Rechazado (Supervisor)';
    if (estadoUpper.includes('RECHAZADO')) return 'Rechazado';
    if (estadoUpper.includes('APROBADO')) return 'Aprobado';
    if (estadoUpper.includes('OBSERVADO')) return 'Observado';
    if (estadoUpper.includes('EN_REVISION')) return 'En Revisión';

    return estado;
  }

  getDiasClass(doc: DocumentoExtendido): string {
    const dias = this.getDiasDesdeRechazo(doc);

    if (dias < 2) return 'text-danger'; // Reciente
    if (dias <= 7) return 'text-warning'; // 2-7 días
    if (dias <= 15) return 'text-primary'; // 8-15 días
    return 'text-secondary'; // Más de 15 días
  }

  getTooltipInfo(doc: DocumentoExtendido): string {
    let info = '';

    if (doc.numeroRadicado) {
      info += `Radicado: ${doc.numeroRadicado}\n`;
    }

    if (doc.nombreContratista) {
      info += `Contratista: ${doc.nombreContratista}\n`;
    }

    const dias = this.getDiasDesdeRechazo(doc);
    info += `Rechazado hace: ${dias} días\n`;

    info += `Motivo: ${this.getMotivoRechazo(doc).substring(0, 50)}`;

    return info;
  }

  getDocumentCount(doc: DocumentoExtendido): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos para archivos
  // ───────────────────────────────────────────────────────────────

  previsualizarDocumentoEspecifico(doc: DocumentoExtendido, index: number): void {
    console.log(`👁️ Previsualizando documento ${doc.numeroRadicado}, archivo ${index}`);

    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    let existeDocumento = false;

    switch (index) {
      case 1:
        existeDocumento = !!doc.cuentaCobro;
        break;
      case 2:
        existeDocumento = !!doc.seguridadSocial;
        break;
      case 3:
        existeDocumento = !!doc.informeActividades;
        break;
    }

    if (!existeDocumento) {
      this.notificationService.warning('Documento no disponible',
        `El documento ${index} no está disponible`);
      return;
    }

    
  }

  descargarDocumentoEspecifico(doc: DocumentoExtendido, index: number): void {
    console.log(`📥 Descargando documento ${doc.numeroRadicado}, archivo ${index}`);

    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    let existeDocumento = false;
    let nombreDocumento = '';

    switch (index) {
      case 1:
        existeDocumento = !!doc.cuentaCobro;
        nombreDocumento = doc.cuentaCobro || 'cuenta_cobro.pdf';
        break;
      case 2:
        existeDocumento = !!doc.seguridadSocial;
        nombreDocumento = doc.seguridadSocial || 'seguridad_social.pdf';
        break;
      case 3:
        existeDocumento = !!doc.informeActividades;
        nombreDocumento = doc.informeActividades || 'informe_actividades.pdf';
        break;
    }

    if (!existeDocumento) {
      this.notificationService.warning('Documento no disponible',
        `El documento ${index} no está disponible para descarga`);
      return;
    }

    this.isProcessing = true;

    this.supervisorService.descargarArchivo(doc.id, index)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreDocumento;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.isProcessing = false;
          this.notificationService.success('Descarga completada',
            `Documento "${nombreDocumento}" descargado correctamente`);
        },
        error: (error: any) => {
          console.error('❌ Error descargando documento específico:', error);
          this.notificationService.error('Error',
            `No se pudo descargar el documento: ${error.message || 'Error desconocido'}`);
          this.isProcessing = false;
        }
      });
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos para mensajes
  // ───────────────────────────────────────────────────────────────

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }
}