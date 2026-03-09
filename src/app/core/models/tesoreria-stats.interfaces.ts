// src/app/modules/tesoreria/interfaces/tesoreria-stats.interfaces.ts
export interface RangoMontos {
  [key: string]: {
    min: number;
    max: number;
    label: string;
  };
}



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