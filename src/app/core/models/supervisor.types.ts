// src/app/core/models/supervisor.types.ts (si no existe)
export type SupervisorEstado = 'PENDIENTE' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';

export interface Supervisor {
  id: string;
  estado: SupervisorEstado;
  observacion?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaAprobacion?: string;
  nombreArchivoSupervisor?: string;
}