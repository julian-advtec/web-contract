import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Documento } from '../models/documento.model';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuditorService {
  private apiUrl = `${environment.apiUrl}/auditor`;
  private baseUrl = `${environment.apiUrl}/auditor`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    const userJson = localStorage.getItem('user');
    const userId = userJson ? JSON.parse(userJson).id : null;
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    const headers = new HttpHeaders({
      Authorization: authToken,
      'Content-Type': 'application/json'
    });

    // Agregar auditor ID si existe
    if (userId) {
      return headers.set('X-Auditor-Id', userId);
    }

    return headers;
  }

  /**
   * 🔹 Obtiene los documentos aprobados por supervisor y pendientes para auditoría
   */
  obtenerPendientesParaAuditoria(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/documentos/disponibles`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        const docs = Array.isArray(response) ? response : (response?.data || []);
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
    const url = `${this.apiUrl}/documentos/${documentoId}/tomar`;

    console.log('[SERVICE] Intentando tomar documento:', url);

    return this.http.post<any>(url, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(res => console.log('[SERVICE] Tomar OK:', res)),
      catchError(err => {
        console.error('[SERVICE] Error al tomar documento:', {
          status: err.status,
          message: err.error?.message || err.message,
          url: err.url
        });
        return throwError(() => err);
      })
    );
  }

  // Método auxiliar para refrescar después de tomar
  refrescarPendientes(): Observable<any[]> {
    return this.obtenerPendientesParaAuditoria();
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
   * Guardar revisión del auditor CON archivos
   * Esta versión permite enviar la decisión Y archivos al mismo tiempo
   */
  guardarRevisionConArchivos(documentoId: string, datosRevision: any, archivos?: FormData): Observable<any> {
    // Si hay archivos, usar FormData
    if (archivos) {
      const formData = archivos;
      // Agregar los datos de revisión al FormData
      Object.keys(datosRevision).forEach(key => {
        formData.append(key, datosRevision[key]);
      });

      return this.http.post<any>(
        `${this.baseUrl}/documentos/${documentoId}/revisar-con-archivos`,
        formData,
        { headers: this.getAuthHeaders().delete('Content-Type') }
      ).pipe(catchError(err => {
        console.error('Error revisando documento con archivos:', err);
        throw err;
      }));
    }

    // Si no hay archivos, usar el método normal
    return this.guardarRevision(documentoId, datosRevision);
  }

  /**
   * Guardar revisión del auditor (sin archivos)
   */
  guardarRevision(documentoId: string, datosRevision: any): Observable<any> {
    console.log('[AuditorService] Guardando revisión:', { documentoId, datosRevision });

    // Validar datos
    if (!datosRevision.estado) {
      throw new Error('El estado es requerido');
    }

    // Si es OBSERVADO o RECHAZADO, requerir observaciones
    if (['OBSERVADO', 'RECHAZADO'].includes(datosRevision.estado) &&
      (!datosRevision.observaciones || datosRevision.observaciones.trim() === '')) {
      throw new Error('Se requieren observaciones para este estado');
    }

    return this.http.put<any>(
      `${this.baseUrl}/documentos/${documentoId}/revisar`,
      datosRevision,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(err => {
        console.error('[AuditorService] Error revisando documento:', err);

        // Proporcionar mensaje de error más útil
        let mensajeError = 'Error al guardar la revisión';
        if (err.status === 400) {
          mensajeError = err.error?.message || 'Datos de revisión inválidos';
        } else if (err.status === 403) {
          mensajeError = 'No tienes permisos para revisar este documento';
        } else if (err.status === 404) {
          mensajeError = 'Documento no encontrado';
        }

        throw new Error(mensajeError);
      })
    );
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

  /**
   * ✅ Método para enviar decisión con FormData (archivos incluidos)
   */
  registrarDecisionConArchivos(documentoId: string, datos: {
    estado: string;
    observaciones: string;
    archivos?: FormData;
  }): Observable<any> {

    console.log('[AuditorService] Registrando decisión con archivos:', datos.estado);

    // Si no hay archivos, usar el método normal
    if (!datos.archivos) {
      return this.guardarRevision(documentoId, {
        estado: datos.estado,
        observaciones: datos.observaciones
      });
    }

    // Agregar los datos de decisión al FormData
    const formData = datos.archivos;
    formData.append('estado', datos.estado);
    formData.append('observaciones', datos.observaciones);

    console.log('[AuditorService] Enviando FormData con archivos y decisión');

    return this.http.post<any>(
      `${this.baseUrl}/documentos/${documentoId}/revision-completa`,
      formData,
      { headers: this.getAuthHeaders().delete('Content-Type') }
    ).pipe(
      catchError(err => {
        console.error('[AuditorService] Error en revision-completa:', err);

        // Si falla, intentar método secuencial
        console.log('[AuditorService] Intentando método secuencial...');
        return this.guardarRevision(documentoId, {
          estado: datos.estado,
          observaciones: datos.observaciones
        });
      })
    );
  }

  /**
   * ✅ Nueva función para subir archivos de auditoría
   */
  subirArchivosDeAuditoria(documentoId: string, archivos: { [key: string]: File }): Observable<any> {
    const formData = new FormData();

    // Agregar archivos al FormData
    Object.entries(archivos).forEach(([tipo, archivo]) => {
      if (archivo) {
        formData.append(tipo, archivo);
      }
    });

    return this.http.post<any>(
      `${this.baseUrl}/documentos/${documentoId}/subir-auditoria`,
      formData,
      { headers: this.getAuthHeaders().delete('Content-Type') }
    ).pipe(catchError(err => {
      console.error('Error subiendo archivos de auditoría:', err);
      throw err;
    }));
  }

  /**
 * ✅ Método para enviar decisión y archivos en una sola petición
 */


  /**
   * ✅ Método simplificado para subir archivos
   */
subirArchivosAuditor(documentoId: string, formData: FormData): Observable<any> {
  console.log('[SERVICE] Enviando FormData a /subir-auditoria');

  return this.http.post<any>(
    `${this.baseUrl}/documentos/${documentoId}/subir-auditoria`,
    formData,
    {
      headers: this.getAuthHeaders().delete('Content-Type')
    }
  ).pipe(
    tap(response => {
      console.log('[SERVICE] Respuesta exitosa de subir-auditoria:', response);
    }),
    catchError(err => {
      console.error('[SERVICE] Error subiendo archivos auditor:', err);
      return throwError(() => err);  // o new Error('Mensaje personalizado')
    })
  );
}

  /**
 * ✅ Método para enviar decisión y archivos en una sola petición
 */
  registrarDecisionCompleta(documentoId: string, formData: FormData): Observable<any> {
    console.log('[AuditorService] Enviando a revision-completa endpoint');

    // Agregar timestamp para debugging
    formData.append('timestamp', new Date().toISOString());

    return this.http.post<any>(
      `${this.baseUrl}/documentos/${documentoId}/revision-completa`,
      formData,
      {
        headers: this.getAuthHeaders().delete('Content-Type'),
        reportProgress: true // Para debugging
      }
    ).pipe(
      tap(response => {
        console.log('[AuditorService] Respuesta exitosa:', response);
      }),
      catchError(err => {
        console.error('[AuditorService] Error en revision-completa:', {
          status: err.status,
          statusText: err.statusText,
          error: err.error,
          url: err.url
        });

        // Reintentar con método simple si falla
        return throwError(() => err);
      })
    );
  }
}