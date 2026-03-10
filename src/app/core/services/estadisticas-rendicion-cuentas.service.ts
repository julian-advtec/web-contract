// src/app/core/services/estadisticas-rendicion-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EstadisticasRendicionCuentas, FiltrosStats, PeriodoStats } from '../models/estadisticas-rendicion-cuentas.model';

@Injectable({ providedIn: 'root' })
export class EstadisticasRendicionCuentasService {
  private apiUrl = `${environment.apiUrl}/rendicion-cuentas/estadisticas`;

  constructor(private http: HttpClient) {}

  obtenerEstadisticas(filtros: FiltrosStats): Observable<EstadisticasRendicionCuentas> {
    let params = new HttpParams().set('periodo', filtros.periodo);

    if (filtros.soloMios) {
      params = params.set('soloMios', 'true');
    }

    console.log('[Servicio Estadísticas] → Petición enviada con params:', params.toString());

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map((response) => {
        console.log('[Servicio Estadísticas] → Respuesta completa del backend (cruda):', JSON.stringify(response, null, 2));

        // Paso 1: Extraer el primer nivel si hay "ok"
        let payload = response;
        if (response?.ok && response.data) {
          payload = response.data;
        }

        // Paso 2: Extraer el segundo nivel si hay doble "ok" y "data"
        if (payload?.ok && payload.data?.ok && payload.data.data) {
          payload = payload.data.data;
          console.log('[Servicio Estadísticas] → Detectado doble anidamiento → extrayendo payload.data.data');
        } else if (payload?.ok && payload.data) {
          payload = payload.data;
          console.log('[Servicio Estadísticas] → Detectado anidamiento simple → extrayendo payload.data');
        }

        // Verificación final
        if (!payload || typeof payload !== 'object') {
          console.warn('[Servicio Estadísticas] → No se pudo extraer payload válido → usando estructura vacía');
          return this.crearEstructuraVacia();
        }

        console.log('[Servicio Estadísticas] → Payload final después de limpiar anidamiento:', JSON.stringify(payload, null, 2));

        // Normalizar fechas
        const normalizeDate = (v: any): Date | null => v ? new Date(v) : null;

        // Extraer resumen
        const resumenRaw = payload.resumen || {};
        console.log('[Servicio Estadísticas] → resumenRaw recibido:', resumenRaw);

        const safeStats: EstadisticasRendicionCuentas = {
          desde: normalizeDate(payload.desde),
          hasta: normalizeDate(payload.hasta),
          fechaCalculo: normalizeDate(payload.fechaCalculo || payload.calculadoEn),
          resumen: {
            pendientes: Number(resumenRaw.pendientes ?? 0),
            enRevision: Number(resumenRaw.enRevision ?? 0),
            aprobados: Number(resumenRaw.aprobados ?? 0),
            observados: Number(resumenRaw.observados ?? 0),
            rechazados: Number(resumenRaw.rechazados ?? 0),
            completados: Number(resumenRaw.completados ?? 0),
            esperaAprobacionGerencia: Number(resumenRaw.esperaAprobacionGerencia ?? 0),
            aprobadoPorGerencia: Number(resumenRaw.aprobadoPorGerencia ?? 0),
            total: Number(resumenRaw.total ?? 0),
          },
          rendimiento: payload.rendimiento || {
            tiempoPromedioHoras: 0,
            tasaAprobacion: 0,
            tasaObservacion: 0,
            tasaRechazo: 0,
          },
          metricas: payload.metricas || {
            documentosProcesados: 0,
            tiempoPromedioRespuesta: 0,
            tasaAprobacion: 0,
            tasaObservacion: 0,
            tasaRechazo: 0,
            documentosPendientes: 0,
          },
          distribucion: Array.isArray(payload.distribucion)
            ? payload.distribucion.map((d: any) => ({
                estado: d.estado || 'Desconocido',
                cantidad: Number(d.cantidad ?? 0),
                porcentaje: Number(d.porcentaje ?? 0),
                color: d.color || '#cccccc',
              }))
            : [],
          documentosPendientes: Array.isArray(payload.documentosPendientes) ? payload.documentosPendientes : [],
          documentosProcesados: Array.isArray(payload.documentosProcesados) ? payload.documentosProcesados : [],
          actividadReciente: Array.isArray(payload.actividadReciente) ? payload.actividadReciente : [],
          tiempos: payload.tiempos || {
            promedioHoras: 0,
            minimoHoras: 0,
            maximoHoras: 0,
            promedioDias: 0,
          },
          misMetricas: payload.misMetricas,
        };

        // Logs clave para depuración
        console.log('[Servicio Estadísticas] → Resumen final mapeado:', safeStats.resumen);
        console.log('[Servicio Estadísticas] → Total final:', safeStats.resumen.total);
        console.log('[Servicio Estadísticas] → Pendientes final:', safeStats.resumen.pendientes);
        console.log('[Servicio Estadísticas] → EnRevisión final:', safeStats.resumen.enRevision);
        console.log('[Servicio Estadísticas] → Rechazados final:', safeStats.resumen.rechazados);

        // Recalcular porcentajes en distribución
        if (safeStats.resumen.total > 0 && safeStats.distribucion.length > 0) {
          safeStats.distribucion = safeStats.distribucion.map(item => ({
            ...item,
            porcentaje: Math.round((item.cantidad / safeStats.resumen.total) * 100),
          }));
        }

        return safeStats;
      }),
      catchError((err) => {
        console.error('[Servicio Estadísticas] → Error en la petición HTTP:', err);
        return of(this.crearEstructuraVacia());
      })
    );
  }

  private crearEstructuraVacia(): EstadisticasRendicionCuentas {
    const ahora = new Date();
    return {
      desde: null,
      hasta: null,
      fechaCalculo: ahora,
      resumen: {
        pendientes: 0,
        enRevision: 0,
        aprobados: 0,
        observados: 0,
        rechazados: 0,
        completados: 0,
        esperaAprobacionGerencia: 0,
        aprobadoPorGerencia: 0,
        total: 0,
      },
      rendimiento: {
        tiempoPromedioHoras: 0,
        tasaAprobacion: 0,
        tasaObservacion: 0,
        tasaRechazo: 0,
      },
      metricas: {
        documentosProcesados: 0,
        tiempoPromedioRespuesta: 0,
        tasaAprobacion: 0,
        tasaObservacion: 0,
        tasaRechazo: 0,
        documentosPendientes: 0,
      },
      distribucion: [],
      documentosPendientes: [],
      documentosProcesados: [],
      actividadReciente: [],
      tiempos: {
        promedioHoras: 0,
        minimoHoras: 0,
        maximoHoras: 0,
        promedioDias: 0,
      },
    };
  }
}