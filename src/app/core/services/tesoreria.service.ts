import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TesoreriaProceso, TesoreriaApiResponse } from '../models/tesoreria.model';

@Injectable({
  providedIn: 'root'
})
export class TesoreriaService {
  private apiUrl = `${environment.apiUrl}/tesoreria`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  private getHeadersFormData(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  getHistorial(): Observable<{ success: boolean; data: any[] }> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.apiUrl}/historial`, { headers }).pipe(
      map(response => {
        let historial: any[] = [];
        if (response?.ok === true && response.data) {
          if (response.data.success === true && Array.isArray(response.data.data)) {
            historial = response.data.data;
          } else if (Array.isArray(response.data)) {
            historial = response.data;
          }
        } else if (response?.success === true && Array.isArray(response.data)) {
          historial = response.data;
        } else if (Array.isArray(response)) {
          historial = response;
        }
        return { success: true, data: historial };
      }),
      catchError(error => throwError(() => new Error(`Error obteniendo historial: ${error.message}`)))
    );
  }

  obtenerDocumentosDisponibles(): Observable<TesoreriaProceso[]> {
    return this.http.get<TesoreriaApiResponse<TesoreriaProceso[]>>(
      `${this.apiUrl}/documentos/disponibles`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.procesos || response.data || []),
      catchError(err => throwError(() => new Error(err.error?.message || 'No se pudieron cargar los documentos')))
    );
  }

  tomarDocumentoParaRevision(documentoId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/documentos/${documentoId}/tomar`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log(`Documento ${documentoId} tomado por tesorería:`, response)),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al tomar documento')))
    );
  }

  obtenerDocumentosEnRevision(): Observable<TesoreriaProceso[]> {
    return this.http.get<TesoreriaApiResponse<TesoreriaProceso[]>>(
      `${this.apiUrl}/mis-documentos`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.procesos || response.data || []),
      catchError(err => throwError(() => new Error(err.error?.message || 'No se pudieron cargar los documentos')))
    );
  }

  obtenerDetalleDocumento(documentoId: string): Observable<TesoreriaProceso> {
    return this.http.get<TesoreriaApiResponse<TesoreriaProceso>>(
      `${this.apiUrl}/documentos/${documentoId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al obtener detalle')))
    );
  }

  subirDocumentoTesoreria(documentoId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/documentos/${documentoId}/subir-documento`,
      formData,
      { headers: this.getHeadersFormData() }
    ).pipe(
      tap(response => console.log('Documento de tesorería subido:', response)),
      catchError(err => throwError(() => new Error(err.error?.message || 'No se pudo subir el archivo')))
    );
  }

  finalizarRevision(documentoId: string, estado: string, observaciones?: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/documentos/${documentoId}/finalizar`,
      { estado, observaciones },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al finalizar revisión')))
    );
  }

  liberarDocumento(documentoId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/documentos/${documentoId}/liberar`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al liberar documento')))
    );
  }

  previsualizarArchivoTesoreria(documentoId: string, tipo: string): Observable<Blob> {
    const url = `${this.apiUrl}/documentos/${documentoId}/descargar/${tipo}`;
    return this.http.get(url, {
      responseType: 'blob',
      headers: this.getHeaders()
    }).pipe(
      catchError(err => throwError(() => new Error('No se pudo previsualizar el archivo de tesorería')))
    );
  }

  descargarArchivoTesoreria(documentoId: string, tipo: string): Observable<Blob> {
    const url = `${this.apiUrl}/documentos/${documentoId}/descargar/${tipo}`;
    return this.http.get(url, {
      responseType: 'blob',
      headers: this.getHeaders()
    }).pipe(
      catchError(err => throwError(() => new Error('No se pudo descargar el archivo de tesorería')))
    );
  }

  descargarArchivoRadicado(documentoId: string, numeroArchivo: number): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/documentos/${documentoId}/descargar-radicado/${numeroArchivo}`,
      {
        responseType: 'blob',
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(err => throwError(() => new Error('No se pudo descargar el archivo')))
    );
  }

  previsualizarArchivoRadicado(documentoId: string, numeroArchivo: number): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/documentos/${documentoId}/preview/${numeroArchivo}`,
      {
        responseType: 'blob',
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(err => throwError(() => new Error('No se pudo previsualizar el archivo')))
    );
  }

  obtenerVistaDocumento(documentoId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/documentos/${documentoId}/vista`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al obtener vista')))
    );
  }

  obtenerMisProcesos(): Observable<TesoreriaProceso[]> {
    return this.http.get<TesoreriaApiResponse<TesoreriaProceso[]>>(
      `${this.apiUrl}/mis-procesos`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.procesos || response.data || []),
      catchError(err => throwError(() => new Error(err.error?.message || 'No se pudieron cargar los procesos')))
    );
  }

  obtenerRechazadosVisibles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/rechazados-visibles`, {
      headers: this.getHeaders()
    }).pipe(
      map(res => res.data || res || []),
      catchError(err => throwError(() => err))
    );
  }

  obtenerDetallePago(documentoId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/documentos/${documentoId}`,
      { headers: this.getHeaders() }
    );
  }

  procesarPago(documentoId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/documentos/${documentoId}/subir-documento`,
      formData,
      { headers: this.getHeadersFormData() }
    );
  }

  descargarComprobantePago(documentoId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/documentos/${documentoId}/descargar/pagorealizado`,
      {
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    );
  }

  verArchivoPago(id: string): Observable<Blob> {
  return this.http.get(`/api/tesoreria/pago/${id}/ver`, { responseType: 'blob' });
}

descargarArchivoPago(id: string): Observable<Blob> {
  return this.http.get(`/api/tesoreria/pago/${id}/descargar`, { responseType: 'blob' });
}
}