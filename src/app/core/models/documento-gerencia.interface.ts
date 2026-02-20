// src/app/modules/asesor-gerencia/models/documento-gerencia.interface.ts

export interface DocumentoGerencia {
  id: string;
  numeroRadicado: string;
  primerRadicadoDelAno?: boolean;
  esUltimoRadicado?: boolean;
  numeroContrato: string;
  nombreContratista: string;
  documentoContratista: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  estado: string;                    // Ej: COMPLETADO_TESORERIA, EN_REVISION_ASESOR_GERENCIA, etc.
  cuentaCobro?: string;
  seguridadSocial?: string;
  informeActividades?: string;
  descripcionCuentaCobro?: string;
  descripcionSeguridadSocial?: string;
  descripcionInformeActividades?: string;
  observacion?: string;
  observaciones?: string;            // Observaciones acumuladas
  observacionesGerencia?: string;    // Observaciones específicas de gerencia
  radicador?: {
    id: string;
    nombre: string;
    usuario: string;
  };
  usuarioAsignado?: {
    id: string;
    nombre: string;
  } | null;
  asesorAsignado?: string;           // Nombre del asesor actual
  tesoreroAsignado?: string;         // Nombre del tesorero anterior
  fechaRadicacion: Date | string;
  fechaActualizacion?: Date | string;
  fechaAsignacion?: Date | string;
  fechaFinRevision?: Date | string;
  rutaCarpetaRadicado: string;
  pagoRealizadoPath?: string;        // Ruta del comprobante subido por tesorería
  aprobacionPath?: string;           // Ruta del documento aprobado/firmado por gerencia (si aplica)
  firmaTesoreriaAplicada?: boolean;
  firmaGerenciaAplicada?: boolean;
  firmaPosicion?: {
    x: number;
    y: number;
    page: number;
    width: number;
    height: number;
  } | null;
  disponible?: boolean;
  tipo?: 'disponible' | 'en_revision_mio' | 'procesado';
  estadoGerencia?: string;
  motivoRechazo?: string;
  historialEstados?: Array<{
    fecha: Date | string;
    estado: string;
    usuarioId: string;
    usuarioNombre: string;
    rolUsuario: string;
    observacion?: string;
  }>;
  [key: string]: any;                // Para campos dinámicos o futuros
}

// Tipo para la respuesta de endpoints que devuelven { success: boolean, data: [...] }
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Tipo para el payload de finalizar revisión
export interface FinalizarRevisionPayload {
  estadoFinal: 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';
  observaciones: string;
  signatureId?: string;
  signaturePosition?: {
    x: number;
    y: number;
    page: number;
    width: number;
    height: number;
  } | null;
}