// src/app/core/models/rendicion-cuentas.model.ts

// Enum para estados
export enum RendicionCuentasEstado {
  PENDIENTE = 'PENDIENTE',
  EN_REVISION = 'EN_REVISION',
  APROBADO = 'APROBADO',
  OBSERVADO = 'OBSERVADO',
  RECHAZADO = 'RECHAZADO',
  RECHAZADO_RENDICION = 'RECHAZADO_RENDICION',
  COMPLETADO = 'COMPLETADO'
}

// Colores para los estados
export const RendicionCuentasColores = {
  [RendicionCuentasEstado.PENDIENTE]: 'warning',
  [RendicionCuentasEstado.EN_REVISION]: 'info',
  [RendicionCuentasEstado.APROBADO]: 'success',
  [RendicionCuentasEstado.OBSERVADO]: 'secondary',
  [RendicionCuentasEstado.RECHAZADO]: 'danger',
  [RendicionCuentasEstado.RECHAZADO_RENDICION]: 'danger',
  [RendicionCuentasEstado.COMPLETADO]: 'primary'
};

// Enum para períodos de estadísticas - ¡VERIFICAR QUE ESTÉ EXPORTADO!
export enum PeriodoStats {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre',
  SEMESTRE = 'semestre',
  ANIO = 'anio'
}

// Interface para filtros de estadísticas
export interface FiltrosStats {
  periodo: PeriodoStats;
  soloMios: boolean;
  estado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  tipoDocumento?: string;
}

// Interface principal para procesos de rendición
export interface RendicionCuentasProceso {
  id: string;
  documentoId: string;
  numeroRadicado: string;
  nombreContratista: string;
  documentoContratista: string;
  numeroContrato: string;
  estado: string;
  fechaAsignacion: Date;
  fechaCreacion: Date;
  fechaActualizacion?: Date;
  fechaProcesamiento?: Date;
  fechaCompletadoContabilidad?: Date;
  fechaRechazo?: Date;
  responsableId?: string;
  responsableNombre?: string;
  rechazadoPor?: string;
  observacion?: string;
  observaciones?: string;
  documento?: any;
  tipo?: string;
}

// Interfaces para estadísticas
export interface DocumentosPorEstado {
  pendientes: number;
  aprobados: number;
  observados: number;
  rechazados: number;
  enProceso: number;
  total: number;
}

export interface MontosPorEstado {
  pendiente: number;
  aprobado: number;
  observado: number;
  rechazado: number;
  enProceso: number;
  total: number;
}

export interface DistribucionEstado {
  estado: string;
  cantidad: number;
  monto: number;
  color: string;
}

export interface ActividadRendicionCuentas {
  id: string;
  tipo: string;
  numeroRadicado: string;
  contratista: string;
  monto: number;
  fecha: Date;
  responsable: string;
  descripcion?: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
}

export interface DocumentoRendicionCuentas {
  id: string;
  numeroRadicado: string;
  contratista: string;
  contrato: string;
  monto: number;
  estado: string;
  fechaAsignacion: Date;
  fechaProcesamiento?: Date;
  responsableAsignado?: string;
  tipoDocumento: string;
  centroCosto?: string;
  proyecto?: string;
}

// Interface principal de estadísticas
export interface EstadisticasRendicionCuentas {
  documentos: DocumentosPorEstado;
  montos: MontosPorEstado;
  distribucion: DistribucionEstado[];
  actividadReciente: ActividadRendicionCuentas[];
  pendientes: DocumentoRendicionCuentas[];
  procesados: DocumentoRendicionCuentas[];
  fechaCalculo: Date;
  desde: Date;
  hasta: Date;
}