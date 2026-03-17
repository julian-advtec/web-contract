export type SupervisorEstado = 'PENDIENTE' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';

export interface Supervisor {
  id: string;
  estado: SupervisorEstado;
  observacion?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaAprobacion?: string;
  nombreArchivoSupervisor?: string;
}

export interface Documento {
  id: string;
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: string;
  fechaRadicacion: Date;
  cuentaCobro: string;
  seguridadSocial: string;
  informeActividades: string;
  descripcionCuentaCobro: string;
  descripcionSeguridadSocial: string;
  descripcionInformeActividades: string;
  observacion: string;
  nombreRadicador: string;
  usuarioRadicador: string;
  rutaCarpetaRadicado: string;
  radicador: any;
  tokenPublico: string;
  tokenActivo: boolean;
  tokenExpiraEn: Date;
  contratistaId?: string;
  createdAt: Date;
  updatedAt: Date;
  ultimoAcceso: Date;
  ultimoUsuario: string;
  fechaActualizacion?: Date;
  usuarioAsignadoNombre?: string;
  primerRadicadoDelAno?: boolean;
  esUltimoRadicado?: boolean;
  tipoContrato?: string;
  valorContrato?: number;
  supervisorAsignado?: string;
  fechaAprobacionSupervisor?: Date | string;
  observacionSupervisor?: string;
  requierePazSalvo?: boolean;
  auditorAsignado?: string;
  fechaAsignacionAuditor?: Date;
  estadoAuditor?: string;
  historialEstados?: any[];
  asignacion?: {
    estado?: string;
    supervisorActual?: string;
    enRevision?: boolean;
    auditorActual?: string;
    [key: string]: any;
  };
  [key: string]: any;

  // ────────────────────────────────────────────────────────────────
  // PROPIEDADES AGREGADAS SOLO PARA EL MÓDULO DE AUDITOR
  // ────────────────────────────────────────────────────────────────
  puedeTomar?: boolean;
  enRevision?: boolean;
  esPrimerRadicado?: boolean;           // ← mapeado desde primerRadicadoDelAno
  estadoBadge?: {
    texto: string;
    clase: string;
  };
}

export interface CreateDocumentoDto {
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  descripcionCuentaCobro: string;
  descripcionSeguridadSocial: string;
  descripcionInformeActividades: string;
  observacion?: string;
  primerRadicadoDelAno: boolean;
  esUltimoRadicado?: boolean;
  archivos?: File[];
}

export interface RevisionDocumentoDto {
  estado: SupervisorEstado;
  observacion: string;
  correcciones?: string;
  requierePazSalvo?: boolean;
  esUltimoRadicado?: boolean;
}