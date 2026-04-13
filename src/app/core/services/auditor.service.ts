import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Documento } from '../models/documento.model';

interface HistorialResponse {
  data?: any[];
  historial?: any[];
  items?: any[];
  [key: string]: any;
}

interface ApiResponse {
  success?: boolean;
  data?: any;
  message?: string;
  ok?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuditorService {
  private apiUrl = `${environment.apiUrl}/auditor`;
  private baseUrl = `${environment.apiUrl}/auditor`;
  private juridicaUrl = `${environment.apiUrl}/juridica`;

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

    if (userId) {
      return headers.set('X-Auditor-Id', userId);
    }

    return headers;
  }

  private getToken(): string {
    const token = localStorage.getItem('access_token')
      || localStorage.getItem('token')
      || '';
    if (!token) {
      console.warn('[AuditorService] No se encontró token en localStorage');
    }
    return token;
  }

  // ────────────────────────────────────────────────────────────────
  // MÉTODOS PÚBLICOS - VER Y DESCARGAR (sin token, sin interceptor)
  // ────────────────────────────────────────────────────────────────

  previsualizarArchivoAuditor(documentoId: string, tipo: string): void {
    const url = `${this.apiUrl}/documentos/${documentoId}/archivo-auditor/${tipo}`;
    console.log('[PREVISUALIZAR PUBLICO]', url);
    window.open(url, '_blank');
  }

  descargarArchivoAuditorDirecto(documentoId: string, tipo: string, nombreSugerido?: string): void {
    const url = `${this.apiUrl}/documentos/${documentoId}/descargar-auditor/${tipo}`;
    console.log('[DESCARGA DIRECTA PUBLICA]', url);

    const a = document.createElement('a');
    a.href = url;
    a.download = nombreSugerido || `${tipo.toUpperCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  descargarArchivoAuditorBlob(documentoId: string, tipo: string): Observable<Blob> {
    const url = `${this.apiUrl}/documentos/${documentoId}/descargar-auditor/${tipo}`;
    console.log('[DESCARGA PUBLICA BLOB]', url);

    return this.http.get(url, { responseType: 'blob' }).pipe(
      tap(() => console.log(`[DESCARGA OK] ${tipo}`)),
      catchError(err => {
        console.error(`[DESCARGA PUBLICA ERROR] ${tipo}:`, err);
        return throwError(() => err);
      })
    );
  }

  descargarTodosArchivosAuditor(documentoId: string): void {
    const tipos = ['rp', 'cdp', 'poliza', 'certificadoBancario', 'minuta', 'actaInicio'];
    tipos.forEach((tipo, index) => {
      setTimeout(() => {
        this.descargarArchivoAuditorDirecto(documentoId, tipo);
      }, index * 800);
    });
  }

  abrirTodosArchivosAuditor(documentoId: string): void {
    const tipos = ['rp', 'cdp', 'poliza', 'certificadoBancario', 'minuta', 'actaInicio'];
    tipos.forEach((tipo, index) => {
      setTimeout(() => {
        this.previsualizarArchivoAuditor(documentoId, tipo);
      }, index * 600);
    });
  }

  // ────────────────────────────────────────────────────────────────
  // MÉTODOS PARA OBTENER DATOS DEL CONTRATO Y CONTRATISTA
  // ────────────────────────────────────────────────────────────────

 
  /**
   * Obtiene los documentos del contrato (RP, CDP, etc.)
   */
  obtenerDocumentosContrato(numeroContrato: string): Observable<any[]> {
    return this.obtenerContratoPorNumero(numeroContrato).pipe(
      map(contrato => contrato?.documentos || [])
    );
  }

  /**
   * Obtiene documento específico del contrato por tipo (RP o CDP)
   */
  obtenerDocumentoContratoPorTipo(numeroContrato: string, tipo: 'RP' | 'CDP'): Observable<any> {
    return this.obtenerDocumentosContrato(numeroContrato).pipe(
      map(documentos => {
        return documentos.find((d: any) => 
          d.tipoDocumento === tipo || 
          d.tipoDocumento?.toUpperCase() === tipo ||
          d.nombreArchivo?.toLowerCase().includes(tipo.toLowerCase())
        );
      })
    );
  }

  // ────────────────────────────────────────────────────────────────
  // MÉTODOS PROTEGIDOS - CON TOKEN
  // ────────────────────────────────────────────────────────────────

  obtenerPendientesParaAuditoria(): Observable<any[]> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/documentos/disponibles`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: ApiResponse) => {
        const docs = Array.isArray(response) ? response : ((response as any)?.data || []);
        return docs.filter((doc: any) => {
          const estado = doc.estado?.toUpperCase() || '';
          return estado === 'RADICADO';
        });
      }),
      catchError(err => {
        console.error('[AuditorService] Error cargando pendientes para auditoría:', err);
        return of([]);
      })
    );
  }

  tomarDocumentoParaRevision(documentoId: string): Observable<any> {
    const url = `${this.apiUrl}/documentos/${documentoId}/tomar`;
    console.log('[SERVICE] Intentando tomar documento:', url);

    return this.http.post<any>(url, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(res => console.log('[SERVICE] Tomar OK:', res)),
      catchError(err => {
        console.error('[SERVICE] Error al tomar documento:', err);
        return throwError(() => err);
      })
    );
  }

  refrescarPendientes(): Observable<any[]> {
    return this.obtenerPendientesParaAuditoria();
  }

  obtenerDocumentoPorId(id: string): Observable<Documento> {
    return this.http.get<Documento>(`${this.baseUrl}/documentos/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  descargarArchivoRadicado(documentoId: string, numeroArchivo: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/documentos/${documentoId}/descargar-radicado/${numeroArchivo}`,
      { responseType: 'blob', headers: this.getAuthHeaders() }
    );
  }

  guardarRevisionConArchivos(documentoId: string, datosRevision: any, archivos?: FormData): Observable<any> {
    if (archivos) {
      const formData = archivos;
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

    return this.guardarRevision(documentoId, datosRevision);
  }

  guardarRevision(documentoId: string, datosRevision: any): Observable<any> {
    console.log('[AuditorService] Guardando revisión:', { documentoId, datosRevision });

    if (!datosRevision.estado) {
      throw new Error('El estado es requerido');
    }

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

  obtenerEstadisticas(): Observable<any> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/estadisticas`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: ApiResponse) => (response as any) || { totalDocumentosDisponibles: 0, misDocumentos: { total: 0 } }),
      catchError(err => {
        console.error('Error estadísticas:', err);
        return of({ totalDocumentosDisponibles: 0, misDocumentos: { total: 0 } });
      })
    );
  }

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

  liberarDocumento(documentoId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/documentos/${documentoId}/liberar`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(err => {
      console.error('Error liberando documento:', err);
      throw err;
    }));
  }

  obtenerHistorial(): Observable<any[]> {
    console.log('[AUDITOR SERVICE] Solicitando historial...');

    return this.http.get<ApiResponse>(`${this.baseUrl}/historial`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: ApiResponse) => {
        // CASO 1: Si la respuesta es directamente un array
        if (Array.isArray(response)) {
          return response;
        }

        const resp = response as any;
        
        // CASO 2: Si la respuesta tiene propiedad 'data' que es array
        if (resp && typeof resp === 'object') {
          if (resp.data && Array.isArray(resp.data)) {
            return resp.data;
          }
          if (resp.historial && Array.isArray(resp.historial)) {
            return resp.historial;
          }
          if (resp.items && Array.isArray(resp.items)) {
            return resp.items;
          }

          // Buscar cualquier propiedad que sea array
          const possibleArrays: any[][] = [];
          Object.keys(resp).forEach(key => {
            const value = resp[key];
            if (Array.isArray(value)) {
              possibleArrays.push(value);
            }
          });

          if (possibleArrays.length > 0) {
            return possibleArrays[0];
          }
        }

        return [];
      }),
      catchError((error: any) => {
        console.error('[AUDITOR SERVICE] Error obteniendo historial:', error);
        return of([]);
      })
    );
  }

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
      map(response => response || []),
      catchError(err => {
        console.error('[AuditorService] Error en mis-auditorias:', err);
        return of([]);
      })
    );
  }

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

  asignarDocumento(id: string): Observable<any> {
    return this.tomarParaRevision(id);
  }

  obtenerDocumentoParaVista(id: string, esDesdeContabilidad: boolean = false): Observable<any> {
    const params: any = {};
    if (esDesdeContabilidad) {
      params.vistaDesde = 'contabilidad';
      params.soloLectura = 'true';
    }

    return this.http.get<ApiResponse>(`${this.apiUrl}/documentos/${id}/vista`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      map((response: ApiResponse) => (response as any)?.data || response),
      catchError(err => {
        console.error('[AuditorService] Error en /vista:', err);
        return of(null);
      })
    );
  }

  verificarArchivosExistentes(documentoId: string): Observable<any> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/documentos/${documentoId}/vista`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: ApiResponse) => {
        const archivosAuditor = (response as any)?.data?.archivosAuditor || [];
        return archivosAuditor.filter((archivo: any) => archivo.subido);
      }),
      catchError(err => {
        console.error('[AuditorService] Error verificando archivos:', err);
        return of([]);
      })
    );
  }

  obtenerEstadoArchivos(documentoId: string): Observable<any> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/documentos/${documentoId}/estado-archivos`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: ApiResponse) => (response as any)?.data || response),
      catchError(err => {
        console.error('[AuditorService] Error obteniendo estado de archivos:', err);
        return of(null);
      })
    );
  }

  registrarDecisionConArchivos(documentoId: string, datos: {
    estado: string;
    observaciones: string;
    archivos?: FormData;
  }): Observable<any> {
    console.log('[AuditorService] Registrando decisión con archivos:', datos.estado);

    if (!datos.archivos) {
      return this.guardarRevision(documentoId, {
        estado: datos.estado,
        observaciones: datos.observaciones
      });
    }

    const formData = datos.archivos;
    formData.append('estado', datos.estado);
    formData.append('observaciones', datos.observaciones);

    return this.http.post<any>(
      `${this.baseUrl}/documentos/${documentoId}/revision-completa`,
      formData,
      { headers: this.getAuthHeaders().delete('Content-Type') }
    ).pipe(
      catchError(err => {
        console.error('[AuditorService] Error en revision-completa:', err);
        console.log('[AuditorService] Intentando método secuencial...');
        return this.guardarRevision(documentoId, {
          estado: datos.estado,
          observaciones: datos.observaciones
        });
      })
    );
  }

  subirArchivosDeAuditoria(documentoId: string, archivos: { [key: string]: File }): Observable<any> {
    const formData = new FormData();

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
        return throwError(() => err);
      })
    );
  }

  registrarDecisionCompleta(documentoId: string, formData: FormData): Observable<any> {
    console.log('[AuditorService] Enviando a revision-completa endpoint');

    formData.append('timestamp', new Date().toISOString());

    return this.http.post<any>(
      `${this.baseUrl}/documentos/${documentoId}/revision-completa`,
      formData,
      {
        headers: this.getAuthHeaders().delete('Content-Type'),
        reportProgress: true
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
        return throwError(() => err);
      })
    );
  }

  previsualizarArchivoRadicado(documentoId: string, numeroArchivo: number): void {
    const url = `${this.apiUrl}/documentos/${documentoId}/descargar-radicado/${numeroArchivo}?download=false`;
    console.log('[PREVISUALIZAR RADICADO]', url);
    window.open(url, '_blank');
  }

  descargarArchivoAuditor(documentoId: string, tipo: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/documentos/${documentoId}/descargar-auditor/${tipo}?download=true`,
      { responseType: 'blob', headers: this.getAuthHeaders() }
    );
  }

  getTodosDocumentos(): Observable<any[]> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/todos-documentos`, { headers: this.getAuthHeaders() }).pipe(
      map((response: ApiResponse) => {
        const data = (response as any)?.data || response || [];
        return Array.isArray(data) ? data : [];
      }),
      catchError(err => {
        console.error('[SERVICE] Error obteniendo todos los documentos:', err);
        return throwError(() => new Error('No se pudieron cargar todos los documentos'));
      })
    );
  }



obtenerContratoPorNumero(numeroContrato: string): Observable<any> {
  console.log('[AuditorService] Buscando contrato:', numeroContrato);
  return this.http.get(`${this.juridicaUrl}/contratos/numero/${numeroContrato}`, {
    headers: this.getAuthHeaders()
  }).pipe(
    map((response: any) => {
      console.log('[AuditorService] Respuesta contrato:', response);
      return response?.data || response;
    }),
    catchError(err => {
      console.error('[AuditorService] Error obteniendo contrato:', err);
      return of(null);
    })
  );
}



obtenerContratistaPorNumeroContrato(numeroContrato: string): Observable<any> {
  console.log('[AuditorService] Buscando contratista por contrato:', numeroContrato);
  
  return this.http.get(`${environment.apiUrl}/contratistas/buscar-por-contrato/${numeroContrato}`, {
    headers: this.getAuthHeaders()
  }).pipe(
    map((response: any) => {
      console.log('[AuditorService] Respuesta COMPLETA:', response);
      
      // ✅ La estructura correcta es response.data.data.data
      let contratista = response?.data?.data?.data || 
                        response?.data?.data || 
                        response?.data || 
                        response;
      
      // Si es un array, tomar el primero
      if (Array.isArray(contratista) && contratista.length > 0) {
        contratista = contratista[0];
      }
      
      console.log('[AuditorService] Contratista extraído:', contratista?.razonSocial);
      console.log('[AuditorService] Documentos encontrados:', contratista?.documentos?.length || 0);
      
      if (contratista?.documentos && contratista.documentos.length > 0) {
        console.log('[AuditorService] Tipos de documentos:', contratista.documentos.map((d: any) => d.tipo).join(', '));
      }
      
      return contratista;
    }),
    catchError(err => {
      console.error('[AuditorService] Error:', err);
      return of(null);
    })
  );
}


}