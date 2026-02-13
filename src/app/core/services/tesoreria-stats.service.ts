// src/app/modules/tesoreria/services/tesoreria-stats.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TesoreriaEstado {
  PENDIENTE: 'PENDIENTE';
  EN_PROCESO: 'EN_PROCESO';
  PAGADO: 'PAGADO';
  ANULADO: 'ANULADO';
}

export interface MetodoPago {
  TRANSFERENCIA: 'TRANSFERENCIA';
  CHEQUE: 'CHEQUE';
  EFECTIVO: 'EFECTIVO';
  TARJETA_CREDITO: 'TARJETA_CREDITO';
  TARJETA_DEBITO: 'TARJETA_DEBITO';
}

export interface FiltrosEstadisticasTesoreria {
  fechaInicio?: Date;
  fechaFin?: Date;
  responsableId?: string;
  estadoPago?: string;
  metodoPago?: string;
  montoMin?: number;
  montoMax?: number;
}

export interface EstadisticasTesoreria {
  resumen: {
    totalPagos: number;
    pagados: number;
    enProceso: number;
    anulados: number;
    pendientes: number;
    montoTotal: number;
    montoPagado: number;
    montoEnProceso: number;
    montoAnulado: number;
    montoPendiente: number;
  };
  distribucionEstados: Array<{
    estado: string;
    cantidad: number;
    porcentaje: number;
    montoTotal: number;
  }>;
  metodosPago: Array<{
    metodo: string;
    cantidad: number;
    porcentaje: number;
    monto: number;
  }>;
  pagosPorMonto: Array<{
    rango: string;
    cantidad: number;
    porcentaje: number;
    montoTotal: number;
    promedio: number;
  }>;
  tiempos: {
    promedioProceso: number;
    maximoProceso: number;
    minimoProceso: number;
  };
  tendenciasMensuales: Array<{
    mes: string;
    nombreMes: string;
    totalPagos: number;
    pagados: number;
    enProceso: number;
    anulados: number;
    montoTotal: number;
    montoPagado: number;
    tasaExito: number;
  }>;
  topResponsables?: Array<{
    responsableId: string;
    responsableNombre: string;
    pagosProcesados: number;
    montoTotal: number;
    eficiencia: number;
    promedioTiempo: number;
  }>;
  pagosRecientes: Array<{
    id: string;
    numeroPago: string;
    numeroRadicado: string;
    nombreContratista: string;
    estadoPago: string;
    metodoPago: string;
    fechaInicioProceso: Date;
    fechaPago: Date;
    valor: number;
    tiempoProceso: number;
    responsable: string;
  }>;
}

export interface EstadisticasResponsable {
  responsable: {
    id: string;
    nombre: string;
    username: string;
    email: string;
  };
  resumen: {
    totalPagos: number;
    pagados: number;
    anulados: number;
    enProceso: number;
    pendientes: number;
  };
  montoTotalProcesado: number;
  tiempos: {
    promedioProceso: number;
    maximoProceso: number;
    minimoProceso: number;
  };
  eficiencia: {
    pagosPorDia: number;
    pagosPorSemana: number;
    pagosPorMes: number;
  };
  distribucionDias: Array<{
    dia: string;
    cantidad: number;
  }>;
  pagosRecientes: Array<{
    numeroPago: string;
    estadoPago: string;
    fechaPago: Date;
    valor: number;
    tiempoProceso: number;
  }>;
}

export interface MetricasTiempoTesoreria {
  promedio: number;
  tendencia: Array<{
    fecha: string;
    dia: string;
    promedio: number;
    cantidad: number;
  }>;
  mejoresTiempos: Array<{
    numeroPago: string;
    tiempo: number;
    fecha: Date;
  }>;
  peoresTiempos: Array<{
    numeroPago: string;
    tiempo: number;
    fecha: Date;
  }>;
}

export interface PagoPorEstado {
  id: string;
  numeroPago: string;
  numeroRadicado: string;
  nombreContratista: string;
  fechaInicioProceso: Date;
  fechaPago: Date;
  estadoPago: string;
  metodoPago: string;
  valor: number;
  observaciones: string;
  responsable: string;
  tiempoProceso: number;
}

export interface ResumenRapidoTesoreria {
  totalPagos: number;
  pagados: number;
  enProceso: number;
  anulados: number;
  pendientes: number;
  tasaPagados: number;
  montoPagado: number;
  montoEnProceso: number;
  montoAnulado: number;
  tiempoPromedioProceso: number;
  pagosRecientes: Array<any>;
}

export interface AnalisisFinanciero {
  flujoEfectivo: {
    entradas: number;
    salidas: number;
    neto: number;
    tendencia: Array<{
      mes: string;
      entrada: number;
      salida: number;
    }>;
  };
  concentracion: {
    topContratistas: Array<{
      contratista: string;
      cantidadPagos: number;
      montoTotal: number;
      porcentaje: number;
    }>;
    topContratos: Array<{
      contrato: string;
      cantidadPagos: number;
      montoTotal: number;
      porcentaje: number;
    }>;
  };
  ratios: {
    eficiencia: number;
    velocidadProceso: number;
    tasaError: number;
    satisfaccion: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TesoreriaStatsService {
  private apiUrl = `${environment.apiUrl}/tesoreria/estadisticas`;

  constructor(private http: HttpClient) {}

  // Obtener estadísticas generales
  getEstadisticasGenerales(filtros?: FiltrosEstadisticasTesoreria): Observable<{ success: boolean; data: EstadisticasTesoreria }> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.fechaInicio) {
        params = params.set('fechaInicio', filtros.fechaInicio.toISOString());
      }
      if (filtros.fechaFin) {
        params = params.set('fechaFin', filtros.fechaFin.toISOString());
      }
      if (filtros.responsableId) {
        params = params.set('responsableId', filtros.responsableId);
      }
      if (filtros.estadoPago) {
        params = params.set('estadoPago', filtros.estadoPago);
      }
      if (filtros.metodoPago) {
        params = params.set('metodoPago', filtros.metodoPago);
      }
      if (filtros.montoMin) {
        params = params.set('montoMin', filtros.montoMin.toString());
      }
      if (filtros.montoMax) {
        params = params.set('montoMax', filtros.montoMax.toString());
      }
    }

    return this.http.get<{ success: boolean; data: EstadisticasTesoreria }>(
      `${this.apiUrl}/generales`,
      { params }
    );
  }

  // Obtener estadísticas por responsable
  getEstadisticasPorResponsable(responsableId: string, fechaInicio?: Date, fechaFin?: Date): Observable<{ success: boolean; data: EstadisticasResponsable }> {
    let params = new HttpParams();
    
    if (fechaInicio) {
      params = params.set('fechaInicio', fechaInicio.toISOString());
    }
    if (fechaFin) {
      params = params.set('fechaFin', fechaFin.toISOString());
    }

    return this.http.get<{ success: boolean; data: EstadisticasResponsable }>(
      `${this.apiUrl}/responsable/${responsableId}`,
      { params }
    );
  }

  // Obtener mis estadísticas
  getMiEstadistica(): Observable<{ success: boolean; data: EstadisticasResponsable }> {
    return this.http.get<{ success: boolean; data: EstadisticasResponsable }>(
      `${this.apiUrl}/mi-estadistica`
    );
  }

  // Obtener pagos por estado
  getPagosPorEstado(estado: string): Observable<{ success: boolean; count: number; data: PagoPorEstado[] }> {
    return this.http.get<{ success: boolean; count: number; data: PagoPorEstado[] }>(
      `${this.apiUrl}/estado/${estado}`
    );
  }

  // Obtener métricas de tiempo
  getMetricasTiempo(): Observable<{ success: boolean; data: MetricasTiempoTesoreria }> {
    return this.http.get<{ success: boolean; data: MetricasTiempoTesoreria }>(
      `${this.apiUrl}/metricas-tiempo`
    );
  }

  // Obtener resumen rápido
  getResumenRapido(): Observable<{ success: boolean; data: ResumenRapidoTesoreria }> {
    return this.http.get<{ success: boolean; data: ResumenRapidoTesoreria }>(
      `${this.apiUrl}/resumen-rapido`
    );
  }

  // Obtener análisis financiero
  getAnalisisFinanciero(fechaInicio?: Date, fechaFin?: Date): Observable<{ success: boolean; data: AnalisisFinanciero }> {
    let params = new HttpParams();
    
    if (fechaInicio) {
      params = params.set('fechaInicio', fechaInicio.toISOString());
    }
    if (fechaFin) {
      params = params.set('fechaFin', fechaFin.toISOString());
    }

    return this.http.get<{ success: boolean; data: AnalisisFinanciero }>(
      `${this.apiUrl}/analisis-financiero`,
      { params }
    );
  }

  // Obtener top responsables
  getTopResponsables(limit: number = 10): Observable<{ success: boolean; data: Array<{
    responsableId: string;
    responsableNombre: string;
    pagosProcesados: number;
    montoTotal: number;
    eficiencia: number;
    promedioTiempo: number;
  }> }> {
    return this.http.get<{ success: boolean; data: Array<any> }>(
      `${this.apiUrl}/top-responsables`,
      { params: new HttpParams().set('limit', limit.toString()) }
    );
  }

  // Obtener tendencias mensuales
  getTendenciasMensuales(anio: number = new Date().getFullYear()): Observable<{ success: boolean; data: Array<{
    mes: string;
    nombreMes: string;
    totalPagos: number;
    pagados: number;
    enProceso: number;
    anulados: number;
    montoTotal: number;
    montoPagado: number;
    tasaExito: number;
  }> }> {
    return this.http.get<{ success: boolean; data: Array<any> }>(
      `${this.apiUrl}/tendencias-mensuales/${anio}`
    );
  }

  // Exportar estadísticas
  exportarEstadisticas(filtros?: FiltrosEstadisticasTesoreria): Observable<Blob> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.fechaInicio) {
        params = params.set('fechaInicio', filtros.fechaInicio.toISOString());
      }
      if (filtros.fechaFin) {
        params = params.set('fechaFin', filtros.fechaFin.toISOString());
      }
      if (filtros.responsableId) {
        params = params.set('responsableId', filtros.responsableId);
      }
      if (filtros.estadoPago) {
        params = params.set('estadoPago', filtros.estadoPago);
      }
      if (filtros.metodoPago) {
        params = params.set('metodoPago', filtros.metodoPago);
      }
    }

    return this.http.get(`${this.apiUrl}/exportar`, {
      params,
      responseType: 'blob'
    });
  }
}