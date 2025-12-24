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

// src/app/core/models/documento.model.ts
export interface Documento {
  id: string;
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  estado: string;
  
  // Campos de documentos actualizados
  cuentaCobro: string;
  seguridadSocial: string;
  informeActividades: string;
  
  // Descripciones actualizadas
  descripcionCuentaCobro: string;
  descripcionSeguridadSocial: string;
  descripcionInformeActividades: string;
  
  // Nuevo campo observación
  observacion?: string;
  
  // Información del radicador
  nombreRadicador: string;
  usuarioRadicador: string;
  fechaRadicacion: Date | string;
  rutaCarpetaRadicado: string;
  ultimoAcceso?: Date | string;
  ultimoUsuario?: string;
  
  // Relación con el usuario radicador
  radicador?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  };
  
  // Campos de token público
  tokenPublico?: string;
  tokenActivo?: boolean;
  tokenExpiraEn?: Date | string;

  // ✅ AGREGAR ESTA PROPIEDAD
  contratistaId?: string;

  // ✅ AGREGAR createdAt y updatedAt
  createdAt?: Date | string;
  updatedAt?: Date | string;
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