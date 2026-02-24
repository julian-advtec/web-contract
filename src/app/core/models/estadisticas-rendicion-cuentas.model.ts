// src/app/core/models/estadisticas-rendicion-cuentas.model.ts
export interface DocumentosPorEstado {
  pendientes: number;
  enRevision: number;
  aprobados: number;
  observados: number;
  rechazados: number;
  completados: number;
  total: number;
  esperaAprobacionGerencia?: number;
  aprobadoPorGerencia?: number;
}

export interface TiemposRespuesta {
  promedioHoras: number;
  minimoHoras: number;
  maximoHoras: number;
  promedioDias: number;
}

export interface ActividadReciente {
  id: string;
  tipo: 'APROBADO' | 'OBSERVADO' | 'RECHAZADO' | 'INICIADO' | 'ASIGNADO';
  numeroRadicado: string;
  contratista: string;
  fecha: Date;
  responsable: string;
  estado: string;
}

export interface DocumentoItem {
  id: string;
  numeroRadicado: string;
  contratista: string;
  contrato: string;
  estado: string;
  fechaAsignacion: Date;
  fechaDecision?: Date | null;
  responsableAsignado?: string;
  observaciones?: string | null;
}

export interface DistribucionEstado {
  estado: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

export interface Rendimiento {
  tiempoPromedioHoras: number;
  tasaAprobacion: number;
  tasaObservacion: number;
  tasaRechazo: number;
}

export interface MetricasDesempeno {
  documentosProcesados: number;
  tiempoPromedioRespuesta: number;
  tasaAprobacion: number;
  tasaObservacion: number;
  tasaRechazo: number;
  documentosPendientes: number;
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
  resumen: DocumentosPorEstado;
  rendimiento: Rendimiento;
  metricas: MetricasDesempeno;
  distribucion: DistribucionEstado[];
  documentosPendientes: DocumentoItem[];
  documentosProcesados: DocumentoItem[];
  actividadReciente: ActividadReciente[];
  tiempos: TiemposRespuesta;
  misMetricas?: MisMetricas;
  cumplimiento?: any;
  tendencias?: any[];
}

export interface FiltrosStats {
  periodo?: string;
  soloMios?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  tipoDocumento?: string;
}

export enum PeriodoStats {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre'
}