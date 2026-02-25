import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-estadisticas-radicacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estadisticas-radicacion.component.html',
  styleUrls: ['./estadisticas-radicacion.component.scss']
})
export class EstadisticasRadicacionComponent implements OnInit, OnDestroy {
  // Períodos disponibles
  periodos = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Última semana' },
    { value: 'mes', label: 'Último mes' },
    { value: 'trimestre', label: 'Último trimestre' },
    { value: 'ano', label: 'Último año' }
  ];

  periodoSeleccionado = 'mes';
  fechaDesde = '';
  fechaHasta = '';
  cargando = false;
  errorCarga = '';
  mostrandoPersonalizado = false;

  // Datos de estadísticas
  estadisticas: any = null;

  // Datos para gráficos
  chartData: any[] = [];
  chartColors: string[] = [
    '#4CAF50', '#FF9800', '#F44336', '#2196F3', '#9C27B0', '#607D8B'
  ];

  private subscriptions: Subscription[] = [];

  constructor(private radicacionService: RadicacionService) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  cambiarPeriodo(periodo: string): void {
    this.periodoSeleccionado = periodo;
    this.mostrandoPersonalizado = false;
    this.cargarEstadisticas();
  }

  aplicarFechasPersonalizadas(): void {
    if (!this.fechaDesde || !this.fechaHasta) {
      this.errorCarga = 'Debe seleccionar fecha desde y fecha hasta';
      return;
    }

    const desde = new Date(this.fechaDesde);
    const hasta = new Date(this.fechaHasta);

    if (desde > hasta) {
      this.errorCarga = 'La fecha desde no puede ser mayor a la fecha hasta';
      return;
    }

    this.mostrandoPersonalizado = true;
    this.cargarEstadisticasPersonalizadas();
  }

  private cargarEstadisticas(): void {
    this.cargando = true;
    this.errorCarga = '';

    const sub = this.radicacionService.obtenerEstadisticasRadicacion({
      periodo: this.periodoSeleccionado
    }).subscribe({
      next: (response) => {
        if (response.ok) {
          this.estadisticas = response.data;
          this.prepararDatosGrafico();
        } else {
          this.errorCarga = response.error || 'Error al cargar estadísticas';
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        this.errorCarga = 'Error de conexión al cargar estadísticas';
        this.cargando = false;
      }
    });

    this.subscriptions.push(sub);
  }

  private cargarEstadisticasPersonalizadas(): void {
    this.cargando = true;
    this.errorCarga = '';

    const sub = this.radicacionService.obtenerEstadisticasRadicacion({
      desde: this.fechaDesde,
      hasta: this.fechaHasta
    }).subscribe({
      next: (response) => {
        if (response.ok) {
          this.estadisticas = response.data;
          this.prepararDatosGrafico();
        } else {
          this.errorCarga = response.error || 'Error al cargar estadísticas';
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        this.errorCarga = 'Error de conexión al cargar estadísticas';
        this.cargando = false;
      }
    });

    this.subscriptions.push(sub);
  }

  private prepararDatosGrafico(): void {
    if (!this.estadisticas?.documentosPorEstado) return;

    this.chartData = this.estadisticas.documentosPorEstado.map((item: any, index: number) => ({
      ...item,
      color: this.chartColors[index % this.chartColors.length],
      porcentaje: this.estadisticas.resumen.totalDocumentos > 0 
        ? Math.round((item.cantidad / this.estadisticas.resumen.totalDocumentos) * 100) 
        : 0
    }));
  }

  obtenerResumen(): any {
    if (!this.estadisticas) return null;
    return this.estadisticas.resumen;
  }

  obtenerRadicacionesPorDia(): any[] {
    return this.estadisticas?.radicacionesPorDia || [];
  }

  obtenerDocumentosPorRadicador(): any[] {
    return this.estadisticas?.documentosPorRadicador || [];
  }

  obtenerDocumentosPorContratista(): any[] {
    return this.estadisticas?.documentosPorContratista || [];
  }

  obtenerDocumentosRecientes(): any[] {
    return this.estadisticas?.documentosRecientes || [];
  }

  getEstadoClass(estado: string): string {
    const classes: Record<string, string> = {
      'RADICADO': 'badge-success',
      'EN_REVISION': 'badge-warning',
      'OBSERVADO': 'badge-danger',
      'APROBADO': 'badge-info',
      'RECHAZADO': 'badge-danger',
      'FINALIZADO': 'badge-secondary'
    };
    return classes[estado] || 'badge-secondary';
  }

  formatearFecha(fecha: string | Date): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearFechaCorta(fecha: string | Date): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}