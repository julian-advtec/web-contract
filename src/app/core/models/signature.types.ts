// core/models/signature.types.ts
export interface Signature {
  id: string;
  userId: string;
  name?: string;
  filename?: string;
  originalName?: string;
  path?: string;
  type?: string;
  size?: number;
  mimeType?: string;
  fileSize?: number;
  tamanoBytes?: number;
  nombreArchivo?: string;
  rutaArchivo?: string;
  tipoMime?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  fechaSubida?: Date | string;
}

export interface CreateSignatureDto {
  name: string;
  file: File;
}

export interface UpdateSignatureDto {
  name?: string;
  isActive?: boolean;
}