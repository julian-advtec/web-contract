// src/app/pages/supervisor/components/supervisor-history/supervisor-history.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupervisorService } from '../../../../core/services/supervisor/supervisor.service';
// IMPORTAR EL SERVICIO CORRECTAMENTE (no como tipo)
import { SupervisorEstadisticasService } from '../../../../core/services/supervisor/supervisor-estadisticas.service';
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

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  usuarioActual = '';
  sidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private supervisorService: SupervisorService,
    private notificationService: NotificationService,
    private router: Router,
    private estadisticasService: SupervisorEstadisticasService  // ✅ AHORA SÍ ESTÁ IMPORTADO
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

    this.estadisticasService.obtenerHistorial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (historialData: any[] | null) => {
          this.loading = false;

          console.log('📊 DATOS RECIBIDOS CRUDOS:', historialData);

          // 🔥 IMPORTANTE: Verificar la estructura de los datos
          let documentos: any[] = [];
          
          if (historialData && Array.isArray(historialData)) {
            documentos = historialData;
          } 
          // Si los datos vienen envueltos en un objeto data
          else if (historialData && (historialData as any).data && Array.isArray((historialData as any).data)) {
            documentos = (historialData as any).data;
          }
          // Si vienen en response.data.data (como en tu log)
          else if (historialData && (historialData as any).data?.data && Array.isArray((historialData as any).data.data)) {
            documentos = (historialData as any).data.data;
          }
          
          console.log('📊 Documentos extraídos:', documentos.length);
          
          if (!documentos || documentos.length === 0) {
            this.infoMessage = 'No hay supervisiones en el historial';
            this.historial = [];
            this.filteredHistorial = [];
            this.updatePagination();
            return;
          }

          // Mostrar los estados de cada documento
          documentos.forEach((doc, idx) => {
            console.log(`📄 Documento ${idx + 1}:`, {
              radicado: doc.numeroRadicado,
              estado: doc.estado,
              tieneEstado: !!doc.estado
            });
          });

          this.historial = documentos;
          console.log('✅ Historial cargado con', this.historial.length, 'registros');

          // Debug de estados
          console.log('📊 ESTADOS RECIBIDOS:');
          this.historial.forEach((item, index) => {
            console.log(`${index + 1}. ${item.numeroRadicado} → ESTADO: "${item.estado}"`);
          });

          this.filteredHistorial = [...this.historial];
          this.updatePagination();

          if (this.filteredHistorial.length > 0) {
            const recientes = this.filteredHistorial.filter(item => this.esDocumentoReciente(item));
            this.successMessage = `Se encontraron ${this.filteredHistorial.length} supervisiones (${recientes.length} recientes)`;
          } else {
            this.infoMessage = 'No hay supervisiones en el historial';
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.error = 'Error de conexión con el servidor: ' + (err.message || 'Desconocido');
          console.error('Error cargando historial:', err);
          this.notificationService.error('Error', this.error);
        }
      });
}

  // ✅ NUEVO: Obtener supervisor asignado del documento
  getSupervisorAsignado(item: any): string {
    // Prioridad 1: Supervisor asignado del documento
    if (item.documento?.supervisorAsignado) {
      return item.documento.supervisorAsignado;
    }

    // Prioridad 2: Supervisor actual de la asignación
    if (item.documento?.asignacion?.supervisorActual) {
      return item.documento.asignacion.supervisorActual;
    }

    // Prioridad 3: Usuario asignado del documento
    if (item.documento?.usuarioAsignadoNombre) {
      return item.documento.usuarioAsignadoNombre;
    }

    // Prioridad 4: Supervisor revisor del historial
    if (item.supervisorRevisor) {
      return item.supervisorRevisor;
    }

    // Prioridad 5: Usuario actual como fallback
    return this.usuarioActual;
  }

  // ✅ NUEVO MÉTODO: Verificar si soy el supervisor asignado
  esMiDocumento(item: any): boolean {
    const supervisorAsignado = this.getSupervisorAsignado(item);
    return this.compararNombres(supervisorAsignado, this.usuarioActual);
  }

  // ✅ NUEVO MÉTODO: Comparar nombres de forma flexible
  compararNombres(nombre1: string, nombre2: string): boolean {
    if (!nombre1 || !nombre2) return false;

    const normalizar = (nombre: string) => {
      return nombre.toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[áä]/g, 'a').replace(/[éë]/g, 'e').replace(/[íï]/g, 'i')
        .replace(/[óö]/g, 'o').replace(/[úü]/g, 'u');
    };

    const nombre1Normalizado = normalizar(nombre1);
    const nombre2Normalizado = normalizar(nombre2);

    return nombre1Normalizado === nombre2Normalizado ||
      nombre1Normalizado.includes(nombre2Normalizado) ||
      nombre2Normalizado.includes(nombre1Normalizado);
  }

  revisarNuevamente(item: any): void {
    console.log('🔄 Revisar documento desde historial:', item);

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

    const estado = item.estado?.toUpperCase() || '';
    const supervisorAsignado = this.getSupervisorAsignado(item);
    const soyElSupervisor = this.esMiDocumento(item);

    const queryParams = this.determinarModoNavegacion(estado, supervisorAsignado, soyElSupervisor);

    console.log('🚀 Navegando a formulario con:', {
      documentoId,  // ← Usamos documentoId, no doc.id
      estado,
      supervisorAsignado,
      soyElSupervisor,
      usuarioActual: this.usuarioActual,
      queryParams
    });

    // ✅ CORREGIDO: Usar documentoId en lugar de doc.id
    this.router.navigate(['/supervisor/revisar', documentoId], { queryParams });
  }


  private determinarModoNavegacion(estado: string, supervisorAsignado: string, soyElSupervisor: boolean): any {
    const queryParams: any = {
      desdeHistorial: 'true'
    };

    console.log('🔍 Determinando modo de navegación:', {
      estado,
      supervisorAsignado,
      soyElSupervisor
    });

    const estadosSoloLecturaFinal = ['APROBADO', 'RECHAZADO'];
    const estadosPotencialmenteEditables = [
      'RADICADO',
      'EN_REVISION',
      'EN_REVISION_SUPERVISOR',
      'OBSERVADO',
      'PENDIENTE',
      'PENDIENTE_CORRECCIONES'
    ];

    const esEstadoFinal = estadosSoloLecturaFinal.some(e => estado.includes(e));
    const esEstadoPotencialEditable = estadosPotencialmenteEditables.some(e => estado.includes(e));

    if (esEstadoFinal) {
      queryParams.soloLectura = 'true';
      queryParams.modo = 'consulta';
      console.log('✅ Modo: SOLO LECTURA (estado final APROBADO/RECHAZADO)');
    }
    else if (esEstadoPotencialEditable && soyElSupervisor) {
      queryParams.modo = 'edicion';
      queryParams.soloLectura = 'false';
      console.log('✅ Modo: EDICIÓN (estado editable, soy el supervisor)');
    }
    else if (esEstadoPotencialEditable && !soyElSupervisor) {
      queryParams.soloLectura = 'true';
      queryParams.modo = 'consulta';
      console.log('✅ Modo: SOLO LECTURA (estado editable, NO soy el supervisor)');
    }
    else {
      queryParams.modo = 'edicion';
      queryParams.soloLectura = 'false';
      console.log('⚠️ Modo: EDICIÓN (por defecto, estado no identificado)');
    }

    return queryParams;
  }

  esDocumentoReciente(item: any): boolean {
    const fechaActualizacion = item.fechaActualizacion || item.updatedAt;
    if (!fechaActualizacion) return false;

    try {
      const fechaDoc = new Date(fechaActualizacion);
      const ahora = new Date();
      const diferenciaDias = Math.floor((ahora.getTime() - fechaDoc.getTime()) / (1000 * 60 * 60 * 24));
      return diferenciaDias <= 7;
    } catch {
      return false;
    }
  }

  tieneDocumentos(item: any): boolean {
    const docData = item.documento || item;
    return !!(docData.cuentaCobro || docData.seguridadSocial || docData.informeActividades);
  }

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

  getEstadoReal(item: any): string {
    // El estado está directamente en el item (como viene del endpoint mis-supervisiones)
    if (item.estado) {
      return item.estado;
    }

    // Fallback: si por alguna razón viene en documento
    if (item.documento?.estado) {
      return item.documento.estado;
    }

    return 'SIN ESTADO';
  }


  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'bg-secondary';

    const e = estado.toUpperCase();

    // Log para debug (puedes quitarlo después)
    console.log('🎨 Estado para badge:', e);

    // Solo colores genéricos basados en palabras clave
    if (e.includes('APROBADO') || e.includes('COMPLETADO') || e === 'PAGADO') {
      return 'bg-success';
    }

    if (e.includes('RECHAZADO')) {
      return 'bg-danger';
    }

    if (e.includes('OBSERVADO') || e.includes('GLOSADO')) {
      return 'bg-warning text-dark';
    }

    if (e.includes('REVISION') || e === 'RADICADO' || e === 'EN_PROCESO') {
      return 'bg-info text-dark';
    }

    if (e === 'PENDIENTE') {
      return 'bg-secondary';
    }

    return 'bg-secondary';
  }

  // ✅ getEstadoTexto - devuelve el texto literal
  getEstadoTexto(estado: string): string {
    return estado || 'SIN ESTADO';
  }

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
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
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

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredHistorial.length / this.pageSize);

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

  verDocumentosHistorial(item: any, index: number): void {
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

    if (!this.tieneDocumentos(item)) {
      console.warn(`⚠️ Documento ${index} no disponible`);
      this.notificationService.warning('Documento no disponible', `El documento no está disponible para visualización`);
      return;
    }

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

    try {

      console.log(`✅ Documento ${index} abierto`);
      this.notificationService.info('Documento abierto', `El documento se ha abierto en una nueva pestaña`);
    } catch (error: any) {
      console.error(`❌ Error al abrir documento ${index}:`, error);
      this.notificationService.error('Error', `No se pudo abrir el documento: ${error.message || 'Error desconocido'}`);
    }
  }

  descargarDocumentoHistorial(item: any, index: number): void {
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
}