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

  // ✅ AGREGAR estas propiedades
  usuarioAsignadoNombre?: string;
  fechaAprobacionSupervisor?: Date | string;

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