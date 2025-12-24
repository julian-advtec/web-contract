// src/app/pages/supervisor/components/supervisor-list/supervisor-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupervisorService } from '../../../../core/services/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Supervisor } from '../../../../core/models/supervisor.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Define el tipo SupervisorEstado si no existe
type SupervisorEstado = 'PENDIENTE' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';

@Component({
  selector: 'app-supervisor-list',
  templateUrl: './supervisor-list.component.html',
  styleUrls: ['./supervisor-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class SupervisorListComponent implements OnInit {
  supervisores: Supervisor[] = [];
  loading = true;
  error = '';

  constructor(
    private supervisorService: SupervisorService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPendientes();
  }

  loadPendientes() {
    this.loading = true;
    this.error = '';
    
    this.supervisorService.getPendientes().subscribe({
      next: (response) => {
        // CORRECCIÓN: Acceder a response.data en lugar de response
        this.supervisores = response.data || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar documentos pendientes';
        this.notificationService.error(this.error);
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  formatDate(date: Date | string): string {
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  }

  getEstadoBadgeClass(estado: SupervisorEstado): string {
    const classes: Record<SupervisorEstado, string> = {
      'PENDIENTE': 'badge-warning',
      'APROBADO': 'badge-success',
      'OBSERVADO': 'badge-info',
      'RECHAZADO': 'badge-danger'
    };
    return classes[estado] || 'badge-secondary';
  }

  getEstadoText(estado: SupervisorEstado): string {
    const texts: Record<SupervisorEstado, string> = {
      'PENDIENTE': 'Pendiente',
      'APROBADO': 'Aprobado',
      'OBSERVADO': 'Observado',
      'RECHAZADO': 'Rechazado'
    };
    return texts[estado] || estado;
  }

  revisarDocumento(supervisorId: string) {
    this.router.navigate(['/supervisor/revisar', supervisorId]);
  }

  verDetalle(documentoId: string) {
    this.router.navigate(['/radicacion', documentoId]);
  }
}