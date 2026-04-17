export interface RendicionCuentasProceso {
  id: string;
  documentoId: string;
  rendicionId?: string;  // ← AÑADIR esta propiedad
  responsableId?: string;
  responsable?: string;
  responsableNombre?: string;  // ← AÑADIR esta propiedad
  estado: string;
  observaciones?: string;
  fechaAsignacion?: Date;
  fechaInicioRevision?: Date;
  fechaDecision?: Date;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  
  // Propiedades adicionales del documento
  numeroRadicado?: string;
  nombreContratista?: string;
  documentoContratista?: string;
  numeroContrato?: string;
  contadorAsignado?: string;
  fechaCompletadoContabilidad?: Date;
  disponible?: boolean;
  
  // Arrays
  informesPresentados?: any[];
  documentosAdjuntos?: any[];
  
  // Montos
  montoRendido?: number;
  montoAprobado?: number;
  observacionesRendicion?: string;
  
  // Propiedades adicionales para compatibilidad
  nombreCompleto?: string;
  radicado?: string;
  fechaRadicacion?: Date;
}

// Exportar el enum de estados
export enum RendicionCuentasEstado {
  PENDIENTE = 'PENDIENTE',
  EN_REVISION = 'EN_REVISION',
  OBSERVADO = 'OBSERVADO',
  RECHAZADO = 'RECHAZADO',
  COMPLETADO = 'COMPLETADO'
}

// Exportar los DTOs faltantes
export interface TomarDecisionDto {
  decision: string;
  observacion?: string;
}

export interface IniciarRevisionDto {
  documentoId: string;
  responsableId?: string;
}

export interface CreateRendicionCuentasDto {
  documentoId: string;
  responsableId: string;
}

export interface FiltrosRendicionCuentas {
  estado?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  responsableId?: string;
  numeroRadicado?: string;
}

export interface RendicionCuentasHistorialItem {
  id: string;
  documentoId: string;
  accion: string;
  usuario: string;
  fecha: Date;
  detalles?: any;
}