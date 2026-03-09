// src/app/pages/tesoreria/components/tesoreria-stats/tesoreria-stats.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EstadisticasTesoreriaService } from '../../../../core/services/estadisticas-tesoreria.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PeriodoStats as ModelPeriodoStats, FiltrosStats } from '../../../../core/models/estadisticas-tesoreria.model';

// Re-exportar para usar en el template
export { PeriodoStats } from '../../../../core/models/estadisticas-tesoreria.model';

export interface FiltrosEstadisticasTesoreria {
  periodo: ModelPeriodoStats;
  soloMios: boolean;
}

export interface EstadisticasTesoreria {
  totalDocumentosDisponibles?: number;
  misDocumentos?: {
    pendientes: number;
    pagados: number;
    observados: number;
    rechazados: number;
    enProceso: number;
    total: number;
  };
  rechazados?: {
    total: number;
    rechazadosTesorero: number;
    rechazadosOtrasAreas: number;
    porPeriodo: number;
  };
  tiempoPromedioHoras?: number;
  eficiencia?: number;
  recientes?: number;
  distribucion?: Array<{
    estado: string;
    cantidad: number;
    porcentaje: number;
    color: string;
  }>;
  ultimosProcesados?: Array<{
    id: string;
    numeroRadicado: string;
    contratista: string;
    fecha: string | Date;
    estado: string;
    monto?: number;
  }>;
  totales?: {
    pendientes: number;
    pagados: number;
    observados: number;
    rechazados: number;
    enProceso: number;
    total: number;
  };
  fechaConsulta?: string;
  desde?: string;
  hasta?: string;
  // Propiedades originales del backend
  documentos?: any;
  montos?: any;
  actividadReciente?: any[];
  pendientes?: any[];
  procesados?: any[];
  fechaCalculo?: Date;
}

@Component({
  selector: 'app-tesoreria-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tesoreria-stats.component.html',
  styleUrls: ['./tesoreria-stats.component.scss'],
  providers: [CurrencyPipe, DatePipe]
})
export class TesoreriaStatsComponent implements OnInit {
  // Usar el enum del modelo para que coincida con el servicio
  periodos = [
    { value: ModelPeriodoStats.HOY, label: 'Hoy' },
    { value: ModelPeriodoStats.SEMANA, label: 'Última semana' },
    { value: ModelPeriodoStats.MES, label: 'Último mes' },
    { value: ModelPeriodoStats.TRIMESTRE, label: 'Último trimestre' }
  ];

  // Mismos nombres de propiedades
  filtros: FiltrosStats = {
    periodo: ModelPeriodoStats.MES,
    soloMios: false
  };

  cargando = false;
  errorMessage: string | null = null;
  estadisticas: EstadisticasTesoreria | null = null;
  currentUserRole: string = '';

  constructor(
    private estadisticasService: EstadisticasTesoreriaService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private currencyPipe: CurrencyPipe,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getCurrentUser()?.role || 'USUARIO';
    this.cargarEstadisticas();
  }

  // Mismo método que en contabilidad
  cargarEstadisticas(): void {
    this.cargando = true;
    this.errorMessage = null;
    this.estadisticas = null;

    this.estadisticasService.obtenerEstadisticas(this.filtros).subscribe({
      next: (data: any) => {
        console.log('Respuesta del servicio:', data);
        
        if (data) {
          // Asegurar que pendientes y procesados sean arrays
          const pendientes = Array.isArray(data.pendientes) ? data.pendientes : [];
          const procesados = Array.isArray(data.procesados) ? data.procesados : [];
          
          console.log('📊 pendientes:', pendientes.length);
          console.log('📊 procesados:', procesados.length);
          
          // Calcular total de documentos
          const totalDocumentos = data.documentos?.total || pendientes.length + procesados.length;
          
          // Calcular eficiencia
          const pagados = data.documentos?.pagados || 
                         procesados.filter((p: any) => p.estado?.includes('PAGADO')).length;
          const eficiencia = totalDocumentos > 0 ? Math.round((pagados / totalDocumentos) * 100) : 0;
          
          // Combinar pendientes y procesados para ultimosProcesados
          const todosLosProcesos = [
            ...pendientes.map((p: any) => ({ ...p, tipo: 'pendiente' })),
            ...procesados.map((p: any) => ({ ...p, tipo: 'procesado' }))
          ].sort((a, b) => {
            const fechaA = new Date(a.fechaProcesamiento || a.fechaAsignacion || a.fecha || 0).getTime();
            const fechaB = new Date(b.fechaProcesamiento || b.fechaAsignacion || b.fecha || 0).getTime();
            return fechaB - fechaA;
          }).slice(0, 10);
          
          console.log('📊 todosLosProcesos combinados:', todosLosProcesos.length);

          this.estadisticas = {
            // Propiedades calculadas para el frontend
            totalDocumentosDisponibles: totalDocumentos,
            misDocumentos: {
              pendientes: data.documentos?.pendientes || pendientes.length,
              pagados: data.documentos?.pagados || 
                      procesados.filter((p: any) => p.estado?.includes('PAGADO')).length,
              observados: data.documentos?.observados || 
                         procesados.filter((p: any) => p.estado?.includes('OBSERVADO')).length,
              rechazados: data.documentos?.rechazados || 
                         procesados.filter((p: any) => p.estado?.includes('RECHAZADO')).length,
              enProceso: data.documentos?.enProceso || 0,
              total: totalDocumentos
            },
            rechazados: {
              total: data.documentos?.rechazados || 
                    procesados.filter((p: any) => p.estado?.includes('RECHAZADO')).length,
              rechazadosTesorero: data.documentos?.rechazados || 
                                  procesados.filter((p: any) => p.estado?.includes('RECHAZADO')).length,
              rechazadosOtrasAreas: 0,
              porPeriodo: data.documentos?.rechazados || 0
            },
            tiempoPromedioHoras: data.tiempoPromedioHoras || 0,
            eficiencia: eficiencia,
            recientes: data.actividadReciente?.length || todosLosProcesos.length,
            distribucion: data.distribucion?.map((item: any, index: number) => ({
              estado: item.estado,
              cantidad: item.cantidad,
              porcentaje: totalDocumentos > 0 ? Math.round((item.cantidad / totalDocumentos) * 100) : 0,
              color: item.color || this.getColorForIndex(index)
            })) || [],
            // CREAR ultimosProcesados a partir de pendientes y procesados
            ultimosProcesados: todosLosProcesos.map((p: any) => ({
              id: p.id,
              numeroRadicado: p.numeroRadicado || p.documento?.numeroRadicado || 'N/A',
              contratista: p.contratista || p.documento?.nombreContratista || 'N/A',
              fecha: p.fechaProcesamiento || p.fechaAsignacion || p.fecha || new Date(),
              estado: p.estado || 'PENDIENTE',
              monto: p.monto || 0
            })),
            totales: {
              pendientes: data.documentos?.pendientes || pendientes.length,
              pagados: data.documentos?.pagados || 
                      procesados.filter((p: any) => p.estado?.includes('PAGADO')).length,
              observados: data.documentos?.observados || 
                         procesados.filter((p: any) => p.estado?.includes('OBSERVADO')).length,
              rechazados: data.documentos?.rechazados || 
                         procesados.filter((p: any) => p.estado?.includes('RECHAZADO')).length,
              enProceso: data.documentos?.enProceso || 0,
              total: totalDocumentos
            },
            fechaConsulta: data.fechaCalculo || new Date().toISOString(),
            desde: data.desde || '',
            hasta: data.hasta || '',
            
            // Mantener propiedades originales
            documentos: data.documentos,
            montos: data.montos,
            actividadReciente: data.actividadReciente,
            pendientes: data.pendientes,
            procesados: data.procesados,
            fechaCalculo: data.fechaCalculo
          };
          
          console.log('✅ Estadísticas procesadas:', this.estadisticas);
          console.log('📊 ultimosProcesados generados:', this.estadisticas.ultimosProcesados?.length);
        } else {
          this.errorMessage = 'No se recibieron datos válidos';
        }
        
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error:', err);
        const mensajeError = err.message || 'Error de conexión';
        this.errorMessage = mensajeError;
        this.notificationService.error('Error', mensajeError);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleMisEstadisticas(): void {
    this.cargarEstadisticas();
  }

  // Mismos métodos helper que en contabilidad
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
    if (upper.includes('PAGADO') || upper.includes('COMPLETADO')) return 'badge bg-success';
    if (upper.includes('OBSERVADO')) return 'badge bg-warning text-dark';
    if (upper.includes('RECHAZADO')) return 'badge bg-danger';
    if (upper.includes('PENDIENTE')) return 'badge bg-warning';
    if (upper.includes('PROCESO')) return 'badge bg-info';
    if (upper.includes('RADICADO')) return 'badge bg-primary';
    return 'badge bg-secondary';
  }

  formatearMoneda(valor: number | null | undefined): string {
    if (valor == null || isNaN(valor)) return 'S/ 0';
    return this.currencyPipe.transform(valor, 'S/ ', 'symbol', '1.0-0') || 'S/ 0';
  }

  // Método específico para tesorería
  tieneMonto(ultimosProcesados: any[] | undefined): boolean {
    return ultimosProcesados?.some(p => p?.monto != null && p?.monto > 0) || false;
  }

  private getColorForIndex(index: number): string {
    const colores = ['#FFA726', '#66BB6A', '#FFB74D', '#EF5350', '#42A5F5', '#AB47BC'];
    return colores[index % colores.length];
  }
}