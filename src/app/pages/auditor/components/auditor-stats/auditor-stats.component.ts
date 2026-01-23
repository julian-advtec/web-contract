import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Registrar Chart.js + plugin
Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-auditor-stats',
  templateUrl: './auditor-stats.component.html',
  styleUrls: ['./auditor-stats.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class AuditorStatsComponent implements OnInit, OnDestroy {
  estadisticas: any = null;

  isLoading = false;
  isProcessing = false;

  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  chartEstado: any;
  chartEficiencia: any;
  chartTiempos: any;
  chartRadicados: any;

  periodoActual = 'ÚLTIMOS_30_DIAS';
  periodos = [
    { value: 'HOY', label: 'Hoy', icon: 'calendar-day' },
    { value: 'ULTIMOS_7_DIAS', label: 'Últimos 7 días', icon: 'calendar-week' },
    { value: 'ULTIMOS_30_DIAS', label: 'Últimos 30 días', icon: 'calendar-alt' },
    { value: 'ESTE_MES', label: 'Este mes', icon: 'calendar' },
    { value: 'TODOS', label: 'Todo el tiempo', icon: 'history' }
  ];

  sidebarCollapsed = false;
  datosExportacion: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private auditorService: AuditorService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
   
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destruirGraficos();
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
        elements: {
          arc: {
            // Aquí va el radio interno (en porcentaje o píxeles)
            innerRadius: '70%'   // ← CORRECTO para v4: dentro de elements.arc
            // Alternativa numérica: innerRadius: 70
          }as any
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Eficiencia del Auditor',
            font: { size: 16, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.raw}%`
            }
          },
          datalabels: {
            color: (context) => context.datasetIndex === 0 ? '#fff' : '#666',
            font: { weight: 'bold', size: 24 },
            formatter: (value: number, context) => {
              return context.datasetIndex === 0 ? `${value}%` : '';
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  // Métodos que faltaban en el template
  getPeriodoIcon(): string {
    const periodo = this.periodos.find(p => p.value === this.periodoActual);
    return periodo?.icon || 'calendar-alt';
  }

  getPeriodoLabel(): string {
    const periodo = this.periodos.find(p => p.value === this.periodoActual);
    return periodo?.label || 'Últimos 30 días';
  }

 
  formatNumber(num: number | undefined): string {
    return num?.toLocaleString('es-ES') || '0';
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

  exportarPDF(): void {
    this.isProcessing = true;
    // Lógica real de exportación PDF (puedes usar jsPDF o similar)
    setTimeout(() => {
      this.notificationService.success('Exportado', 'Estadísticas exportadas a PDF');
      this.isProcessing = false;
    }, 1500);
  }

  exportarExcel(): void {
    this.isProcessing = true;
    // Lógica real de exportación Excel (puedes usar XLSX)
    setTimeout(() => {
      this.notificationService.success('Exportado', 'Estadísticas exportadas a Excel');
      this.isProcessing = false;
    }, 1500);
  }


  calcularPorcentaje(valor: number, total: number): string {
    if (!total || total === 0) return '0%';
    const porcentaje = (valor / total) * 100;
    return `${porcentaje.toFixed(1)}%`;
  }

  prepararDatosExportacion(): void {
    if (!this.estadisticas) return;

    this.datosExportacion = [
      { categoria: 'Documentos Disponibles', valor: this.estadisticas.totalDocumentosDisponibles || 0 },
      { categoria: 'En Revisión', valor: this.estadisticas.misDocumentos?.enRevision || 0 },
      { categoria: 'Aprobados', valor: this.estadisticas.misDocumentos?.aprobados || 0 },
      { categoria: 'Observados', valor: this.estadisticas.misDocumentos?.observados || 0 },
      { categoria: 'Rechazados', valor: this.estadisticas.misDocumentos?.rechazados || 0 },
      { categoria: 'Completados', valor: this.estadisticas.misDocumentos?.completados || 0 },
      { categoria: 'Primer Radicados', valor: this.estadisticas.misDocumentos?.primerRadicados || 0 },
      { categoria: 'Total Procesados', valor: this.estadisticas.misDocumentos?.total || 0 },
      { categoria: 'Recientes (7 días)', valor: this.estadisticas.recientes || 0 },
      { categoria: 'Tiempo Promedio (horas)', valor: this.estadisticas.tiempoPromedioHoras || 0 },
      { categoria: 'Eficiencia', valor: `${this.estadisticas.eficiencia || 0}%` }
    ];
  }

  dismissError() { this.errorMessage = ''; }
  dismissSuccess() { this.successMessage = ''; }
  dismissInfo() { this.infoMessage = ''; }

  // Métodos de gráficos (ya corregidos en tu versión anterior)
  crearGraficoEstados(): void {
    const ctx = document.getElementById('chartEstado') as HTMLCanvasElement;
    if (!ctx) return;

    const dataValues = [
      this.estadisticas.misDocumentos?.enRevision || 0,
      this.estadisticas.misDocumentos?.aprobados || 0,
      this.estadisticas.misDocumentos?.observados || 0,
      this.estadisticas.misDocumentos?.rechazados || 0,
      this.estadisticas.misDocumentos?.completados || 0
    ];

    const total = dataValues.reduce((sum: number, val: number) => sum + val, 0);

    const data = {
      labels: ['En Revisión', 'Aprobados', 'Observados', 'Rechazados', 'Completados'],
      datasets: [{
        data: dataValues,
        backgroundColor: ['#FFB74D', '#4CAF50', '#FF9800', '#F44336', '#2196F3'],
        borderColor: ['#FF8F00', '#388E3C', '#EF6C00', '#D32F2F', '#1976D2'],
        borderWidth: 2
      }]
    };

    this.chartEstado = new Chart(ctx, {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { padding: 20, usePointStyle: true, font: { size: 12 } } },
          title: { display: true, text: 'Distribución de Estados', font: { size: 16, weight: 'bold' } },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          },
          datalabels: {
            color: '#fff',
            font: { weight: 'bold', size: 14 },
            formatter: (value: number) => {
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return value > 0 ? `${percentage}%` : '';
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


  calcularDuracion(fechaInicio: Date | string | undefined, fechaFin: Date | string | undefined): string {
    if (!fechaInicio || !fechaFin) return 'N/A';

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return 'Fecha inválida';

    const diffMs = fin.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;

    if (diffDays > 0) return `${diffDays} días ${diffHours}h`;
    if (diffHours > 0) return `${diffHours} horas`;
    return '< 1 hora';
  }

  destruirGraficos(): void {
    [this.chartEstado, this.chartEficiencia, this.chartTiempos, this.chartRadicados]
      .forEach(chart => chart?.destroy());
  }

}