import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DocumentoContable } from '../models/documento-contable.model'; // ← Importar del modelo

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class ContabilidadService {
  private apiUrl = `${environment.apiUrl}/contabilidad`;

  constructor(private http: HttpClient) {}

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

  // 1. Documentos disponibles
  obtenerDocumentosDisponibles(): Observable<DocumentoContable[]> {
    return this.http.get<any>(`${this.apiUrl}/documentos/disponibles`, { headers: this.getHeaders() }).pipe(
      map(res => this.extractArrayData(res)),
      tap(docs => console.log(`Disponibles: ${docs.length} docs`)),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al cargar disponibles')))
    );
  }

  // 2. Tomar documento
  tomarDocumento(documentoId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/documentos/${documentoId}/tomar`, {}, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => console.log(`Tomado: ${documentoId}`)),
      catchError(err => throwError(() => new Error(err.error?.message || 'No se pudo tomar')))
    );
  }

  // 3. ALIAS para tomarDocumentoParaRevision
  tomarDocumentoParaRevision(documentoId: string): Observable<ApiResponse> {
    return this.tomarDocumento(documentoId);
  }

  // 4. Mis documentos en revisión
  obtenerMisDocumentos(): Observable<DocumentoContable[]> {
    return this.http.get<any>(`${this.apiUrl}/mis-documentos`, { headers: this.getHeaders() }).pipe(
      map(res => this.extractArrayData(res)),
      tap(docs => console.log(`En revisión: ${docs.length} docs`)),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error en revisión')))
    );
  }

  // 5. ALIAS para obtenerDocumentosEnRevision
  obtenerDocumentosEnRevision(): Observable<DocumentoContable[]> {
    return this.obtenerMisDocumentos();
  }

  // 6. Detalle de documento
  obtenerDetalleDocumento(documentoId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/documentos/${documentoId}`, { headers: this.getHeaders() }).pipe(
      tap(() => console.log(`Detalle cargado: ${documentoId}`)),
      catchError(err => throwError(() => new Error(err.error?.message || 'No se pudo cargar detalle')))
    );
  }

  // 7. Definir si tiene glosa
  definirGlosa(documentoId: string, tieneGlosa: boolean): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/documentos/${documentoId}/definir-glosa`, 
      { tieneGlosa }, 
      { headers: this.getHeaders() }
    ).pipe(
      tap(res => console.log(`Glosa definida: ${tieneGlosa}`)),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al definir glosa')))
    );
  }

  // 8. Subir documentos con FormData
  subirDocumentosContabilidad(documentoId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/documentos/${documentoId}/subir-documentos`, formData, {
      headers: this.getHeadersFormData()
    }).pipe(
      tap(res => console.log('Archivos subidos OK:', res)),
      catchError((err: any) => throwError(() => new Error(err.error?.message || 'Error al subir documentos')))
    );
  }

  // 9. Subir documentos con objetos
  subirDocumentos(
    documentoId: string,
    files: { glosa?: File; causacion?: File; extracto?: File; comprobanteEgreso?: File },
    datos: {
      observaciones?: string;
      tipoProceso?: string;
      tieneGlosa?: boolean;
      tipoCausacion?: string;
      estadoFinal?: string;
    }
  ): Observable<any> {
    const formData = new FormData();

    if (files.glosa) formData.append('glosa', files.glosa);
    if (files.causacion) formData.append('causacion', files.causacion);
    if (files.extracto) formData.append('extracto', files.extracto);
    if (files.comprobanteEgreso) formData.append('comprobanteEgreso', files.comprobanteEgreso);

    if (datos.observaciones) formData.append('observaciones', datos.observaciones);
    if (datos.tipoProceso) formData.append('tipoProceso', datos.tipoProceso);
    if (datos.tieneGlosa !== undefined) formData.append('tieneGlosa', JSON.stringify(datos.tieneGlosa));
    if (datos.tipoCausacion) formData.append('tipoCausacion', datos.tipoCausacion);
    if (datos.estadoFinal) formData.append('estadoFinal', datos.estadoFinal);

    return this.http.post<any>(`${this.apiUrl}/documentos/${documentoId}/subir-documentos`, formData, {
      headers: this.getHeadersFormData()
    }).pipe(
      tap(res => console.log('Archivos subidos OK:', res)),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al subir documentos')))
    );
  }

  // 10. Finalizar revisión
  finalizarRevision(
    documentoId: string,
    estado: string,
    observaciones: string = ''
  ): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/documentos/${documentoId}/finalizar`, 
      { estado, observaciones }, 
      { headers: this.getHeaders() }
    ).pipe(
      tap(res => console.log(`Finalizado: ${estado}`)),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al finalizar')))
    );
  }

  // 11. Liberar
  liberarDocumento(documentoId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/documentos/${documentoId}/liberar`, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => console.log(`Liberado: ${documentoId}`)),
      catchError(err => throwError(() => new Error(err.error?.message || 'No se pudo liberar')))
    );
  }

  // 12. Historial
  getHistorial(): Observable<any[]> {
    console.log('📊 [CONTABILIDAD] Solicitando historial...');
    
    return this.http.get<any>(`${this.apiUrl}/historial`, { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => {
        console.log('[CONTABILIDAD] Respuesta historial RAW:', response);
        
        if (response && response.ok === true && response.data) {
          if (Array.isArray(response.data)) {
            return response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            return response.data.data;
          }
        }
        
        if (response && response.success === true && Array.isArray(response.data)) {
          return response.data;
        }
        
        if (Array.isArray(response)) {
          return response;
        }
        
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        
        return [];
      }),
      tap(hist => console.log(`Historial: ${hist.length} registros`)),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al cargar historial')))
    );
  }

  // 13. Mis auditorías
  obtenerMisAuditorias(): Observable<any[]> {
    return this.getHistorial();
  }

  // 14. Vista documento
  obtenerVistaDocumento(documentoId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/documentos/${documentoId}/vista`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(err => throwError(() => new Error(err.error?.message || 'Error en vista')))
    );
  }

  // 15. Descargar archivo contabilidad
  descargarArchivoContabilidad(documentoId: string, tipo: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/${documentoId}/descargar/${tipo}`, {
      responseType: 'blob',
      headers: this.getHeaders()
    }).pipe(
      catchError(err => throwError(() => new Error('No se pudo descargar')))
    );
  }

  // 16. Previsualizar archivo contabilidad
  previsualizarArchivoContabilidad(documentoId: string, tipo: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/${documentoId}/archivo/${tipo}`, {
      responseType: 'blob',
      headers: this.getHeaders()
    }).pipe(
      catchError(err => throwError(() => new Error('No se pudo previsualizar')))
    );
  }

  // 17. Descargar archivo radicado
  descargarArchivoRadicado(documentoId: string, numeroArchivo: number): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/documentos/${documentoId}/descargar-radicado/${numeroArchivo}`,
      {
        responseType: 'blob',
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(err => throwError(() => new Error('No se pudo descargar archivo radicado')))
    );
  }

  // 18. Previsualizar archivo radicado
  previsualizarArchivoRadicado(documentoId: string, numeroArchivo: number): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/documentos/${documentoId}/preview/${numeroArchivo}`,
      {
        responseType: 'blob',
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(err => throwError(() => new Error('No se pudo previsualizar archivo radicado')))
    );
  }

  // 19. Rechazados visibles
  obtenerRechazadosVisibles(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/rechazados-visibles`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('[RECHAZADOS-VISIBLES] Respuesta:', response);
        return response.data || response || [];
      }),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al cargar rechazados')))
    );
  }

  // Helpers
  private extractArrayData(response: any): DocumentoContable[] {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    if (response?.documentos && Array.isArray(response.documentos)) return response.documentos;
    if (response?.success && Array.isArray(response.data)) return response.data;
    return [];
  }
}