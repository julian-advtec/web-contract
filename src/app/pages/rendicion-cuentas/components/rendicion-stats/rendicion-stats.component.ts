// src/app/pages/rendicion-cuentas/components/rendicion-stats/rendicion-stats.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';

import { EstadisticasRendicionCuentasService } from '../../../../core/services/estadisticas-rendicion-cuentas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EstadisticasRendicionCuentas, FiltrosStats, PeriodoStats } from '../../../../core/models/estadisticas-rendicion-cuentas.model';

@Component({
  selector: 'app-rendicion-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rendicion-stats.component.html',
  styleUrls: ['./rendicion-stats.component.scss'],
  providers: [DatePipe]
})
export class RendicionStatsComponent implements OnInit, OnDestroy {
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

  private filtrosAnteriores: FiltrosStats = { ...this.filtros };

  private filtrosSubject = new Subject<void>();

  isLoading = false;
  errorMessage: string | null = null;
  estadisticas: EstadisticasRendicionCuentas | null = null;
  currentUserRole: string = '';

  activeTab: 'resumen' | 'pendientes' | 'procesados' = 'resumen';

  constructor(
    private estadisticasService: EstadisticasRendicionCuentasService,
    private authService: AuthService,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getCurrentUser()?.role || 'USUARIO';
    this.filtrosSubject.pipe(debounceTime(400)).subscribe(() => this.cargarEstadisticas());
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.filtrosSubject.complete();
  }

  cargarEstadisticas(): void {
    if (
      this.filtros.periodo === this.filtrosAnteriores.periodo &&
      this.filtros.soloMios === this.filtrosAnteriores.soloMios
    ) {
      console.log('[DEBUG] Filtros sin cambio → no recargo');
      return;
    }

    this.filtrosAnteriores = { ...this.filtros };

    this.isLoading = true;
    this.errorMessage = null;
    this.estadisticas = null;
    this.cdr.detectChanges();

    console.log('[DEBUG] Cargando con filtros:', this.filtros);

    this.estadisticasService.obtenerEstadisticas(this.filtros).subscribe({
      next: (data) => {
        console.log('[DEBUG] Datos recibidos:', data);
        console.log('[DEBUG] resumen:', data?.resumen);

        if (data && data.resumen) {
          this.estadisticas = data;
          console.log('[DEBUG] Asignado OK');
        } else {
          this.errorMessage = 'Datos inválidos';
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[DEBUG] Error:', err);
        this.errorMessage = 'Error al cargar';
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
  }

  verDocumento(id: string): void {
    window.open(`/rendicion-cuentas/documento/${id}?modo=consulta`, '_blank');
  }

  formatearFechaCorta(fecha: Date | string | null | undefined): string {
    if (!fecha) return '—';
    try {
      const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return this.datePipe.transform(d, 'dd/MM/yyyy') || '—';
    } catch {
      return '—';
    }
  }

  getBadgeClass(estado: string | null | undefined): string {
    const s = (estado || '').toUpperCase();
    if (s.includes('APROBADO')) return 'bg-success';
    if (s.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (s.includes('RECHAZADO')) return 'bg-danger';
    if (s.includes('PENDIENTE')) return 'bg-warning';
    if (s.includes('REVISION')) return 'bg-info';
    if (s.includes('COMPLETADO')) return 'bg-secondary';
    if (s.includes('ESPERA')) return 'bg-purple';
    return 'bg-light text-dark';
  }

  getResumenPeriodo(): string {
    if (!this.estadisticas?.desde || !this.estadisticas?.hasta) return '';
    return `${this.formatearFechaCorta(this.estadisticas.desde)} — ${this.formatearFechaCorta(this.estadisticas.hasta)}`;
  }
}