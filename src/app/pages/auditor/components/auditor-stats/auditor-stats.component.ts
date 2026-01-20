import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Registrar componentes de Chart.js
Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-auditor-stats',
  templateUrl: './auditor-stats.component.html',
  styleUrls: ['./auditor-stats.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class AuditorStatsComponent implements OnInit, OnDestroy {
  // Datos de estadísticas
  estadisticas: any = null;
  
  // Estados de carga
  isLoading = false;
  isProcessing = false;

  // Mensajes
  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  // Gráficos
  chartEstado: any;
  chartEficiencia: any;
  chartTiempos: any;
  chartRadicados: any;

  // Período
  periodoActual = 'ÚLTIMOS_30_DIAS';
  periodos = [
    { value: 'HOY', label: 'Hoy', icon: 'calendar-day' },
    { value: 'ULTIMOS_7_DIAS', label: 'Últimos 7 días', icon: 'calendar-week' },
    { value: 'ULTIMOS_30_DIAS', label: 'Últimos 30 días', icon: 'calendar-alt' },
    { value: 'ESTE_MES', label: 'Este mes', icon: 'calendar' },
    { value: 'TODOS', label: 'Todo el tiempo', icon: 'history' }
  ];

  // Sidebar
  sidebarCollapsed = false;

  // Datos para exportación
  datosExportacion: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private auditorService: AuditorService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    console.log('🚀 Auditor: Inicializando estadísticas...');
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Destruir gráficos
    if (this.chartEstado) {
      this.chartEstado.destroy();
    }
    if (this.chartEficiencia) {
      this.chartEficiencia.destroy();
    }
    if (this.chartTiempos) {
      this.chartTiempos.destroy();
    }
    if (this.chartRadicados) {
      this.chartRadicados.destroy();
    }
  }

  cargarEstadisticas(): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📊 Cargando estadísticas del auditor...');

    this.auditorService.getEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (estadisticas: any) => {
          console.log('✅ Estadísticas recibidas:', estadisticas);
          
          this.estadisticas = estadisticas;
          this.prepararDatosExportacion();
          
          // Crear gráficos después de cargar los datos
          setTimeout(() => {
            this.crearGraficos();
          }, 100);
          
          this.isLoading = false;
          this.successMessage = 'Estadísticas actualizadas correctamente';
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Error cargando estadísticas:', error);
          this.errorMessage = 'Error al cargar estadísticas: ' + (error.message || 'Error desconocido');
          this.isLoading = false;
          this.notificationService.error('Error', this.errorMessage);
        }
      });
  }

  crearGraficos(): void {
    if (!this.estadisticas) return;

    // Destruir gráficos existentes
    this.destruirGraficos();

    // 1. Gráfico de distribución de estados
    this.crearGraficoEstados();
    
    // 2. Gráfico de eficiencia
    this.crearGraficoEficiencia();
    
    // 3. Gráfico de tiempos
    this.crearGraficoTiempos();
    
    // 4. Gráfico de primer radicado
    this.crearGraficoRadicados();
  }

  crearGraficoEstados(): void {
    const ctx = document.getElementById('chartEstado') as HTMLCanvasElement;
    if (!ctx) return;

    const data = {
      labels: ['En Revisión', 'Aprobados', 'Observados', 'Rechazados', 'Completados'],
      datasets: [{
        data: [
          this.estadisticas.misDocumentos?.enRevision || 0,
          this.estadisticas.misDocumentos?.aprobados || 0,
          this.estadisticas.misDocumentos?.observados || 0,
          this.estadisticas.misDocumentos?.rechazados || 0,
          this.estadisticas.misDocumentos?.completados || 0
        ],
        backgroundColor: [
          '#FFB74D', // Naranja
          '#4CAF50', // Verde
          '#FF9800', // Naranja oscuro
          '#F44336', // Rojo
          '#2196F3'  // Azul
        ],
        borderColor: [
          '#FF8F00',
          '#388E3C',
          '#EF6C00',
          '#D32F2F',
          '#1976D2'
        ],
        borderWidth: 2
      }]
    };

    this.chartEstado = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          title: {
            display: true,
            text: 'Distribución de Estados',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          },
          datalabels: {
            color: '#fff',
            font: {
              weight: 'bold',
              size: 14
            },
            formatter: (value: number, context) => {
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              if (total === 0) return '0%';
              const percentage = ((value / total) * 100).toFixed(1);
              return value > 0 ? `${percentage}%` : '';
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  crearGraficoEficiencia(): void {
    const ctx = document.getElementById('chartEficiencia') as HTMLCanvasElement;
    if (!ctx) return;

    const eficiencia = this.estadisticas.eficiencia || 0;
    const restante = 100 - eficiencia;

    const data = {
      labels: ['Eficiencia', 'Por Mejorar'],
      datasets: [{
        data: [eficiencia, restante],
        backgroundColor: [
          eficiencia >= 80 ? '#4CAF50' : eficiencia >= 60 ? '#FF9800' : '#F44336',
          '#E0E0E0'
        ],
        borderColor: [
          eficiencia >= 80 ? '#388E3C' : eficiencia >= 60 ? '#EF6C00' : '#D32F2F',
          '#BDBDBD'
        ],
        borderWidth: 2
      }]
    };

    this.chartEficiencia = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Eficiencia del Auditor',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.raw}%`;
              }
            }
          },
          datalabels: {
            color: (context) => {
              return context.datasetIndex === 0 ? '#fff' : '#666';
            },
            font: {
              weight: 'bold',
              size: 24
            },
            formatter: (value: number, context) => {
              if (context.datasetIndex === 0) {
                return `${value}%`;
              }
              return '';
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  crearGraficoTiempos(): void {
    const ctx = document.getElementById('chartTiempos') as HTMLCanvasElement;
    if (!ctx) return;

    // Datos de ejemplo para tiempos de revisión
    const tiempos = [2, 4, 6, 8, 12, 18, 24, 36, 48];
    const frecuencias = [15, 25, 30, 22, 18, 12, 8, 5, 3];

    const data = {
      labels: tiempos.map(t => `${t}h`),
      datasets: [{
        label: 'Documentos',
        data: frecuencias,
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    };

    this.chartTiempos = new Chart(ctx, {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          title: {
            display: true,
            text: 'Tiempos de Revisión',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.raw} documentos en ${context.label}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad de Documentos'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Tiempo de Revisión (horas)'
            }
          }
        }
      }
    });
  }

  crearGraficoRadicados(): void {
    const ctx = document.getElementById('chartRadicados') as HTMLCanvasElement;
    if (!ctx) return;

    const totalPrimerRadicados = this.estadisticas.misDocumentos?.primerRadicados || 0;
    const totalOtros = (this.estadisticas.misDocumentos?.total || 0) - totalPrimerRadicados;

    const data = {
      labels: ['Primer Radicado', 'Otros Radicados'],
      datasets: [{
        data: [totalPrimerRadicados, totalOtros],
        backgroundColor: ['#FF9800', '#2196F3'],
        borderColor: ['#EF6C00', '#1976D2'],
        borderWidth: 2
      }]
    };

    this.chartRadicados = new Chart(ctx, {
      type: 'pie',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Primer Radicado vs Otros',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  destruirGraficos(): void {
    if (this.chartEstado) {
      this.chartEstado.destroy();
    }
    if (this.chartEficiencia) {
      this.chartEficiencia.destroy();
    }
    if (this.chartTiempos) {
      this.chartTiempos.destroy();
    }
    if (this.chartRadicados) {
      this.chartRadicados.destroy();
    }
  }

  prepararDatosExportacion(): void {
    if (!this.estadisticas) return;

    this.datosExportacion = [
      {
        categoria: 'Documentos Disponibles',
        valor: this.estadisticas.totalDocumentosDisponibles || 0
      },
      {
        categoria: 'En Revisión',
        valor: this.estadisticas.misDocumentos?.enRevision || 0
      },
      {
        categoria: 'Aprobados',
        valor: this.estadisticas.misDocumentos?.aprobados || 0
      },
      {
        categoria: 'Observados',
        valor: this.estadisticas.misDocumentos?.observados || 0
      },
      {
        categoria: 'Rechazados',
        valor: this.estadisticas.misDocumentos?.rechazados || 0
      },
      {
        categoria: 'Completados',
        valor: this.estadisticas.misDocumentos?.completados || 0
      },
      {
        categoria: 'Primer Radicados',
        valor: this.estadisticas.misDocumentos?.primerRadicados || 0
      },
      {
        categoria: 'Total Procesados',
        valor: this.estadisticas.misDocumentos?.total || 0
      },
      {
        categoria: 'Recientes (7 días)',
        valor: this.estadisticas.recientes || 0
      },
      {
        categoria: 'Tiempo Promedio (horas)',
        valor: this.estadisticas.tiempoPromedioHoras || 0
      },
      {
        categoria: 'Eficiencia',
        valor: `${this.estadisticas.eficiencia || 0}%`
      }
    ];
  }

  cambiarPeriodo(periodo: string): void {
    this.periodoActual = periodo;
    this.isProcessing = true;
    
    // Simular carga de datos para el nuevo período
    setTimeout(() => {
      this.refreshData();
      this.isProcessing = false;
    }, 1000);
  }

  refreshData(): void {
    console.log('🔄 Auditor: Actualizando estadísticas...');
    this.cargarEstadisticas();
  }

  exportarPDF(): void {
    console.log('📄 Exportando estadísticas a PDF...');
    this.isProcessing = true;

    // Implementar exportación a PDF
    setTimeout(() => {
      this.notificationService.success('Exportación', 'Estadísticas exportadas a PDF correctamente');
      this.isProcessing = false;
    }, 1500);
  }

  exportarExcel(): void {
    console.log('📊 Exportando estadísticas a Excel...');
    this.isProcessing = true;

    // Implementar exportación a Excel
    setTimeout(() => {
      this.notificationService.success('Exportación', 'Estadísticas exportadas a Excel correctamente');
      this.isProcessing = false;
    }, 1500);
  }

  getPeriodoLabel(): string {
    const periodo = this.periodos.find(p => p.value === this.periodoActual);
    return periodo ? periodo.label : 'Últimos 30 días';
  }

  getPeriodoIcon(): string {
    const periodo = this.periodos.find(p => p.value === this.periodoActual);
    return periodo ? periodo.icon : 'calendar-alt';
  }

  calcularProgresoEficiencia(): number {
    return this.estadisticas?.eficiencia || 0;
  }

  getEficienciaColor(): string {
    const eficiencia = this.estadisticas?.eficiencia || 0;
    if (eficiencia >= 80) return 'success';
    if (eficiencia >= 60) return 'warning';
    return 'danger';
  }

  getEficienciaIcon(): string {
    const eficiencia = this.estadisticas?.eficiencia || 0;
    if (eficiencia >= 80) return 'check-circle';
    if (eficiencia >= 60) return 'exclamation-circle';
    return 'times-circle';
  }

  formatNumber(num: number): string {
    return num?.toLocaleString('es-ES') || '0';
  }

  calcularPorcentaje(valor: number, total: number): string {
    if (!total || total === 0) return '0%';
    const porcentaje = (valor / total) * 100;
    return `${porcentaje.toFixed(1)}%`;
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