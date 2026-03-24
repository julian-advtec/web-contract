// src/app/core/models/contratista.model.ts
export interface Contratista {
  id: string;
  documentoIdentidad: string;
  numeroContrato?: string;
  nombreCompleto: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  tipoContratista?: string;
  estado?: string;
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
  observaciones?: string;
  [key: string]: any; // Para propiedades adicionales
  createdAt?: Date | string;
}

export interface DocumentoContratista {
  id: string;
  contratistaId: string;
  tipo: TipoDocumento;
  nombreArchivo: string;
  rutaArchivo: string;
  tipoMime: string;
  tamanoBytes: number;
  fechaSubida: Date | string;
  subidoPor: string;
}

export type TipoDocumento = 
  | 'CEDULA'
  | 'CERTIFICADO_BANCARIO'
  | 'CERTIFICADO_EXPERIENCIA'
  | 'CERTIFICADO_NO_PLANTA'
  | 'CERTIFICADO_ANTECEDENTES'
  | 'CERTIFICADO_IDONEIDAD'
  | 'DECLARACION_BIENES'
  | 'DECLARACION_INHABILIDADES'
  | 'EXAMEN_INGRESO'
  | 'GARANTIA'
  | 'HOJA_VIDA_SIGEP'
  | 'LIBRETA_MILITAR'
  | 'PANTALLAZO_SECOP'
  | 'PROPUESTA'
  | 'PUBLICACION_GT'
  | 'REDAM'
  | 'RUT'
  | 'SARLAFT'
  | 'SEGURIDAD_SOCIAL'
  | 'TARJETA_PROFESIONAL';

export interface CreateContratistaDto {
  documentoIdentidad: string;
  nombreCompleto: string;
  numeroContrato?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  tipoContratista?: string;
  estado?: string;
  observaciones?: string;
}

export interface UpdateContratistaDto {
  documentoIdentidad?: string;
  nombreCompleto?: string;
  numeroContrato?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  tipoContratista?: string;
  estado?: string;
  observaciones?: string;
}

export interface FiltrosContratistaDto {
  nombre?: string;
  documento?: string;
  contrato?: string;
  tipoContratista?: string;
  estado?: string;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
  limit?: number;
  offset?: number;
}