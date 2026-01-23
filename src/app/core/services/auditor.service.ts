import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Documento } from '../models/documento.model';

@Injectable({
  providedIn: 'root'
})
export class AuditorService {
  private apiUrl = `${environment.apiUrl}/auditor`;
  private baseUrl = `${environment.apiUrl}/auditor`; // Agrega esta propiedad

  constructor(private http: HttpClient) { }

  // Headers de autenticación
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    return new HttpHeaders({
      Authorization: authToken,
      'Content-Type': 'application/json'
    });
  }

  /**
   * 🔹 Obtiene los documentos aprobados por supervisor y pendientes para auditoría
   */
  obtenerPendientesParaAuditoria(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/documentos/disponibles`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // El backend devuelve { success: true, data: [...] } o array directo
        const docs = Array.isArray(response) ? response : (response?.data || []);

        // Filtrar solo documentos aprobados por supervisor
        return docs.filter((doc: any) => {
          const estado = doc.estado?.toUpperCase() || '';
          return estado.includes('APROBADO') &&
            (estado.includes('SUPERVISOR') || estado.includes('APROBADO_SUPERVISOR'));
        });
      }),
      catchError(err => {
        console.error('[AuditorService] Error cargando pendientes para auditoría:', err);
        return of([]);
      })
    );
  }

  /**
   * Tomar un documento para auditoría
   */
  tomarDocumentoParaRevision(documentoId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/documentos/${documentoId}/tomar`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(err => {
      console.error('Error tomando documento:', err);
      throw err;
    }));
  }

  /**
   * Obtener un documento por ID
   */
  obtenerDocumentoPorId(id: string): Observable<Documento> {
    return this.http.get<Documento>(`${this.baseUrl}/documentos/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Descargar archivo radicado
   */
  descargarArchivoRadicado(documentoId: string, numeroArchivo: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/documentos/${documentoId}/descargar-radicado/${numeroArchivo}`,
      { responseType: 'blob', headers: this.getAuthHeaders() }
    );
  }

  /**
   * Descargar archivo de auditoría
   */
  descargarArchivoAuditor(documentoId: string, tipo: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/documentos/${documentoId}/descargar-auditor/${tipo}`,
      { responseType: 'blob', headers: this.getAuthHeaders() }
    );
  }

  /**
   * Guardar revisión del auditor
   */
  guardarRevision(documentoId: string, datosRevision: any): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/documentos/${documentoId}/revisar`,
      datosRevision,
      { headers: this.getAuthHeaders() }
    ).pipe(catchError(err => {
      console.error('Error revisando documento:', err);
      throw err;
    }));
  }

  /**
   * Obtener estadísticas
   */
  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/estadisticas`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response || { totalDocumentosDisponibles: 0, misDocumentos: { total: 0 } }),
      catchError(err => {
        console.error('Error estadísticas:', err);
        return of({ totalDocumentosDisponibles: 0, misDocumentos: { total: 0 } });
      })
    );
  }

  /**
   * Obtener documentos en revisión por el auditor actual
   */
  obtenerDocumentosEnRevision(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/mis-documentos`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response || []),
      catchError(err => {
        console.error('Error mis documentos:', err);
        return of([]);
      })
    );
  }

  /**
   * Subir documentos del auditor
   */
  subirDocumentosAuditor(documentoId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/documentos/${documentoId}/subir-documentos`,
      formData,
      { headers: this.getAuthHeaders().delete('Content-Type') }
    ).pipe(catchError(err => {
      console.error('Error subiendo documentos auditor:', err);
      throw err;
    }));
  }

  /**
   * Liberar documento (dejar de revisarlo)
   */
  liberarDocumento(documentoId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/documentos/${documentoId}/liberar`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(err => {
      console.error('Error liberando documento:', err);
      throw err;
    }));
  }

  /**
   * Obtener historial de auditoría
   */
  obtenerHistorial(): Observable<any> {
    return this.http.get(`${this.baseUrl}/historial`, { headers: this.getAuthHeaders() });
  }

  /**
   * Métodos simplificados (usando apiUrl)
   */
  obtenerDocumentoParaAuditoria(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/documento/${id}`, { headers: this.getAuthHeaders() });
  }

  obtenerDocumentosPendientes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/documentos`, { headers: this.getAuthHeaders() });
  }

  aprobarDocumento(id: string, observacion: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/documento/${id}/aprobar`, { observacion }, {
      headers: this.getAuthHeaders()
    });
  }

  rechazarDocumento(id: string, observacion: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/documento/${id}/rechazar`, { observacion }, {
      headers: this.getAuthHeaders()
    });
  }

  tomarParaRevision(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/documento/${id}/tomar-revision`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  liberarRevision(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/documento/${id}/liberar`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  obtenerMisAuditorias(): Observable<any[]> {
    console.log('[AuditorService] Llamando a /auditor/mis-auditorias');
    return this.http.get<any[]>(`${this.apiUrl}/mis-auditorias`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        console.log('[AuditorService] Respuesta cruda de mis-auditorias:', response);
        return response || [];
      }),
      catchError(err => {
        console.error('[AuditorService] Error en mis-auditorias:', err);
        return of([]);
      })
    );
  }

  /**
 * ✅ Tomar documento para auditoría
 */
  tomarDocumentoParaAuditoria(id: string): Observable<any> {
    const url = `${this.apiUrl}/documento/${id}/tomar-revision`;

    console.log('📋 Tomando documento para auditoría:', url);

    return this.http.post(url, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('❌ Error tomando documento para auditoría:', error);
        throw error;
      })
    );
  }

  /**
   * ✅ Alternativa: Tomar documento usando el método existente
   */
  asignarDocumento(id: string): Observable<any> {
    // Usa el método existente 'tomarParaRevision'
    return this.tomarParaRevision(id);
  }

  obtenerDocumentoParaVista(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/documentos/${id}/vista`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => res?.data || res),
      catchError(err => {
        console.error('[AuditorService] Error en /vista:', err);
        return of(null);
      })
    );
  }

  /**
 * Verificar archivos existentes en el servidor para primer radicado
 */
  verificarArchivosExistentes(documentoId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/documentos/${documentoId}/vista`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        const archivosAuditor = response?.data?.archivosAuditor || [];
        return archivosAuditor.filter((archivo: any) => archivo.subido);
      }),
      catchError(err => {
        console.error('[AuditorService] Error verificando archivos:', err);
        return of([]);
      })
    );
  }

  // En tu auditor.service.ts (Angular), agregar este método:

  /**
   * ✅ Obtener estado de archivos de auditoría
   */
  obtenerEstadoArchivos(documentoId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/documentos/${documentoId}/estado-archivos`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response?.data || response),
      catchError(err => {
        console.error('[AuditorService] Error obteniendo estado de archivos:', err);
        return of(null);
      })
    );
  }

  
}