// src/app/pages/rendicion-cuentas/components/rendicion-stats/rendicion-stats.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';

import { EstadisticasRendicionCuentasService } from '../../../../core/services/estadisticas-rendicion-cuentas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EstadisticasRendicionCuentas, FiltrosStats, PeriodoStats } from '../../../../core/models/estadisticas-rendicion-cuentas.model';

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
  estadisticas: EstadisticasRendicionCuentas | null = null;
  currentUserRole: string = '';

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

  /**
   * Carga las estadísticas desde el servicio
   */
  cargarEstadisticas(): void {
    // Evitar recargas innecesarias si los filtros no han cambiado
    if (
      this.filtros.periodo === this.filtrosAnteriores.periodo &&
      this.filtros.soloMios === this.filtrosAnteriores.soloMios
    ) {
      console.log('[DEBUG Rendición] Filtros iguales → no recargo');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.filtrosAnteriores = { ...this.filtros };

    this.isLoading = true;
    this.errorMessage = null;
    this.estadisticas = null;
    this.cdr.detectChanges();

    console.log('[DEBUG Rendición] Cargando estadísticas con filtros:', this.filtros);

    this.estadisticasService.obtenerEstadisticas(this.filtros).subscribe({
      next: (data) => {
        console.log('[DEBUG Rendición] Datos recibidos del servicio:', data);
        console.log('[DEBUG Rendición] resumen:', data?.resumen);
        console.log('[DEBUG Rendición] pendientes:', data?.resumen?.pendientes);
        
        if (data && data.resumen) {
          this.estadisticas = data;
          console.log('[DEBUG Rendición] estadisticas asignado correctamente');
        } else {
          console.warn('[DEBUG Rendición] Datos no tienen la estructura esperada');
          this.errorMessage = 'La estructura de datos recibida no es válida';
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();

        // Renderizar gráfico si es necesario
        if (this.activeTab === 'resumen' && this.estadisticas?.distribucion?.length) {
          setTimeout(() => this.renderizarGrafico(), 300);
        }
      },
      error: (err) => {
        console.error('[DEBUG Rendición] Error al cargar estadísticas:', err);
        
        // Si el error tiene estructura vacía, usarla
        if (err.estructuraVacia) {
          this.estadisticas = err.estructuraVacia;
          this.errorMessage = null;
          console.log('[DEBUG Rendición] Usando estructura vacía por error');
        } else {
          this.errorMessage = err.message || 'Error al cargar estadísticas';
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Aplica los filtros después de un debounce
   */
  aplicarFiltros(): void {
    this.filtrosSubject.next();
  }

  /**
   * Alterna el filtro de solo mis documentos
   */
  toggleMisEstadisticas(): void {
    this.filtrosSubject.next();
  }

  /**
   * Recarga las estadísticas
   */
  recargar(): void {
    // Forzar recarga resetando filtros anteriores
    this.filtrosAnteriores = { periodo: '' as any, soloMios: false };
    this.cargarEstadisticas();
  }

  /**
   * Cambia la pestaña activa
   */
  setActiveTab(tab: 'resumen' | 'pendientes' | 'procesados'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();

    if (tab === 'resumen' && this.estadisticas?.distribucion?.length) {
      setTimeout(() => this.renderizarGrafico(), 150);
    }
  }

  /**
   * Navega a la vista de detalle de un documento
   */
  verDocumento(id: string): void {
    window.open(`/rendicion-cuentas/documento/${id}?modo=consulta`, '_blank');
  }

  /**
   * Formatea una fecha en formato corto (dd/MM/yyyy)
   */
  formatearFechaCorta(fecha: Date | string | null | undefined): string {
    if (!fecha) return '—';
    try {
      const fechaReal = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return this.datePipe.transform(fechaReal, 'dd/MM/yyyy') || '—';
    } catch {
      return '—';
    }
  }

  /**
   * Obtiene la clase CSS para el badge según el estado
   */
  getBadgeClass(estado: string | null | undefined): string {
    const upper = (estado || '').toUpperCase();
    if (upper.includes('APROBADO')) return 'badge bg-success';
    if (upper.includes('OBSERVADO')) return 'badge bg-warning text-dark';
    if (upper.includes('RECHAZADO')) return 'badge bg-danger';
    if (upper.includes('PENDIENTE')) return 'badge bg-warning';
    if (upper.includes('REVISION')) return 'badge bg-info';
    if (upper.includes('COMPLETADO')) return 'badge bg-secondary';
    if (upper.includes('ESPERA')) return 'badge bg-info';
    return 'badge bg-light text-dark';
  }

  /**
   * Obtiene el texto resumen del período
   */
  getResumenPeriodo(): string {
    if (!this.estadisticas?.desde || !this.estadisticas?.hasta) return '';
    return `${this.formatearFechaCorta(this.estadisticas.desde)} — ${this.formatearFechaCorta(this.estadisticas.hasta)}`;
  }

  /**
   * Renderiza el gráfico de distribución
   */
  private renderizarGrafico(): void {
    console.log('[DEBUG Rendición] Intentando renderizar gráfico');

    const canvas = document.getElementById('chart-estados') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('[DEBUG Rendición] Canvas no encontrado');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      console.warn('[DEBUG Rendición] Canvas tiene tamaño 0 → NO se crea el gráfico');
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
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          animation: { duration: 0 },
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
                  const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                  return `${label}: ${value} (${porcentaje}%)`;
                }
              }
            }
          }
        }
      });

      console.log('[DEBUG Rendición] Gráfico creado exitosamente');
    } catch (err) {
      console.error('[DEBUG Rendición] Error al crear gráfico:', err);
    }
  }
}