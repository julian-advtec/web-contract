// src/app/pages/asesor-gerencia/components/asesor-gerencia-stats/asesor-gerencia-stats.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';

import { EstadisticasAsesorGerenciaService } from '../../../../core/services/estadisticas-asesor-gerencia';
import { AuthService } from '../../../../core/services/auth.service';
import { EstadisticasAsesorGerencia, FiltrosStats, PeriodoStats } from '../../../../core/models/estadisticas-asesor-gerencia.model';

import Chart from 'chart.js/auto';

@Component({
  selector: 'app-asesor-gerencia-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asesor-gerencia-stats.html',
  styleUrls: ['./asesor-gerencia-stats.scss'],
  providers: [CurrencyPipe, DatePipe]
})
export class AsesorGerenciaStatsComponent implements OnInit, OnDestroy, AfterViewInit {
  periodos = [
    { value: PeriodoStats.HOY, label: 'Hoy' },
    { value: PeriodoStats.SEMANA, label: 'Última semana' },
    { value: PeriodoStats.MES, label: 'Último mes' },
    { value: PeriodoStats.TRIMESTRE, label: 'Último trimestre' }
  ];

  filtros: FiltrosStats = {
    periodo: PeriodoStats.MES,
    soloMios: false
  };

  private filtrosAnteriores: FiltrosStats = {
    periodo: PeriodoStats.MES,
    soloMios: false
  };

  private filtrosSubject = new Subject<void>();

  isLoading = false;
  errorMessage: string | null = null;
  estadisticas: EstadisticasAsesorGerencia | null = null;
  currentUserRole: string = '';

  activeTab: 'resumen' | 'pendientes' | 'procesados' = 'resumen';
  private chartInstance: any = null;

  constructor(
    private estadisticasService: EstadisticasAsesorGerenciaService,
    private authService: AuthService,
    private currencyPipe: CurrencyPipe,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.currentUserRole = this.authService.getCurrentUser()?.role || 'USUARIO';

    this.filtrosSubject.pipe(debounceTime(800)).subscribe(() => {
      this.cargarEstadisticas();
    });

    this.cargarEstadisticas();
  }

  ngAfterViewInit(): void {
    if (this.estadisticas?.distribucion?.length && this.activeTab === 'resumen') {
      setTimeout(() => this.renderizarGrafico(), 300);
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

  this.estadisticasService.obtenerEstadisticas(this.filtros).subscribe({
    next: (data) => {
      console.log('[DEBUG] Datos recibidos:', data);
      
      // Verificar que data tiene la estructura esperada
      if (data && data.documentos) {
        this.estadisticas = data;
        console.log('[DEBUG] Estadísticas asignadas:', this.estadisticas);
        console.log('[DEBUG] documentos.pendientes:', this.estadisticas.documentos.pendientes);
      } else {
        console.warn('[DEBUG] Datos recibidos no tienen la estructura esperada:', data);
        this.errorMessage = 'La estructura de datos recibida no es válida';
      }
      
      this.isLoading = false;
      this.cdr.detectChanges();

      if (this.activeTab === 'resumen' && this.estadisticas?.distribucion?.length) {
        setTimeout(() => this.renderizarGrafico(), 300);
      }
    },
    error: (err) => {
      console.error('[ERROR] Falló:', err);
      this.errorMessage = err.message || 'Error al cargar estadísticas.';
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
    window.open(`/asesor-gerencia/documento/${id}?modo=consulta`, '_blank');
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
    if (upper.includes('APROBADO') || upper.includes('COMPLETADO')) return 'badge bg-success';
    if (upper.includes('OBSERVADO')) return 'badge bg-warning text-dark';
    if (upper.includes('RECHAZADO')) return 'badge bg-danger';
    if (upper.includes('PENDIENTE') || upper.includes('REVISION')) return 'badge bg-warning';
    return 'badge bg-secondary';
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

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      console.warn('[DEBUG] Canvas tiene tamaño 0 → NO se crea el gráfico');
      return;
    }

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
          responsive: false,
          maintainAspectRatio: false,
          cutout: '65%',
          animation: { duration: 0 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const label = context.label || '';
                  const value = context.raw as number;
                  const total = this.estadisticas!.distribucion.reduce((sum, d) => sum + d.cantidad, 0);
                  const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : '0';

                  // CORREGIDO: Usar los montos por índice de forma segura
                  const montosArray = [
                    this.estadisticas!.montos.pendiente,
                    this.estadisticas!.montos.aprobado,
                    this.estadisticas!.montos.observado,
                    this.estadisticas!.montos.rechazado,
                    this.estadisticas!.montos.completado
                  ];
                  const monto = montosArray[context.dataIndex] || 0;

                  return `${label}: ${value} (${porcentaje}%) - ${this.formatearMoneda(monto)}`;
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