import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SupervisorService } from '../../../../core/services/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Documento } from '../../../../core/models/documento.model';

@Component({
  selector: 'app-supervisor-pending-list',
  templateUrl: './supervisor-pending-list.component.html',
  styleUrls: ['./supervisor-pending-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class SupervisorPendingListComponent implements OnInit, OnDestroy {
// Lista de documentos RADICADOS
  documentos: Documento[] = [];
  filteredDocumentos: Documento[] = [];
  paginatedDocumentos: Documento[] = [];

  // Estados de carga
  isLoading = false;
  isProcessing = false;  // ✅ Solo estas dos variables de estado

  // Mensajes
  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  // Búsqueda y paginación
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  // Sidebar
  sidebarCollapsed = false;

  // Usuario actual
  usuarioActual = '';

  private destroy$ = new Subject<void>();

  constructor(
    private supervisorService: SupervisorService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Supervisor: Inicializando lista de documentos RADICADOS...');
    this.cargarUsuarioActual();
    this.cargarDocumentosRadicados();
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

  cargarDocumentosRadicados(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('📋 Supervisor: Solicitando documentos RADICADOS...');

    this.supervisorService.obtenerDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documentosArray: Documento[]) => {
          console.log('✅ Documentos RADICADOS recibidos:', documentosArray);

          if (documentosArray.length > 0) {
            // Filtrar solo documentos con estado RADICADO
            const documentosRadicados = documentosArray.filter(doc => {
              const estado = doc.estado?.toUpperCase() || '';
              return estado.includes('RADICADO');
            });

            console.log(`📊 Documentos con estado RADICADO: ${documentosRadicados.length}`);
            this.documentos = documentosRadicados;
          } else {
            this.documentos = [];
          }

          this.filteredDocumentos = [...this.documentos];
          this.updatePagination();

          console.log(`✅ ${this.documentos.length} documentos RADICADOS cargados`);
          this.isLoading = false;

          if (this.documentos.length === 0) {
            this.infoMessage = 'No hay documentos en estado RADICADO disponibles para revisión';
          } else {
            this.successMessage = `Se encontraron ${this.documentos.length} documentos RADICADOS`;
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          }
        },
        error: (error) => {
          console.error('❌ Error al cargar documentos RADICADOS:', error);
          this.errorMessage = 'Error al cargar documentos: ' + (error.message || 'Error desconocido');
          this.isLoading = false;
          this.notificationService.error('Error', this.errorMessage);
          this.infoMessage = 'Intenta usar "Asignar RADICADOS"';
        }
      });
  }

  /**
   * ✅ Forzar asignación de documentos RADICADOS
   */
  forzarAsignacion(): void {
    console.log('🚀 Supervisor: Forzando asignación de documentos RADICADOS...');
    this.isProcessing = true;
    this.infoMessage = '';

    const confirmar = confirm('¿Estás seguro de asignar TODOS los documentos RADICADOS a supervisores?\n\nEsta acción marcará todos los documentos como disponibles para supervisores.');

    if (!confirmar) {
      this.isProcessing = false;
      return;
    }

    this.supervisorService.forzarAsignacionDocumentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado) => {
          console.log('✅ Asignación completada:', resultado);
          this.notificationService.success('Éxito', 'Documentos RADICADOS asignados correctamente');
          this.isProcessing = false;
          this.refreshData();
        },
        error: (error) => {
          console.error('❌ Error forzando asignación:', error);
          this.notificationService.error('Error', 'No se pudo asignar los documentos');
          this.isProcessing = false;
        }
      });
  }

  /**
 * ✅ CORREGIDO: Tomar documento para revisión y redirigir a formulario
 */
tomarParaRevision(doc: Documento): void {
  console.log(`🤝 Supervisor: Tomando documento ${doc.numeroRadicado} para revisión...`);
  
  // Verificar estado actual
  if (doc.estado !== 'RADICADO') {
    this.notificationService.warning('Documento no disponible', 
      `Este documento ya no está disponible. Estado actual: ${doc.estado}`);
    return;
  }

  this.isProcessing = true;

  const confirmar = confirm(`¿Tomar el documento ${doc.numeroRadicado} para revisión?\n\nEsto cambiará el estado a "EN REVISIÓN" y otros supervisores no podrán acceder a él.`);

  if (!confirmar) {
    this.isProcessing = false;
    return;
  }

  this.supervisorService.tomarDocumentoParaRevision(doc.id)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (resultado: any) => {
        console.log('✅ Respuesta de tomar documento:', resultado);

        // Actualizar el estado del documento localmente
        const index = this.documentos.findIndex(d => d.id === doc.id);
        if (index !== -1) {
          this.documentos[index].estado = 'EN_REVISION_SUPERVISOR';
          this.documentos[index].ultimoUsuario = this.usuarioActual;
          this.documentos[index].fechaActualizacion = new Date();
        }

        this.notificationService.success('Éxito', 'Documento tomado para revisión. Estado actualizado.');
        this.isProcessing = false;
        
        // Navegar directamente al formulario de revisión
        this.router.navigate(['/supervisor/revisar', doc.id]);
        
        // Recargar lista después de navegar
        setTimeout(() => {
          this.refreshData();
        }, 1000);
      },
      error: (error: any) => {
        console.error('❌ Error tomando documento:', error);
        this.notificationService.error('Error', error.message || 'No se pudo tomar el documento');
        this.isProcessing = false;
      }
    });
}

  /**
   * Previsualiza un documento específico en nueva pestaña
   */
  previsualizarDocumentoEspecifico(doc: Documento, index: number): void {
    console.log(`👁️ Previsualizando documento ${doc.numeroRadicado}, archivo ${index}`);
    
    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    // Verificar si el documento existe
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

    // Usar el método del servicio de supervisor
    this.supervisorService.previsualizarArchivo(doc.id, index);
  }

  /**
   * Descarga un documento específico
   */
  descargarDocumentoEspecifico(doc: Documento, index: number): void {
    console.log(`📥 Descargando documento ${doc.numeroRadicado}, archivo ${index}`);
    
    if (index < 1 || index > 3) {
      this.notificationService.warning('Advertencia', 'Índice de documento no válido');
      return;
    }

    // Verificar si el documento existe
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
          // Crear URL del blob y descargar
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

  /**
   * ✅ Métodos de utilidad
   */
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

  esDocumentoReciente(doc: Documento): boolean {
    if (!doc?.fechaRadicacion) return false;
    const diasTranscurridos = this.getDiasTranscurridos(doc.fechaRadicacion);
    return diasTranscurridos < 1; // Menos de 24 horas
  }

  getEstadoClass(estado: string): string {
    if (!estado) return 'badge-secondary';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('RADICADO')) return 'badge-primary';
    if (estadoUpper.includes('PENDIENTE') || estadoUpper.includes('EN_REVISION')) return 'badge-warning';
    if (estadoUpper.includes('APROBADO')) return 'badge-success';
    if (estadoUpper.includes('OBSERVADO')) return 'badge-info';
    if (estadoUpper.includes('RECHAZADO')) return 'badge-danger';

    return 'badge-secondary';
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';

    const estadoUpper = estado.toUpperCase();

    if (estadoUpper.includes('RADICADO')) return 'RADICADO';
    if (estadoUpper.includes('PENDIENTE')) return 'Pendiente';
    if (estadoUpper.includes('EN_REVISION')) return 'En Revisión';
    if (estadoUpper.includes('APROBADO')) return 'Aprobado';
    if (estadoUpper.includes('OBSERVADO')) return 'Observado';
    if (estadoUpper.includes('RECHAZADO')) return 'Rechazado';

    return estado;
  }

  getDiasClass(doc: Documento): string {
    const dias = this.getDiasTranscurridos(doc.fechaRadicacion);

    if (dias < 1) return 'text-success'; // Menos de 1 día
    if (dias <= 3) return 'text-primary'; // 1-3 días
    if (dias <= 7) return 'text-warning'; // 4-7 días
    return 'text-danger'; // Más de 7 días
  }

  getTooltipInfo(doc: Documento): string {
    let info = '';

    if (doc.numeroRadicado) {
      info += `Radicado: ${doc.numeroRadicado}\n`;
    }

    if (doc.nombreContratista) {
      info += `Contratista: ${doc.nombreContratista}\n`;
    }

    const dias = this.getDiasTranscurridos(doc.fechaRadicacion);
    info += `Días desde radicación: ${dias}\n`;

    info += `Documentos: ${this.getDocumentCount(doc)}`;

    return info;
  }

  getDocumentCount(doc: Documento): number {
    let count = 0;
    if (doc.cuentaCobro) count++;
    if (doc.seguridadSocial) count++;
    if (doc.informeActividades) count++;
    return count;
  }

  /**
   * ✅ Búsqueda y filtrado
   */
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
          (doc.documentoContratista?.toLowerCase().includes(term))
        );
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * ✅ Recargar datos
   */
  refreshData(): void {
    console.log('🔄 Supervisor: Recargando datos...');
    this.cargarDocumentosRadicados();
  }

  /**
   * ✅ Métodos de paginación
   */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);

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

    // Actualizar documentos paginados
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredDocumentos.length);
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

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