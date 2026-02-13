// src/app/modules/tesoreria/components/tesoreria-stats/tesoreria-stats.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TesoreriaStatsService } from '../../../../core/services/tesoreria-stats.service';
import { AuthService } from '../../../../core/services/auth.service';
import * as moment from 'moment';

@Component({
  selector: 'app-tesoreria-stats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './tesoreria-stats.component.html',
  styleUrls: ['./tesoreria-stats.component.scss']
})
export class TesoreriaStatsComponent implements OnInit {
  // Filtros (sin ReactiveForms)
  filtros = {
    rangoFechas: '30',
    fechaInicio: null as Date | null,
    fechaFin: null as Date | null,
    estadoPago: '',
    metodoPago: '',
    responsableId: ''
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

  estadosPago = [
    { value: 'PENDIENTE', label: 'Pendiente', color: '#6B7280' },
    { value: 'EN_PROCESO', label: 'En Proceso', color: '#F59E0B' },
    { value: 'PAGADO', label: 'Pagado', color: '#10B981' },
    { value: 'ANULADO', label: 'Anulado', color: '#EF4444' },
  ];

  metodosPago = [
    { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TARJETA_CREDITO', label: 'Tarjeta de Crédito' },
    { value: 'TARJETA_DEBITO', label: 'Tarjeta de Débito' },
  ];

  // Usuario
  userRole: string = '';
  isAdmin: boolean = false;

  // Para responsables (solo admin)
  listaResponsables: any[] = [];

  constructor(
    private statsService: TesoreriaStatsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener rol del usuario
    const user = this.authService.getCurrentUser();
    this.userRole = user?.role || '';
    this.isAdmin = this.userRole === 'ADMIN' || this.userRole === 'SUPER_ADMIN' || this.userRole === 'TESORERIA_ADMIN';
    
    this.cargarResumenRapido();
    this.cargarMiEstadistica();
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
    if (this.filtros.estadoPago && this.filtros.estadoPago !== '') filtros.estadoPago = this.filtros.estadoPago;
    if (this.filtros.metodoPago && this.filtros.metodoPago !== '') filtros.metodoPago = this.filtros.metodoPago;
    if (this.filtros.responsableId && this.filtros.responsableId !== '' && this.isAdmin) filtros.responsableId = this.filtros.responsableId;
    
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

  cargarPagosPorEstado(estado: string): void {
    this.loading = true;
    this.statsService.getPagosPorEstado(estado)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.documentosPorEstado = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando pagos por estado:', error);
          this.error = 'Error al cargar los pagos';
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

  getColorEstadoPago(estado: string | undefined | null): string {
    if (!estado) return '#6B7280';
    const estadoObj = this.estadosPago.find(e => e.value === estado);
    return estadoObj?.color || '#6B7280';
  }

  getNombreEstadoPago(estado: string | undefined | null): string {
    if (!estado) return 'Desconocido';
    const estadoObj = this.estadosPago.find(e => e.value === estado);
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
      estadoPago: '',
      metodoPago: '',
      responsableId: ''
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
    a.download = `estadisticas-tesoreria-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Getters seguros
  get resumenRapidoSeguro() {
    return this.resumenRapido || {
      totalPagos: 0,
      pagados: 0,
      enProceso: 0,
      anulados: 0,
      pendientes: 0,
      tasaPagados: 0,
      montoPagado: 0,
      montoEnProceso: 0,
      montoAnulado: 0,
      tiempoPromedioProceso: 0,
      pagosRecientes: []
    };
  }

  get miEstadisticaSegura() {
    return this.miEstadistica || {
      responsable: { id: '', nombre: '', username: '', email: '' },
      resumen: {
        totalPagos: 0,
        pagados: 0,
        anulados: 0,
        enProceso: 0,
        pendientes: 0
      },
      montoTotalProcesado: 0,
      tiempos: { promedioProceso: 0, maximoProceso: 0, minimoProceso: 0 },
      eficiencia: { pagosPorDia: 0, pagosPorSemana: 0, pagosPorMes: 0 },
      distribucionDias: [],
      pagosRecientes: []
    };
  }

  get estadisticasGeneralesSeguras() {
    return this.estadisticasGenerales || {
      resumen: {
        totalPagos: 0,
        pagados: 0,
        enProceso: 0,
        anulados: 0,
        pendientes: 0,
        montoTotal: 0,
        montoPagado: 0,
        montoEnProceso: 0,
        montoAnulado: 0
      },
      distribucionEstados: [],
      metodosPago: [],
      pagosPorMonto: [],
      tiempos: { promedioProceso: 0, maximoProceso: 0, minimoProceso: 0 },
      tendenciasMensuales: [],
      pagosRecientes: [],
      topResponsables: []
    };
  }
}