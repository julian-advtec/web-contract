// src/app/core/services/estadisticas-rendicion-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EstadisticasRendicionCuentas, FiltrosStats, PeriodoStats } from '../models/estadisticas-rendicion-cuentas.model';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasRendicionCuentasService {
  private apiUrl = `${environment.apiUrl}/rendicion-cuentas/estadisticas`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las estadísticas de rendición de cuentas según los filtros aplicados
   * @param filtros Filtros para la consulta (período, soloMios, etc.)
   * @returns Observable con las estadísticas
   */
  obtenerEstadisticas(filtros: FiltrosStats): Observable<EstadisticasRendicionCuentas> {
    let params = new HttpParams().set('periodo', filtros.periodo);

    if (filtros.soloMios) {
      params = params.set('soloMios', 'true');
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        console.log('[Servicio Rendición] Respuesta completa:', response);

        // Extraer datos según la estructura del backend
        let data = response;
        
        // Si response tiene propiedad data (estructura { ok: true, data: {...} })
        if (response?.data) {
          data = response.data;
          console.log('[Servicio Rendición] Extraído response.data:', data);
        }
        
        // Si data tiene propiedad data anidada (estructura { data: { data: {...} } })
        if (data?.data) {
          data = data.data;
          console.log('[Servicio Rendición] Extraído data.data:', data);
        }
        
        // Verificar que data tiene resumen, si no, crear estructura vacía
        if (!data || !data.resumen) {
          console.warn('[Servicio Rendición] Datos no tienen resumen, usando estructura vacía:', data);
          
          // Devolver estructura vacía para evitar errores en el template
          return this.crearEstructuraVacia() as EstadisticasRendicionCuentas;
        }
        
        // Calcular porcentajes para la distribución
        if (data.distribucion && data.resumen?.total > 0) {
          data.distribucion = data.distribucion.map((item: any) => ({
            ...item,
            porcentaje: Math.round((item.cantidad / data.resumen.total) * 100)
          }));
        }
        
        // Asegurar que documentosPendientes y documentosProcesados sean arrays
        if (!data.documentosPendientes) data.documentosPendientes = [];
        if (!data.documentosProcesados) data.documentosProcesados = [];
        if (!data.actividadReciente) data.actividadReciente = [];
        
        // Asegurar que tiempos tenga todas las propiedades
        if (!data.tiempos) {
          data.tiempos = {
            promedioHoras: 0,
            minimoHoras: 0,
            maximoHoras: 0,
            promedioDias: 0
          };
        }
        
        // Asegurar que rendimiento tenga todas las propiedades
        if (!data.rendimiento) {
          data.rendimiento = {
            tiempoPromedioHoras: 0,
            tasaAprobacion: 0,
            tasaObservacion: 0,
            tasaRechazo: 0
          };
        }
        
        console.log('[Servicio Rendición] Datos finales procesados:', data);
        
        return data as EstadisticasRendicionCuentas;
      }),
      catchError(err => {
        console.error('[Servicio Rendición] Error:', err);
        
        // En caso de error, devolver estructura vacía para que la aplicación no se rompa
        return throwError(() => ({
          error: err,
          estructuraVacia: this.crearEstructuraVacia()
        }));
      })
    );
  }

  /**
   * Crea una estructura vacía de estadísticas para evitar errores cuando no hay datos
   */
  private crearEstructuraVacia(): any {
    const hoy = new Date();
    const haceUnMes = new Date(hoy);
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);

    return {
      desde: haceUnMes,
      hasta: hoy,
      fechaCalculo: hoy,
      resumen: {
        pendientes: 0,
        enRevision: 0,
        aprobados: 0,
        observados: 0,
        rechazados: 0,
        completados: 0,
        esperaAprobacionGerencia: 0,
        aprobadoPorGerencia: 0,
        total: 0
      },
      rendimiento: {
        tiempoPromedioHoras: 0,
        tasaAprobacion: 0,
        tasaObservacion: 0,
        tasaRechazo: 0
      },
      metricas: {
        documentosProcesados: 0,
        tiempoPromedioRespuesta: 0,
        tasaAprobacion: 0,
        tasaObservacion: 0,
        tasaRechazo: 0,
        documentosPendientes: 0
      },
      distribucion: [],
      documentosPendientes: [],
      documentosProcesados: [],
      actividadReciente: [],
      tiempos: {
        promedioHoras: 0,
        minimoHoras: 0,
        maximoHoras: 0,
        promedioDias: 0
      }
    };
  }

  /**
   * Obtiene un resumen rápido para el dashboard
   */
  obtenerResumenRapido(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen`).pipe(
      map(response => {
        console.log('[Servicio Rendición] Resumen rápido:', response);
        
        let data = response?.data || response || {};
        
        return {
          totalPendientes: data.totalPendientes || 0,
          misPendientes: data.misPendientes || 0,
          procesadosSemana: data.procesadosSemana || 0,
          tasaAprobacion: data.tasaAprobacion || 0
        };
      }),
      catchError(err => {
        console.error('[Servicio Rendición] Error en resumen rápido:', err);
        return throwError(() => err);
      })
    );
  }
}