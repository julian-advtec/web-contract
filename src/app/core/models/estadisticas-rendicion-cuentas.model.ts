// src/app/core/models/estadisticas-rendicion-cuentas.model.ts
export enum PeriodoStats {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre'
}

export interface FiltrosStats {
  periodo: PeriodoStats;
  soloMios: boolean;
}

export interface ResumenRendicion {
  pendientes: number;
  enRevision: number;
  aprobados: number;
  observados: number;
  rechazados: number;
  completados: number;
  esperaAprobacionGerencia: number;
  aprobadoPorGerencia: number;
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
  estado: string;
  fechaAsignacion: Date;
  fechaDecision?: Date;
  responsableAsignado?: string;
  observaciones?: string;
}

export interface ActividadItem {
  id: string;
  tipo: string;
  numeroRadicado: string;
  contratista: string;
  fecha: Date;
  responsable: string;
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
  desde: Date;
  hasta: Date;
  fechaCalculo: Date;
  resumen: ResumenRendicion;
  rendimiento: Rendimiento;
  metricas: Metricas;
  distribucion: DistribucionItem[];
  documentosPendientes: DocumentoItem[];
  documentosProcesados: DocumentoItem[];
  actividadReciente: ActividadItem[];
  tiempos: Tiempos;
  misMetricas?: MisMetricas;
}