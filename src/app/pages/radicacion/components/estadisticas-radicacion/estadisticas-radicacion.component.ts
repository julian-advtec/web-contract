// src/app/pages/radicacion/components/estadisticas-radicador/estadisticas-radicador.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';
import { EstadisticasRadicadorService } from '../../../../core/services/estadisticas-radicador.service';
import { EstadisticasRadicador, FiltrosEstadisticasRadicador, PeriodoStats } from '../../../../core/models/estadisticas-radicador.model';

@Component({
  selector: 'app-estadisticas-radicador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estadisticas-radicacion.component.html',
  styleUrls: ['./estadisticas-radicacion.component.scss']
})
export class EstadisticasRadicadorComponent implements OnInit, OnDestroy {
  periodos = [
    { value: PeriodoStats.HOY, label: 'Hoy' },
    { value: PeriodoStats.SEMANA, label: 'Última semana' },
    { value: PeriodoStats.MES, label: 'Último mes' },
    { value: PeriodoStats.TRIMESTRE, label: 'Último trimestre' },
    { value: PeriodoStats.ANO, label: 'Este año' }
  ];

  filtros: FiltrosEstadisticasRadicador = {
    periodo: PeriodoStats.MES
    // soloMios ya no es necesario
  };

  private filtrosSubject = new Subject<void>();

  cargando = false;
  errorMessage: string | null = null;
  estadisticas: EstadisticasRadicador | null = null;

  constructor(
    private estadisticasService: EstadisticasRadicadorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.filtrosSubject.pipe(debounceTime(300)).subscribe(() => {
      this.cargarEstadisticas();
    });

    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.filtrosSubject.complete();
  }

  aplicarFiltros(): void {
    this.filtrosSubject.next();
  }

  cargarEstadisticas(): void {
    this.cargando = true;
    this.errorMessage = null;
    this.estadisticas = null;
    this.cdr.detectChanges();

    this.estadisticasService.obtenerMisEstadisticas(this.filtros.periodo).subscribe({
      next: (data) => {
        this.estadisticas = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al cargar estadísticas';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  recargar(): void {
    this.cargarEstadisticas();
  }

getTotalDocumentos(): number {
  return this.estadisticas?.documentos?.totalRadicados || 0;
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
    if (upper.includes('RADICADO')) return 'badge bg-info';
    return 'badge bg-secondary';
  }
}