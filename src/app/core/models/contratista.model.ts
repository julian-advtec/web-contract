export interface Contratista {
  id: string;
  tipoDocumento: string;
  documentoIdentidad: string;
  razonSocial: string;
  representanteLegal?: string;
  documentoRepresentante?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  departamento?: string;
  ciudad?: string;
  tipoContratista?: string;
  estado: string;
  numeroContrato?: string;
  cargo?: string;
  observaciones?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  
  // Propiedad de compatibilidad con código antiguo
  nombreCompleto?: string;
  fechaCreacion?: Date | string;
  fechaActualizacion?: Date | string;
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
  tipoDocumento?: string;
  documentoIdentidad: string;
  razonSocial: string;
  representanteLegal?: string;
  documentoRepresentante?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  departamento?: string;
  ciudad?: string;
  tipoContratista?: string;
  estado?: string;
  numeroContrato?: string;
  cargo?: string;
  observaciones?: string;
}

export interface UpdateContratistaDto extends Partial<CreateContratistaDto> {}

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