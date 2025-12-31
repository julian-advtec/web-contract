// src/app/core/models/documento.model.ts
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
}

// DTO para crear documento
export interface CreateDocumentoDto {
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;

  // Descripciones
  descripcionCuentaCobro: string;
  descripcionSeguridadSocial: string;
  descripcionInformeActividades: string;

  // Campo observación
  observacion?: string;

  // Archivos (para formulario)
  archivos?: File[];
}