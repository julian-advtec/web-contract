import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';

import { EstadisticasTesoreriaService } from '../../../../core/services/estadisticas-tesoreria.service';
import { AuthService } from '../../../../core/services/auth.service';

import { EstadisticasTesoreria, FiltrosStats, PeriodoStats } from '../../../../core/models/estadisticas-tesoreria.model';

// Import estático de Chart.js
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-tesoreria-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tesoreria-stats.component.html',
  styleUrls: ['./tesoreria-stats.component.scss'],
  providers: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.Default   // temporal, para descartar problemas de detección
})
export class TesoreriaStatsComponent implements OnInit, OnDestroy, AfterViewInit {
  estadisticas: EstadisticasTesoreria | null = null;
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
    private estadisticasService: EstadisticasTesoreriaService,
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
      this.renderizarGrafico();
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
      console.log('[DEBUG] Filtros iguales → no recargo');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.filtrosAnteriores = { ...this.filtros };

    this.isLoading = true;
    this.errorMessage = null;
    this.estadisticas = null;
    this.cdr.detectChanges();

    console.log('[DEBUG] Iniciando carga con filtros:', this.filtros);

    this.estadisticasService.obtenerEstadisticas(this.filtros).subscribe({
      next: (data) => {
        console.log('[DEBUG] Datos recibidos:', data);
        this.estadisticas = data;
        this.isLoading = false;
        console.log('[DEBUG] isLoading = false');

        this.cdr.detectChanges();

        setTimeout(() => {
          console.log('[DEBUG] 500ms después de cargar datos');
          if (this.activeTab === 'resumen' && this.estadisticas?.distribucion?.length) {
            this.renderizarGrafico();
          }
        }, 500);
      },
      error: (err) => {
        console.error('[ERROR] Falló:', err);
        this.errorMessage = 'Error al cargar estadísticas.';
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
    window.open(`/tesoreria/documento/${id}?modo=consulta`, '_blank');
  }

  formatearFechaCorta(fecha: Date | string | null | undefined): string {
    if (!fecha) return '—';
    const fechaReal = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return this.datePipe.transform(fechaReal, 'dd/MM') || '—';
  }

  formatearFechaLarga(fecha: Date | string | null | undefined): string {
    if (!fecha) return '—';
    const fechaReal = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return this.datePipe.transform(fechaReal, 'dd/MM/yyyy HH:mm') || '—';
  }

  getBadgeClass(estado: string | null | undefined): string {
    const upper = (estado || '').toUpperCase();
    if (upper.includes('PAGADO') || upper.includes('COMPLETADO')) return 'badge bg-success';
    if (upper.includes('OBSERVADO')) return 'badge bg-warning text-dark';
    if (upper.includes('RECHAZADO')) return 'badge bg-danger';
    if (upper.includes('PENDIENTE')) return 'badge bg-secondary';
    return 'badge bg-dark';
  }

  getResumenPeriodo(): string {
    if (!this.estadisticas?.desde || !this.estadisticas?.hasta) return '';
    return `${this.formatearFechaCorta(this.estadisticas.desde)} — ${this.formatearFechaCorta(this.estadisticas.hasta)}`;
  }

  formatearMoneda(valor: number | null | undefined): string {
    if (valor == null || isNaN(valor)) return 'S/ 0';
    return this.currencyPipe.transform(valor, 'S/ ', 'symbol', '1.0-0') || 'S/ 0';
  }

  private renderizarGrafico(): void {
    console.log('[DEBUG] Intentando renderizar gráfico');

    const canvas = document.getElementById('chart-estados') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('[DEBUG] Canvas no encontrado');
      return;
    }

    // Chequeo crítico: evitar crear chart si el canvas no tiene tamaño válido
    const rect = canvas.getBoundingClientRect();
    console.log('[DEBUG] Tamaño canvas:', rect.width, 'x', rect.height);
    if (rect.width <= 0 || rect.height <= 0) {
      console.warn('[DEBUG] Canvas tiene tamaño 0 → NO se crea el gráfico (evita freeze)');
      return;
    }

    // Destruir instancia anterior si existe
    if (this.chartInstance) {
      console.log('[DEBUG] Destruyendo gráfico anterior');
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
          responsive: false,                    // ← clave: desactivado para evitar loops de resize
          maintainAspectRatio: false,
          cutout: '65%',
          animation: {
            duration: 0                         // sin animaciones
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const label = context.label || '';
                  const value = context.raw as number;
                  return `${label}: ${value} docs`;
                }
              }
            }
          }
        }
      });

      console.log('[DEBUG] Gráfico creado exitosamente');
    } catch (err) {
      console.error('[ERROR] Falló al crear gráfico:', err);
    }
  }
}