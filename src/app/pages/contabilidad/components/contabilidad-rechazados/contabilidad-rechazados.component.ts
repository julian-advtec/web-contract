// src/app/pages/contabilidad/components/contabilidad-rechazados/contabilidad-rechazados.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Interfaz extendida para manejar propiedades dinámicas
interface DocumentoContableExtendido {
  id?: string;
  numeroRadicado?: string;
  fechaRadicacion?: Date | string;
  nombreContratista?: string;
  documentoContratista?: string;
  numeroContrato?: string;
  fechaInicio?: Date | string;
  fechaFin?: Date | string;
  estado?: string;
  cuentaCobro?: string;
  seguridadSocial?: string;
  informeActividades?: string;
  comentarios?: string;
  radicador?: string;
  ultimoUsuario?: string;
  fechaActualizacion?: Date | string;
  updatedAt?: Date | string;
  primerRadicadoDelAno?: boolean;
  [key: string]: any; // Para propiedades dinámicas
}

@Component({
  selector: 'app-contabilidad-rechazados',
  templateUrl: './contabilidad-rechazados.component.html',
  styleUrls: ['./contabilidad-rechazados.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class ContabilidadRechazadosComponent implements OnInit, OnDestroy {
  documentos: DocumentoContableExtendido[] = [];
  filteredDocumentos: DocumentoContableExtendido[] = [];
  paginatedDocumentos: DocumentoContableExtendido[] = [];

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
    private contabilidadService: ContabilidadService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Contabilidad Rechazados: Inicializando componente...');
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
        this.usuarioActual = user.fullName || user.username || 'Contador';
        console.log('👤 Usuario actual detectado:', this.usuarioActual);
      } catch {
        this.usuarioActual = 'Contador';
      }
    }
  }

  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.infoMessage = '';

    console.log('📋 Cargando documentos rechazados desde historial...');

    this.contabilidadService.getHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (historial: any[]) => {
          console.log('[HISTORIAL] Datos recibidos:', historial?.length);
          
          // Mostrar los primeros items para depuración
          if (historial && historial.length > 0) {
            console.log('[HISTORIAL] Primer item:', historial[0]);
          }
          
          // Filtrar solo documentos rechazados del historial - VERSIÓN MEJORADA
          const itemsRechazados = historial.filter(item => {
            if (!item) return false;
            
            // Buscar en todas las posibles propiedades que contengan el estado
            const estado = (item.estado || '').toUpperCase();
            const documentoEstado = (item.documento?.estado || '').toUpperCase();
            const estadoCont = (item.estadoCont || '').toUpperCase();
            const estadoDoc = (item.estadoDoc || '').toUpperCase();
            
            // Palabras clave de rechazo
            const esRechazado = 
              estado.includes('RECHAZADO') ||
              documentoEstado.includes('RECHAZADO') ||
              estadoCont.includes('RECHAZADO') ||
              estadoDoc.includes('RECHAZADO') ||
              estado === 'RECHAZADO' ||
              documentoEstado === 'RECHAZADO';
            
            // También incluir observados si aplica
            const esObservado = 
              estado.includes('OBSERVADO') ||
              documentoEstado.includes('OBSERVADO') ||
              estadoCont.includes('OBSERVADO') ||
              estadoDoc.includes('OBSERVADO');
            
            return esRechazado || esObservado;
          });

          console.log(`[FILTRADO] ${itemsRechazados.length} documentos rechazados/observados encontrados`);

          // Mapear los items a documentos - asegurando que todas las propiedades estén disponibles
          this.documentos = itemsRechazados.map(item => {
            // Si el item ya tiene todas las propiedades, usarlo directamente
            if (item.numeroRadicado) {
              return { ...item } as DocumentoContableExtendido;
            }
            
            // Si el item tiene documento anidado, combinar propiedades
            if (item.documento) {
              return {
                ...item.documento,
                ...item,
                id: item.documento.id || item.id,
                estado: item.estado || item.documento.estado,
                observaciones: item.observaciones || item.documento.observaciones || item.documento.comentarios,
                fechaRechazo: item.fechaActualizacion || item.fechaCreacion || item.documento.fechaActualizacion
              } as DocumentoContableExtendido;
            }
            
            // Si no, usar el item tal cual
            return { ...item } as DocumentoContableExtendido;
          });

          console.log('[DOCUMENTOS MAPEADOS]', this.documentos);
          this.procesarDocumentos();
        },
        error: (err: any) => {
          console.error('[CONTABILIDAD] Error cargando historial:', err);
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

  getContadorRechazo(doc: DocumentoContableExtendido): string {
    return doc['contadorRevisor'] || 
           doc['auditor'] || 
           doc['rechazadoPor'] || 
           doc['usuarioAsignadoNombre'] || 
           doc['ultimoUsuario'] ||
           'Nivel Superior';
  }

  getMotivoRechazo(doc: DocumentoContableExtendido): string {
    return doc['motivoRechazo'] || 
           doc['observaciones'] || 
           doc['comentarios'] || 
           'Sin motivo especificado';
  }

  getObservaciones(doc: DocumentoContableExtendido): string {
    return doc['observaciones'] || doc['comentarios'] || '';
  }

  getDiasDesdeRechazo(doc: DocumentoContableExtendido): number {
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

  getFechaRechazo(doc: DocumentoContableExtendido): string {
    return this.formatDate(doc['fechaRechazo'] || doc.fechaActualizacion || doc.updatedAt);
  }

  esDocumentoReciente(doc: DocumentoContableExtendido): boolean {
    const dias = this.getDiasDesdeRechazo(doc);
    return dias < 2; // Menos de 2 días
  }

  esMiRechazo(doc: DocumentoContableExtendido): boolean {
    const rechazadoPor = this.getContadorRechazo(doc);
    return rechazadoPor === this.usuarioActual;
  }

  verDetalle(doc: DocumentoContableExtendido): void {
    if (!doc?.id) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    console.log(`👁️ Ver documento rechazado: ${doc.numeroRadicado} (${doc.id})`);

    // Siempre en modo consulta/solo lectura
    this.router.navigate(['/contabilidad/revisar', doc.id], {
      queryParams: {
        soloLectura: 'true',
        modo: 'consulta',
        desde: 'rechazados'
      }
    }).catch(err => {
      console.error('[VER] Error:', err);
      this.notificationService.error('Redirección fallida', 'Intenta ingresar manualmente');
    });
  }

  tieneArchivos(doc: DocumentoContableExtendido): boolean {
    return this.getDocumentCount(doc) > 0;
  }

  getDocumentCount(doc: DocumentoContableExtendido): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    
    // Archivos específicos de contabilidad
    if (doc['glosa']) count++;
    if (doc['causacion']) count++;
    if (doc['extracto']) count++;
    if (doc['comprobanteEgreso']) count++;
    
    return count;
  }

  descargarTodos(doc: DocumentoContableExtendido): void {
    const totalArchivos = this.getDocumentCount(doc);
    
    if (totalArchivos === 0) {
      this.notificationService.warning('Sin archivos', 'Este documento no tiene archivos adjuntos');
      return;
    }
    
    console.log(`📥 Iniciando descarga de ${totalArchivos} archivo(s) para:`, doc.numeroRadicado);
    this.notificationService.info('Descarga iniciada', `Preparando ${totalArchivos} archivo(s)...`);
    
    // Aquí implementarías la lógica para descargar todos los archivos
    // Podrías llamar a un método del servicio que los empaquete en ZIP
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de utilidad
  // ───────────────────────────────────────────────────────────────

  refreshData(): void {
    console.log('🔄 Refrescando lista de rechazados...');
    this.cargarDocumentosRechazados();
  }

  updatePagination(): void {
    if (!this.filteredDocumentos || this.filteredDocumentos.length === 0) {
      this.totalPages = 0;
      this.pages = [];
      this.paginatedDocumentos = [];
      return;
    }
    
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
          (doc.numeroRadicado || '').toLowerCase().includes(term) ||
          (doc.nombreContratista || '').toLowerCase().includes(term) ||
          (doc.numeroContrato || '').toLowerCase().includes(term) ||
          (doc.documentoContratista || '').toLowerCase().includes(term) ||
          (this.getMotivoRechazo(doc) || '').toLowerCase().includes(term) ||
          (this.getContadorRechazo(doc) || '').toLowerCase().includes(term)
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos de formateo y helpers
  // ───────────────────────────────────────────────────────────────

  formatDate(fecha: Date | string | undefined): string {
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

  formatDateShort(fecha: Date | string | undefined): string {
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

  getDuracionContrato(inicio: Date | string | undefined, fin: Date | string | undefined): string {
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

  getEstadoClass(estado: string | undefined): string {
    if (!estado) return 'badge-secondary';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('RECHAZADO')) return 'badge-danger';
    if (estadoUpper.includes('OBSERVADO')) return 'badge-warning';
    if (estadoUpper.includes('GLOSADO')) return 'badge-warning';
    if (estadoUpper.includes('APROBADO')) return 'badge-success';
    if (estadoUpper.includes('EN_REVISION')) return 'badge-info';
    if (estadoUpper.includes('COMPLETADO')) return 'badge-success';

    return 'badge-secondary';
  }

  getEstadoTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('RECHAZADO_CONTABILIDAD')) return 'Rechazado (Contabilidad)';
    if (estadoUpper.includes('RECHAZADO')) return 'Rechazado';
    if (estadoUpper.includes('OBSERVADO_CONTABILIDAD')) return 'Observado (Contabilidad)';
    if (estadoUpper.includes('OBSERVADO')) return 'Observado';
    if (estadoUpper.includes('GLOSADO')) return 'Glosado';
    if (estadoUpper.includes('APROBADO')) return 'Aprobado';
    if (estadoUpper.includes('EN_REVISION')) return 'En Revisión';
    if (estadoUpper.includes('COMPLETADO')) return 'Completado';

    return estado;
  }

  getDiasClass(doc: DocumentoContableExtendido): string {
    const dias = this.getDiasDesdeRechazo(doc);

    if (dias < 2) return 'text-danger fw-bold'; // Reciente
    if (dias <= 7) return 'text-warning'; // 2-7 días
    if (dias <= 15) return 'text-primary'; // 8-15 días
    return 'text-secondary'; // Más de 15 días
  }

  getRechazadoPorClass(doc: DocumentoContableExtendido): string {
    if (this.esMiRechazo(doc)) return 'bg-info text-white';
    return 'bg-danger text-white';
  }

  getTooltipInfo(doc: DocumentoContableExtendido): string {
    let info = '';

    if (doc.numeroRadicado) {
      info += `📄 Radicado: ${doc.numeroRadicado}\n`;
    }

    if (doc.nombreContratista) {
      info += `👤 Contratista: ${doc.nombreContratista}\n`;
    }

    const dias = this.getDiasDesdeRechazo(doc);
    info += `⏱️ Rechazado hace: ${dias} días\n`;

    info += `📝 Motivo: ${this.getMotivoRechazo(doc).substring(0, 80)}`;

    if (doc.primerRadicadoDelAno) {
      info += `\n⭐ Primer radicado del año`;
    }
    
    const archivos = this.getDocumentCount(doc);
    if (archivos > 0) {
      info += `\n📎 ${archivos} archivo(s) disponible(s)`;
    }

    return info;
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