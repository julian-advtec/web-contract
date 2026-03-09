// src/app/core/services/contabilidad-stats.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContabilidadStatsService {
  private apiUrl = `${environment.apiUrl}/contabilidad/estadisticas`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  /**
   * Obtener estadísticas generales
   */
  getEstadisticasGenerales(filtros?: any): Observable<any> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== undefined && filtros[key] !== null && filtros[key] !== '') {
          params = params.set(key, filtros[key].toString());
        }
      });
    }

    console.log('🔍 Llamando a:', `${this.apiUrl}/generales`, params.toString());
    return this.http.get(`${this.apiUrl}/generales`, { headers, params });
  }

  /**
   * Obtener mis estadísticas personales
   */
  getMiEstadistica(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/mi-estadistica`, { headers });
  }

  /**
   * Obtener lista de contadores (para admin)
   */
  getListaContadores(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${environment.apiUrl}/users?role=contabilidad`, { headers });
  }

  /**
   * Obtener resumen rápido para dashboard
   */
  getResumenRapido(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/resumen-rapido`, { headers });
  }
}