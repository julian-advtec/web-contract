export interface Contratista {
  id: string;
  tipoDocumento: string;
  documentoIdentidad: string;
  razonSocial?: string;
  nombreCompleto?: string;
  representanteLegal?: string;
  documentoRepresentante?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  departamento?: string;
  ciudad?: string;
  tipoContratista?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  numeroContrato?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface CreateContratistaDto {
  tipoDocumento?: string;
  documentoIdentidad: string;
  razonSocial?: string;
  nombreCompleto?: string;
  representanteLegal?: string;
  documentoRepresentante?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  departamento?: string;
  ciudad?: string;
  tipoContratista?: string;
  numeroContrato?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export interface UpdateContratistaDto {
  razonSocial?: string;
  nombreCompleto?: string;
  representanteLegal?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  tipoContratista?: string;
  numeroContrato?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export interface FiltrosContratistaDto {
  limit?: number;
  offset?: number;
  nombre?: string;
  documento?: string;
  tipoContratista?: string;
  estado?: string;
}

export type TipoDocumento = 'CC' | 'NIT' | 'CE' | 'PASAPORTE' | 'OTRO';

export interface DocumentoContratista {
  id: string;
  tipo: TipoDocumento;
  nombreArchivo: string;
  tamanoBytes: number;
  fechaSubida: Date | string;
  ruta?: string;
}