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

  constructor(private http: HttpClient) { }

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
    console.log('[handleArrayResponse] Respuesta:', response);

    if (Array.isArray(response)) {
      console.log('[handleArrayResponse] Es array directo');
      return response;
    }

    if (response?.ok && response?.data) {
      console.log('[handleArrayResponse] Tiene ok y data');
      if (Array.isArray(response.data)) {
        console.log('[handleArrayResponse] response.data es array');
        return response.data;
      }
      if (response.data?.data && Array.isArray(response.data.data)) {
        console.log('[handleArrayResponse] response.data.data es array');
        return response.data.data;
      }
    }

    if (response?.success && response?.data) {
      console.log('[handleArrayResponse] Tiene success y data');
      if (Array.isArray(response.data)) {
        return response.data;
      }
    }

    if (response?.data && Array.isArray(response.data)) {
      console.log('[handleArrayResponse] response.data es array');
      return response.data;
    }

    if (response?.documentos && Array.isArray(response.documentos)) {
      console.log('[handleArrayResponse] Tiene documentos');
      return response.documentos;
    }

    if (response?.historial && Array.isArray(response.historial)) {
      console.log('[handleArrayResponse] Tiene historial');
      return response.historial;
    }

    if (response?.items && Array.isArray(response.items)) {
      console.log('[handleArrayResponse] Tiene items');
      return response.items;
    }

    console.warn('[handleArrayResponse] No se pudo extraer array, devolviendo []');
    return [];
  }

  getHistorial(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/historial`, { headers: this.getAuthHeaders() }).pipe(
      map(res => this.handleArrayResponse(res)),
      catchError(err => {
        console.error('[AsesorGerenciaService] Error al obtener historial:', err);
        return throwError(() => new Error('No se pudo cargar el historial'));
      })
    );
  }

  getRechazadosVisibles(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/rechazados-visibles`, { headers: this.getAuthHeaders() }).pipe(
      map(res => this.handleArrayResponse(res)),
      catchError(err => {
        console.error('[AsesorGerenciaService] Error al obtener rechazados visibles:', err);
        return throwError(() => new Error('No se pudieron cargar los documentos rechazados'));
      })
    );
  }

  getDocumentosDisponibles(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/documentos/disponibles`, { headers: this.getAuthHeaders() }).pipe(
      map(res => this.handleArrayResponse(res)),
      catchError(err => {
        console.error('[AsesorGerenciaService] Error al obtener documentos disponibles:', err);
        return throwError(() => new Error('No se pudieron cargar los documentos disponibles'));
      })
    );
  }

  getMisDocumentos(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/mis-documentos`, { headers: this.getAuthHeaders() }).pipe(
      map(res => this.handleArrayResponse(res)),
      catchError(err => {
        console.error('[AsesorGerenciaService] Error al obtener mis documentos:', err);
        return throwError(() => new Error('No se pudieron cargar tus documentos en revisión'));
      })
    );
  }

  tomarDocumento(documentoId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/documentos/${documentoId}/tomar`, {}, { headers: this.getAuthHeaders() }).pipe(
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al tomar documento ${documentoId}:`, err);
        return throwError(() => new Error(err.error?.message || 'No se pudo tomar el documento'));
      })
    );
  }

  liberarDocumento(documentoId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/documentos/${documentoId}/liberar`, { headers: this.getAuthHeaders() }).pipe(
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al liberar documento ${documentoId}:`, err);
        return throwError(() => new Error(err.error?.message || 'No se pudo liberar el documento'));
      })
    );
  }

  verArchivo(documentoId: string, tipo: 'pagoRealizado' | 'aprobacion' | 'comprobanteFirmado'): Observable<Blob> {
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

  descargarArchivo(documentoId: string, tipo: 'pagoRealizado' | 'aprobacion' | 'comprobanteFirmado'): Observable<Blob> {
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

  obtenerDetalleRevision(documentoId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/documentos/${documentoId}/detalle`, { headers: this.getAuthHeaders() }).pipe(
      map(res => res?.data || res || null),
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al obtener detalle de ${documentoId}:`, err);
        return throwError(() => new Error(err.error?.message || 'No se pudo cargar el detalle del documento'));
      })
    );
  }

  finalizarRevision(documentoId: string, payload: {
    estadoFinal: string;
    observaciones?: string;
    signatureId?: string;
    signaturePosition?: any;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/documentos/${documentoId}/finalizar`,
      payload,
      { headers: this.getAuthHeadersWithJson() }
    ).pipe(
      map(res => res),
      catchError(err => {
        console.error(`[AsesorGerenciaService] Error al finalizar revisión de ${documentoId}:`, err);
        const mensaje = err.error?.message || err.message || 'Error al procesar la decisión final';
        return throwError(() => new Error(mensaje));
      })
    );
  }

  obtenerComprobanteFirmado(documentoId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/${documentoId}/comprobante-firmado`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.error('[obtenerComprobanteFirmado] Error:', err);
        return throwError(() => err);
      })
    );
  }

  getTodosDocumentos(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/todos-documentos`, { headers: this.getAuthHeaders() }).pipe(
      map(response => {
        console.log('[SERVICE] Todos documentos - respuesta completa:', JSON.stringify(response, null, 2));

        // Extraer datos según la estructura
        let documentos = [];

        // Si response.data existe y es un array
        if (response?.data && Array.isArray(response.data)) {
          documentos = response.data;
        }
        // Si response.data.data existe y es un array
        else if (response?.data?.data && Array.isArray(response.data.data)) {
          documentos = response.data.data;
        }
        // Si response es un array directamente
        else if (Array.isArray(response)) {
          documentos = response;
        }

        console.log('[SERVICE] Documentos extraídos:', documentos.length);
        return documentos;
      }),
      catchError(err => {
        console.error('[SERVICE] Error obteniendo todos los documentos:', err);
        return throwError(() => new Error('No se pudieron cargar todos los documentos'));
      })
    );
  }
}