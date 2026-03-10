// src/app/core/models/estadisticas-rendicion-cuentas.model.ts
export type RendicionCuentasEstado =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'APROBADO'
  | 'OBSERVADO'
  | 'RECHAZADO'
  | 'COMPLETADO'
  | 'ESPERA_APROBACION_GERENCIA'
  | 'APROBADO_POR_GERENCIA';

export enum PeriodoStats {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre'
}

export interface FiltrosStats {
  periodo: PeriodoStats;
  soloMios?: boolean;
}

export interface ResumenRendicion {
  pendientes: number;
  enRevision: number;
  aprobados: number;
  observados: number;
  rechazados: number;
  completados: number;
  esperaAprobacionGerencia: number;     // ← importante
  aprobadoPorGerencia: number;          // ← importante
  total: number;
}

export interface Rendimiento {
  tiempoPromedioHoras: number;
  tasaAprobacion: number;
  tasaObservacion: number;
  tasaRechazo: number;
}

export interface Metricas {
  documentosProcesados: number;
  tiempoPromedioRespuesta: number;
  tasaAprobacion: number;
  tasaObservacion: number;
  tasaRechazo: number;
  documentosPendientes: number;
}

export interface DistribucionItem {
  estado: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

export interface DocumentoItem {
  id: string;
  numeroRadicado: string;
  contratista: string;
  contrato: string;
  estado: RendicionCuentasEstado | string;
  fechaAsignacion: Date | string;
  fechaDecision?: Date | string | null;
  responsableAsignado?: string;
  observaciones?: string | null;
}

export interface ActividadItem {
  id: string;
  tipo: string;
  numeroRadicado: string;
  contratista: string;
  fecha: Date | string;
  responsable: string;
  // estado?: RendicionCuentasEstado;   // opcional
}

export interface Tiempos {
  promedioHoras: number;
  minimoHoras: number;
  maximoHoras: number;
  promedioDias: number;
}

export interface MisMetricas {
  pendientes: number;
  procesadosHoy: number;
  procesadosSemana: number;
  promedioRespuesta: number;
}

export interface EstadisticasRendicionCuentas {
  desde:          Date | string | null;
  hasta:          Date | string | null;
  fechaCalculo:   Date | string | null;
  resumen:        ResumenRendicion;
  rendimiento:    Rendimiento;
  metricas:       Metricas;
  distribucion:   DistribucionItem[];
  documentosPendientes: DocumentoItem[];
  documentosProcesados: DocumentoItem[];
  actividadReciente: ActividadItem[];
  tiempos:        Tiempos;
  cumplimiento?:  any;
  tendencias?:    any[];
  misMetricas?:   MisMetricas;
}