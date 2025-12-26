import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
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
export class SupervisorPendingListComponent implements OnInit, OnDestroy, AfterViewInit {
  // Lista de documentos RADICADOS
  documentos: Documento[] = [];
  filteredDocumentos: Documento[] = [];
  paginatedDocumentos: Documento[] = [];

  // Estados de carga
  isLoading = false;
  cargandoEstadisticas = false;
  isProcessing = false;
  isDownloadingAll = false;
  isDiagnosticando = false;

  // Estadísticas
  estadisticas: any = {
    totalDocumentosRadicados: 0,
    totales: {
      pendientes: 0,
      aprobados: 0,
      observados: 0,
      rechazados: 0,
      total: 0
    }
  };

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
    this.cargarEstadisticas();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initTooltips();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initTooltips(): void {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length > 0) {
      if (typeof (window as any).bootstrap !== 'undefined') {
        Array.from(tooltipTriggerList).forEach((tooltipTriggerEl: Element) => {
          new (window as any).bootstrap.Tooltip(tooltipTriggerEl, {
            placement: 'top',
            trigger: 'hover'
          });
        });
      }
    }
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

    // Primero realizar diagnóstico
    this.supervisorService.realizarDiagnosticoDocumentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (diagnostico) => {
          console.log('🔍 Diagnóstico inicial:', diagnostico);
        },
        error: (error) => {
          console.warn('⚠️ Diagnóstico con advertencias:', error.message);
        }
      });

    // Obtener documentos disponibles (RADICADOS)
    this.supervisorService.obtenerDocumentosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documentosArray: Documento[]) => {
          console.log('✅ Documentos RADICADOS recibidos:', documentosArray);
          console.log(`📊 Número de documentos: ${documentosArray.length}`);

          if (documentosArray.length > 0) {
            console.log('📄 Primer documento RADICADO:', documentosArray[0]);
            console.log('📄 Último documento RADICADO:', documentosArray[documentosArray.length - 1]);
            
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
          
          this.infoMessage = 'Intenta usar "Asignar RADICADOS" o ejecutar "Diagnóstico"';
        }
      });
  }

  cargarEstadisticas(): void {
    this.cargandoEstadisticas = true;

    console.log('📊 Supervisor: Solicitando estadísticas...');

    this.supervisorService.obtenerEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (estadisticas) => {
          console.log('✅ Estadísticas recibidas:', estadisticas);
          this.estadisticas = estadisticas;
          this.cargandoEstadisticas = false;
        },
        error: (error) => {
          console.error('❌ Error cargando estadísticas:', error);
          this.cargandoEstadisticas = false;
          this.estadisticas = {
            totalDocumentosRadicados: 0,
            totales: {
              pendientes: 0,
              aprobados: 0,
              observados: 0,
              rechazados: 0,
              total: 0
            }
          };
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
   * ✅ Verificar supervisores
   */
  verificarSupervisores(): void {
    console.log('👥 Supervisor: Verificando supervisores...');
    this.isProcessing = true;

    this.supervisorService.verificarSupervisores()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado) => {
          console.log('✅ Supervisores verificados:', resultado);
          this.isProcessing = false;
          
          if (resultado.success && resultado.data?.supervisores?.length > 0) {
            const count = resultado.data.supervisores.length;
            this.notificationService.success('Supervisores', `Se encontraron ${count} supervisores activos`);
          } else {
            this.notificationService.warning('Supervisores', 'No se encontraron supervisores activos');
          }
        },
        error: (error) => {
          console.error('❌ Error verificando supervisores:', error);
          this.notificationService.error('Error', 'No se pudieron verificar los supervisores');
          this.isProcessing = false;
        }
      });
  }

  /**
   * ✅ Realizar diagnóstico completo
   */
  realizarDiagnostico(): void {
    console.log('🔍 Supervisor: Realizando diagnóstico completo...');
    this.isDiagnosticando = true;
    this.infoMessage = 'Realizando diagnóstico del sistema...';

    this.supervisorService.realizarDiagnosticoCompleto()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado) => {
          console.log('✅ Diagnóstico completado:', resultado);
          
          if (resultado.success) {
            const backend = resultado.backend;
            let mensaje = '✅ DIAGNÓSTICO DEL SISTEMA\n\n';
            
            // Información del usuario
            if (resultado.frontend?.usuario) {
              mensaje += `👤 USUARIO:\n`;
              mensaje += `   - Nombre: ${resultado.frontend.usuario.fullName || resultado.frontend.usuario.username}\n`;
              mensaje += `   - Rol: ${resultado.frontend.usuario.role}\n`;
              mensaje += `   - Token: ${resultado.frontend.token}\n\n`;
            }
            
            // Documentos
            if (backend?.conteos) {
              mensaje += `📊 DOCUMENTOS EN BD:\n`;
              mensaje += `   - Total: ${backend.conteos.totalDocumentos || 0}\n`;
              mensaje += `   - RADICADO (exacto): ${backend.conteos.radicadoExacto || 0}\n`;
              mensaje += `   - RADICADO (like): ${backend.conteos.radicadoLike || 0}\n\n`;
            }
            
            // Estados
            if (backend?.estadosEnBD) {
              mensaje += `🔍 ESTADOS EN BD:\n`;
              backend.estadosEnBD.forEach((estado: any) => {
                mensaje += `   - "${estado.estado}": ${estado.cantidad} documentos\n`;
              });
              mensaje += '\n';
            }
            
            // Ejemplos
            if (backend?.documentosEjemplo?.length > 0) {
              mensaje += `📄 EJEMPLOS RADICADOS:\n`;
              backend.documentosEjemplo.slice(0, 3).forEach((doc: any, index: number) => {
                mensaje += `   [${index + 1}] ${doc.numeroRadicado} - Estado: "${doc.estado}"\n`;
              });
              mensaje += '\n';
            }
            
            // Supervisores
            if (backend?.supervisores) {
              mensaje += `👥 SUPERVISORES:\n`;
              mensaje += `   - Total: ${backend.supervisores.total || 0}\n`;
              if (backend.supervisores.lista?.length > 0) {
                backend.supervisores.lista.slice(0, 3).forEach((s: any) => {
                  mensaje += `   • ${s.username} (${s.role})\n`;
                });
              }
              mensaje += '\n';
            }
            
            this.infoMessage = 'Diagnóstico completado. Ver consola para detalles completos.';
            
            // Mostrar alerta con información resumida
            alert(mensaje);
          } else {
            this.infoMessage = 'Diagnóstico con errores. Ver consola para detalles.';
          }
          
          this.isDiagnosticando = false;
        },
        error: (error) => {
          console.error('❌ Error en diagnóstico:', error);
          this.notificationService.error('Error', 'No se pudo realizar el diagnóstico');
          this.isDiagnosticando = false;
          this.infoMessage = 'Error en diagnóstico';
        }
      });
  }

  /**
   * ✅ Tomar documento para revisión
   */
  tomarParaRevision(doc: Documento): void {
    console.log(`🤝 Supervisor: Tomando documento ${doc.numeroRadicado} para revisión...`);
    this.isProcessing = true;

    const confirmar = confirm(`¿Tomar el documento ${doc.numeroRadicado} para revisión?\n\nEsto reservará el documento para ti y otros supervisores no podrán acceder a él.`);
    
    if (!confirmar) {
      this.isProcessing = false;
      return;
    }

    this.supervisorService.tomarDocumentoParaRevision(doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado) => {
          console.log('✅ Documento tomado para revisión:', resultado);
          this.notificationService.success('Éxito', `Documento ${doc.numeroRadicado} tomado para revisión`);
          this.isProcessing = false;
          
          // Recargar lista
          this.refreshData();
        },
        error: (error) => {
          console.error('❌ Error tomando documento:', error);
          this.notificationService.error('Error', 'No se pudo tomar el documento para revisión');
          this.isProcessing = false;
        }
      });
  }

  /**
   * ✅ Ver detalle del documento
   */
  verDetalle(documentoId: string): void {
    console.log(`🔍 Supervisor: Navegando al detalle del documento ${documentoId}`);
    this.router.navigate(['/supervisor/documento', documentoId]);
  }

  /**
   * ✅ Descargar todos los documentos
   */
  descargarTodosDocumentos(doc: Documento): void {
    if (this.isDownloadingAll) {
      console.log('⏳ Ya se está descargando, espera...');
      return;
    }

    console.log(`📥 Supervisor: Descargando todos los documentos para ${doc.numeroRadicado}`);
    this.isDownloadingAll = true;

    // Crear array de descargas
    const descargas: any[] = [];
    
    // Documento 1: Cuenta de Cobro
    if (doc.cuentaCobro) {
      descargas.push(
        this.supervisorService.descargarArchivo(doc.id, 1)
      );
    }
    
    // Documento 2: Seguridad Social
    if (doc.seguridadSocial) {
      descargas.push(
        this.supervisorService.descargarArchivo(doc.id, 2)
      );
    }
    
    // Documento 3: Informe de Actividades
    if (doc.informeActividades) {
      descargas.push(
        this.supervisorService.descargarArchivo(doc.id, 3)
      );
    }

    if (descargas.length === 0) {
      this.notificationService.warning('Sin documentos', 'No hay documentos para descargar');
      this.isDownloadingAll = false;
      return;
    }

    this.notificationService.info('Descarga', `Iniciando descarga de ${descargas.length} archivos...`);

    // Ejecutar descargas secuencialmente
    let descargaIndex = 0;
    const ejecutarSiguienteDescarga = () => {
      if (descargaIndex >= descargas.length) {
        console.log('✅ Todas las descargas completadas');
        this.isDownloadingAll = false;
        this.notificationService.success('Descarga completada', `${descargas.length} archivos descargados`);
        return;
      }

      descargas[descargaIndex].subscribe({
        next: (blob: Blob) => {
          // Determinar nombre del archivo
          let nombreArchivo = '';
          switch (descargaIndex) {
            case 0: nombreArchivo = doc.cuentaCobro || 'cuenta_cobro.pdf'; break;
            case 1: nombreArchivo = doc.seguridadSocial || 'seguridad_social.pdf'; break;
            case 2: nombreArchivo = doc.informeActividades || 'informe_actividades.pdf'; break;
            default: nombreArchivo = `documento_${descargaIndex + 1}.pdf`;
          }
          
          // Descargar blob
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreArchivo;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          descargaIndex++;
          setTimeout(ejecutarSiguienteDescarga, 500);
        },
        error: (error: any) => {
          console.error(`❌ Error descargando archivo ${descargaIndex + 1}:`, error);
          descargaIndex++;
          setTimeout(ejecutarSiguienteDescarga, 500);
        }
      });
    };

    ejecutarSiguienteDescarga();
  }

  /**
   * ✅ Previsualizar documento
   */
  previsualizarDocumento(doc: Documento, numeroArchivo: number): void {
    console.log(`👁️ Supervisor: Previsualizando documento ${doc.numeroRadicado}, archivo ${numeroArchivo}`);
    this.supervisorService.previsualizarArchivo(doc.id, numeroArchivo);
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

  contarDocumentosRecientes(): number {
    return this.documentos.filter(doc => this.esDocumentoReciente(doc)).length;
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
    
    if (doc.observacion) {
      info += `Observación: ${doc.observacion}\n`;
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
      this.filteredDocumentos = this.documentos.filter(doc =>
        (doc.numeroRadicado?.toLowerCase().includes(term)) ||
        (doc.nombreContratista?.toLowerCase().includes(term)) ||
        (doc.numeroContrato?.toLowerCase().includes(term)) ||
        (doc.documentoContratista?.toLowerCase().includes(term)) ||
        (doc.radicador?.toLowerCase().includes(term))
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredDocumentos = [...this.documentos];
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * ✅ Recargar datos
   */
  refreshData(): void {
    console.log('🔄 Supervisor: Recargando datos...');
    this.cargarDocumentosRadicados();
    this.cargarEstadisticas();
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

  getPaginatedEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredDocumentos.length);
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