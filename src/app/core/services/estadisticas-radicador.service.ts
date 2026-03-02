// src/app/core/services/estadisticas-radicador.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { EstadisticasRadicador, PeriodoStats } from '../models/estadisticas-radicador.model';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasRadicadorService {
  private apiUrl = `${environment.apiUrl}/estadisticas/radicador`;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    if (!token) {
      this.notificationService.warning('No estás autenticado', 'Por favor inicia sesión');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });
  }

  obtenerMisEstadisticas(
    periodo: PeriodoStats = PeriodoStats.ANO
  ): Observable<EstadisticasRadicador | null> {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
      return of(null);
    }

    const params = new HttpParams()
      .set('periodo', periodo);

    return this.http.get<any>(`${this.apiUrl}/mis-estadisticas`, { headers, params }).pipe(
      map(response => {
        console.log('[DEBUG Frontend] Respuesta completa del backend:', response);

        // Acepta tanto ok como success, y accede al nivel correcto (data.data)
        const responseData = response?.data?.data; // ← ¡Aquí está la clave! Doble .data

        if ((response?.ok === true || response?.success === true) && responseData) {
          const estadisticas: EstadisticasRadicador = {
            documentos: {
              totalRadicados: responseData.documentos?.totalRadicados || 0,
            },
            distribucion: (responseData.distribucion || []).map((item: any) => ({
              estado: item.estado,
              cantidad: item.cantidad || 0,
              porcentaje: item.porcentaje || 0,
              color: item.color
            })),
            ultimosRadicados: (responseData.ultimosRadicados || []).map((doc: any) => ({
              id: doc.id,
              numeroRadicado: doc.numeroRadicado,
              contratista: doc.contratista,
              fechaRadicacion: doc.fecha ? new Date(doc.fecha) : null,
              estado: doc.estado
            })),
            fechaCalculo: responseData.fechaCalculo || new Date().toISOString(),
            desde: responseData.desde || '',
            hasta: responseData.hasta || ''
          };

          console.log('[DEBUG Frontend] Estadisticas mapeadas correctamente:', estadisticas);
          return estadisticas;
        }

        console.warn('[Frontend] Respuesta inválida o sin data:', response);
        this.notificationService.warning('Datos incompletos', 'No se recibieron todas las estadísticas');
        return null;
      }),
      catchError(err => {
        console.error('[Frontend] Error en la petición:', err);
        let msg = 'No se pudieron cargar tus estadísticas';
        if (err.status === 401) msg = 'Sesión expirada';
        if (err.status === 403) msg = 'No tienes permisos';
        this.notificationService.error('Error', msg);
        return of(null);
      })
    );
  }
}