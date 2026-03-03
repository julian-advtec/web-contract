// src/app/core/services/supervisor/supervisor-estadisticas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../notification.service';
import { SupervisorEstadisticas, PeriodoStats, FiltrosEstadisticasSupervisor } from '../../models/supervisor-estadisticas.model';  // ← Asegúrate de este import

@Injectable({
  providedIn: 'root'
})
export class SupervisorEstadisticasService {
  private apiUrl = `${environment.apiUrl}/supervisor/estadisticas`;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });
  }

obtenerEstadisticas(filtros: FiltrosEstadisticasSupervisor): Observable<SupervisorEstadisticas | null> {
  const headers = this.getAuthHeaders();
  if (!headers.has('Authorization')) {
    this.notificationService.error('Error', 'No estás autenticado');
    return of(null);
  }

  const periodoLimpio = filtros?.periodo?.toLowerCase().trim() || PeriodoStats.ANO;
  const body = { periodo: periodoLimpio };

  return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
    timeout(15000),
    map(response => {
      console.log('[Supervisor Stats] Respuesta POST completa:', JSON.stringify(response, null, 2));

      // Baja TODOS los niveles posibles hasta llegar a los datos reales
      let data = response;

      // Nivel 1: {ok: true, data: {...}}
      if (data?.ok === true && data?.data) data = data.data;

      // Nivel 2: {timestamp: "...", data: {...}}
      if (data?.data) data = data.data;

      // Nivel 3: {success: true, data: {...}}
      if (data?.success === true && data?.data) data = data.data;

      // Nivel 4: el objeto final con aprobados, desde, etc.
      if (data?.data) data = data.data;

      // Si aún hay wrapper, último intento
      if (data?.success || data?.ok) data = data.data || data;

      // Ahora 'data' debería tener aprobados, desde, hasta, etc.
      const estadisticas: SupervisorEstadisticas = {
        totalDocumentosRadicados: data?.totalDocumentosRadicados ?? 0,
        enRevision: data?.enRevision ?? 0,
        aprobados: data?.aprobados ?? 0,
        observados: data?.observados ?? 0,
        rechazados: data?.rechazados ?? 0,
        tiempoPromedioHoras: data?.tiempoPromedioHoras ?? 0,
        eficiencia: data?.eficiencia ?? 0,
        distribucion: (data?.distribucion || []).map((item: any) => ({
          estado: item.estado || 'Desconocido',
          cantidad: Number(item.cantidad) || 0,
          porcentaje: Number(item.porcentaje) || 0,
          color: item.color || '#6c757d'
        })),
        ultimosProcesados: (data?.ultimosProcesados || []).map((item: any) => ({
          id: item.id,
          numeroRadicado: item.numeroRadicado || item.documento?.numeroRadicado || 'N/A',
          contratista: item.contratista || item.documento?.nombreContratista || 'N/A',
          fecha: item.fecha || item.fechaAprobacion || item.fechaCreacion || item.fechaActualizacion || '',
          estado: item.estado || 'N/A'
        })),
        totales: {
          enRevision: Number(data?.enRevision) || 0,
          aprobados: Number(data?.aprobados) || 0,
          observados: Number(data?.observados) || 0,
          rechazados: Number(data?.rechazados) || 0,
          total: Number(data?.totales?.total) ||
                 (Number(data?.enRevision) || 0) +
                 (Number(data?.aprobados) || 0) +
                 (Number(data?.observados) || 0) +
                 (Number(data?.rechazados) || 0)
        },
        fechaConsulta: data?.fechaConsulta || new Date().toISOString(),
        desde: data?.desde || '',
        hasta: data?.hasta || ''
      };

      console.log('[Supervisor Stats] Datos finales mapeados (después de limpiar):', estadisticas);
      return estadisticas;
    }),
    catchError(err => {
      console.error('[Supervisor Stats] Error en POST:', err);
      this.notificationService.error('Error', 'No se pudieron cargar las estadísticas');
      return of(null);
    })
  );
}

  // Método de historial (sin cambios importantes, pero lo incluyo completo)
obtenerHistorial(limit: number = 20): Observable<any[]> {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
        console.warn('[Historial] No hay token de autenticación');
        return of([]); // Retornar array vacío en lugar de null
    }

    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/historial`, { headers, params }).pipe(
        map(response => {
            console.log('[DEBUG Supervisor Historial] Respuesta completa:', response);

            let historialData = response?.data?.data ||
                               response?.data ||
                               response?.historial ||
                               response?.records ||
                               response ||
                               [];

            if (Array.isArray(historialData)) {
                console.log(`[Historial] ${historialData.length} registros encontrados`);
                return historialData;
            }

            console.warn('[Supervisor Historial] No se encontró array válido en la respuesta');
            return []; // Siempre retornar array
        }),
        catchError(err => {
            console.error('[Supervisor Historial] Error en la petición:', err);
            this.notificationService.error('Error', 'No se pudo cargar el historial');
            return of([]); // Retornar array vacío en caso de error
        })
    );
}
}