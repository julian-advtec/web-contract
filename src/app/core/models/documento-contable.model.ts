// src/app/core/models/documento-contable.model.ts

export interface DocumentoContable {
  id: string;
  numeroRadicado: string;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  fechaRadicacion: Date | string;
  radicador: string;
  supervisor: string;
  auditor: string;
  auditorAsignado?: string;
  contadorAsignado?: string;
  contadorRevisor?: string;
  observacion: string;
  disponible: boolean;
  
  // ============================================================
  // ESTADO DEL DOCUMENTO (Tabla principal: Documento)
  // ============================================================
  estado: string; // APROBADO_SUPERVISOR, EN_REVISION_AUDITOR, etc.
  
  // ============================================================
  // ESTADO DE CONTABILIDAD (Tabla: ContabilidadDocumento)
  // ============================================================
  estadoContabilidad?: string; // DISPONIBLE, EN_REVISION, COMPLETADO, OBSERVADO, RECHAZADO, GLOSADO, PROCESADO
  
  // ============================================================
  // INFORMACIÓN DE ASIGNACIÓN
  // ============================================================
  asignacion?: {
    enRevision: boolean;
    puedoTomar: boolean;
    tieneGlosaDefinida: boolean;
    supervisorAsignado: string;
  };
  
  usuarioAsignadoNombre?: string;
  fechaAprobacionSupervisor?: Date | string;

  // ============================================================
  // ARCHIVOS DEL RADICADO
  // ============================================================
  cuentaCobro?: string;
  seguridadSocial?: string;
  informeActividades?: string;
  descripcionCuentaCobro?: string;
  descripcionSeguridadSocial?: string;
  descripcionInformeActividades?: string;

  // ============================================================
  // FECHAS ESPECÍFICAS
  // ============================================================
  fechaAprobacionAuditor?: Date | string;
  fechaAsignacionContabilidad?: Date | string;
  fechaInicioRevisionContabilidad?: Date | string;
  fechaFinRevisionContabilidad?: Date | string;

  // ============================================================
  // CAMPOS DE CONTABILIDAD
  // ============================================================
  tieneGlosa?: boolean;
  tipoCausacion?: string;
  tipoProceso?: string; // 'glosa' | 'causacion'
  observacionesContabilidad?: string;
  glosaPath?: string;
  causacionPath?: string;
  extractoPath?: string;
  comprobanteEgresoPath?: string;

  // ============================================================
  // METADATOS
  // ============================================================
  historialEstados?: any[];
  rutaCarpetaRadicado?: string;
  ultimoAcceso?: Date | string;
  ultimoUsuario?: string;
  
  // ============================================================
  // CAMPOS PARA LA LISTA (frontend)
  // ============================================================
  tipo?: 'disponible' | 'en_revision' | 'procesado';
  esMio?: boolean;
  puedeTomar?: boolean;
  fechaReferencia?: Date | string;
}

// ============================================================
// ENUMS PARA REFERENCIA
// ============================================================

/**
 * Estados del Documento (Tabla principal)
 */
export enum EstadoDocumento {
  // Estados iniciales
  RADICADO = 'RADICADO',
  CON_ACTA = 'CON_ACTA',
  
  // Estados del Auditor
  EN_REVISION_AUDITOR = 'EN_REVISION_AUDITOR',
  APROBADO_AUDITOR = 'APROBADO_AUDITOR',
  OBSERVADO_AUDITOR = 'OBSERVADO_AUDITOR',
  RECHAZADO_AUDITOR = 'RECHAZADO_AUDITOR',
  COMPLETADO_AUDITOR = 'COMPLETADO_AUDITOR',
  
  // Estados del Supervisor
  APROBADO_SUPERVISOR = 'APROBADO_SUPERVISOR',
  OBSERVADO_SUPERVISOR = 'OBSERVADO_SUPERVISOR',
  RECHAZADO_SUPERVISOR = 'RECHAZADO_SUPERVISOR',
  EN_REVISION_SUPERVISOR = 'EN_REVISION_SUPERVISOR',
  FIRMADO_SUPERVISOR = 'FIRMADO_SUPERVISOR',
  
  // Estados de Contabilidad
  EN_REVISION_CONTABILIDAD = 'EN_REVISION_CONTABILIDAD',
  APROBADO_CONTABILIDAD = 'APROBADO_CONTABILIDAD',
  OBSERVADO_CONTABILIDAD = 'OBSERVADO_CONTABILIDAD',
  RECHAZADO_CONTABILIDAD = 'RECHAZADO_CONTABILIDAD',
  COMPLETADO_CONTABILIDAD = 'COMPLETADO_CONTABILIDAD',
  GLOSADO_CONTABILIDAD = 'GLOSADO_CONTABILIDAD',
  PROCESADO_CONTABILIDAD = 'PROCESADO_CONTABILIDAD',
  
  // Estados de Tesorería
  EN_REVISION_TESORERIA = 'EN_REVISION_TESORERIA',
  APROBADO_TESORERIA = 'APROBADO_TESORERIA',
  OBSERVADO_TESORERIA = 'OBSERVADO_TESORERIA',
  RECHAZADO_TESORERIA = 'RECHAZADO_TESORERIA',
  COMPLETADO_TESORERIA = 'COMPLETADO_TESORERIA',
  
  // Estados de Asesor Gerencia
  EN_REVISION_ASESOR_GERENCIA = 'EN_REVISION_ASESOR_GERENCIA',
  APROBADO_ASESOR_GERENCIA = 'APROBADO_ASESOR_GERENCIA',
  OBSERVADO_ASESOR_GERENCIA = 'OBSERVADO_ASESOR_GERENCIA',
  RECHAZADO_ASESOR_GERENCIA = 'RECHAZADO_ASESOR_GERENCIA',
  
  // Estados de Rendición Cuentas
  EN_REVISION_RENDICION_CUENTAS = 'EN_REVISION_RENDICION_CUENTAS',
  APROBADO_RENDICION_CUENTAS = 'APROBADO_RENDICION_CUENTAS',
  OBSERVADO_RENDICION_CUENTAS = 'OBSERVADO_RENDICION_CUENTAS',
  RECHAZADO_RENDICION_CUENTAS = 'RECHAZADO_RENDICION_CUENTAS',
  
  // Estados finales
  COMPLETADO = 'COMPLETADO',
  PAGADO = 'PAGADO',
  FINALIZADO = 'FINALIZADO',
  ANULADO = 'ANULADO'
}

/**
 * Estados de Contabilidad (Tabla contabilidad_documentos)
 */
export enum EstadoContabilidad {
  DISPONIBLE = 'DISPONIBLE',
  EN_REVISION = 'EN_REVISION',
  OBSERVADO = 'OBSERVADO',
  RECHAZADO = 'RECHAZADO',
  GLOSADO = 'GLOSADO',
  COMPLETADO = 'COMPLETADO',
  PROCESADO = 'PROCESADO',
}

/**
 * Tipos de Causación
 */
export enum TipoCausacion {
  NOTA_DEBITO = 'NOTA_DEBITO',
  NOTA_CREDITO = 'NOTA_CREDITO',
  COMPROBANTE_EGRESO = 'COMPROBANTE_EGRESO',
  OTRO = 'OTRO',
}

// ============================================================
// MAPAS PARA TEXTO Y CLASES CSS
// ============================================================

/**
 * Mapa de texto legible para Estados del Documento
 */
export const ESTADO_DOCUMENTO_TEXTO: Record<string, string> = {
  [EstadoDocumento.RADICADO]: 'Radicado',
  [EstadoDocumento.CON_ACTA]: 'Con Acta',
  [EstadoDocumento.EN_REVISION_AUDITOR]: 'En Revisión Auditor',
  [EstadoDocumento.APROBADO_AUDITOR]: 'Aprobado Auditor',
  [EstadoDocumento.OBSERVADO_AUDITOR]: 'Observado Auditor',
  [EstadoDocumento.RECHAZADO_AUDITOR]: 'Rechazado Auditor',
  [EstadoDocumento.COMPLETADO_AUDITOR]: 'Completado Auditor',
  [EstadoDocumento.APROBADO_SUPERVISOR]: 'Aprobado Supervisor',
  [EstadoDocumento.OBSERVADO_SUPERVISOR]: 'Observado Supervisor',
  [EstadoDocumento.RECHAZADO_SUPERVISOR]: 'Rechazado Supervisor',
  [EstadoDocumento.EN_REVISION_SUPERVISOR]: 'En Revisión Supervisor',
  [EstadoDocumento.FIRMADO_SUPERVISOR]: 'Firmado Supervisor',
  [EstadoDocumento.EN_REVISION_CONTABILIDAD]: 'En Revisión Contabilidad',
  [EstadoDocumento.APROBADO_CONTABILIDAD]: 'Aprobado Contabilidad',
  [EstadoDocumento.OBSERVADO_CONTABILIDAD]: 'Observado Contabilidad',
  [EstadoDocumento.RECHAZADO_CONTABILIDAD]: 'Rechazado Contabilidad',
  [EstadoDocumento.COMPLETADO_CONTABILIDAD]: 'Completado Contabilidad',
  [EstadoDocumento.GLOSADO_CONTABILIDAD]: 'Glosado Contabilidad',
  [EstadoDocumento.PROCESADO_CONTABILIDAD]: 'Procesado Contabilidad',
  [EstadoDocumento.EN_REVISION_TESORERIA]: 'En Revisión Tesorería',
  [EstadoDocumento.APROBADO_TESORERIA]: 'Aprobado Tesorería',
  [EstadoDocumento.OBSERVADO_TESORERIA]: 'Observado Tesorería',
  [EstadoDocumento.RECHAZADO_TESORERIA]: 'Rechazado Tesorería',
  [EstadoDocumento.COMPLETADO_TESORERIA]: 'Completado Tesorería',
  [EstadoDocumento.EN_REVISION_ASESOR_GERENCIA]: 'En Revisión Asesor Gerencia',
  [EstadoDocumento.APROBADO_ASESOR_GERENCIA]: 'Aprobado Asesor Gerencia',
  [EstadoDocumento.OBSERVADO_ASESOR_GERENCIA]: 'Observado Asesor Gerencia',
  [EstadoDocumento.RECHAZADO_ASESOR_GERENCIA]: 'Rechazado Asesor Gerencia',
  [EstadoDocumento.EN_REVISION_RENDICION_CUENTAS]: 'En Revisión Rendición Cuentas',
  [EstadoDocumento.APROBADO_RENDICION_CUENTAS]: 'Aprobado Rendición Cuentas',
  [EstadoDocumento.OBSERVADO_RENDICION_CUENTAS]: 'Observado Rendición Cuentas',
  [EstadoDocumento.RECHAZADO_RENDICION_CUENTAS]: 'Rechazado Rendición Cuentas',
  [EstadoDocumento.COMPLETADO]: 'Completado',
  [EstadoDocumento.PAGADO]: 'Pagado',
  [EstadoDocumento.FINALIZADO]: 'Finalizado',
  [EstadoDocumento.ANULADO]: 'Anulado'
};

/**
 * Mapa de texto legible para Estados de Contabilidad
 */
export const ESTADO_CONTABILIDAD_TEXTO: Record<string, string> = {
  [EstadoContabilidad.DISPONIBLE]: 'Disponible',
  [EstadoContabilidad.EN_REVISION]: 'En Revisión',
  [EstadoContabilidad.OBSERVADO]: 'Observado',
  [EstadoContabilidad.RECHAZADO]: 'Rechazado',
  [EstadoContabilidad.GLOSADO]: 'Glosado',
  [EstadoContabilidad.COMPLETADO]: 'Completado',
  [EstadoContabilidad.PROCESADO]: 'Procesado'
};

/**
 * Mapa de clases CSS para Estados del Documento
 */
export const ESTADO_DOCUMENTO_CLASE: Record<string, string> = {
  [EstadoDocumento.RADICADO]: 'estado-radicado',
  [EstadoDocumento.CON_ACTA]: 'estado-con-acta',
  [EstadoDocumento.EN_REVISION_AUDITOR]: 'estado-en-revision-auditor',
  [EstadoDocumento.APROBADO_AUDITOR]: 'estado-aprobado-auditor',
  [EstadoDocumento.OBSERVADO_AUDITOR]: 'estado-observado-auditor',
  [EstadoDocumento.RECHAZADO_AUDITOR]: 'estado-rechazado-auditor',
  [EstadoDocumento.COMPLETADO_AUDITOR]: 'estado-completado-auditor',
  [EstadoDocumento.APROBADO_SUPERVISOR]: 'estado-aprobado-supervisor',
  [EstadoDocumento.OBSERVADO_SUPERVISOR]: 'estado-observado-supervisor',
  [EstadoDocumento.RECHAZADO_SUPERVISOR]: 'estado-rechazado-supervisor',
  [EstadoDocumento.EN_REVISION_SUPERVISOR]: 'estado-en-revision-supervisor',
  [EstadoDocumento.FIRMADO_SUPERVISOR]: 'estado-firmado-supervisor',
  [EstadoDocumento.EN_REVISION_CONTABILIDAD]: 'estado-en-revision-contabilidad',
  [EstadoDocumento.APROBADO_CONTABILIDAD]: 'estado-aprobado-contabilidad',
  [EstadoDocumento.OBSERVADO_CONTABILIDAD]: 'estado-observado-contabilidad',
  [EstadoDocumento.RECHAZADO_CONTABILIDAD]: 'estado-rechazado-contabilidad',
  [EstadoDocumento.COMPLETADO_CONTABILIDAD]: 'estado-completado-contabilidad',
  [EstadoDocumento.GLOSADO_CONTABILIDAD]: 'estado-glosado-contabilidad',
  [EstadoDocumento.PROCESADO_CONTABILIDAD]: 'estado-procesado-contabilidad',
  [EstadoDocumento.COMPLETADO]: 'estado-completado',
  [EstadoDocumento.PAGADO]: 'estado-pagado',
  [EstadoDocumento.FINALIZADO]: 'estado-finalizado',
  [EstadoDocumento.ANULADO]: 'estado-anulado'
};

/**
 * Mapa de clases CSS para Estados de Contabilidad
 */
export const ESTADO_CONTABILIDAD_CLASE: Record<string, string> = {
  [EstadoContabilidad.DISPONIBLE]: 'contabilidad-disponible',
  [EstadoContabilidad.EN_REVISION]: 'contabilidad-en-revision',
  [EstadoContabilidad.OBSERVADO]: 'contabilidad-observado',
  [EstadoContabilidad.RECHAZADO]: 'contabilidad-rechazado',
  [EstadoContabilidad.GLOSADO]: 'contabilidad-glosado',
  [EstadoContabilidad.COMPLETADO]: 'contabilidad-completado',
  [EstadoContabilidad.PROCESADO]: 'contabilidad-procesado'
};

// ============================================================
// FUNCIONES HELPER
// ============================================================

/**
 * Obtiene el texto legible de un estado de documento
 */
export function getEstadoDocumentoTexto(estado: string): string {
  return ESTADO_DOCUMENTO_TEXTO[estado] || estado || 'Desconocido';
}

/**
 * Obtiene la clase CSS de un estado de documento
 */
export function getEstadoDocumentoClase(estado: string): string {
  return ESTADO_DOCUMENTO_CLASE[estado] || 'estado-desconocido';
}

/**
 * Obtiene el texto legible de un estado de contabilidad
 */
export function getEstadoContabilidadTexto(estado: string): string {
  return ESTADO_CONTABILIDAD_TEXTO[estado] || estado || 'Desconocido';
}

/**
 * Obtiene la clase CSS de un estado de contabilidad
 */
export function getEstadoContabilidadClase(estado: string): string {
  return ESTADO_CONTABILIDAD_CLASE[estado] || 'contabilidad-desconocido';
}

/**
 * Verifica si el estado del documento es un estado final
 */
export function esEstadoFinal(estado: string): boolean {
  const estadosFinales = [
    EstadoDocumento.COMPLETADO,
    EstadoDocumento.PAGADO,
    EstadoDocumento.FINALIZADO,
    EstadoDocumento.ANULADO,
    EstadoDocumento.APROBADO_SUPERVISOR,
    EstadoDocumento.APROBADO_AUDITOR,
    EstadoDocumento.APROBADO_CONTABILIDAD,
    EstadoDocumento.APROBADO_TESORERIA,
    EstadoDocumento.APROBADO_ASESOR_GERENCIA,
    EstadoDocumento.APROBADO_RENDICION_CUENTAS
  ];
  return estadosFinales.includes(estado as EstadoDocumento);
}

/**
 * Verifica si el estado de contabilidad es un estado final
 */
export function esEstadoContabilidadFinal(estado: string): boolean {
  const estadosFinales = [
    EstadoContabilidad.COMPLETADO,
    EstadoContabilidad.PROCESADO,
    EstadoContabilidad.OBSERVADO,
    EstadoContabilidad.RECHAZADO
  ];
  return estadosFinales.includes(estado as EstadoContabilidad);
}