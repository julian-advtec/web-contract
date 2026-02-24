// src/app/core/services/estadisticas-rendicion-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EstadisticasRendicionCuentas, FiltrosStats } from '../models/estadisticas-rendicion-cuentas.model';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasRendicionCuentasService {
  private apiUrl = `${environment.apiUrl}/rendicion-cuentas/estadisticas`;

  constructor(private http: HttpClient) {}

  obtenerEstadisticas(filtros?: FiltrosStats): Observable<EstadisticasRendicionCuentas> {
    return this.http.get<any>(this.apiUrl, { params: filtros as any }).pipe(
      map(res => res.data || res)
    );
  }

  obtenerResumenRapido(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen`).pipe(
      map(res => res.data || res)
    );
  }
}