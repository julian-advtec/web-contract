// src/app/pages/contabilidad/components/contabilidad-stats/contabilidad-stats.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContabilidadStatsService } from '../../../../core/services/contabilidad-stats.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Definir los enums y interfaces como en auditoría
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
  // Mismos periodos que en auditoría
  periodos = [
    { value: PeriodoStats.HOY, label: 'Hoy' },
    { value: PeriodoStats.SEMANA, label: 'Última semana' },
    { value: PeriodoStats.MES, label: 'Último mes' },
    { value: PeriodoStats.TRIMESTRE, label: 'Último trimestre' },
    { value: PeriodoStats.ANO, label: 'Este año' }
  ];

  // Mismos nombres de propiedades
  filtros: FiltrosEstadisticasContabilidad = {
    periodo: PeriodoStats.MES
  };

  cargando = false;
  errorMessage: string | null = null;
  estadisticas: EstadisticasContabilidad | null = null;

  constructor(
    private statsService: ContabilidadStatsService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  // Mismo método que en auditoría
  cargarEstadisticas(): void {
    this.cargando = true;
    this.errorMessage = null;
    this.estadisticas = null;

    this.statsService.getEstadisticasGenerales({ periodo: this.filtros.periodo }).subscribe({
      next: (res: any) => {
        console.log('Respuesta completa del servicio:', res);
        
        // Extraer datos de la respuesta
        let data = null;
        
        // Nivel 1: { data: { data: {...} } }
        if (res?.data?.data) {
          data = res.data.data;
        }
        // Nivel 2: { data: {...} }
        else if (res?.data) {
          data = res.data;
        }
        // Nivel 3: res directamente
        else if (res) {
          data = res;
        }
        
        // Si data tiene success y data, extraer nuevamente
        if (data?.success && data?.data) {
          data = data.data;
        }
        
        console.log('Datos extraídos:', data);
        
        // Verificar que data tiene la estructura esperada
        if (data && data.misDocumentos) {
          // Forzar una copia profunda para evitar problemas de reactividad
          this.estadisticas = JSON.parse(JSON.stringify(data));
          console.log('✅ Estadísticas cargadas correctamente:', this.estadisticas);
          
          // Usar optional chaining para evitar errores de TypeScript
          console.log('📊 misDocumentos.aprobados:', this.estadisticas?.misDocumentos?.aprobados);
          console.log('📊 ultimosProcesados.length:', this.estadisticas?.ultimosProcesados?.length);
        } else if (data) {
          // Si no tiene misDocumentos, probablemente la estructura es diferente
          console.warn('⚠️ Estructura de datos inesperada:', data);
          this.errorMessage = 'Error en la estructura de datos recibida';
        } else {
          this.errorMessage = 'No se recibieron datos válidos del servidor';
        }
        
        this.cargando = false;
        // Forzar detección de cambios
        this.cdr.detectChanges();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('❌ Error cargando estadísticas:', err);
        const mensajeError = err.message || 'Error de conexión';
        this.errorMessage = mensajeError;
        this.notificationService.error('Error', mensajeError);
        this.cargando = false;
        this.cdr.detectChanges();
        this.cdr.markForCheck();
      }
    });
  }

  // Mismos métodos helper que en auditoría
  getTotalProcesados(): number {
    return this.estadisticas?.totales?.total || 0;
  }

  getResumenPeriodo(): string {
    if (!this.estadisticas?.desde || !this.estadisticas?.hasta) return '';
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
    if (upper.includes('EN_REVISION')) return 'badge bg-info';
    if (upper.includes('COMPLETADO')) return 'badge bg-secondary';
    if (upper.includes('GLOSADO')) return 'badge bg-warning';
    if (upper.includes('RADICADO')) return 'badge bg-primary';
    return 'badge bg-secondary';
  }

  // Método específico para contabilidad - CORREGIDO para manejar undefined
  tieneGlosado(ultimosProcesados: any[] | undefined): boolean {
    return ultimosProcesados?.some(p => p?.glosado) || false;
  }
}