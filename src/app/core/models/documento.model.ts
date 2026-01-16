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
  
  // ✅ CAMPOS AÑADIDOS
  fechaActualizacion?: Date;
  usuarioAsignadoNombre?: string;
  primerRadicadoDelAno?: boolean;
  
  // ✅ NUEVOS CAMPOS
  esUltimoRadicado?: boolean; // ✅ NUEVO: Campo para identificar si es el último radicado del contratista
  tipoContrato?: string;
  valorContrato?: number;
  
  // Campos específicos para supervisor
  disponible?: boolean;
  asignacion?: {
    id?: string;
    estado?: string;
    fechaInicioRevision?: Date;
    supervisor?: {
      id: string;
      nombre: string;
      username: string;
    };
    enRevision?: boolean;
    puedoTomar?: boolean;
    usuarioAsignado?: string;
    supervisorActual?: string;
  };

  // ✅ NUEVOS CAMPOS PARA PAZ Y SALVO Y SUPERVISOR
  supervisorAsignado?: string;
  fechaAsignacion?: Date;
  supervisorEstado?: string;
  requierePazSalvo?: boolean;
  pazSalvo?: string;
  fechaPazSalvo?: Date; // ✅ NUEVO: Fecha de emisión del paz y salvo
}

// DTO para crear documento
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
    esUltimoRadicado?: boolean; // ✅ NUEVO: Indicador si es el último radicado
    archivos?: File[];
}

// DTO para revisión del supervisor
export interface RevisionDocumentoDto {
  estado: SupervisorEstado;
  observacion: string;
  correcciones?: string;
  requierePazSalvo?: boolean;
  esUltimoRadicado?: boolean; // ✅ NUEVO: Confirmación del supervisor
}