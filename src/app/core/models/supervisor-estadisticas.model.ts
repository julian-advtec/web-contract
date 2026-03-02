export interface SupervisorEstadisticas {
  totalDocumentosRadicados: number;
  enRevision: number;
  aprobados: number;
  observados: number;
  rechazados: number;
  recientes: number;
  tiempoPromedioHoras: number;
  eficiencia: number;
  totales: {
    enRevision: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    total: number;
  };
  fechaConsulta: string;
}

export interface SupervisorHistorialItem {
  id: string;
  documento: {
    id: string;
    numeroRadicado: string;
    nombreContratista: string;
    documentoContratista: string;
    numeroContrato: string;
    fechaInicio: string;
    fechaFin: string;
    fechaRadicacion: string;
    estado: string;
    cuentaCobro: string;
    seguridadSocial: string;
    informeActividades: string;
    observacion: string;
    nombreRadicador: string;
  };
  supervisorRevisor: string;
  estado: string;
  observacion: string;
  correcciones: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaAprobacion: string | null;
  tieneArchivo: boolean;
  nombreArchivoSupervisor: string | null;
  tienePazSalvo: boolean;
  pazSalvo: string | null;
}

export interface SupervisorInconsistencias {
  totalDocumentos: number;
  totalConPazSalvo: number;
  inconsistenciasEncontradas: number;
  detalles: Array<{
    documento_id: string;
    numero_radicado: string;
    es_ultimo_radicado: boolean;
    paz_salvo: string;
    estado_supervision: string;
  }>;
  fechaVerificacion: string;
}