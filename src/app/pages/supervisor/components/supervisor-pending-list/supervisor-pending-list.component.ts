import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SupervisorService } from '../../../../core/services/supervisor/supervisor.service';
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
  documentos: Documento[] = [];
  filteredDocumentos: Documento[] = [];
  paginatedDocumentos: Documento[] = [];

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
    console.log('🚀 Supervisor Pending: Inicializando componente...');
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
        console.log('👤 Usuario actual detectado:', this.usuarioActual);
      } catch {
        this.usuarioActual = 'Supervisor';
      }
    }
  }

  cargarDocumentosRadicados(): void {
  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';
  this.infoMessage = '';

  console.log('📋 Solicitando documentos APROBADOS POR AUDITOR...');

  this.supervisorService.obtenerDocumentosDisponibles()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (docs: Documento[]) => {
        console.log('[SUPERVISOR] Documentos recibidos del backend:', docs.length, docs);

        // ✅ CAMBIO IMPORTANTE: Filtrar documentos en estado APROBADO_AUDITOR
        this.documentos = docs.filter(doc => {
          const estado = (doc.estado || '').toUpperCase();
          // El supervisor debe ver documentos APROBADOS POR AUDITOR
          return estado === 'APROBADO_AUDITOR';
        });

        console.log(`📊 Filtrados ${this.documentos.length} documentos en estado APROBADO_AUDITOR`);

        if (this.documentos.length > 0) {
          this.successMessage = `Se encontraron ${this.documentos.length} documentos APROBADOS POR AUDITOR`;
          setTimeout(() => this.successMessage = '', 4000);
        } else {
          this.infoMessage = 'No hay documentos APROBADOS POR AUDITOR disponibles';
        }

        this.filteredDocumentos = [...this.documentos];
        this.updatePagination();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('[SUPERVISOR] Error cargando documentos:', err);
        this.errorMessage = err.error?.message || err.message || 'Error al cargar documentos';
        this.notificationService.error('Error', this.errorMessage);
        this.isLoading = false;
      }
    });
}

  // ───────────────────────────────────────────────────────────────
  // Métodos corregidos: tomar y continuar (los más importantes)
  // ───────────────────────────────────────────────────────────────

 puedeTomarDocumento(doc: Documento): boolean {
  const estado = (doc.estado || '').toUpperCase();
  // ✅ El supervisor puede tomar documentos APROBADOS_POR_AUDITOR
  const puedeTomar = estado === 'APROBADO_AUDITOR';
  
  // Si ya está en revisión por este supervisor, también puede continuar
  const enRevisionPorMi = estado === 'EN_REVISION_SUPERVISOR' && 
    (doc.supervisorAsignado || doc['asignacion']?.['supervisorActual']) === this.usuarioActual;

  return puedeTomar || enRevisionPorMi;
}

getTextoBoton(doc: Documento): string {
  const estado = (doc.estado || '').toUpperCase();
  const enRevisionPorMi = estado === 'EN_REVISION_SUPERVISOR' && 
    (doc.supervisorAsignado || doc['asignacion']?.['supervisorActual']) === this.usuarioActual;

  if (enRevisionPorMi) return 'Continuar';
  if (estado === 'APROBADO_AUDITOR') return 'Tomar';
  return 'No disponible';
}
  tomarParaRevision(doc: Documento): void {
    if (!doc?.id) {
      this.notificationService.error('Error', 'ID de documento no válido');
      return;
    }

    console.log(`🤝 Intentando tomar/continuar documento: ${doc.numeroRadicado} (${doc.id})`);

    const enRevision = (doc.estado || '').toUpperCase().includes('EN_REVISION');
    const soyYo = (doc.supervisorAsignado || doc['asignacion']?.['supervisorActual'] || '') === this.usuarioActual;

    if (enRevision && soyYo) {
      console.log('[CONTINUAR] Ya es mío → redirigiendo directamente');
      this.continuarRevision(doc);
      return;
    }

    if (enRevision && !soyYo) {
      const otroSupervisor = doc.supervisorAsignado || doc['asignacion']?.['supervisorActual'] || 'otro usuario';
      this.notificationService.warning('En revisión', `Ya está siendo revisado por ${otroSupervisor}`);
      return;
    }

    // Confirmación para tomar nuevo
    const confirmar = confirm(
      `¿Tomar el documento ${doc.numeroRadicado || 'sin radicado'} para revisión?\n\n` +
      `Esto lo asignará a ti y cambiará el estado a "EN REVISIÓN SUPERVISOR".`
    );

    if (!confirmar) return;

    this.isProcessing = true;

    this.supervisorService.tomarDocumentoParaRevision(doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          console.log('[TOMAR] Respuesta completa del backend:', JSON.stringify(res, null, 2));

          // Criterios amplios de éxito
          const exito =
            res?.success === true ||
            res?.ok === true ||
            res?.message?.toLowerCase().includes('tomado') ||
            res?.message?.toLowerCase().includes('éxito') ||
            res?.message?.toLowerCase().includes('asignado') ||
            res?.documento?.estado?.includes('EN_REVISION') ||
            res?.status === 200 || res?.status === 201;

          if (exito) {
            console.log('[TOMAR] Éxito detectado');

            // Actualizar localmente
            const idx = this.documentos.findIndex(d => d.id === doc.id);
            if (idx !== -1) {
              this.documentos[idx] = {
                ...this.documentos[idx],
                estado: 'EN_REVISION_SUPERVISOR',
                supervisorAsignado: this.usuarioActual,
                fechaAsignacion: new Date().toISOString(),
                ultimoUsuario: this.usuarioActual
              };

              // Si usa asignacion como objeto
              if (this.documentos[idx]['asignacion']) {
                this.documentos[idx]['asignacion'] = {
                  ...this.documentos[idx]['asignacion'],
                  supervisorActual: this.usuarioActual,
                  enRevision: true,
                  fechaAsignacion: new Date().toISOString()
                };
              }

              this.filteredDocumentos = [...this.documentos];
              this.updatePagination();

              console.log('[TOMAR] Lista local actualizada');
            }

            this.notificationService.success(
              '¡Documento tomado!',
              `Redirigiendo a revisión de ${doc.numeroRadicado || doc.id}...`
            );

            // ✅ Navegación con modo edición FORZADO
            setTimeout(() => {
              console.log('[NAVEGACIÓN] Intentando ir a /supervisor/revisar/' + doc.id);
              this.router.navigate(['/supervisor/revisar', doc.id], {
                queryParams: {
                  desde: 'pendientes',
                  modo: 'edicion',           // ← FORZAR MODO EDICIÓN
                  soloLectura: 'false',       // ← FORZAR QUE NO SEA SOLO LECTURA
                  refresh: Date.now().toString()
                }
              }).then(navOk => {
                console.log('[NAVEGACIÓN] Resultado:', navOk ? 'ÉXITO' : 'FALLÓ');
                if (!navOk) {
                  this.notificationService.warning('Redirección fallida', 'Intenta ingresar manualmente');
                }
              }).catch(err => {
                console.error('[NAVEGACIÓN] Error:', err);
                this.notificationService.error('Redirección fallida', 'Verifica la ruta o permisos');
              });
            }, 1800);
          } else {
            console.warn('[TOMAR] Respuesta no considerada exitosa');
            this.notificationService.error(
              'Problema al tomar',
              res?.message || 'No se pudo asignar el documento. Intenta refrescar la lista.'
            );
          }

          this.isProcessing = false;
        },
        error: (err: any) => {
          console.error('[TOMAR] Error completo:', err);

          let msg = 'No se pudo tomar el documento';
          if (err.status === 409) msg = err.error?.message || 'Ya está siendo revisado por otro supervisor';
          if (err.status === 403) msg = 'No tienes permisos para tomar este documento';
          if (err.status === 404) msg = 'Documento no encontrado o no disponible';
          if (err.status === 500) msg = 'Error interno del servidor';

          this.notificationService.error('Error', msg);
          this.isProcessing = false;
        }
      });
  }

  continuarRevision(doc: Documento): void {
    console.log(`▶️ Continuando revisión de ${doc.numeroRadicado || doc.id}`);

    // ✅ También forzar modo edición al continuar
    this.router.navigate(['/supervisor/revisar', doc.id], {
      queryParams: { 
        desde: 'pendientes',
        modo: 'edicion',
        soloLectura: 'false'
      }
    }).then(ok => {
      console.log('[CONTINUAR] Navegación:', ok ? 'exitosa' : 'fallida');
    }).catch(err => {
      console.error('[CONTINUAR] Error:', err);
      this.notificationService.error('Redirección fallida', 'Intenta ingresar manualmente');
    });
  }

  // ───────────────────────────────────────────────────────────────
  // Resto de métodos (sin cambios críticos)
  // ───────────────────────────────────────────────────────────────

  refreshData(): void {
    console.log('🔄 Refrescando lista de pendientes...');
    this.cargarDocumentosRadicados();
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

  // ✅ NUEVOS MÉTODOS HELPER
  getSupervisorEstado(doc: Documento): string {
    return doc['supervisorEstado'] || doc['asignacion']?.['estado'] || 'Pendiente';
  }

  getSupervisorAsignado(doc: Documento): string {
    return doc['supervisorAsignado'] || doc['asignacion']?.['supervisorActual'] || '';
  }

  estaEnRevision(doc: Documento): boolean {
    return doc['supervisorEstado'] === 'EN_REVISION' || doc['asignacion']?.['enRevision'] === true;
  }

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

  // Resto de los métodos existentes (formatDate, getDuracionContrato, etc.)...
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

  // Métodos para archivos (mantener compatibilidad)
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
}