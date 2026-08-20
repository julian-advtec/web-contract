// src/app/core/models/formulario-aprobacion.model.ts
export interface EstadoGrupo {
  label: string;
  completado: boolean;
  documentosSubidos: number;
  totalRequeridos: number;
  combinadoExiste: boolean;
  combinadoId: string | null;
  tipos: string[];
}

export interface FormularioAprobacion {
  id: string;
  contratistaId: string;
  contratistaNombre: string;
  contratistaDocumento: string;
  estado: 'COMPLETADO' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
  completado: boolean;
  totalDocumentos: number;
  fechaCompletado: string;
  createdAt: string;
  estadoGrupos: Record<string, EstadoGrupo>;
  contratista?: {
    tipoContratista?: string;
  };
  representanteLegal?: string;
  documentoRepresentante?: string;
}