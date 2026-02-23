// src/app/core/models/rendicion-cuentas.model.ts

export enum RendicionCuentasEstado {
  PENDIENTE = 'PENDIENTE',
  EN_REVISION = 'EN_REVISION',
  APROBADO = 'APROBADO',
  OBSERVADO = 'OBSERVADO',
  RECHAZADO = 'RECHAZADO',
  COMPLETADO = 'COMPLETADO'
}

export const RendicionCuentasColores: Record<string, string> = {
  [RendicionCuentasEstado.PENDIENTE]: '#FFC107',
  [RendicionCuentasEstado.EN_REVISION]: '#2196F3',
  [RendicionCuentasEstado.APROBADO]: '#4CAF50',
  [RendicionCuentasEstado.OBSERVADO]: '#FF9800',
  [RendicionCuentasEstado.RECHAZADO]: '#F44336',
  [RendicionCuentasEstado.COMPLETADO]: '#9E9E9E',
};

export interface RendicionCuentasDocumento {
  id: string;
  radicadoId: string;
  numeroRadicado: string;
  nombreContratista: string;
  documentoContratista: string;
  numeroContrato: string;
  estado: RendicionCuentasEstado | string;
  responsableId?: string;
  responsableAsignado?: string;
  observaciones?: string;
  fechaAsignacion?: Date;
  fechaInicioRevision?: Date;
  fechaDecision?: Date;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  
  // Campos extendidos para UI
  contadorAsignado?: string;
  fechaCompletadoContabilidad?: Date;
  disponible?: boolean;
}

export interface RendicionCuentasProceso {
  id: string;
  documentoId: string;
  documento: RendicionCuentasDocumento;
  responsableId?: string;
  responsable?: {
    id: string;
    nombreCompleto: string;
    email: string;
  };
  estado: RendicionCuentasEstado | string;
  observaciones?: string;
  fechaAsignacion?: Date;
  fechaInicioRevision?: Date;
  fechaDecision?: Date;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  
  // Campos de ayuda para UI
  numeroRadicado?: string;
  nombreContratista?: string;
  documentoContratista?: string;
  numeroContrato?: string;
  contadorAsignado?: string;
  fechaCompletadoContabilidad?: Date;
  disponible?: boolean;
  
  // Campos específicos para rendición
  informesPresentados?: string[];
  documentosAdjuntos?: string[];
  montoRendido?: number;
  montoAprobado?: number;
  observacionesRendicion?: string;
}

export interface RendicionCuentasHistorialItem {
  id: string;
  documentoId: string;
  usuarioId: string;
  usuarioNombre: string;
  estadoAnterior: string;
  estadoNuevo: string;
  accion: string;
  observacion?: string;
  fechaCreacion: Date;
  
  // Para UI
  documento?: {
    numeroRadicado: string;
    nombreContratista: string;
    numeroContrato: string;
  };
}

export interface TomarDecisionDto {
  decision: RendicionCuentasEstado.APROBADO | RendicionCuentasEstado.OBSERVADO | RendicionCuentasEstado.RECHAZADO;
  observacion?: string;
}

export interface IniciarRevisionDto {
  observacion?: string;
}

export interface AsignarResponsableDto {
  responsableId: string;
}

export interface CreateRendicionCuentasDto {
  documentoId: string;
  responsableId?: string;
}

export interface FiltrosRendicionCuentas {
  estados?: RendicionCuentasEstado[];
  responsableId?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}