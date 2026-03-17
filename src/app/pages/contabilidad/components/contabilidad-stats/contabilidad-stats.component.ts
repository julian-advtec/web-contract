import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContabilidadStatsService } from '../../../../core/services/contabilidad-stats.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Definir los enums
export enum PeriodoStats {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre',
  ANO = 'ano'
}

export interface FiltrosEstadisticasContabilidad {
  periodo: PeriodoStats;
}

// Interfaz completa con todas las propiedades opcionales para seguridad
export interface EstadisticasContabilidad {
  totalDocumentosDisponibles: number;
  misDocumentos: {
    enRevision: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    completados: number;
    glosados: number;
    total: number;
  };
  rechazados: {
    total: number;
    rechazadosContador: number;
    rechazadosOtrasAreas: number;
    porPeriodo: number;
  };
  tiempoPromedioHoras: number;
  eficiencia: number;
  recientes: number;
  distribucion: Array<{
    estado: string;
    cantidad: number;
    porcentaje: number;
    color: string;
  }>;
  ultimosProcesados: Array<{
    id: string;
    numeroRadicado: string;
    contratista: string;
    fecha: string | Date;
    estado: string;
    glosado: boolean;
  }>;
  totales: {
    enRevision: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    completados: number;
    total: number;
  };
  fechaConsulta: string;
  desde: string;
  hasta: string;
}

@Component({
  selector: 'app-contabilidad-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contabilidad-stats.component.html',
  styleUrls: ['./contabilidad-stats.component.scss']
})
export class ContabilidadStatsComponent implements OnInit {
  // Periodos
  periodos = [
    { value: PeriodoStats.HOY, label: 'Hoy' },
    { value: PeriodoStats.SEMANA, label: 'Última semana' },
    { value: PeriodoStats.MES, label: 'Último mes' },
    { value: PeriodoStats.TRIMESTRE, label: 'Último trimestre' },
    { value: PeriodoStats.ANO, label: 'Este año' }
  ];

  // Filtros
  filtros: FiltrosEstadisticasContabilidad = {
    periodo: PeriodoStats.MES
  };

  cargando = false;
  errorMessage: string | null = null;
  
  // Inicializar con objeto vacío para evitar undefined
  estadisticas: EstadisticasContabilidad = {
    totalDocumentosDisponibles: 0,
    misDocumentos: {
      enRevision: 0,
      aprobados: 0,
      observados: 0,
      rechazados: 0,
      completados: 0,
      glosados: 0,
      total: 0
    },
    rechazados: {
      total: 0,
      rechazadosContador: 0,
      rechazadosOtrasAreas: 0,
      porPeriodo: 0
    },
    tiempoPromedioHoras: 0,
    eficiencia: 0,
    recientes: 0,
    distribucion: [],
    ultimosProcesados: [],
    totales: {
      enRevision: 0,
      aprobados: 0,
      observados: 0,
      rechazados: 0,
      completados: 0,
      total: 0
    },
    fechaConsulta: new Date().toISOString(),
    desde: '',
    hasta: ''
  };

  // Array de colores para la distribución
  private coloresDistribucion = [
    '#4CAF50', // Verde
    '#FF9800', // Naranja
    '#F44336', // Rojo
    '#2196F3', // Azul
    '#9C27B0', // Púrpura
    '#00BCD4', // Cian
    '#795548', // Marrón
    '#607D8B', // Gris azulado
    '#FFC107', // Amarillo
    '#E91E63'  // Rosa
  ];

  constructor(
    private statsService: ContabilidadStatsService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    this.cargando = true;
    this.errorMessage = null;

    this.statsService.getEstadisticasGenerales({ periodo: this.filtros.periodo }).subscribe({
      next: (res: any) => {
        console.log('Respuesta completa del servicio:', res);
        
        // Extraer datos de la respuesta
        let data = null;
        
        if (res?.data?.data) {
          data = res.data.data;
        } else if (res?.data) {
          data = res.data;
        } else if (res) {
          data = res;
        }
        
        if (data?.success && data?.data) {
          data = data.data;
        }
        
        console.log('Datos extraídos:', data);
        
        if (data) {
          // Merge de los datos recibidos con el objeto por defecto
          this.estadisticas = {
            ...this.estadisticas,
            ...data,
            misDocumentos: { ...this.estadisticas.misDocumentos, ...(data.misDocumentos || {}) },
            rechazados: { ...this.estadisticas.rechazados, ...(data.rechazados || {}) },
            totales: { ...this.estadisticas.totales, ...(data.totales || {}) },
            ultimosProcesados: data.ultimosProcesados || [],
            distribucion: data.distribucion || []
          };
          
          console.log('✅ Estadísticas cargadas correctamente:', this.estadisticas);
        } else {
          this.errorMessage = 'No se recibieron datos válidos del servidor';
        }
        
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error cargando estadísticas:', err);
        const mensajeError = err.error?.message || err.message || 'Error de conexión';
        this.errorMessage = mensajeError;
        this.notificationService.error('Error', mensajeError);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  getTotalProcesados(): number {
    return this.estadisticas.totales?.total || 0;
  }

  getResumenPeriodo(): string {
    if (!this.estadisticas.desde || !this.estadisticas.hasta) return '';
    const desde = new Date(this.estadisticas.desde);
    const hasta = new Date(this.estadisticas.hasta);
    return `${desde.toLocaleDateString('es-CO')} — ${hasta.toLocaleDateString('es-CO')}`;
  }

  getBadgeClass(estado: string | undefined): string {
    const estadoStr = estado || '';
    const upper = estadoStr.toUpperCase();
    if (upper.includes('APROBADO')) return 'badge bg-success';
    if (upper.includes('OBSERVADO')) return 'badge bg-warning text-dark';
    if (upper.includes('RECHAZADO')) return 'badge bg-danger';
    if (upper.includes('EN_REVISION') || upper.includes('EN REVISION')) return 'badge bg-info';
    if (upper.includes('COMPLETADO')) return 'badge bg-secondary';
    if (upper.includes('GLOSADO')) return 'badge bg-warning';
    if (upper.includes('RADICADO')) return 'badge bg-primary';
    return 'badge bg-secondary';
  }

  tieneGlosado(): boolean {
    return this.estadisticas.ultimosProcesados?.some(p => p?.glosado) || false;
  }

  // MÉTODO NUEVO - Para obtener colores en la distribución
  getColorPorIndice(index: number): string {
    return this.coloresDistribucion[index % this.coloresDistribucion.length];
  }
}