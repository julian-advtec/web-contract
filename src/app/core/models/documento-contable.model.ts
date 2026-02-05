// src/app/core/models/documento-contable.model.ts
export interface DocumentoContable {
  id: string;
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  estado: string;
  fechaRadicacion: Date | string;
  radicador: string;
  supervisor: string;
  auditor: string;
  auditorAsignado?: string;
  contadorAsignado?: string;
  observacion: string;
  disponible: boolean;
  asignacion?: {
    enRevision: boolean;
    puedoTomar: boolean;
    tieneGlosaDefinida: boolean;
    supervisorAsignado: string;
  };

  // Campos para archivos
  cuentaCobro?: string;
  seguridadSocial?: string;
  informeActividades?: string;
  descripcionCuentaCobro?: string;
  descripcionSeguridadSocial?: string;
  descripcionInformeActividades?: string;

  // Fechas específicas
  fechaAprobacionAuditor?: Date | string;
  fechaAsignacionContabilidad?: Date | string;
  fechaInicioRevisionContabilidad?: Date | string;
  fechaFinRevisionContabilidad?: Date | string;

  // Campos de contabilidad
  tieneGlosa?: boolean;
  tipoCausacion?: string;
  observacionesContabilidad?: string;
  glosaPath?: string;
  causacionPath?: string;
  extractoPath?: string;
  comprobanteEgresoPath?: string;

  // Metadatos
  historialEstados?: any[];
  rutaCarpetaRadicado?: string;
  ultimoAcceso?: Date | string;
  ultimoUsuario?: string;
}

export interface ContabilidadDocumento {
  id: string;
  documentoId: string;
  contadorId: string;
  estado: 'DISPONIBLE' | 'EN_REVISION' | 'GLOSADO' | 'SIN_GLOSA' | 'COMPLETADO' | 'OBSERVADO';
  tieneGlosa?: boolean;
  tipoCausacion?: 'NOTA_DEBITO' | 'NOTA_CREDITO' | 'COMPROBANTE_EGRESO';
  observaciones?: string;
  fechaCreacion: Date | string;
  fechaInicioRevision?: Date | string;
  fechaFinRevision?: Date | string;
  fechaExtracto?: Date | string;
  fechaComprobanteEgreso?: Date | string;
  fechaGlosa?: Date | string;
  fechaCausacion?: Date | string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  documentos?: T[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ArchivoContabilidad {
  tipo: 'glosa' | 'causacion' | 'extracto' | 'comprobanteEgreso';
  descripcion: string;
  subido: boolean;
  nombreArchivo?: string;
  requerido: boolean;
}

export enum EstadoContabilidad {
  DISPONIBLE = 'DISPONIBLE',
  EN_REVISION = 'EN_REVISION',
  EN_PROCESO_CONTABILIDAD = 'EN_PROCESO_CONTABILIDAD',
  GLOSADO = 'GLOSADO',
  GLOSADO_CONTABILIDAD = 'GLOSADO_CONTABILIDAD',
  SIN_GLOSA = 'SIN_GLOSA',
  COMPLETADO = 'COMPLETADO',
  COMPLETADO_CONTABILIDAD = 'COMPLETADO_CONTABILIDAD',
  OBSERVADO = 'OBSERVADO',
  OBSERVADO_CONTABILIDAD = 'OBSERVADO_CONTABILIDAD',
  PROCESADO_CONTABILIDAD = 'PROCESADO_CONTABILIDAD'
}

export enum TipoCausacion {
  NOTA_DEBITO = 'NOTA_DEBITO',
  NOTA_CREDITO = 'NOTA_CREDITO',
  COMPROBANTE_EGRESO = 'COMPROBANTE_EGRESO'
}