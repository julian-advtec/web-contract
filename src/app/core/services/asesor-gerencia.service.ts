import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AsesorGerenciaService {
  private apiUrl = `${environment.apiUrl}/asesor-gerencia`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  private getAuthHeadersWithJson(): HttpHeaders {
    return this.getAuthHeaders().set('Content-Type', 'application/json');
  }

  private handleArrayResponse(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    if (response?.documentos && Array.isArray(response.documentos)) return response.documentos;
    console.warn('Respuesta no es array esperado:', response);
    return [];
  }

  // Listado de documentos disponibles para tomar
  getDocumentosDisponibles(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/documentos/disponibles`, { headers: this.getAuthHeaders() }).pipe(
      map(res => this.handleArrayResponse(res)),
      catchError(err => {
        console.error('[AsesorGerenciaService] Error al obtener documentos disponibles:', err);
        return throwError(() => new Error('No se pudieron cargar los documentos disponibles'));
      })
    );
  }

  // Mis documentos en revisión
  getMisDocumentos(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/mis-documentos`, { headers: this.getAuthHeaders() }).pipe(
      map(res => this.handleArrayResponse(res)),
      catchError(err => {
        console.error('[AsesorGerenciaService] Error al obtener mis documentos:', err);
        return throwError(() => new Error('No se pudieron cargar tus documentos en revisión'));
      })
    );
  }

  // Tomar documento para revisión
  tomarDocumento(documentoId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/documentos/${documentoId}/tomar`, {}, { headers: this.getAuthHeaders() }).pipe(
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al tomar documento ${documentoId}:`, err);
        return throwError(() => new Error(err.error?.message || 'No se pudo tomar el documento'));
      })
    );
  }

  // Finalizar revisión (APROBADO / OBSERVADO / RECHAZADO)
  finalizarRevision(documentoId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/documentos/${documentoId}/finalizar`, formData, { headers: this.getAuthHeaders() }).pipe(
      map(res => res),
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al finalizar revisión de ${documentoId}:`, err);
        const mensaje = err.error?.message || err.message || 'Error al procesar la decisión final';
        return throwError(() => new Error(mensaje));
      })
    );
  }

  // Liberar documento (volver a disponibles)
  liberarDocumento(documentoId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/documentos/${documentoId}/liberar`, { headers: this.getAuthHeaders() }).pipe(
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al liberar documento ${documentoId}:`, err);
        return throwError(() => new Error(err.error?.message || 'No se pudo liberar el documento'));
      })
    );
  }

  // Historial del asesor
  getHistorial(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/historial`, { headers: this.getAuthHeaders() }).pipe(
      map(res => this.handleArrayResponse(res)),
      catchError(err => {
        console.error('[AsesorGerenciaService] Error al obtener historial:', err);
        return throwError(() => new Error('No se pudo cargar el historial'));
      })
    );
  }

  // Documentos rechazados/observados visibles
  getRechazadosVisibles(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/rechazados-visibles`, { headers: this.getAuthHeaders() }).pipe(
      map(res => this.handleArrayResponse(res)),
      catchError(err => {
        console.error('[AsesorGerenciaService] Error al obtener rechazados visibles:', err);
        return throwError(() => new Error('No se pudieron cargar los documentos rechazados'));
      })
    );
  }

  // Ver archivo (blob) - usado para comprobante de pago
  verArchivo(documentoId: string, tipo: 'pagoRealizado' | 'aprobacion'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/${documentoId}/archivo/${tipo}`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al cargar archivo ${tipo} de ${documentoId}:`, err);
        return throwError(() => new Error('No se pudo cargar el archivo'));
      })
    );
  }

  // Descargar archivo (si en algún momento lo necesitas de nuevo)
  descargarArchivo(documentoId: string, tipo: 'pagoRealizado' | 'aprobacion'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/${documentoId}/descargar/${tipo}`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al descargar ${tipo} de ${documentoId}:`, err);
        return throwError(() => new Error('No se pudo descargar el archivo'));
      })
    );
  }

  // Detalle de revisión
  obtenerDetalleRevision(documentoId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/documentos/${documentoId}/detalle`, { headers: this.getAuthHeaders() }).pipe(
      map(res => res?.data || res || null),
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al obtener detalle de ${documentoId}:`, err);
        return throwError(() => new Error(err.error?.message || 'No se pudo cargar el detalle del documento'));
      })
    );
  }
}