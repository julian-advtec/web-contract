// src/auditor/models/auditor-estadisticas.model.ts
export enum PeriodoStats {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre',
  ANO = 'ano'
}

export interface FiltrosEstadisticasAuditor {
  periodo: PeriodoStats;
}

export interface DistribucionEstadoAuditor {
  estado: string;
  cantidad: number;
  porcentaje: number;
  color?: string;
}

export interface DocumentoAuditorResumen {
  id: string;
  numeroRadicado: string;
  nombreContratista: string;
  documentoContratista: string;
  numeroContrato: string;
  fechaRadicacion: Date;
  fechaRevision: Date;
  estado: string;
  estadoAuditor: string;
  observaciones?: string;
  primerRadicadoDelAno: boolean;
}

export interface EstadisticasAuditor {
  // Totales generales
  totalDocumentosDisponibles: number;
  
  // Mis documentos
  misDocumentos: {
    enRevision: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    completados: number;
    primerRadicados: number;
    total: number;
  };
  
  // Rechazados desglosados
  rechazados: {
    total: number;
    rechazadosAuditor: number;
    rechazadosOtrasAreas: number;
    porPeriodo: number;
  };
  
  // Métricas
  tiempoPromedioHoras: number;
  eficiencia: number;
  recientes: number;
  
  // Distribución para gráficos
  distribucion: DistribucionEstadoAuditor[];
  
  // Últimos procesados
  ultimosProcesados: DocumentoAuditorResumen[];
  
  // Fechas de consulta
  fechaConsulta: string;
  desde: string;
  hasta: string;
  
  // Diagnóstico
  diagnostico?: {
    periodoSolicitado: string;
    fechaDesde: string;
    fechaHasta: string;
  };
}

export interface AuditorRechazadoResponse {
  id: string;
  documento: {
    id: string;
    numeroRadicado: string;
    nombreContratista: string;
    documentoContratista: string;
    numeroContrato: string;
    fechaRadicacion: Date;
    fechaInicio: Date;
    fechaFin: Date;
    estado: string;
    cuentaCobro: string;
    seguridadSocial: string;
    informeActividades: string;
    comentarios?: string;          // 👈 AÑADIR
    primerRadicadoDelAno: boolean; // 👈 AÑADIR
  };
  auditorRevisor: string;
  estado: string;
  observaciones: string;
  correcciones: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaRechazo: Date;
  tieneArchivos: boolean;
  archivos: {
    rp: boolean;
    cdp: boolean;
    poliza: boolean;
    certificadoBancario: boolean;
    minuta: boolean;
    actaInicio: boolean;
  };
}