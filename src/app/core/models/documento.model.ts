// En models/documento.model.ts
export interface Documento {
  id: string;
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: string;
  nombreDocumento1: string;
  nombreDocumento2: string;
  nombreDocumento3: string;
  descripcionDoc1: string;
  descripcionDoc2: string;
  descripcionDoc3: string;
  nombreRadicador: string;
  usuarioRadicador: string;
  fechaRadicacion: Date;
  rutaCarpetaRadicado: string;
  ultimoAcceso?: Date;
  ultimoUsuario?: string;
  radicador?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  };
}

export interface CreateDocumentoDto {
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date;
  fechaFin: Date;
  descripcionDoc1?: string;
  descripcionDoc2?: string;
  descripcionDoc3?: string;
}