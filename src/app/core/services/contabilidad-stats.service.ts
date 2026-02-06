// src/app/modules/contabilidad/services/contabilidad-stats.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ContabilidadEstado {
  EN_REVISION: 'EN_REVISION';
  GLOSADO_CONTABILIDAD: 'GLOSADO_CONTABILIDAD';
  PROCESADO_CONTABILIDAD: 'PROCESADO_CONTABILIDAD';
  COMPLETADO_CONTABILIDAD: 'COMPLETADO_CONTABILIDAD';
  OBSERVADO_CONTABILIDAD: 'OBSERVADO_CONTABILIDAD';
  RECHAZADO_CONTABILIDAD: 'RECHAZADO_CONTABILIDAD';
}

export interface TipoCausacion {
  NOTA_DEBITO: 'NOTA_DEBITO';
  NOTA_CREDITO: 'NOTA_CREDITO';
  COMPROBANTE_EGRESO: 'COMPROBANTE_EGRESO';
}

export interface FiltrosEstadisticas {
  fechaInicio?: Date;
  fechaFin?: Date;
  contadorId?: string;
  estado?: string;
  tipoCausacion?: string;
  tieneGlosa?: boolean;
}

export interface EstadisticasContabilidad {
  resumen: {
    totalDocumentos: number;
    documentosEnRevision: number;
    documentosCompletados: number;
    documentosObservados: number;
    documentosRechazados: number;
    documentosGlosados: number;
  };
  distribucionEstados: Array<{
    estado: string;
    cantidad: number;
    porcentaje: number;
  }>;
  tipoCausacion: Array<{
    tipo: string;
    cantidad: number;
    porcentaje: number;
  }>;
  glosas: {
    conGlosa: number;
    sinGlosa: number;
    porcentajeConGlosa: number;
    totalGlosado: number;
  };
  tiempos: {
    promedioRevision: number;
    maximoRevision: number;
    minimoRevision: number;
  };
  tendenciaMensual: Array<{
    mes: string;
    nombreMes: string;
    completados: number;
    observados: number;
    rechazados: number;
    glosados: number;
    total: number;
  }>;
  topContadores?: Array<{
    contadorId: string;
    contadorNombre: string;
    documentosProcesados: number;
    eficiencia: number;
    promedioTiempo: number;
  }>;
  documentosRecientes: Array<{
    id: string;
    numeroRadicado: string;
    nombreContratista: string;
    estado: string;
    fechaInicioRevision: Date;
    fechaFinRevision: Date;
    tieneGlosa: boolean;
    tipoCausacion: string;
    tiempoRevision: number;
  }>;
}

export interface EstadisticasContador {
  contador: {
    id: string;
    nombre: string;
    username: string;
    email: string;
  };
  resumen: {
    totalDocumentos: number;
    completados: number;
    observados: number;
    rechazados: number;
    glosados: number;
    enRevision: number;
  };
  tiempos: {
    promedioRevision: number;
    maximoRevision: number;
    minimoRevision: number;
  };
  eficiencia: {
    documentosPorDia: number;
    documentosPorSemana: number;
    documentosPorMes: number;
  };
  distribucionDias: Array<{
    dia: string;
    cantidad: number;
  }>;
  documentosRecientes: Array<{
    numeroRadicado: string;
    estado: string;
    fechaFinRevision: Date;
    tiempoRevision: number;
  }>;
}

export interface MetricasTiempo {
  promedio: number;
  tendencia: Array<{
    fecha: string;
    dia: string;
    promedio: number;
    cantidad: number;
  }>;
  mejoresTiempos: Array<{
    numeroRadicado: string;
    tiempo: number;
    fecha: Date;
  }>;
  peoresTiempos: Array<{
    numeroRadicado: string;
    tiempo: number;
    fecha: Date;
  }>;
}

export interface DocumentoPorEstado {
  id: string;
  numeroRadicado: string;
  nombreContratista: string;
  fechaInicioRevision: Date;
  fechaFinRevision: Date;
  tieneGlosa: boolean;
  tipoCausacion: string;
  observaciones: string;
  contador: string;
  tiempoRevision: number;
}

export interface ResumenRapido {
  totalDocumentos: number;
  completados: number;
  enRevision: number;
  tasaCompletitud: number;
  tiempoPromedio: number;
  conGlosa: number;
  documentosRecientes: Array<any>;
}

@Injectable({
  providedIn: 'root'
})
export class ContabilidadStatsService {
  private apiUrl = `${environment.apiUrl}/contabilidad/estadisticas`;

  constructor(private http: HttpClient) {}

  // Obtener estadísticas generales
  getEstadisticasGenerales(filtros?: FiltrosEstadisticas): Observable<{ success: boolean; data: EstadisticasContabilidad }> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.fechaInicio) {
        params = params.set('fechaInicio', filtros.fechaInicio.toISOString());
      }
      if (filtros.fechaFin) {
        params = params.set('fechaFin', filtros.fechaFin.toISOString());
      }
      if (filtros.contadorId) {
        params = params.set('contadorId', filtros.contadorId);
      }
      if (filtros.estado) {
        params = params.set('estado', filtros.estado);
      }
      if (filtros.tipoCausacion) {
        params = params.set('tipoCausacion', filtros.tipoCausacion);
      }
      if (filtros.tieneGlosa !== undefined) {
        params = params.set('tieneGlosa', filtros.tieneGlosa.toString());
      }
    }

    return this.http.get<{ success: boolean; data: EstadisticasContabilidad }>(
      `${this.apiUrl}/generales`,
      { params }
    );
  }

  // Obtener estadísticas por contador
  getEstadisticasPorContador(contadorId: string, fechaInicio?: Date, fechaFin?: Date): Observable<{ success: boolean; data: EstadisticasContador }> {
    let params = new HttpParams();
    
    if (fechaInicio) {
      params = params.set('fechaInicio', fechaInicio.toISOString());
    }
    if (fechaFin) {
      params = params.set('fechaFin', fechaFin.toISOString());
    }

    return this.http.get<{ success: boolean; data: EstadisticasContador }>(
      `${this.apiUrl}/contador/${contadorId}`,
      { params }
    );
  }

  // Obtener mis estadísticas
  getMiEstadistica(): Observable<{ success: boolean; data: EstadisticasContador }> {
    return this.http.get<{ success: boolean; data: EstadisticasContador }>(
      `${this.apiUrl}/mi-estadistica`
    );
  }

  // Obtener documentos por estado
  getDocumentosPorEstado(estado: string): Observable<{ success: boolean; count: number; data: DocumentoPorEstado[] }> {
    return this.http.get<{ success: boolean; count: number; data: DocumentoPorEstado[] }>(
      `${this.apiUrl}/estado/${estado}`
    );
  }

  // Obtener métricas de tiempo
  getMetricasTiempo(): Observable<{ success: boolean; data: MetricasTiempo }> {
    return this.http.get<{ success: boolean; data: MetricasTiempo }>(
      `${this.apiUrl}/metricas-tiempo`
    );
  }

  // Obtener resumen rápido
  getResumenRapido(): Observable<{ success: boolean; data: ResumenRapido }> {
    return this.http.get<{ success: boolean; data: ResumenRapido }>(
      `${this.apiUrl}/resumen-rapido`
    );
  }
}