// src/app/core/services/formularios-publicos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FormulariosPublicosService {
  private baseUrl = `${environment.apiUrl}/contratistas/publico`;

  constructor(private http: HttpClient) {}

  /**
   * Listar formularios pendientes de aprobación
   */
  listarPendientesAprobacion(): Observable<any> {
    // ✅ SIN map - devuelve la respuesta tal cual del backend
    return this.http.get(`${this.baseUrl}/pendientes-aprobacion`);
  }

  /**
   * Obtener detalle completo de un formulario
   */
  obtenerDetalleAprobacion(formularioId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${formularioId}/detalle-aprobacion`);
  }

  /**
   * Aprobar un formulario
   */
  aprobarFormulario(formularioId: string, observaciones?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${formularioId}/aprobar`, { observaciones });
  }

  /**
   * Rechazar un formulario
   */
  rechazarFormulario(formularioId: string, motivo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${formularioId}/rechazar`, { motivo });
  }

  /**
   * Descargar documento combinado
   */
  descargarCombinado(formularioId: string, grupo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${formularioId}/combinado/${grupo}`, {
      responseType: 'blob'
    });
  }

  /**
   * Obtener estado de grupos
   */
  obtenerEstadoGrupos(formularioId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${formularioId}/estado-grupos`);
  }
}