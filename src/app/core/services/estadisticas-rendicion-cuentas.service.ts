// src/app/core/services/estadisticas-rendicion-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export enum PeriodoStats {
  HOY = 'hoy',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre'
}

export interface FiltrosStats {
  periodo: PeriodoStats;
  soloMios: boolean;
  estado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  tipoDocumento?: string;
}

export interface EstadisticasRendicionCuentas {
  desde: Date;
  hasta: Date;
  fechaCalculo: Date;
  resumen: {
    pendientes: number;
    enRevision: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    completados: number;
    esperaAprobacionGerencia: number;
    aprobadoPorGerencia: number;
    total: number;
  };
  rendimiento: {
    tiempoPromedioHoras: number;
    tasaAprobacion: number;
    tasaObservacion: number;
    tasaRechazo: number;
  };
  metricas: {
    documentosProcesados: number;
    tiempoPromedioRespuesta: number;
    tasaAprobacion: number;
    tasaObservacion: number;
    tasaRechazo: number;
    documentosPendientes: number;
  };
  distribucion: Array<{
    estado: string;
    cantidad: number;
    porcentaje: number;
    color: string;
  }>;
  documentosPendientes: any[];
  documentosProcesados: any[];
  actividadReciente: any[];
  tiempos: {
    promedioHoras: number;
    minimoHoras: number;
    maximoHoras: number;
    promedioDias: number;
  };
  cumplimiento: any;
  tendencias: any[];
  misMetricas?: {
    pendientes: number;
    procesadosHoy: number;
    procesadosSemana: number;
    promedioRespuesta: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EstadisticasRendicionCuentasService {
  private apiUrl = `${environment.apiUrl}/rendicion-cuentas/estadisticas`;

  constructor(private http: HttpClient) {
    console.log('🔧 Servicio de estadísticas inicializado con URL:', this.apiUrl);
  }


obtenerEstadisticas(filtros?: FiltrosStats): Observable<EstadisticasRendicionCuentas> {
  console.log('📊 Solicitando estadísticas con filtros:', filtros);
  
  const params: any = { ...filtros };
  
  return this.http.get<any>(this.apiUrl, { params }).pipe(
    timeout(30000),
    map(response => {
      console.log('✅ Respuesta completa del backend:', response);
      
      // Verificar si la respuesta tiene la estructura { ok: true, data: { data: ... } }
      if (response && response.ok === true && response.data) {
        // Si response.data tiene otra propiedad data, extraer esa
        if (response.data.data) {
          console.log('📦 Extrayendo data.data del response:', response.data.data);
          return response.data.data; // ← EXTRAER EL DATA ANIDADO
        }
        console.log('📦 Extrayendo data del response:', response.data);
        return response.data;
      }
      
      return response;
    }),
    catchError(this.handleError)
  );
}

  obtenerResumenRapido(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen`).pipe(
      timeout(10000),
      map(response => response.data || response),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error al conectar con el servidor';
    
    if (error.status === 0) {
      errorMessage = 'No se pudo conectar al servidor. Verifica que el backend esté corriendo en http://localhost:3000';
      console.error('❌ Error de red/CORS:', error.message);
    } else if (error.status === 401) {
      errorMessage = 'Sesión expirada o no autorizada';
    } else if (error.status === 403) {
      errorMessage = 'No tienes permisos para ver estas estadísticas';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Solicitud inválida';
    } else if (error.status >= 500) {
      errorMessage = 'Error interno del servidor';
    }
    
    console.error('❌ Error en servicio de estadísticas:', error);
    return throwError(() => new Error(errorMessage));
  }
}