import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupervisorService } from '../../../../core/services/supervisor.service';

@Component({
  selector: 'app-supervisor-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supervisor-history.component.html',
  styleUrls: ['./supervisor-history.component.scss']
})
export class SupervisorHistoryComponent implements OnInit {
  historial: any[] = [];
  loading = false;
  error = '';

  constructor(private supervisorService: SupervisorService) {}

  ngOnInit(): void {
    this.loadHistorial();
  }

  loadHistorial(): void {
    this.loading = true;
    this.supervisorService.getHistorial().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.historial = response.data;
        } else {
          this.error = 'Error al cargar el historial';
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

  getEstadoBadgeClass(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'APROBADO': return 'badge bg-success';
      case 'OBSERVADO': return 'badge bg-warning text-dark';
      case 'RECHAZADO': return 'badge bg-danger';
      case 'PENDIENTE': return 'badge bg-secondary';
      default: return 'badge bg-light text-dark';
    }
  }
}