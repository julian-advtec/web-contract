// src/app/modules/tesoreria/interfaces/tesoreria-stats.interfaces.ts
export interface RangoMontos {
  [key: string]: {
    min: number;
    max: number;
    label: string;
  };
}

export const RANGOS_MONTO: RangoMontos = {
  'menor_1m': { min: 0, max: 1000000, label: 'Menor a 1M' },
  '1m_5m': { min: 1000000, max: 5000000, label: '1M - 5M' },
  '5m_10m': { min: 5000000, max: 10000000, label: '5M - 10M' },
  '10m_50m': { min: 10000000, max: 50000000, label: '10M - 50M' },
  '50m_100m': { min: 50000000, max: 100000000, label: '50M - 100M' },
  'mayor_100m': { min: 100000000, max: Infinity, label: 'Mayor a 100M' },
};

export interface DashboardMetrics {
  indicadores: {
    liquidez: {
      ratioCorriente: number;
      pruebaAcida: number;
      capitalTrabajo: number;
    };
    eficiencia: {
      rotacionCuentasPorPagar: number;
      periodoPromedioPago: number;
      cicloEfectivo: number;
    };
    rentabilidad: {
      margenNeto: number;
      roa: number;
      roe: number;
    };
  };
  alertas: Array<{
    tipo: 'info' | 'warning' | 'danger';
    mensaje: string;
    fecha: Date;
    prioridad: number;
  }>;
  objetivos: {
    actual: number;
    objetivo: number;
    cumplimiento: number;
    tendencia: 'positive' | 'negative' | 'neutral';
  };
}

export interface ReporteCumplimiento {
  periodo: {
    inicio: Date;
    fin: Date;
  };
  cumplimiento: {
    pagosATiempo: number;
    pagosRetrasados: number;
    pagosAnticipados: number;
    tasaCumplimiento: number;
  };
  tiempos: {
    promedioDiasPago: number;
    desviacionEstandar: number;
    modaDias: number;
  };
  costos: {
    interesesPagados: number;
    comisionesBancarias: number;
    costoTotalFinanciero: number;
  };
}

export interface ProyeccionFlujo {
  fecha: Date;
  proyectado: number;
  real: number;
  variacion: number;
  confianza: number;
}