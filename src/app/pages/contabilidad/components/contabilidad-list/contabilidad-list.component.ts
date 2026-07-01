// src/app/pages/contabilidad/components/contabilidad-list/contabilidad-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-contabilidad-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contabilidad-list.component.html',
  styleUrls: ['./contabilidad-list.component.scss']
})
export class ContabilidadListComponent implements OnInit, OnDestroy {
  documentos: any[] = [];
  filteredDocumentos: any[] = [];
  paginatedDocumentos: any[] = [];

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

  filtroEstado = 'todos';
  filtroAsignacion = 'todos';
  filtroFecha = 'todos';

  private destroy$ = new Subject<void>();

  constructor(
    private contabilidadService: ContabilidadService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarDocumentos();
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
      } catch {
        this.usuarioActual = 'Contador';
      }
    }
  }

  cargarDocumentos(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.infoMessage = '';

    forkJoin({
      disponibles: this.contabilidadService.obtenerDocumentosDisponibles().pipe(takeUntil(this.destroy$)),
      enRevision: this.contabilidadService.obtenerDocumentosEnRevision().pipe(takeUntil(this.destroy$)),
      historial: this.contabilidadService.getHistorial().pipe(takeUntil(this.destroy$))
    }).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (resultados) => {
        console.log('📊 Disponibles:', resultados.disponibles?.length || 0);
        console.log('📊 En revisión:', resultados.enRevision?.length || 0);
        console.log('📊 Historial:', resultados.historial?.length || 0);
        
        this.combinarDocumentos(
          resultados.disponibles || [],
          resultados.enRevision || [],
          resultados.historial || []
        );
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error('Error cargando documentos:', err);
        this.error = 'Error al cargar los documentos';
        this.notificationService.error('Error', this.error);
        this.documentos = [];
        this.filteredDocumentos = [];
        this.updatePagination();
      }
    });
  }

  combinarDocumentos(disponibles: any[], enRevision: any[], historial: any[]): void {
    const todos: any[] = [];
    const idsProcesados = new Set<string>();

    // 1. Documentos disponibles (APROBADO_SUPERVISOR)
    disponibles.forEach((doc: any) => {
      if (!doc?.id || idsProcesados.has(doc.id)) return;
      
      // ✅ Mantener el estado COMPLETO del documento
      const estadoDocumento = doc.estado || 'APROBADO_SUPERVISOR';
      
      todos.push({
        ...doc,
        tipo: 'disponible',
        estadoContabilidad: 'DISPONIBLE',
        estadoDocumento: estadoDocumento, // ← Estado COMPLETO
        estadoOriginal: estadoDocumento,   // ← Guardar copia del estado original
        contadorAsignado: null,
        puedeTomar: true,
        esMio: false,
        fechaReferencia: doc.fechaRadicacion || doc.fechaCreacion
      });
      idsProcesados.add(doc.id);
    });

    // 2. Documentos en revisión
    enRevision.forEach((doc: any) => {
      if (!doc?.id || idsProcesados.has(doc.id)) return;
      
      // ✅ Mantener el estado COMPLETO del documento
      const estadoDocumento = doc.estado || 'EN_REVISION_CONTABILIDAD';
      let estadoContabilidad = 'EN_REVISION';
      
      // Determinar estado de contabilidad
      if (estadoDocumento.includes('COMPLETADO')) estadoContabilidad = 'COMPLETADO';
      else if (estadoDocumento.includes('RECHAZADO')) estadoContabilidad = 'RECHAZADO';
      else if (estadoDocumento.includes('OBSERVADO')) estadoContabilidad = 'OBSERVADO';
      else if (estadoDocumento.includes('GLOSADO')) estadoContabilidad = 'GLOSADO';
      else if (estadoDocumento.includes('PROCESADO')) estadoContabilidad = 'PROCESADO';

      todos.push({
        ...doc,
        tipo: 'en_revision',
        estadoContabilidad: estadoContabilidad,
        estadoDocumento: estadoDocumento, // ← Estado COMPLETO
        estadoOriginal: estadoDocumento,   // ← Guardar copia
        contadorAsignado: this.usuarioActual,
        puedeTomar: false,
        esMio: true,
        tieneGlosa: doc.tieneGlosa,
        tipoCausacion: doc.tipoCausacion,
        observaciones: doc.observaciones || doc.observacion || '',
        fechaReferencia: doc.fechaAsignacion || doc.fechaInicioRevision || doc.fechaRadicacion
      });
      idsProcesados.add(doc.id);
    });

    // 3. Historial
    historial.forEach((item: any) => {
      const doc = item.documento || item;
      if (!doc?.id || idsProcesados.has(doc.id)) return;

      // ✅ Mantener el estado COMPLETO del documento
      const estadoDocumento = doc.estado || item.estadoDocumento || 'PROCESADO';
      let estadoContabilidad = 'PROCESADO';
      const observaciones = item.observaciones || doc.observacion || '';

      // Determinar estado de contabilidad simplificado
      if (estadoDocumento.includes('COMPLETADO') || 
          estadoDocumento.includes('APROBADO') ||
          estadoDocumento === 'COMPLETADO') {
        estadoContabilidad = 'COMPLETADO';
      } else if (estadoDocumento.includes('RECHAZADO') || 
                 estadoDocumento === 'RECHAZADO' ||
                 observaciones.toUpperCase().includes('RECHAZ')) {
        estadoContabilidad = 'RECHAZADO';
      } else if (estadoDocumento.includes('OBSERVADO') || 
                 estadoDocumento === 'OBSERVADO' ||
                 observaciones.toUpperCase().includes('OBSERV')) {
        estadoContabilidad = 'OBSERVADO';
      } else if (estadoDocumento.includes('GLOSADO')) {
        estadoContabilidad = 'GLOSADO';
      }

      const esMio = this.esMiDocumento({
        contadorRevisor: item.contadorRevisor || item.contadorAsignado,
        contadorAsignado: item.contadorAsignado
      });

      todos.push({
        ...doc,
        tipo: 'procesado',
        estadoContabilidad: estadoContabilidad,
        estadoDocumento: estadoDocumento, // ← Estado COMPLETO
        estadoOriginal: estadoDocumento,   // ← Guardar copia
        esMio: esMio,
        puedeTomar: false,
        contadorRevisor: item.contadorRevisor || item.contadorAsignado,
        observacionesContabilidad: item.observaciones || '',
        tieneGlosa: item.tieneGlosa ?? doc.tieneGlosa,
        tipoCausacion: item.tipoCausacion ?? doc.tipoCausacion,
        fechaReferencia: item.fechaFinRevision || item.fechaActualizacion || doc.fechaRadicacion
      });
      idsProcesados.add(doc.id);
    });

    // Ordenar: en revisión → disponibles → procesados
    this.documentos = [
      ...todos.filter(d => d.tipo === 'en_revision'),
      ...todos.filter(d => d.tipo === 'disponible'),
      ...todos.filter(d => d.tipo === 'procesado')
    ];

    console.log(`[CONTABILIDAD-LIST] Documentos cargados: ${this.documentos.length}`);
    console.table(this.documentos.map(d => ({
      radicado: d.numeroRadicado,
      tipo: d.tipo,
      estadoDocumento: d.estadoDocumento,
      estadoContabilidad: d.estadoContabilidad,
      tieneGlosa: d.tieneGlosa
    })));
  }

  // ==================== MÉTODOS GETTERS ====================

  getDisponiblesCount(): number {
    return this.documentos.filter(d => d.tipo === 'disponible').length;
  }

  getEnRevisionCount(): number {
    return this.documentos.filter(d => d.tipo === 'en_revision').length;
  }

  getProcesadosCount(): number {
    return this.documentos.filter(d => d.tipo === 'procesado').length;
  }

  getNumeroRadicado(documento: any): string {
    return documento.numeroRadicado || 'N/A';
  }

  getFechaRadicacion(documento: any): string | Date {
    return documento.fechaRadicacion || documento.fechaCreacion;
  }

  getRadicador(documento: any): string {
    return documento.radicador || 'Sistema';
  }

  getNombreContratista(documento: any): string {
    return documento.nombreContratista || 'Sin nombre';
  }

  getDocumentoContratista(documento: any): string {
    return documento.documentoContratista || 'N/A';
  }

  getNumeroContrato(documento: any): string {
    return documento.numeroContrato || 'Sin contrato';
  }

  getFechaInicio(documento: any): string | Date {
    return documento.fechaInicio;
  }

  getFechaFin(documento: any): string | Date {
    return documento.fechaFin;
  }

  getEstadoDocumento(documento: any): string {
    // ✅ Retorna el estado COMPLETO del documento
    return documento.estadoOriginal || documento.estadoDocumento || documento.estado || '';
  }

  getEstadoContabilidad(documento: any): string {
    return documento.estadoContabilidad || '';
  }

  getObservacion(documento: any): string {
    return documento.observacion || '';
  }

  getObservacionCorta(documento: any): string {
    const obs = documento.observacion || '';
    return obs.length > 25 ? obs.substring(0, 25) + '...' : obs;
  }

  getContadorRevisor(documento: any): string {
    return documento.contadorRevisor || documento.contadorAsignado || '';
  }

  // ==================== MÉTODOS DE NEGOCIO ====================

  esMiDocumento(item: any): boolean {
    const contadorAsignado = item.contadorAsignado || item.contadorRevisor || '';
    return this.compararNombres(contadorAsignado, this.usuarioActual);
  }

  compararNombres(nombre1: string, nombre2: string): boolean {
    if (!nombre1 || !nombre2) return false;
    const normalizar = (nombre: string) => nombre.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalizar(nombre1);
    const n2 = normalizar(nombre2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }

  tomarDocumento(documento: any): void {
    if (this.isProcessing) return;
    
    if (documento.tipo !== 'disponible') {
      this.notificationService.warning('Advertencia', 'Este documento no está disponible para tomar');
      return;
    }

    this.notificationService.showModal({
      title: 'Tomar documento',
      message: `¿Deseas tomar el documento ${documento.numeroRadicado || 'N/A'} para revisión contable?`,
      type: 'confirm',
      confirmText: 'Sí, tomar',
      cancelText: 'Cancelar',
      onConfirm: () => this.procederTomarDocumento(documento)
    });
  }

  procederTomarDocumento(documento: any): void {
    this.isProcessing = true;

    this.contabilidadService.tomarDocumentoParaRevision(documento.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.notificationService.success('Éxito', 'Documento tomado para revisión');
          
          const index = this.documentos.findIndex(d => d.id === documento.id);
          if (index !== -1) {
            this.documentos[index] = {
              ...this.documentos[index],
              tipo: 'en_revision',
              estadoContabilidad: 'EN_REVISION',
              estadoDocumento: 'EN_REVISION_CONTABILIDAD',
              estadoOriginal: 'EN_REVISION_CONTABILIDAD',
              contadorAsignado: this.usuarioActual,
              esMio: true,
              puedeTomar: false
            };
          }

          this.aplicarFiltros();
          this.isProcessing = false;

          setTimeout(() => {
            this.router.navigate(['/contabilidad/procesar', documento.id], {
              queryParams: { modo: 'edicion', soloLectura: 'false' }
            });
          }, 1500);
        },
        error: (err: any) => {
          this.notificationService.error('Error', err.message || 'No se pudo tomar el documento');
          this.isProcessing = false;
        }
      });
  }

  verDocumento(documento: any): void {
    const documentoId = documento.id;
    const esMio = documento.tipo === 'en_revision' || documento.esMio;
    const esEditable = documento.tipo === 'en_revision' && esMio;

    this.router.navigate(['/contabilidad/procesar', documentoId], {
      queryParams: {
        modo: esEditable ? 'edicion' : 'consulta',
        soloLectura: esEditable ? 'false' : 'true',
        origen: 'lista'
      }
    });
  }

  getTextoBoton(documento: any): string {
    if (documento.tipo === 'disponible') return 'Tomar';
    if (documento.tipo === 'en_revision') return 'Revisar';
    return 'Consultar';
  }

  getClaseBoton(documento: any): string {
    if (documento.tipo === 'disponible') return 'btn-success';
    if (documento.tipo === 'en_revision') return 'btn-primary';
    return 'btn-info';
  }

  esDocumentoReciente(item: any): boolean {
    const fecha = item.fechaRadicacion || item.fechaCreacion || item.fechaActualizacion;
    if (!fecha) return false;
    const dias = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 7;
  }

  // ==================== MÉTODOS DE ESTADO ====================

  /**
   * Retorna la clase CSS para el badge según el estado del DOCUMENTO (COMPLETO)
   */
  getEstadoDocumentoBadgeClass(estado: string | undefined): string {
    if (!estado) return 'badge bg-secondary';
    
    const e = estado.toUpperCase();
    
    // Estados de Supervisor
    if (e === 'APROBADO_SUPERVISOR') return 'badge bg-success';
    if (e === 'OBSERVADO_SUPERVISOR') return 'badge bg-warning text-dark';
    if (e === 'RECHAZADO_SUPERVISOR') return 'badge bg-danger';
    if (e === 'EN_REVISION_SUPERVISOR') return 'badge bg-primary';
    if (e === 'FIRMADO_SUPERVISOR') return 'badge bg-info';
    
    // Estados de Auditor
    if (e === 'EN_REVISION_AUDITOR') return 'badge bg-primary';
    if (e === 'APROBADO_AUDITOR') return 'badge bg-success';
    if (e === 'OBSERVADO_AUDITOR') return 'badge bg-warning text-dark';
    if (e === 'RECHAZADO_AUDITOR') return 'badge bg-danger';
    if (e === 'COMPLETADO_AUDITOR') return 'badge bg-success';
    
    // Estados de Contabilidad
    if (e === 'EN_REVISION_CONTABILIDAD') return 'badge bg-primary';
    if (e === 'APROBADO_CONTABILIDAD') return 'badge bg-success';
    if (e === 'OBSERVADO_CONTABILIDAD') return 'badge bg-warning text-dark';
    if (e === 'RECHAZADO_CONTABILIDAD') return 'badge bg-danger';
    if (e === 'COMPLETADO_CONTABILIDAD') return 'badge bg-success';
    if (e === 'GLOSADO_CONTABILIDAD') return 'badge bg-purple';
    if (e === 'PROCESADO_CONTABILIDAD') return 'badge bg-success';
    
    // Estados de Tesorería
    if (e === 'EN_REVISION_TESORERIA') return 'badge bg-primary';
    if (e === 'APROBADO_TESORERIA') return 'badge bg-success';
    if (e === 'OBSERVADO_TESORERIA') return 'badge bg-warning text-dark';
    if (e === 'RECHAZADO_TESORERIA') return 'badge bg-danger';
    if (e === 'COMPLETADO_TESORERIA') return 'badge bg-success';
    
    // Estados de Asesor Gerencia
    if (e === 'EN_REVISION_ASESOR_GERENCIA') return 'badge bg-primary';
    if (e === 'APROBADO_ASESOR_GERENCIA') return 'badge bg-success';
    if (e === 'OBSERVADO_ASESOR_GERENCIA') return 'badge bg-warning text-dark';
    if (e === 'RECHAZADO_ASESOR_GERENCIA') return 'badge bg-danger';
    
    // Estados de Rendición Cuentas
    if (e === 'EN_REVISION_RENDICION_CUENTAS') return 'badge bg-primary';
    if (e === 'APROBADO_RENDICION_CUENTAS') return 'badge bg-success';
    if (e === 'OBSERVADO_RENDICION_CUENTAS') return 'badge bg-warning text-dark';
    if (e === 'RECHAZADO_RENDICION_CUENTAS') return 'badge bg-danger';
    
    // Estados finales
    if (e === 'COMPLETADO') return 'badge bg-success';
    if (e === 'PAGADO') return 'badge bg-success';
    if (e === 'FINALIZADO') return 'badge bg-secondary';
    if (e === 'ANULADO') return 'badge bg-secondary';
    if (e === 'RADICADO') return 'badge bg-secondary';
    if (e === 'CON_ACTA') return 'badge bg-info';
    
    return 'badge bg-secondary';
  }

  /**
   * Retorna el texto legible del estado del DOCUMENTO (COMPLETO)
   */
  getEstadoDocumentoTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    
    const e = estado.toUpperCase();
    
    // Mapeo completo de estados
    const mapeo: Record<string, string> = {
      'APROBADO_SUPERVISOR': 'Aprobado Supervisor',
      'OBSERVADO_SUPERVISOR': 'Observado Supervisor',
      'RECHAZADO_SUPERVISOR': 'Rechazado Supervisor',
      'EN_REVISION_SUPERVISOR': 'En Revisión Supervisor',
      'FIRMADO_SUPERVISOR': 'Firmado Supervisor',
      'EN_REVISION_AUDITOR': 'En Revisión Auditor',
      'APROBADO_AUDITOR': 'Aprobado Auditor',
      'OBSERVADO_AUDITOR': 'Observado Auditor',
      'RECHAZADO_AUDITOR': 'Rechazado Auditor',
      'COMPLETADO_AUDITOR': 'Completado Auditor',
      'EN_REVISION_CONTABILIDAD': 'En Revisión Contabilidad',
      'APROBADO_CONTABILIDAD': 'Aprobado Contabilidad',
      'OBSERVADO_CONTABILIDAD': 'Observado Contabilidad',
      'RECHAZADO_CONTABILIDAD': 'Rechazado Contabilidad',
      'COMPLETADO_CONTABILIDAD': 'Completado Contabilidad',
      'GLOSADO_CONTABILIDAD': 'Glosado Contabilidad',
      'PROCESADO_CONTABILIDAD': 'Procesado Contabilidad',
      'EN_REVISION_TESORERIA': 'En Revisión Tesorería',
      'APROBADO_TESORERIA': 'Aprobado Tesorería',
      'OBSERVADO_TESORERIA': 'Observado Tesorería',
      'RECHAZADO_TESORERIA': 'Rechazado Tesorería',
      'COMPLETADO_TESORERIA': 'Completado Tesorería',
      'EN_REVISION_ASESOR_GERENCIA': 'En Revisión Asesor Gerencia',
      'APROBADO_ASESOR_GERENCIA': 'Aprobado Asesor Gerencia',
      'OBSERVADO_ASESOR_GERENCIA': 'Observado Asesor Gerencia',
      'RECHAZADO_ASESOR_GERENCIA': 'Rechazado Asesor Gerencia',
      'EN_REVISION_RENDICION_CUENTAS': 'En Revisión Rendición Cuentas',
      'APROBADO_RENDICION_CUENTAS': 'Aprobado Rendición Cuentas',
      'OBSERVADO_RENDICION_CUENTAS': 'Observado Rendición Cuentas',
      'RECHAZADO_RENDICION_CUENTAS': 'Rechazado Rendición Cuentas',
      'COMPLETADO': 'Completado',
      'PAGADO': 'Pagado',
      'FINALIZADO': 'Finalizado',
      'ANULADO': 'Anulado',
      'RADICADO': 'Radicado',
      'CON_ACTA': 'Con Acta'
    };
    
    return mapeo[e] || estado.replace(/_/g, ' ');
  }

  /**
   * Retorna la clase CSS para el badge del estado de CONTABILIDAD
   */
  getEstadoContabilidadBadgeClass(estado: string | undefined): string {
    if (!estado) return 'badge bg-secondary';
    
    const e = estado.toUpperCase();
    
    if (e === 'DISPONIBLE') return 'badge bg-info';
    if (e === 'EN_REVISION') return 'badge bg-primary';
    if (e === 'COMPLETADO' || e === 'APROBADO') return 'badge bg-success';
    if (e === 'OBSERVADO') return 'badge bg-warning text-dark';
    if (e === 'RECHAZADO') return 'badge bg-danger';
    if (e === 'GLOSADO') return 'badge bg-purple';
    if (e === 'PROCESADO') return 'badge bg-success';
    
    return 'badge bg-secondary';
  }

  /**
   * Retorna el texto legible del estado de CONTABILIDAD
   */
  getEstadoContabilidadTexto(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    
    const e = estado.toUpperCase();
    
    const mapeo: Record<string, string> = {
      'DISPONIBLE': 'Disponible',
      'EN_REVISION': 'En Revisión',
      'COMPLETADO': 'Completado',
      'APROBADO': 'Aprobado',
      'OBSERVADO': 'Observado',
      'RECHAZADO': 'Rechazado',
      'GLOSADO': 'Glosado',
      'PROCESADO': 'Procesado'
    };
    
    return mapeo[e] || estado;
  }

  getTipoDocumentoTexto(documento: any): string {
    switch (documento.tipo) {
      case 'disponible': return 'Disponible';
      case 'en_revision': return 'En Revisión (Mío)';
      case 'procesado': return 'Procesado';
      default: return 'Desconocido';
    }
  }

  getTieneGlosaTexto(item: any): string {
    if (item.tieneGlosa === true) return 'Con Glosa';
    if (item.tieneGlosa === false) return 'Sin Glosa';
    return 'No definido';
  }

  formatDate(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
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

  formatDateOnly(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
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
      return new Date(fecha).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getDocumentCount(item: any): number {
    let count = 0;
    if (item.cuentaCobro) count++;
    if (item.seguridadSocial) count++;
    if (item.informeActividades) count++;
    return count;
  }

  // ==================== FILTROS ====================

  aplicarFiltros(): void {
    let filtered = [...this.documentos];

    // Filtro por estado de contabilidad
    if (this.filtroEstado !== 'todos') {
      switch (this.filtroEstado) {
        case 'disponibles':
          filtered = filtered.filter(doc => doc.tipo === 'disponible');
          break;
        case 'en_revision':
          filtered = filtered.filter(doc => doc.tipo === 'en_revision');
          break;
        case 'aprobados':
          filtered = filtered.filter(doc => 
            doc.estadoContabilidad === 'COMPLETADO' || 
            doc.estadoContabilidad === 'APROBADO' ||
            doc.estadoContabilidad?.includes('COMPLETADO') ||
            doc.estadoContabilidad?.includes('APROBADO')
          );
          break;
        case 'observados':
          filtered = filtered.filter(doc => 
            doc.estadoContabilidad === 'OBSERVADO' || 
            doc.estadoContabilidad?.includes('OBSERVADO')
          );
          break;
        case 'rechazados':
          filtered = filtered.filter(doc => 
            doc.estadoContabilidad === 'RECHAZADO' || 
            doc.estadoContabilidad?.includes('RECHAZADO')
          );
          break;
      }
    }

    // Filtro por asignación
    if (this.filtroAsignacion !== 'todos') {
      switch (this.filtroAsignacion) {
        case 'mios':
          filtered = filtered.filter(doc => doc.esMio);
          break;
        case 'disponibles':
          filtered = filtered.filter(doc => doc.tipo === 'disponible');
          break;
      }
    }

    // Filtro por fecha
    if (this.filtroFecha !== 'todos') {
      const ahora = new Date();
      filtered = filtered.filter(doc => {
        const fechaDoc = doc.fechaReferencia || doc.fechaRadicacion || doc.fechaCreacion;
        if (!fechaDoc) return true;
        const fecha = new Date(fechaDoc);
        const diffDias = Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (this.filtroFecha) {
          case 'hoy': return diffDias === 0;
          case 'semana': return diffDias <= 7;
          case 'mes': return diffDias <= 30;
          default: return true;
        }
      });
    }

    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        return (
          (item.numeroRadicado?.toLowerCase().includes(term)) ||
          (item.nombreContratista?.toLowerCase().includes(term)) ||
          (item.numeroContrato?.toLowerCase().includes(term)) ||
          (item.estadoDocumento?.toLowerCase().includes(term)) ||
          (item.estadoContabilidad?.toLowerCase().includes(term)) ||
          (item.observacion?.toLowerCase().includes(term))
        );
      });
    }

    this.filteredDocumentos = filtered;
    this.currentPage = 1;
    this.updatePagination();

    if (this.filteredDocumentos.length === 0 && this.documentos.length > 0) {
      this.infoMessage = 'No hay documentos con los filtros aplicados';
    } else if (this.filteredDocumentos.length > 0) {
      this.successMessage = `Mostrando ${this.filteredDocumentos.length} documentos`;
      setTimeout(() => this.successMessage = '', 3000);
    }
  }

  onSearch(): void {
    this.aplicarFiltros();
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    this.pages = [];
    
    if (this.totalPages <= 1) {
      if (this.totalPages === 1) this.pages.push(1);
    } else {
      const maxPagesToShow = 5;
      let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
      
      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        this.pages.push(i);
      }
    }

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
    this.error = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }

  refreshData(): void {
    this.cargarDocumentos();
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroAsignacion = 'todos';
    this.filtroFecha = 'todos';
    this.searchTerm = '';
    this.aplicarFiltros();
  }

  trackById(index: number, item: any): string {
    return item.id || index.toString();
  }
}