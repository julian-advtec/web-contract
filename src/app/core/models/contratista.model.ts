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