export interface Documento {
  id: string;
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: string;
  
  // ✅ Campos de documentos actualizados
  cuentaCobro: string;
  seguridadSocial: string;
  informeActividades: string;
  
  // ✅ Descripciones actualizadas
  descripcionCuentaCobro: string;
  descripcionSeguridadSocial: string;
  descripcionInformeActividades: string;
  
  // ✅ Nuevo campo observación
  observacion?: string;
  
  // Información del radicador
  nombreRadicador: string;
  usuarioRadicador: string;
  fechaRadicacion: Date;
  rutaCarpetaRadicado: string;
  ultimoAcceso?: Date;
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
  tokenExpiraEn?: Date;

  // Si necesitas acceso dinámico a los campos de documentos
  [key: string]: any;
}

export interface CreateDocumentoDto {
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  // ✅ Acepta Date | string para flexibilidad
  fechaInicio: Date | string;
  fechaFin: Date | string;
  
  // ✅ NUEVOS CAMPOS
  descripcionCuentaCobro?: string;
  descripcionSeguridadSocial?: string;
  descripcionInformeActividades?: string;
  observacion?: string;
}