import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ContabilidadStatsService } from '../../../../core/services/contabilidad-stats.service';
import { AuthService } from '../../../../core/services/auth.service';
import * as moment from 'moment';

@Component({
  selector: 'app-contabilidad-stats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule   // 👈 ESTO habilita ngModel
  ],
  templateUrl: './contabilidad-stats.component.html',
  styleUrls: ['./contabilidad-stats.component.scss']
})
export class ContabilidadStatsComponent implements OnInit {
  // Filtros (sin ReactiveForms)
  filtros = {
    rangoFechas: '30',
    fechaInicio: null as Date | null,
    fechaFin: null as Date | null,
    estado: '',
    tipoCausacion: '',
    tieneGlosa: '',
    contadorId: ''
  };

  // Datos
  estadisticasGenerales: any = null;
  miEstadistica: any = null;
  metricasTiempo: any = null;
  documentosPorEstado: any[] = [];
  resumenRapido: any = null;
  
  // Estados
  loading = false;
  error: string | null = null;
  
  // Opciones
  rangosFechas = [
    { label: 'Últimos 7 días', value: '7' },
    { label: 'Últimos 30 días', value: '30' },
    { label: 'Últimos 90 días', value: '90' },
    { label: 'Este mes', value: 'current_month' },
    { label: 'Mes anterior', value: 'last_month' },
    { label: 'Este año', value: 'current_year' },
  ];

  estadosContabilidad = [
    { value: 'EN_REVISION', label: 'En Revisión', color: '#F59E0B' },
    { value: 'COMPLETADO_CONTABILIDAD', label: 'Completado', color: '#10B981' },
    { value: 'OBSERVADO_CONTABILIDAD', label: 'Observado', color: '#F97316' },
    { value: 'RECHAZADO_CONTABILIDAD', label: 'Rechazado', color: '#EF4444' },
    { value: 'GLOSADO_CONTABILIDAD', label: 'Glosado', color: '#8B5CF6' },
    { value: 'PROCESADO_CONTABILIDAD', label: 'Procesado', color: '#3B82F6' },
  ];

  tiposCausacion = [
    { value: 'NOTA_DEBITO', label: 'Nota Débito' },
    { value: 'NOTA_CREDITO', label: 'Nota Crédito' },
    { value: 'COMPROBANTE_EGRESO', label: 'Comprobante de Egreso' },
  ];

  // Usuario
  userRole: string = '';
  isAdmin: boolean = false;

  // Para contadores (solo admin)
  listaContadores: any[] = [];

  constructor(
    private statsService: ContabilidadStatsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener rol del usuario
    const user = this.authService.getCurrentUser();
    this.userRole = user?.role || '';
    this.isAdmin = this.userRole === 'ADMIN' || this.userRole === 'SUPER_ADMIN';
    
    this.cargarResumenRapido();
    this.cargarMiEstadistica();
    this.cargarMetricasTiempo();
  }

  cargarResumenRapido(): void {
    this.loading = true;
    this.statsService.getResumenRapido()
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.resumenRapido = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando resumen rápido:', error);
          this.error = 'Error al cargar el resumen rápido';
          this.loading = false;
        }
      });
  }

  cargarEstadisticasGenerales(): void {
    this.loading = true;
    this.error = null;
    
    const filtros: any = {};
    
    // Calcular fechas basado en el rango seleccionado
    if (this.filtros.rangoFechas && !this.filtros.fechaInicio && !this.filtros.fechaFin) {
      const hoy = new Date();
      
      switch (this.filtros.rangoFechas) {
        case '7':
          filtros.fechaInicio = moment().subtract(7, 'days').toDate();
          filtros.fechaFin = hoy;
          break;
        case '30':
          filtros.fechaInicio = moment().subtract(30, 'days').toDate();
          filtros.fechaFin = hoy;
          break;
        case '90':
          filtros.fechaInicio = moment().subtract(90, 'days').toDate();
          filtros.fechaFin = hoy;
          break;
        case 'current_month':
          filtros.fechaInicio = moment().startOf('month').toDate();
          filtros.fechaFin = moment().endOf('month').toDate();
          break;
        case 'last_month':
          filtros.fechaInicio = moment().subtract(1, 'month').startOf('month').toDate();
          filtros.fechaFin = moment().subtract(1, 'month').endOf('month').toDate();
          break;
        case 'current_year':
          filtros.fechaInicio = moment().startOf('year').toDate();
          filtros.fechaFin = moment().endOf('year').toDate();
          break;
      }
    } else if (this.filtros.fechaInicio || this.filtros.fechaFin) {
      filtros.fechaInicio = this.filtros.fechaInicio;
      filtros.fechaFin = this.filtros.fechaFin;
    }
    
    // Otros filtros - solo si no están vacíos
    if (this.filtros.estado && this.filtros.estado !== '') filtros.estado = this.filtros.estado;
    if (this.filtros.tipoCausacion && this.filtros.tipoCausacion !== '') filtros.tipoCausacion = this.filtros.tipoCausacion;
    if (this.filtros.tieneGlosa !== '' && this.filtros.tieneGlosa !== null && this.filtros.tieneGlosa !== undefined) {
      filtros.tieneGlosa = this.filtros.tieneGlosa === 'true' ? true : this.filtros.tieneGlosa === 'false' ? false : this.filtros.tieneGlosa;
    }
    if (this.filtros.contadorId && this.filtros.contadorId !== '' && this.isAdmin) filtros.contadorId = this.filtros.contadorId;
    
    this.statsService.getEstadisticasGenerales(filtros)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.estadisticasGenerales = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando estadísticas:', error);
          this.error = 'Error al cargar las estadísticas';
          this.loading = false;
        }
      });
  }

  cargarMiEstadistica(): void {
    this.statsService.getMiEstadistica()
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.miEstadistica = response.data;
          }
        },
        error: (error) => {
          console.error('Error cargando mi estadística:', error);
        }
      });
  }

  cargarMetricasTiempo(): void {
    this.statsService.getMetricasTiempo()
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.metricasTiempo = response.data;
          }
        },
        error: (error) => {
          console.error('Error cargando métricas de tiempo:', error);
        }
      });
  }

  cargarDocumentosPorEstado(estado: string): void {
    this.loading = true;
    this.statsService.getDocumentosPorEstado(estado)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.documentosPorEstado = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando documentos por estado:', error);
          this.error = 'Error al cargar los documentos';
          this.loading = false;
        }
      });
  }

  // Métodos auxiliares
  formatearMoneda(valor: number | undefined | null): string {
    const valorNum = valor || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valorNum);
  }

  formatearPorcentaje(valor: number | undefined | null): string {
    const valorNum = valor || 0;
    return `${valorNum.toFixed(1)}%`;
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

  getColorEstado(estado: string | undefined | null): string {
    if (!estado) return '#6B7280';
    const estadoObj = this.estadosContabilidad.find(e => e.value === estado);
    return estadoObj?.color || '#6B7280';
  }

  getNombreEstado(estado: string | undefined | null): string {
    if (!estado) return 'Desconocido';
    const estadoObj = this.estadosContabilidad.find(e => e.value === estado);
    return estadoObj?.label || estado;
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
      rangoFechas: '30',
      fechaInicio: null,
      fechaFin: null,
      estado: '',
      tipoCausacion: '',
      tieneGlosa: '',
      contadorId: ''
    };
    
    // Recargar estadísticas con filtros limpios
    this.cargarEstadisticasGenerales();
  }

  exportarEstadisticas(): void {
    if (!this.estadisticasGenerales) return;
    
    const data = {
      fechaGeneracion: new Date().toISOString(),
      filtros: this.filtros,
      estadisticas: this.estadisticasGenerales
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
  get resumenRapidoSeguro() {
    return this.resumenRapido || {
      totalDocumentos: 0,
      completados: 0,
      enRevision: 0,
      tasaCompletitud: 0,
      tiempoPromedio: 0,
      conGlosa: 0,
      documentosRecientes: []
    };
  }

  get miEstadisticaSegura() {
    return this.miEstadistica || {
      contador: { id: '', nombre: '', username: '', email: '' },
      resumen: {
        totalDocumentos: 0,
        completados: 0,
        observados: 0,
        rechazados: 0,
        glosados: 0,
        enRevision: 0
      },
      tiempos: { promedioRevision: 0, maximoRevision: 0, minimoRevision: 0 },
      eficiencia: { documentosPorDia: 0, documentosPorSemana: 0, documentosPorMes: 0 },
      distribucionDias: [],
      documentosRecientes: []
    };
  }

  get estadisticasGeneralesSeguras() {
    return this.estadisticasGenerales || {
      resumen: {
        totalDocumentos: 0,
        documentosEnRevision: 0,
        documentosCompletados: 0,
        documentosObservados: 0,
        documentosRechazados: 0,
        documentosGlosados: 0
      },
      distribucionEstados: [],
      tipoCausacion: [],
      glosas: { conGlosa: 0, sinGlosa: 0, porcentajeConGlosa: 0, totalGlosado: 0 },
      tiempos: { promedioRevision: 0, maximoRevision: 0, minimoRevision: 0 },
      tendenciaMensual: [],
      documentosRecientes: []
    };
  }
}