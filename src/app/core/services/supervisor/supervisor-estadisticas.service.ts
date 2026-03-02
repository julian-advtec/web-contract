import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../notification.service';
import { SupervisorEstadisticas } from '../../models/supervisor-estadisticas.model';

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
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });
  }

  obtenerEstadisticas(periodo: string = 'ano'): Observable<SupervisorEstadisticas | null> {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) return of(null);

    const params = new HttpParams().set('periodo', periodo);

    return this.http.get<any>(this.apiUrl, { headers, params }).pipe(
      map(response => {
        console.log('[DEBUG Supervisor] Respuesta completa:', response);

        // La estructura correcta: response.data contiene los datos
        const realData = response?.data;

        if (response?.success === true && realData) {
          // Mapeo completo
          const estadisticas: SupervisorEstadisticas = {
            totalDocumentosRadicados: realData.totalDocumentosRadicados ?? 0,
            enRevision: realData.enRevision ?? 0,
            aprobados: realData.aprobados ?? 0,
            observados: realData.observados ?? 0,
            rechazados: realData.rechazados ?? 0,
            tiempoPromedioHoras: realData.tiempoPromedioHoras ?? 0,
            eficiencia: realData.eficiencia ?? 0,
            distribucion: (realData.distribucion || []).map((item: any) => ({
              estado: item.estado || 'Desconocido',
              cantidad: item.cantidad ?? 0,
              porcentaje: item.porcentaje ?? 0,
              color: item.color || '#4CAF50'
            })),
            ultimosProcesados: (realData.ultimosProcesados || []).map((item: any) => ({
              id: item.id,
              numeroRadicado: item.documento?.numeroRadicado || 'N/A',
              contratista: item.documento?.nombreContratista || 'N/A',
              fecha: item.fechaAprobacion || item.fechaCreacion || '',
              estado: item.estado || 'N/A'
            })),
            totales: realData.totales || {
              enRevision: realData.enRevision ?? 0,
              aprobados: realData.aprobados ?? 0,
              observados: realData.observados ?? 0,
              rechazados: realData.rechazados ?? 0,
              total: (realData.enRevision ?? 0) + (realData.aprobados ?? 0) + 
                     (realData.observados ?? 0) + (realData.rechazados ?? 0)
            },
            fechaConsulta: realData.fechaConsulta || new Date().toISOString(),
            desde: realData.desde || '',
            hasta: realData.hasta || ''
          };

          console.log('[DEBUG Supervisor] Datos mapeados:', estadisticas);
          return estadisticas;
        }

        console.warn('[DEBUG Supervisor] No se pudo mapear la respuesta:', response);
        return null;
      }),
      catchError(err => {
        console.error('[Supervisor] Error:', err);
        this.notificationService.error('Error', 'No se pudieron cargar las estadísticas');
        return of(null);
      })
    );
  }

  obtenerHistorial(limit: number = 20): Observable<any[] | null> {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
      console.warn('[Historial] No hay token de autenticación');
      return of(null);
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
        return [];
      }),
      catchError(err => {
        console.error('[Supervisor Historial] Error en la petición:', err);
        this.notificationService.error('Error', 'No se pudo cargar el historial');
        return of([]);
      })
    );
  }
}