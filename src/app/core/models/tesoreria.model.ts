// src/app/core/models/tesoreria.model.ts
// (nuevo archivo recomendado)

export enum EstadoTesoreria {
  DISPONIBLE              = 'DISPONIBLE',
  EN_REVISION_TESORERIA   = 'EN_REVISION_TESORERIA',
  EN_PROCESO_TESORERIA    = 'EN_PROCESO_TESORERIA',
  OBSERVADO_TESORERIA     = 'OBSERVADO_TESORERIA',
  COMPLETADO_TESORERIA    = 'COMPLETADO_TESORERIA',
  RECHAZADO_TESORERIA     = 'RECHAZADO_TESORERIA',
}

export interface TesoreriaProceso {
  // Identificador único del proceso de tesorería
  id: string;                           // uuid del TesoreriaDocumento en backend

  // Referencia al documento principal
  documentoId: string;
  numeroRadicado: string;
  nombreContratista: string;
  numeroContrato: string;
  documentoContratista: string;
  fechaRadicacion: string | Date;

  // Información resumida del contrato (lo más usado en UI)
  fechaInicioContrato?: string | Date;
  fechaFinContrato?: string | Date;

  // Estado y asignación específica de tesorería
  estado: EstadoTesoreria;
  tesoreroAsignado?: string;                // nombre completo o username
  tesoreroId?: string;                      // uuid del usuario tesorero

  // Fechas clave del proceso de tesorería
  fechaAsignacion?: string | Date;          // cuando se asignó el proceso a un tesorero
  fechaInicioRevision?: string | Date;
  fechaFinRevision?: string | Date;
  fechaObservado?: string | Date;
  fechaCompletado?: string | Date;

  // Archivos propios de tesorería
  pagoRealizadoPath?: string;               // comprobante de pago
  observaciones?: string;

  // Flags útiles para la UI
  disponible: boolean;
  enMiRevision: boolean;                    // si está asignado al usuario actual
  puedeTomar: boolean;
  tieneComprobantePago: boolean;

  // Datos del documento principal que casi siempre se necesitan mostrar
  contadorAsignado?: string;
  fechaCompletadoContabilidad?: string | Date;

  // Opcional: para cálculos rápidos en frontend
  diasPendientes?: number;                  // calculado
}

// Tipo para respuestas de API de tesorería
export interface TesoreriaApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  procesos?: TesoreriaProceso[];
  total?: number;
}