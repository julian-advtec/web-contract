// src/app/models/auditor-documento.model.ts
export interface AuditorDocumento {
  id: string;
  documentoId: string;
  auditorId: string;
  estado: 'DISPONIBLE' | 'EN_REVISION' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO' | 'COMPLETADO';
  fechaInicioRevision?: Date;
  fechaFinRevision?: Date;
  fechaAprobacion?: Date;
  observaciones?: string;
  
  // Campos para los archivos del auditor
  rpPath?: string;
  cdpPath?: string;
  polizaPath?: string;
  certificadoBancarioPath?: string;
  minutaPath?: string;
  actaInicioPath?: string;
  
  fechaCreacion: Date;
  fechaActualizacion: Date;
  
  // Relaciones
  documento?: any;
  auditor?: any;
  
  // Método helper
  tieneTodosDocumentos(): boolean;
}

export interface AuditorDocumentoResponse {
  success: boolean;
  message: string;
  data?: any;
  auditor?: AuditorDocumento;
  documento?: any;
}