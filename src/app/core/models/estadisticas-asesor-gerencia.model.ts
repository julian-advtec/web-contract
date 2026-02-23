// src/app/core/models/estadisticas-asesor-gerencia.model.ts
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

export interface DocumentosPorEstado {
  pendientes: number;
  aprobados: number;
  observados: number;
  rechazados: number;
  total: number;
}

export interface MontosPorEstado {
  pendiente: number;
  aprobado: number;
  observado: number;
  rechazado: number;
  total: number;
}

export interface ActividadAsesorGerencia {
  id: string;
  tipo: string;
  numeroRadicado: string;
  contratista: string;
  monto: number;
  fecha: Date;
  asesor: string;
}

export interface DocumentoAsesorGerencia {
  id: string;
  numeroRadicado: string;
  contratista: string;
  contrato: string;
  monto: number;
  estado: string;
  fechaAsignacion: Date;
  fechaProcesamiento?: Date;
  asesorAsignado?: string;
}

export interface EstadisticasAsesorGerencia {
  documentos: DocumentosPorEstado;
  montos: MontosPorEstado;
  distribucion: Array<{
    estado: string;
    cantidad: number;
    monto: number;
    color: string;
  }>;
  actividadReciente: ActividadAsesorGerencia[];
  pendientes: DocumentoAsesorGerencia[];
  procesados: DocumentoAsesorGerencia[];
  fechaCalculo: Date;
  desde: Date;
  hasta: Date;
}