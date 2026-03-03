import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupervisorEstadisticasService } from '../../../../core/services/supervisor/supervisor-estadisticas.service';
import { SupervisorEstadisticas, PeriodoStats, FiltrosEstadisticasSupervisor } from '../../../../core/models/supervisor-estadisticas.model';

@Component({
  selector: 'app-estadisticas-supervisor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estadisticas-supervisor.component.html',
  styleUrls: ['./estadisticas-supervisor.component.scss']
})
export class EstadisticasSupervisorComponent implements OnInit {
  periodos = [
    { value: PeriodoStats.HOY, label: 'Hoy' },
    { value: PeriodoStats.SEMANA, label: 'Última semana' },
    { value: PeriodoStats.MES, label: 'Último mes' },
    { value: PeriodoStats.TRIMESTRE, label: 'Último trimestre' },
    { value: PeriodoStats.ANO, label: 'Este año' }
  ];

  filtros: FiltrosEstadisticasSupervisor = {
    periodo: PeriodoStats.MES
  };

  cargando = false;
  errorMessage: string | null = null;
  estadisticas: SupervisorEstadisticas | null = null;

  constructor(
    private estadisticasService: SupervisorEstadisticasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    this.cargando = true;
    this.errorMessage = null;
    this.estadisticas = null;

    // Enviamos el filtro como body en POST
    this.estadisticasService.obtenerEstadisticas(this.filtros).subscribe({
      next: (data) => {
        if (data) {
          this.estadisticas = data;
          console.log('Estadísticas cargadas correctamente:', data);
        } else {
          this.errorMessage = 'No se recibieron datos válidos del servidor';
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error de conexión';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  getTotalProcesados(): number {
    return this.estadisticas?.totales?.total || 0;
  }

  getResumenPeriodo(): string {
    if (!this.estadisticas?.desde || !this.estadisticas?.hasta) return '';
    const desde = new Date(this.estadisticas.desde);
    const hasta = new Date(this.estadisticas.hasta);
    return `${desde.toLocaleDateString('es-CO')} — ${hasta.toLocaleDateString('es-CO')}`;
  }

  getBadgeClass(estado: string): string {
    const upper = (estado || '').toUpperCase();
    if (upper.includes('APROBADO')) return 'badge bg-success';
    if (upper.includes('OBSERVADO')) return 'badge bg-warning text-dark';
    if (upper.includes('RECHAZADO')) return 'badge bg-danger';
    if (upper.includes('EN_REVISION')) return 'badge bg-info';
    if (upper.includes('RADICADO')) return 'badge bg-primary';
    return 'badge bg-secondary';
  }
}