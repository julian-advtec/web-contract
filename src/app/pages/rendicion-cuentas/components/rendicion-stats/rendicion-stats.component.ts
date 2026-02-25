// src/app/pages/rendicion-cuentas/components/rendicion-stats/rendicion-stats.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';
import { EstadisticasRendicionCuentasService, EstadisticasRendicionCuentas, FiltrosStats, PeriodoStats } from '../../../../core/services/estadisticas-rendicion-cuentas.service';
import { AuthService } from '../../../../core/services/auth.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-rendicion-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rendicion-stats.component.html',
  styleUrls: ['./rendicion-stats.component.scss'],
  providers: [CurrencyPipe, DatePipe]
})
export class RendicionStatsComponent implements OnInit, OnDestroy, AfterViewInit {
  estadisticas: EstadisticasRendicionCuentas | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  currentUserRole: string = '';
  filtros: FiltrosStats = {
    periodo: PeriodoStats.MES,
    soloMios: false
  };

  private filtrosAnteriores: FiltrosStats = {
    periodo: PeriodoStats.MES,
    soloMios: false
  };

  private filtrosSubject = new Subject<void>();

  periodos = [
    { value: PeriodoStats.HOY, label: 'Hoy' },
    { value: PeriodoStats.SEMANA, label: 'Última semana' },
    { value: PeriodoStats.MES, label: 'Último mes' },
    { value: PeriodoStats.TRIMESTRE, label: 'Último trimestre' }
  ];

  activeTab: 'resumen' | 'pendientes' | 'procesados' = 'resumen';
  private chartInstance: any = null;

  constructor(
    private estadisticasService: EstadisticasRendicionCuentasService,
    private authService: AuthService,
    private currencyPipe: CurrencyPipe,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getCurrentUser()?.role || 'USUARIO';

    this.filtrosSubject.pipe(debounceTime(1200)).subscribe(() => {
      this.cargarEstadisticas();
    });

    this.cargarEstadisticas();
  }

  ngAfterViewInit(): void {
    if (this.estadisticas?.distribucion?.length && this.activeTab === 'resumen') {
      setTimeout(() => this.renderizarGrafico(), 500);
    }
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
    this.filtrosSubject.complete();
  }

  cargarEstadisticas(): void {
    if (
      this.filtros.periodo === this.filtrosAnteriores.periodo &&
      this.filtros.soloMios === this.filtrosAnteriores.soloMios
    ) {
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.filtrosAnteriores = { ...this.filtros };

    this.isLoading = true;
    this.errorMessage = null;
    this.estadisticas = null;
    this.cdr.detectChanges();

    console.log('🚀 Cargando estadísticas con filtros:', this.filtros);

    this.estadisticasService.obtenerEstadisticas(this.filtros).subscribe({
      next: (data) => {
        console.log('📈 Estadísticas recibidas del backend:', data);
        this.estadisticas = data;
        console.log('📊 Resumen:', data.resumen);
        console.log('📊 Pendientes:', data.resumen?.pendientes);
        this.isLoading = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.activeTab === 'resumen' && this.estadisticas?.distribucion?.length) {
            this.renderizarGrafico();
          }
        }, 500);
      },
      error: (err) => {
        console.error('❌ Error detallado:', err);
        this.errorMessage = err.message || 'Error al cargar estadísticas';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros(): void {
    this.filtrosSubject.next();
  }

  toggleMisEstadisticas(): void {
    this.filtrosSubject.next();
  }

  recargar(): void {
    this.filtrosAnteriores = { periodo: '' as any, soloMios: false };
    this.cargarEstadisticas();
  }

  setActiveTab(tab: 'resumen' | 'pendientes' | 'procesados'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();

    if (tab === 'resumen' && this.estadisticas?.distribucion?.length) {
      setTimeout(() => this.renderizarGrafico(), 150);
    }
  }

  verDocumento(id: string): void {
    window.open(`/rendicion-cuentas/documento/${id}?modo=consulta`, '_blank');
  }

  formatearFechaCorta(fecha: Date | string | null | undefined): string {
    if (!fecha) return '—';
    const fechaReal = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return this.datePipe.transform(fechaReal, 'dd/MM/yyyy') || '—';
  }

  getBadgeClass(estado: string | null | undefined): string {
    const estadoMap: { [key: string]: string } = {
      'PENDIENTE': 'badge-warning',
      'EN_REVISION': 'badge-info',
      'APROBADO': 'badge-success',
      'OBSERVADO': 'badge-secondary',
      'RECHAZADO': 'badge-danger',
      'RECHAZADO_RENDICION': 'badge-danger',
      'COMPLETADO': 'badge-primary',
      'ESPERA_APROBACION_GERENCIA': 'badge-info',
      'APROBADO_POR_GERENCIA': 'badge-success'
    };
    return estadoMap[estado || ''] || 'badge-light';
  }

  getResumenPeriodo(): string {
    if (!this.estadisticas?.desde || !this.estadisticas?.hasta) return '';
    return `${this.formatearFechaCorta(this.estadisticas.desde)} — ${this.formatearFechaCorta(this.estadisticas.hasta)}`;
  }

  private renderizarGrafico(): void {
    const canvas = document.getElementById('chart-estados') as HTMLCanvasElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    try {
      this.chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: this.estadisticas!.distribucion.map(d => d.estado),
          datasets: [{
            data: this.estadisticas!.distribucion.map(d => d.cantidad),
            backgroundColor: this.estadisticas!.distribucion.map(d => d.color),
            borderWidth: 1,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { 
              position: 'bottom',
              labels: { boxWidth: 12 }
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const label = context.label || '';
                  const value = context.raw as number;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                  return `${label}: ${value} docs (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Error al crear gráfico:', err);
    }
  }
}