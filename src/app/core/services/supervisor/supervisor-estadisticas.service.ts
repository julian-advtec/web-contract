// src/app/core/services/supervisor/supervisor-estadisticas.service.ts
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

  obtenerEstadisticas(): Observable<SupervisorEstadisticas | null> {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
      return of(null);
    }

    return this.http.get<any>(this.apiUrl, { headers }).pipe(
      map(response => {
        console.log('[DEBUG Supervisor Estadísticas] Respuesta completa:', response);

        // Accede al nivel correcto (doble data)
        const realData = response?.data?.data;

        if (response?.ok === true && realData) {
          console.log('[DEBUG] Datos reales encontrados:', realData);
          return realData as SupervisorEstadisticas;
        }

        if (response?.success === true && response?.data) {
          return response.data as SupervisorEstadisticas;
        }

        console.warn('[Supervisor] Respuesta sin ok/data o sin data interna:', response);
        this.notificationService.warning('Datos incompletos', 'No se recibieron estadísticas completas');
        return null;
      }),
      catchError(err => {
        console.error('[Supervisor Estadísticas] Error en petición:', err);
        this.notificationService.error('Error', 'No se pudieron cargar las estadísticas');
        return of(null);
      })
    );
  }

  // Método de historial (ya agregado para resolver el otro error)
  obtenerHistorial(limit: number = 20): Observable<any[] | null> {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
      return of(null);
    }

    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/historial`, { headers, params }).pipe(
      map(response => {
        console.log('[DEBUG Supervisor Historial] Respuesta completa:', response);

        // Manejo flexible de la estructura de respuesta
        const historialData = response?.data?.data || response?.data || response || [];

        if (Array.isArray(historialData)) {
          return historialData;
        }

        console.warn('[Supervisor Historial] No se encontró array válido');
        return [];
      }),
      catchError(err => {
        console.error('[Supervisor Historial] Error:', err);
        this.notificationService.error('Error', 'No se pudo cargar el historial');
        return of([]);
      })
    );
  }
}