// src/app/pages/contabilidad/components/contabilidad-rechazados/contabilidad-rechazados.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Documento } from '../../../../core/models/documento.model';

// Interfaz extendida para manejar propiedades dinámicas
interface DocumentoExtendido extends Documento {
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

  /**
   * Cargar documentos rechazados visibles para contabilidad
   */
  cargarDocumentosRechazados(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.infoMessage = '';

    console.log('📋 Cargando documentos rechazados visibles...');

    this.contabilidadService.obtenerRechazadosVisibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('[RECHAZADOS] Respuesta:', response);

          // Manejar diferentes formatos de respuesta
          let documentos = [];

          if (response?.success && response?.data) {
            documentos = response.data;
          } else if (response?.data) {
            documentos = response.data;
          } else if (Array.isArray(response)) {
            documentos = response;
          } else if (response?.documentos) {
            documentos = response.documentos;
          }

          console.log(`[FILTRADO] ${documentos.length} documentos rechazados encontrados`);

          // Mapear los documentos con información adicional
          this.documentos = documentos.map((doc: any) => {
            const docExtendido = { ...doc } as DocumentoExtendido;

            // Extraer información del rechazo si está disponible
            if (doc.rechazoInfo) {
              docExtendido['fechaRechazo'] = doc.rechazoInfo.fecha;
              docExtendido['motivoRechazo'] = doc.rechazoInfo.motivo;
              docExtendido['rechazadoPor'] = doc.rechazoInfo.rechazadoPor;
              docExtendido['rechazadoPorRol'] = doc.rechazoInfo.rol;
            }

            // Buscar en historial si existe
            if (doc.historialEstados && Array.isArray(doc.historialEstados)) {
              const estadosRechazo = doc.historialEstados.filter((h: any) =>
                (h.estado || '').toUpperCase().includes('RECHAZADO')
              );

              if (estadosRechazo.length > 0) {
                const ultimoRechazo = estadosRechazo[estadosRechazo.length - 1];
                docExtendido['fechaRechazo'] = ultimoRechazo.fecha || docExtendido['fechaRechazo'];
                docExtendido['rechazadoPor'] = ultimoRechazo.usuarioNombre || docExtendido['rechazadoPor'];
                docExtendido['rechazadoPorRol'] = ultimoRechazo.rolUsuario || docExtendido['rechazadoPorRol'];
                docExtendido['motivoRechazo'] = ultimoRechazo.observacion || docExtendido['motivoRechazo'];
              }
            }

            return docExtendido;
          });

          this.procesarDocumentos();
        },
        error: (err: any) => {
          console.error('[CONTABILIDAD] Error cargando rechazados:', err);
          this.errorMessage = err.error?.message || err.message || 'Error al cargar documentos rechazados';
          this.notificationService.error('Error', this.errorMessage);
          this.isLoading = false;
        }
      });
  }

  /**
   * Procesar documentos después de cargarlos
   */
  procesarDocumentos(): void {
    console.log(`📊 Encontrados ${this.documentos.length} documentos rechazados`);

    if (this.documentos.length > 0) {
      this.successMessage = `Se encontraron ${this.documentos.length} documentos rechazados visibles`;
      setTimeout(() => this.successMessage = '', 4000);
    } else {
      this.infoMessage = 'No hay documentos rechazados visibles';
    }

    this.filteredDocumentos = [...this.documentos];
    this.updatePagination();
    this.isLoading = false;
  }

  // ===================================================
  // MÉTODOS ESPECÍFICOS PARA RECHAZADOS
  // ===================================================

  /**
   * Obtener el rol que rechazó el documento
   */
  getRechazadoPor(doc: DocumentoExtendido): string {
    const estado = (doc.estado || '').toUpperCase();

    // Primero verificar si hay información específica
    if (doc['rechazadoPorRol']) {
      return doc['rechazadoPorRol'];
    }

    if (doc['rechazadoPor']) {
      return doc['rechazadoPor'];
    }

    // Determinar por el estado
    if (estado.includes('SUPERVISOR')) return 'Supervisor';
    if (estado.includes('AUDITOR')) return 'Auditoría';
    if (estado.includes('ASESOR')) return 'Asesor Gerencia';
    if (estado.includes('RENDICION')) return 'Rendición Cuentas';
    if (estado.includes('TESORERIA')) return 'Tesorería';
    if (estado.includes('CONTABILIDAD')) return 'Contabilidad (anterior)';

    return doc['usuarioAsignadoNombre'] || doc['ultimoUsuario'] || 'Sistema / No especificado';
  }

  /**
   * Obtener clase CSS para el badge del rechazador
   */
  getRechazadoPorClass(doc: DocumentoExtendido): string {
    const rol = this.getRechazadoPor(doc).toLowerCase();

    if (rol.includes('supervisor')) return 'badge bg-warning text-dark';
    if (rol.includes('auditor')) return 'badge bg-info';
    if (rol.includes('asesor')) return 'badge bg-purple text-white';
    if (rol.includes('rendicion')) return 'badge bg-dark text-white';
    if (rol.includes('tesoreria')) return 'badge bg-primary text-white';
    if (rol.includes('contabilidad')) return 'badge bg-danger text-white';

    return 'badge bg-secondary text-white';
  }

  /**
   * Obtener el motivo del rechazo
   */
  getMotivoRechazo(doc: DocumentoExtendido): string {
    return doc['motivoRechazo'] ||
      doc['observacion'] ||
      doc['observaciones'] ||
      doc['comentarios'] ||
      'Sin motivo especificado';
  }

  /**
   * Obtener fecha de rechazo
   */
  getFechaRechazo(doc: DocumentoExtendido): string {
    const fecha = doc['fechaRechazo'] ||
      doc.fechaActualizacion ||
      doc.updatedAt ||
      doc.fechaCreacion;

    if (!fecha) return 'Fecha desconocida';

    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Calcular días desde el rechazo
   */
  getDiasDesdeRechazo(doc: DocumentoExtendido): number {
    const fechaRechazo = doc['fechaRechazo'] ||
      doc.fechaActualizacion ||
      doc.updatedAt;

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

  /**
   * Obtener nombre del contador asignado
   */
  getContadorAsignado(doc: DocumentoExtendido): string {
    return doc['contadorNombre'] ||
      doc['contadorAsignado'] ||
      doc['usuarioAsignadoNombre'] ||
      'No asignado';
  }

  /**
   * Verificar si el documento tiene archivos
   */
  tieneArchivos(doc: DocumentoExtendido): boolean {
    return !!(doc.cuentaCobro ||
      doc.seguridadSocial ||
      doc.informeActividades ||
      doc.glosaPath ||
      doc.causacionPath ||
      doc.extractoPath ||
      doc.comprobanteEgresoPath);
  }

  /**
   * Contar documentos disponibles
   */
  getDocumentCount(doc: DocumentoExtendido): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    if (doc.glosaPath) count++;
    if (doc.causacionPath) count++;
    if (doc.extractoPath) count++;
    if (doc.comprobanteEgresoPath) count++;
    return count;
  }

  /**
   * Ver documento en modo consulta
   */
  verDetalle(doc: DocumentoExtendido): void {
    if (!doc?.id) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    console.log(`👁️ Ver documento rechazado: ${doc.numeroRadicado} (${doc.id})`);

    // Siempre en modo consulta/solo lectura
    this.router.navigate(['/contabilidad/procesar', doc.id], {
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

  /**
   * Descargar todos los archivos del documento
   */
  descargarTodos(doc: DocumentoExtendido): void {
    if (!doc?.id) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    const archivos = [
      { tipo: 'cuenta_cobro', existe: doc.cuentaCobro, nombre: doc.cuentaCobro },
      { tipo: 'seguridad_social', existe: doc.seguridadSocial, nombre: doc.seguridadSocial },
      { tipo: 'informe_actividades', existe: doc.informeActividades, nombre: doc.informeActividades },
      { tipo: 'glosa', existe: doc.glosaPath, nombre: doc.glosaPath },
      { tipo: 'causacion', existe: doc.causacionPath, nombre: doc.causacionPath },
      { tipo: 'extracto', existe: doc.extractoPath, nombre: doc.extractoPath },
      { tipo: 'comprobanteEgreso', existe: doc.comprobanteEgresoPath, nombre: doc.comprobanteEgresoPath }
    ].filter(a => a.existe);

    if (archivos.length === 0) {
      this.notificationService.warning('Sin archivos', 'Este documento no tiene archivos asociados');
      return;
    }

    this.isProcessing = true;

    // Descargar secuencialmente
    let descargados = 0;

    archivos.forEach((archivo, index) => {
      setTimeout(() => {
        this.descargarArchivoEspecifico(doc.id!, archivo.tipo, archivo.nombre!);
        descargados++;

        if (descargados === archivos.length) {
          this.isProcessing = false;
          this.notificationService.success('Descarga completada',
            `Se descargaron ${archivos.length} archivo(s)`);
        }
      }, index * 500); // Delay de 500ms entre descargas
    });
  }

  /**
   * Descargar archivo específico
   */
  descargarArchivoEspecifico(documentoId: string, tipo: string, nombreArchivo: string): void {
    this.contabilidadService.descargarArchivo(documentoId, tipo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreArchivo || `${tipo}_${documentoId}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (error: any) => {
          console.error(`❌ Error descargando ${tipo}:`, error);
        }
      });
  }

  // ===================================================
  // MÉTODOS DE PAGINACIÓN Y BÚSQUEDA
  // ===================================================

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
          (this.getRechazadoPor(doc)?.toLowerCase().includes(term)) ||
          (doc.observacion?.toLowerCase().includes(term))
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  // ===================================================
  // MÉTODOS DE UTILIDAD
  // ===================================================

  formatDate(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
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
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getDiasClass(doc: DocumentoExtendido): string {
    const dias = this.getDiasDesdeRechazo(doc);

    if (dias < 2) return 'text-danger fw-bold'; // Reciente
    if (dias <= 7) return 'text-warning'; // 2-7 días
    if (dias <= 15) return 'text-primary'; // 8-15 días
    return 'text-secondary'; // Más de 15 días
  }

  getTooltipInfo(doc: DocumentoExtendido): string {
    let info = `Radicado: ${doc.numeroRadicado || 'N/A'}\n`;
    info += `Contratista: ${doc.nombreContratista || 'N/A'}\n`;
    info += `Rechazado por: ${this.getRechazadoPor(doc)}\n`;
    info += `Fecha: ${this.getFechaRechazo(doc)}\n`;
    info += `Motivo: ${this.getMotivoRechazo(doc).substring(0, 100)}`;
    return info;
  }

  // ===================================================
  // MÉTODOS PARA MENSAJES
  // ===================================================

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