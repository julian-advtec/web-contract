// src/app/core/services/estadisticas-rendicion-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EstadisticasRendicionCuentas, FiltrosStats } from '../models/estadisticas-rendicion-cuentas.model';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasRendicionCuentasService {
  private apiUrl = `${environment.apiUrl}/rendicion-cuentas/estadisticas`;  // ← ruta base correcta

  constructor(private http: HttpClient) {}

  obtenerResumenEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen`).pipe(  // ← usa /resumen
      map(response => response.data || response),
      catchError(err => {
        console.error('[EstadisticasService] Error resumen:', err);
        return throwError(() => err);
      })
    );
  }

  obtenerEstadisticas(filtros: FiltrosStats): Observable<EstadisticasRendicionCuentas> {
    let params = new HttpParams()
      .set('periodo', filtros.periodo)
      .set('soloMios', filtros.soloMios ? 'true' : 'false');

    if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);

    // ¡RUTA CORRECTA! Solo /estadisticas (sin duplicar)
    return this.http.get<EstadisticasRendicionCuentas>(this.apiUrl, { params }).pipe(
      catchError(err => {
        console.error('[EstadisticasService] Error estadísticas:', err);
        return throwError(() => err);
      })
    );
  }

  // Si tienes duplicado, bórralo o úsalo igual
  getEstadisticas(filtros: FiltrosStats): Observable<EstadisticasRendicionCuentas> {
    return this.obtenerEstadisticas(filtros); // reutiliza el método corregido
  }
}