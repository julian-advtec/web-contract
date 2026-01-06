import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupervisorService } from '../../../../core/services/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-supervisor-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './supervisor-history.component.html',
  styleUrls: ['./supervisor-history.component.scss']
})
export class SupervisorHistoryComponent implements OnInit, OnDestroy {
  historial: any[] = [];
  filteredHistorial: any[] = [];
  paginatedHistorial: any[] = [];

  loading = false;
  isProcessing = false;
  error = '';
  successMessage = '';
  infoMessage = '';

  // Búsqueda y paginación
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  // Usuario actual
  usuarioActual = '';

  // Control sidebar
  sidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private supervisorService: SupervisorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Supervisor: Inicializando historial de supervisiones...');
    this.cargarUsuarioActual();
    this.loadHistorial();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // AÑADE ESTE MÉTODO PARA VERIFICAR SI EL DOCUMENTO ES RECIENTE
  esDocumentoReciente(item: any): boolean {
    const fechaActualizacion = item.fechaActualizacion || item.updatedAt;
    if (!fechaActualizacion) return false;

    try {
      const fechaDoc = new Date(fechaActualizacion);
      const ahora = new Date();
      const diferenciaDias = Math.floor((ahora.getTime() - fechaDoc.getTime()) / (1000 * 60 * 60 * 24));

      // Considerar reciente si tiene menos de 7 días
      return diferenciaDias <= 7;
    } catch {
      return false;
    }
  }

  // AÑADE ESTE MÉTODO PARA VERIFICAR SI TIENE DOCUMENTOS
  tieneDocumentos(item: any): boolean {
    const docData = item.documento || item;
    return !!(docData.cuentaCobro || docData.seguridadSocial || docData.informeActividades);
  }

  cargarUsuarioActual(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.usuarioActual = user.fullName || user.username || 'Supervisor';
        console.log('👤 Supervisor actual:', this.usuarioActual);
      } catch (error) {
        console.error('Error parseando usuario:', error);
        this.usuarioActual = 'Supervisor';
      }
    }
  }

  loadHistorial(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.infoMessage = '';

    this.supervisorService.getHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📊 Respuesta del historial:', response);

          if (response.success) {
            this.historial = response.data || [];
            console.log('✅ Historial cargado con', this.historial.length, 'registros');

            // DEBUG: Mostrar estructura del primer elemento
            if (this.historial.length > 0) {
              console.log('🔍 Estructura del primer elemento:', this.historial[0]);
              console.log('📝 Datos disponibles en primer elemento:');
              console.log('- Documento:', this.historial[0].documento);
              console.log('- Estado:', this.historial[0].estado);
              console.log('- Supervisor:', this.historial[0].supervisorRevisor);
            }

            this.filteredHistorial = [...this.historial];
            this.updatePagination();

            if (this.filteredHistorial.length > 0) {
              const recientes = this.filteredHistorial.filter(item => this.esDocumentoReciente(item));
              this.successMessage = `Se encontraron ${this.filteredHistorial.length} supervisiones (${recientes.length} recientes)`;
            } else {
              this.infoMessage = 'No hay supervisiones en el historial';
            }
          } else {
            this.error = response.message || 'Error al cargar el historial';
            this.notificationService.error('Error', this.error);
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Error de conexión con el servidor: ' + err.message;
          this.loading = false;
          console.error('Error:', err);
          this.notificationService.error('Error', this.error);
        }
      });
  }

  // Método para ver documentos del historial
  verDocumentosHistorial(item: any, index: number): void {
    // Extraer el ID del documento
    let documentoId = '';

    if (item.documento?.id) {
      documentoId = item.documento.id;
    } else if (item.id) {
      documentoId = item.id;
    } else if (item.documentoId) {
      documentoId = item.documentoId;
    }

    if (!documentoId) {
      console.error('❌ No hay ID de documento disponible');
      this.notificationService.warning('Documento no disponible', 'No se puede abrir el documento: ID no disponible');
      return;
    }

    console.log(`👁️ Ver documento ${index} del historial:`, item);

    // Verificar si el documento existe usando el método tieneDocumentos
    if (!this.tieneDocumentos(item)) {
      console.warn(`⚠️ Documento ${index} no disponible`);
      this.notificationService.warning('Documento no disponible', `El documento no está disponible para visualización`);
      return;
    }

    // Verificar documento específico
    const docData = item.documento || item;
    let existeDocumento = false;

    switch (index) {
      case 1:
        existeDocumento = !!(docData.cuentaCobro);
        break;
      case 2:
        existeDocumento = !!(docData.seguridadSocial);
        break;
      case 3:
        existeDocumento = !!(docData.informeActividades);
        break;
      default:
        console.error('❌ Índice de documento no válido');
        return;
    }

    if (!existeDocumento) {
      console.warn(`⚠️ Documento ${index} no disponible`);
      this.notificationService.warning('Documento no disponible', `El documento específico no está disponible`);
      return;
    }

    // Llamar directamente al método del servicio
    try {
      this.supervisorService.previsualizarArchivo(documentoId, index);
      console.log(`✅ Documento ${index} abierto`);
      this.notificationService.info('Documento abierto', `El documento se ha abierto en una nueva pestaña`);
    } catch (error: any) {
      console.error(`❌ Error al abrir documento ${index}:`, error);
      this.notificationService.error('Error', `No se pudo abrir el documento: ${error.message || 'Error desconocido'}`);
    }
  }

  // Método para descargar documentos del historial
  descargarDocumentoHistorial(item: any, index: number): void {
    // Extraer el ID del documento
    let documentoId = '';

    if (item.documento?.id) {
      documentoId = item.documento.id;
    } else if (item.id) {
      documentoId = item.id;
    } else if (item.documentoId) {
      documentoId = item.documentoId;
    }

    if (!documentoId) {
      console.error('❌ No hay ID de documento disponible');
      this.notificationService.error('Error', 'No se puede descargar el documento: ID no disponible');
      return;
    }

    console.log(`📥 Descargando documento ${index} del historial:`, item);

    // Verificar si hay documentos disponibles
    if (!this.tieneDocumentos(item)) {
      console.warn(`⚠️ Documento ${index} no disponible para descarga`);
      this.notificationService.warning('Documento no disponible', `El documento no está disponible para descarga`);
      return;
    }

    let nombreDocumento = '';
    let existeDocumento = false;

    const docData = item.documento || item;

    switch (index) {
      case 1:
        nombreDocumento = docData.cuentaCobro || 'cuenta_cobro.pdf';
        existeDocumento = !!docData.cuentaCobro;
        break;
      case 2:
        nombreDocumento = docData.seguridadSocial || 'seguridad_social.pdf';
        existeDocumento = !!docData.seguridadSocial;
        break;
      case 3:
        nombreDocumento = docData.informeActividades || 'informe_actividades.pdf';
        existeDocumento = !!docData.informeActividades;
        break;
      default:
        console.error('❌ Índice de documento no válido');
        return;
    }

    if (!existeDocumento) {
      console.warn(`⚠️ Documento ${index} no disponible para descarga`);
      this.notificationService.warning('Documento no disponible', `El documento específico no está disponible para descarga`);
      return;
    }

    this.isProcessing = true;

    this.supervisorService.descargarArchivo(documentoId, index)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          // Crear URL del blob y descargar
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreDocumento.split(/[\\/]/).pop() || nombreDocumento;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.isProcessing = false;
          console.log(`✅ Documento ${index} descargado`);
          this.notificationService.success('Descarga exitosa', `Documento descargado correctamente`);
        },
        error: (error: any) => {
          console.error(`❌ Error descargando documento ${index}:`, error);
          this.isProcessing = false;
          this.notificationService.error('Error', `No se pudo descargar el documento: ${error.message || 'Error desconocido'}`);
        }
      });
  }

  // NUEVO MÉTODO: Revisar documento nuevamente
 revisarNuevamente(item: any): void {
  console.log('🔄 Revisar documento nuevamente:', item);

  // Extraer el ID del documento
  let documentoId = '';

  if (item.documento?.id) {
    documentoId = item.documento.id;
  } else if (item.id) {
    documentoId = item.id;
  } else if (item.documentoId) {
    documentoId = item.documentoId;
  }

  if (!documentoId) {
    console.error('❌ No hay ID de documento disponible');
    this.notificationService.error('Error', 'No se puede revisar el documento: ID no disponible');
    return;
  }

  // Guardar datos del historial para prellenar el formulario
  const datosHistorial = {
    id: item.id,
    documentoId: documentoId,
    numeroRadicado: this.getNumeroRadicado(item),
    numeroContrato: this.getNumeroContrato(item),
    nombreContratista: this.getNombreContratista(item),
    documentoContratista: this.getDocumentoContratista(item),
    estadoRevision: item.estado || 'PENDIENTE',
    observacionSupervisor: item.observacion || '',
    fechaRevision: item.fechaActualizacion || new Date(),
    supervisorRevisor: this.getSupervisorRevisor(item),
    fechaInicio: item.documento?.fechaInicio || item.fechaInicio,
    fechaFin: item.documento?.fechaFin || item.fechaFin,
    fechaRadicacion: item.documento?.fechaRadicacion || item.fechaRadicacion,
    desdeHistorial: true,
    modoSoloLectura: true // ✅ Indicar que es solo lectura
  };

  // Guardar en localStorage para que el formulario los use
  localStorage.setItem('datosHistorialParaRevision', JSON.stringify(datosHistorial));

  // ✅ CORRECCIÓN: Usar la ruta correcta 'revisar/:id' en lugar de 'ver-revision/:id'
  this.router.navigate(['/supervisor/revisar', documentoId], {
    queryParams: {
      modo: 'consulta',
      desdeHistorial: 'true',
      soloLectura: 'true'
    }
  });
}

  // NUEVO MÉTODO: Calcular duración de revisión
  getDuracionRevision(item: any): string {
    const fechaInicio = item.fechaInicio || item.documento?.fechaInicio || item.createdAt;
    const fechaFin = item.fechaActualizacion || item.updatedAt || new Date();

    if (!fechaInicio) return 'N/A';

    try {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      const diffMs = fin.getTime() - inicio.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Hoy';
      } else if (diffDays === 1) {
        return '1 día';
      } else {
        return `${diffDays} días`;
      }
    } catch {
      return 'N/A';
    }
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'badge bg-light text-dark';

    const estadoUpper = estado.toUpperCase();

    switch (estadoUpper) {
      case 'APROBADO':
      case 'APROBADO_SUPERVISOR':
        return 'badge bg-success';
      case 'OBSERVADO':
      case 'OBSERVADO_SUPERVISOR':
        return 'badge bg-warning text-dark';
      case 'RECHAZADO':
      case 'RECHAZADO_SUPERVISOR':
        return 'badge bg-danger';
      case 'PENDIENTE':
        return 'badge bg-secondary';
      case 'EN_REVISION_SUPERVISOR':
      case 'EN_REVISION':
        return 'badge bg-info';
      case 'RADICADO':
        return 'badge bg-primary';
      default:
        return 'badge bg-light text-dark';
    }
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('APROBADO')) return 'Aprobado';
    if (estadoUpper.includes('OBSERVADO')) return 'Observado';
    if (estadoUpper.includes('RECHAZADO')) return 'Rechazado';
    if (estadoUpper.includes('PENDIENTE')) return 'Pendiente';
    if (estadoUpper.includes('EN_REVISION')) return 'En Revisión';
    if (estadoUpper.includes('RADICADO')) return 'Radicado';

    return estado;
  }

  // ✅ MÉTODOS DE FORMATO DE FECHAS ACTUALIZADOS

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
      // Formato: "12 ene 2024"
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatDateOnly(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      // Formato: "12/01/2024"
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  // Método adicional para formato con mes completo
  formatDateWithFullMonth(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      // Formato: "12 de enero de 2024"
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getDocumentCount(item: any): number {
    let count = 0;
    const docData = item.documento || item;

    if (docData.cuentaCobro) count++;
    if (docData.seguridadSocial) count++;
    if (docData.informeActividades) count++;

    return count;
  }

  getNumeroRadicado(item: any): string {
    return item.documento?.numeroRadicado || item.numeroRadicado || 'N/A';
  }

  getNombreContratista(item: any): string {
    return item.documento?.nombreContratista || item.nombreContratista || 'N/A';
  }

  getDocumentoContratista(item: any): string {
    return item.documento?.documentoContratista || item.documentoContratista || 'N/A';
  }

  getNumeroContrato(item: any): string {
    return item.documento?.numeroContrato || item.numeroContrato || 'N/A';
  }

  getObservacion(item: any): string {
    const observacion = item.observacion || item.documento?.observacion || '';
    if (!observacion) return 'Sin observaciones';
    return observacion.length > 50 ? observacion.substring(0, 50) + '...' : observacion;
  }

  getSupervisorRevisor(item: any): string {
    return item.supervisorRevisor || item.supervisorAsignado || item.usuarioAsignadoNombre || this.usuarioActual || 'Supervisor';
  }

  // Búsqueda y filtrado
  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredHistorial = [...this.historial];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredHistorial = this.historial.filter(item => {
        const doc = item.documento || item;
        return (
          (doc.numeroRadicado?.toLowerCase().includes(term)) ||
          (doc.nombreContratista?.toLowerCase().includes(term)) ||
          (doc.numeroContrato?.toLowerCase().includes(term)) ||
          (doc.documentoContratista?.toLowerCase().includes(term)) ||
          (item.estado?.toLowerCase().includes(term)) ||
          (item.observacion?.toLowerCase().includes(term)) ||
          (item.supervisorRevisor?.toLowerCase().includes(term)) ||
          (item.supervisorAsignado?.toLowerCase().includes(term)) ||
          (item.usuarioAsignadoNombre?.toLowerCase().includes(term)) ||
          (item.ultimoUsuario?.toLowerCase().includes(term))
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  // Métodos de paginación
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredHistorial.length / this.pageSize);

    // Calcular páginas a mostrar
    this.pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }

    // Actualizar historial paginado
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredHistorial.length);
    this.paginatedHistorial = this.filteredHistorial.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  dismissError(): void {
    this.error = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }

  refreshData(): void {
    this.loadHistorial();
  }
}