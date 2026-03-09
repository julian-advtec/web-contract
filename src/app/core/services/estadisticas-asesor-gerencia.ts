// src/app/core/services/estadisticas-asesor-gerencia.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EstadisticasAsesorGerencia, FiltrosStats } from '../models/estadisticas-asesor-gerencia.model';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasAsesorGerenciaService {
  private apiUrl = `${environment.apiUrl}/asesor-gerencia/estadisticas`;

  constructor(private http: HttpClient) {}

  obtenerEstadisticas(filtros: FiltrosStats): Observable<EstadisticasAsesorGerencia> {
    let params = new HttpParams().set('periodo', filtros.periodo);

    if (filtros.soloMios) {
      params = params.set('soloMios', 'true');
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        console.log('[Servicio] Respuesta completa:', response);

        // Extraer datos según la estructura del backend
        let data = response;
        
        // Si response tiene propiedad data
        if (response?.data) {
          data = response.data;
        }
        
        // Si data tiene propiedad data anidada
        if (data?.data) {
          data = data.data;
        }
        
        console.log('[Servicio] Datos extraídos:', data);
        
        return data as EstadisticasAsesorGerencia;
      }),
      catchError(err => {
        console.error('[Servicio] Error:', err);
        return throwError(() => err);
      })
    );
  }
}