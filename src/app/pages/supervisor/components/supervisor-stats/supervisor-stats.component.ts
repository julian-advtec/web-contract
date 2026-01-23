// src/app/pages/supervisor/components/supervisor-stats/supervisor-stats.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupervisorService } from '../../../../core/services/supervisor/supervisor.service';

@Component({
  selector: 'app-supervisor-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supervisor-stats.component.html',
  styleUrls: ['./supervisor-stats.component.scss']
})
export class SupervisorStatsComponent implements OnInit {
  stats: any = null;
  loading = false;
  error = '';

  constructor(private supervisorService: SupervisorService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.supervisorService.getEstadisticas().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.stats = response.data;
        } else {
          this.error = 'Error al cargar estadísticas';
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Error de conexión con el servidor';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  getPercentage(part: number, total: number): string {
    if (total === 0) return '0';
    return ((part / total) * 100).toFixed(1);
  }
}