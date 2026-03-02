// src/app/pages/supervisor/components/estadisticas-supervisor/estadisticas-supervisor.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';  // ← AGREGAR ESTO OBLIGATORIAMENTE
import { SupervisorEstadisticasService } from '../../../../core/services/supervisor/supervisor-estadisticas.service';
import { SupervisorEstadisticas } from '../../../../core/models/supervisor-estadisticas.model';

@Component({
  selector: 'app-estadisticas-supervisor',
  standalone: true,
  imports: [CommonModule],  // ← Esto resuelve el pipe 'date' (NG8004)
  templateUrl: './estadisticas-supervisor.component.html',
  styleUrls: ['./estadisticas-supervisor.component.scss']
})
export class EstadisticasSupervisorComponent implements OnInit {
  estadisticas: SupervisorEstadisticas | null = null;
  cargando = true;
  errorMessage: string | null = null;

  constructor(private estadisticasService: SupervisorEstadisticasService) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    this.cargando = true;
    this.errorMessage = null;

    this.estadisticasService.obtenerEstadisticas().subscribe({
      next: (data) => {
        this.estadisticas = data;
        this.cargando = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar las estadísticas';
        this.cargando = false;
      }
    });
  }
}