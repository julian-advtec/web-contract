export enum PeriodoStats {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre',
  ANO = 'ano'  // Debe ser 'ano' no 'anio'
}

export interface FiltrosEstadisticasSupervisor {
  periodo: PeriodoStats;
}

export interface DistribucionEstadoSupervisor {
  estado: string;
  cantidad: number;
  porcentaje: number;
  color?: string;
}

export interface SupervisorEstadisticas {
  totalDocumentosRadicados: number;
  enRevision: number;
  aprobados: number;
  observados: number;
  rechazados: number;
  tiempoPromedioHoras: number;
  eficiencia: number;
  distribucion: DistribucionEstadoSupervisor[]; // para la barra
  ultimosProcesados: any[]; // para la tabla de últimos
  totales: {
    enRevision: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    total: number;
  };
  fechaConsulta: string;
  desde: string;
  hasta: string;
}