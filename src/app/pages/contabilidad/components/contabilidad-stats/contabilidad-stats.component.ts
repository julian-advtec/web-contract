// src/app/pages/contabilidad/components/contabilidad-stats/contabilidad-stats.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContabilidadStatsService } from '../../../../core/services/contabilidad-stats.service';
import { AuthService } from '../../../../core/services/auth.service';
import * as moment from 'moment';

// Modelo de estadísticas de contabilidad
export interface ContabilidadEstadisticas {
  totalDocumentosRadicados: number;
  enRevision: number;
  aprobados: number;
  observados: number;
  rechazados: number;
  glosados: number;
  completados: number;
  procesados: number;
  tiempoPromedioHoras: number;
  eficiencia: number;
  distribucion: Array<{
    estado: string;
    cantidad: number;
    porcentaje: number;
    color: string;
  }>;
  tipoCausacion: Array<{
    tipo: string;
    cantidad: number;
    porcentaje: number;
  }>;
  tiempos: {
    promedioRevision: number;
    maximoRevision: number;
    minimoRevision: number;
  };
  documentosRecientes: Array<{
    id: string;
    numeroRadicado: string;
    nombreContratista: string;
    estado: string;
    tiempoRevision: number;
    tieneGlosa: boolean;
    fechaActualizacion: Date | string;
  }>;
  totales: {
    enRevision: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    glosados: number;
    completados: number;
    total: number;
  };
  fechaConsulta: string;
  desde: string;
  hasta: string;
}

export enum PeriodoContabilidad {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre',
  ANO = 'ano'
}

export interface FiltrosEstadisticasContabilidad {
  periodo: PeriodoContabilidad;
  estado?: string;
  tipoCausacion?: string;
  tieneGlosa?: boolean | string;
  contadorId?: string;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
}

@Component({
  selector: 'app-contabilidad-stats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './contabilidad-stats.component.html',
  styleUrls: ['./contabilidad-stats.component.scss']
})
export class ContabilidadStatsComponent implements OnInit {
  // Períodos predefinidos
  periodos = [
    { value: PeriodoContabilidad.HOY, label: 'Hoy' },
    { value: PeriodoContabilidad.SEMANA, label: 'Última semana' },
    { value: PeriodoContabilidad.MES, label: 'Último mes' },
    { value: PeriodoContabilidad.TRIMESTRE, label: 'Último trimestre' },
    { value: PeriodoContabilidad.ANO, label: 'Este año' }
  ];

  // Filtros
  filtros: FiltrosEstadisticasContabilidad = {
    periodo: PeriodoContabilidad.MES,
    estado: '',
    tipoCausacion: '',
    tieneGlosa: '',
    contadorId: '',
    fechaInicio: null,
    fechaFin: null
  };

  // Datos
  estadisticas: ContabilidadEstadisticas | null = null;
  miEstadistica: any = null;
  metricasTiempo: any = null;
  documentosPorEstado: any[] = [];

  // Estados de UI
  cargando = false;
  cargandoMiEstadistica = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Usuario
  userRole: string = '';
  isAdmin: boolean = false;

  // Lista de contadores (para admin)
  listaContadores: any[] = [];

  // Rangos de fechas para filtros avanzados
  rangosFechas = [
    { label: 'Últimos 7 días', value: '7' },
    { label: 'Últimos 30 días', value: '30' },
    { label: 'Últimos 90 días', value: '90' },
    { label: 'Este mes', value: 'current_month' },
    { label: 'Mes anterior', value: 'last_month' },
    { label: 'Este año', value: 'current_year' },
  ];

  // Opciones para selects
  estadosContabilidad = [
    { value: 'EN_REVISION', label: 'En Revisión', color: '#F59E0B' },
    { value: 'COMPLETADO', label: 'Completado', color: '#10B981' },
    { value: 'COMPLETADO_CONTABILIDAD', label: 'Completado', color: '#10B981' },
    { value: 'OBSERVADO', label: 'Observado', color: '#F97316' },
    { value: 'RECHAZADO', label: 'Rechazado', color: '#EF4444' },
    { value: 'GLOSADO', label: 'Glosado', color: '#8B5CF6' },
    { value: 'PROCESADO', label: 'Procesado', color: '#3B82F6' },
  ];

  tiposCausacion = [
    { value: 'NOTA_DEBITO', label: 'Nota Débito' },
    { value: 'NOTA_CREDITO', label: 'Nota Crédito' },
    { value: 'COMPROBANTE_EGRESO', label: 'Comprobante de Egreso' },
  ];

  constructor(
    private statsService: ContabilidadStatsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Obtener rol del usuario
    const user = this.authService.getCurrentUser();
    this.userRole = user?.role || '';
    this.isAdmin = this.userRole === 'ADMIN' || this.userRole === 'SUPER_ADMIN';

    // Cargar estadísticas principales
    this.cargarEstadisticas();

    // Cargar estadísticas personales
    this.cargarMiEstadistica();

    // Si es admin, cargar lista de contadores
    if (this.isAdmin) {
      this.cargarListaContadores();
    }
  }

  /**
   * Cargar estadísticas generales
   */
  cargarEstadisticas(): void {
    this.cargando = true;
    this.errorMessage = null;

    console.log('📊 Cargando estadísticas de contabilidad con período:', this.filtros.periodo);

    this.statsService.getEstadisticasGenerales(this.filtros).subscribe({
      next: (response: any) => {
        console.log('📊 Respuesta estadísticas:', response);

        if (response?.success && response?.data) {
          this.estadisticas = this.mapearEstadisticas(response.data);
          this.successMessage = `Estadísticas actualizadas (${this.getPeriodoLabel(this.filtros.periodo)})`;
          setTimeout(() => this.successMessage = null, 3000);
        } else if (response?.data) {
          this.estadisticas = this.mapearEstadisticas(response.data);
        } else {
          this.estadisticas = this.crearEstadisticasVacias();
          this.errorMessage = 'No se pudieron cargar las estadísticas';
        }

        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Error cargando estadísticas:', error);
        this.errorMessage = error.error?.message || error.message || 'Error de conexión al cargar estadísticas';
        this.estadisticas = this.crearEstadisticasVacias();
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Cargar estadísticas personales
   */
  cargarMiEstadistica(): void {
    this.cargandoMiEstadistica = true;

    this.statsService.getMiEstadistica().subscribe({
      next: (response: any) => {
        if (response?.success && response?.data) {
          this.miEstadistica = response.data;
        } else if (response?.data) {
          this.miEstadistica = response.data;
        }
        this.cargandoMiEstadistica = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error cargando mi estadística:', error);
        this.cargandoMiEstadistica = false;
      }
    });
  }

  /**
   * Cargar métricas de tiempo
   */
  cargarMetricasTiempo(): void {
    this.statsService.getMetricasTiempo().subscribe({
      next: (response: any) => {
        if (response?.success && response?.data) {
          this.metricasTiempo = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error cargando métricas de tiempo:', error);
      }
    });
  }

  /**
   * Cargar documentos por estado
   */
  cargarDocumentosPorEstado(estado: string): void {
    if (!estado) return;

    this.statsService.getDocumentosPorEstado(estado).subscribe({
      next: (response: any) => {
        if (response?.success && response?.data) {
          this.documentosPorEstado = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error cargando documentos por estado:', error);
      }
    });
  }

  /**
   * Cargar lista de contadores (admin)
   */
  cargarListaContadores(): void {
    this.statsService.getListaContadores().subscribe({
      next: (response: any) => {
        if (response?.success && response?.data) {
          this.listaContadores = response.data;
        } else if (Array.isArray(response)) {
          this.listaContadores = response;
        }
      },
      error: (error: any) => {
        console.error('Error cargando lista de contadores:', error);
      }
    });
  }

  /**
   * Mapear datos al modelo de estadísticas
   */
  private mapearEstadisticas(data: any): ContabilidadEstadisticas {
    if (!data) return this.crearEstadisticasVacias();

    return {
      totalDocumentosRadicados: Number(data.totalDocumentosRadicados) || 0,
      enRevision: Number(data.enRevision) || 0,
      aprobados: Number(data.aprobados) || 0,
      observados: Number(data.observados) || 0,
      rechazados: Number(data.rechazados) || 0,
      glosados: Number(data.glosados) || 0,
      completados: Number(data.completados) || 0,
      procesados: Number(data.procesados) || 0,
      tiempoPromedioHoras: Number(data.tiempoPromedioHoras) || 0,
      eficiencia: Number(data.eficiencia) || 0,
      distribucion: this.mapearDistribucion(data.distribucion || data.distribucionEstados || []),
      tipoCausacion: this.mapearTipoCausacion(data.tipoCausacion || []),
      tiempos: {
        promedioRevision: Number(data.tiempos?.promedioRevision) || 0,
        maximoRevision: Number(data.tiempos?.maximoRevision) || 0,
        minimoRevision: Number(data.tiempos?.minimoRevision) || 0
      },
      documentosRecientes: this.mapearDocumentosRecientes(data.documentosRecientes || []),
      totales: {
        enRevision: Number(data.enRevision) || 0,
        aprobados: Number(data.aprobados) || 0,
        observados: Number(data.observados) || 0,
        rechazados: Number(data.rechazados) || 0,
        glosados: Number(data.glosados) || 0,
        completados: Number(data.completados) || 0,
        total: Number(data.totales?.total) || 0
      },
      fechaConsulta: data.fechaConsulta || new Date().toISOString(),
      desde: data.desde || '',
      hasta: data.hasta || ''
    };
  }

  private mapearDistribucion(distribucion: any[]): any[] {
    if (!Array.isArray(distribucion)) return [];

    return distribucion.map(item => ({
      estado: item.estado || 'Desconocido',
      cantidad: Number(item.cantidad) || 0,
      porcentaje: Number(item.porcentaje) || 0,
      color: item.color || this.getColorEstado(item.estado)
    }));
  }

  private mapearTipoCausacion(tipos: any[]): any[] {
    if (!Array.isArray(tipos)) return [];

    return tipos.map(item => ({
      tipo: item.tipo || 'No especificado',
      cantidad: Number(item.cantidad) || 0,
      porcentaje: Number(item.porcentaje) || 0
    }));
  }

  private mapearDocumentosRecientes(docs: any[]): any[] {
    if (!Array.isArray(docs)) return [];

    return docs.map(doc => ({
      id: doc.id || '',
      numeroRadicado: doc.numeroRadicado || 'N/A',
      nombreContratista: doc.nombreContratista || 'N/A',
      estado: doc.estado || 'Desconocido',
      tiempoRevision: Number(doc.tiempoRevision) || 0,
      tieneGlosa: Boolean(doc.tieneGlosa),
      fechaActualizacion: doc.fechaActualizacion || new Date().toISOString()
    }));
  }

  private crearEstadisticasVacias(): ContabilidadEstadisticas {
    return {
      totalDocumentosRadicados: 0,
      enRevision: 0,
      aprobados: 0,
      observados: 0,
      rechazados: 0,
      glosados: 0,
      completados: 0,
      procesados: 0,
      tiempoPromedioHoras: 0,
      eficiencia: 0,
      distribucion: [],
      tipoCausacion: [],
      tiempos: {
        promedioRevision: 0,
        maximoRevision: 0,
        minimoRevision: 0
      },
      documentosRecientes: [],
      totales: {
        enRevision: 0,
        aprobados: 0,
        observados: 0,
        rechazados: 0,
        glosados: 0,
        completados: 0,
        total: 0
      },
      fechaConsulta: new Date().toISOString(),
      desde: '',
      hasta: ''
    };
  }

  // ===================================================
  // MÉTODOS DE UTILIDAD
  // ===================================================

  getPeriodoLabel(periodo: string): string {
    const p = this.periodos.find(p => p.value === periodo);
    return p ? p.label : periodo;
  }

  getTotalProcesados(): number {
    return this.estadisticas?.totales?.total || 0;
  }

  getResumenPeriodo(): string {
    if (!this.estadisticas?.desde || !this.estadisticas?.hasta) return '';
    const desde = new Date(this.estadisticas.desde);
    const hasta = new Date(this.estadisticas.hasta);
    return `${desde.toLocaleDateString('es-CO')} — ${hasta.toLocaleDateString('es-CO')}`;
  }

  getBadgeClass(estado: string): string {
    const upper = (estado || '').toUpperCase();

    if (upper.includes('COMPLETADO')) return 'badge bg-success';
    if (upper.includes('APROBADO')) return 'badge bg-success';
    if (upper.includes('PROCESADO')) return 'badge bg-primary';
    if (upper.includes('EN_REVISION')) return 'badge bg-info';
    if (upper.includes('OBSERVADO')) return 'badge bg-warning text-dark';
    if (upper.includes('RECHAZADO')) return 'badge bg-danger';
    if (upper.includes('GLOSADO')) return 'badge bg-purple';

    return 'badge bg-secondary';
  }

  getColorEstado(estado: string): string {
    const upper = (estado || '').toUpperCase();

    if (upper.includes('COMPLETADO') || upper.includes('APROBADO')) return '#10B981';
    if (upper.includes('PROCESADO')) return '#3B82F6';
    if (upper.includes('EN_REVISION')) return '#F59E0B';
    if (upper.includes('OBSERVADO')) return '#F97316';
    if (upper.includes('RECHAZADO')) return '#EF4444';
    if (upper.includes('GLOSADO')) return '#8B5CF6';

    return '#6B7280';
  }

  getNombreEstado(estado: string): string {
    const upper = (estado || '').toUpperCase();

    if (upper.includes('COMPLETADO')) return 'Completado';
    if (upper.includes('APROBADO')) return 'Aprobado';
    if (upper.includes('PROCESADO')) return 'Procesado';
    if (upper.includes('EN_REVISION')) return 'En Revisión';
    if (upper.includes('OBSERVADO')) return 'Observado';
    if (upper.includes('RECHAZADO')) return 'Rechazado';
    if (upper.includes('GLOSADO')) return 'Glosado';

    return estado || 'Desconocido';
  }

  formatearTiempo(horas: number | undefined | null): string {
    const horasNum = horas || 0;

    if (horasNum < 1) {
      const minutos = Math.round(horasNum * 60);
      return `${minutos} min`;
    } else if (horasNum < 24) {
      return `${horasNum.toFixed(1)} horas`;
    } else {
      const dias = (horasNum / 24).toFixed(1);
      return `${dias} días`;
    }
  }

  formatearPorcentaje(valor: number | undefined | null): string {
    const valorNum = valor || 0;
    return `${valorNum.toFixed(1)}%`;
  }

  formatearFecha(fecha: Date | string | undefined | null): string {
    if (!fecha) return 'N/A';
    try {
      const dateObj = new Date(fecha);
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      periodo: PeriodoContabilidad.MES,
      estado: '',
      tipoCausacion: '',
      tieneGlosa: '',
      contadorId: '',
      fechaInicio: null,
      fechaFin: null
    };

    this.cargarEstadisticas();
  }

  exportarEstadisticas(): void {
    if (!this.estadisticas) return;

    const data = {
      fechaGeneracion: new Date().toISOString(),
      filtros: this.filtros,
      estadisticas: this.estadisticas
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estadisticas-contabilidad-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Getters seguros
  get estadisticasSeguras(): ContabilidadEstadisticas {
    return this.estadisticas || this.crearEstadisticasVacias();
  }

  get miEstadisticaSegura(): any {
    return this.miEstadistica || {
      contador: { nombre: 'No disponible' },
      resumen: {
        totalDocumentos: 0,
        completados: 0,
        observados: 0,
        rechazados: 0,
        glosados: 0,
        enRevision: 0
      },
      tiempos: { promedioRevision: 0 },
      eficiencia: { documentosPorDia: 0 },
      distribucionDias: []
    };
  }
}