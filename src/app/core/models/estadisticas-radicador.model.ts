// src/app/core/models/estadisticas-radicador.model.ts
export enum PeriodoStats {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre',
  ANO = 'ano'
}

export interface FiltrosEstadisticasRadicador {
  periodo: PeriodoStats;
}

export interface DocumentosPorEstadoRadicador {
  totalRadicados: number;
}

export interface DistribucionEstadoRadicador {
  estado: string;
  cantidad: number;
  porcentaje: number;
  color?: string;
}

export interface DocumentoRadicado {
  id: string;
  numeroRadicado: string;
  contratista: string;
  fechaRadicacion: Date | string;
  estado: string;
}

export interface EstadisticasRadicador {
  documentos: DocumentosPorEstadoRadicador;
  distribucion: DistribucionEstadoRadicador[];
  ultimosRadicados: DocumentoRadicado[];
  fechaCalculo: string;
  desde: string;
  hasta: string;
}