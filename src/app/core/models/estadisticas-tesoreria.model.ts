export interface DocumentosPorEstado {
    pendientes: number;
    pagados: number;
    observados: number;
    rechazados: number;
    total: number;
}

export interface MontosPorEstado {
    pendiente: number;
    pagado: number;
    observado: number;
    rechazado: number;
    total: number;
}

export interface DistribucionItem {
    estado: string;
    cantidad: number;
    monto: number;
    porcentaje: number;
    color: string;
}

export interface ActividadItem {
    id: string;
    tipo: 'PAGADO' | 'OBSERVADO' | 'RECHAZADO';
    numeroRadicado: string;
    contratista: string;
    monto: number;
    fecha: Date;
    tesorero: string;
    // El backend NO envía estos campos
    // tieneComprobante: boolean;
    // tieneFirma: boolean;
}

export interface DocumentoItem {
    id: string;
    numeroRadicado: string;
    contratista: string;
    contrato: string;
    monto: number;
    estado: 'PENDIENTE' | 'PAGADO' | 'OBSERVADO' | 'RECHAZADO';
    fechaAsignacion: Date;
    fechaProcesamiento?: Date;
    tesoreroAsignado?: string;
    tesoreroProceso?: string;
    tieneComprobante: boolean;
    tieneFirma: boolean;
}

export interface MisMetricas {
    procesadosHoy: number;
    montoHoy: number;
    pendientesAsignados: number;
}

export interface EstadisticasTesoreria {
    documentos: DocumentosPorEstado;
    montos: MontosPorEstado;
    distribucion: DistribucionItem[];      // ANTES: distribucionEstados
    actividadReciente: ActividadItem[];     // ANTES: actividadReciente (igual)
    pendientes: DocumentoItem[];            // ANTES: NO existía
    procesados: DocumentoItem[];             // ANTES: NO existía
    misMetricas?: MisMetricas;               // ANTES: misEstadisticas
    fechaCalculo: Date;
    desde: Date;                             // ANTES: NO existía
    hasta: Date;                             // ANTES: NO existía
}

export enum PeriodoStats {
    HOY = 'hoy',
    SEMANA = 'semana',
    MES = 'mes',
    TRIMESTRE = 'trimestre'
}

export interface FiltrosStats {
    periodo: PeriodoStats;
    soloMios?: boolean;
    fechaInicio?: Date;
    fechaFin?: Date;
}