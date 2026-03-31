// core/models/contratista.model.ts
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
  userId?: string;  // 👈 Relación con usuario
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
  userId?: string;  // 👈 Para asociar con usuario
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
  departamento?: string;
  ciudad?: string;
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
  contratistaId?: string;
  tipoMime?: string;
  subidoPor?: string;
}