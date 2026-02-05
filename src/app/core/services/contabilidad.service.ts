import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DocumentoContable, ApiResponse } from '../models/documento-contable.model';

@Injectable({
    providedIn: 'root'
})
export class ContabilidadService {
    private apiUrl = `${environment.apiUrl}/contabilidad`;

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

    private extractDocumentos(response: any): DocumentoContable[] {
        if (!response) return [];

        if (Array.isArray(response)) {
            return response;
        }

        if (response.success !== false) {
            if (response.data && Array.isArray(response.data)) {
                return response.data;
            } else if (response.documentos && Array.isArray(response.documentos)) {
                return response.documentos;
            }
        }
        return [];
    }

    getHistorial(): Observable<{ success: boolean; data: any[] }> {
        const headers = this.getHeaders();
        console.log('📊 [CONTABILIDAD] Solicitando historial...');

        return this.http.get<any>(`${this.apiUrl}/historial`, { headers }).pipe(
            map(response => {
                console.log('📊 [CONTABILIDAD] Respuesta historial:', response);

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

                console.log(`✅ [CONTABILIDAD] ${historial.length} registros de historial recibidos`);
                return { success: true, data: historial };
            }),
            catchError(error => {
                console.error('❌ [CONTABILIDAD] Error obteniendo historial:', error);
                return throwError(() => new Error(`Error obteniendo historial: ${error.message}`));
            })
        );
    }

    obtenerDocumentosDisponibles(): Observable<DocumentoContable[]> {
        return this.http.get<ApiResponse<DocumentoContable[]> | DocumentoContable[]>(
            `${this.apiUrl}/documentos/disponibles`,
            { headers: this.getHeaders() }
        ).pipe(
            map((response: ApiResponse<DocumentoContable[]> | DocumentoContable[]) => {
                return this.extractDocumentos(response);
            }),
            catchError(err => {
                console.error('Error obteniendo documentos contables:', err);
                return throwError(() => new Error(err.error?.message || 'No se pudieron cargar los documentos'));
            })
        );
    }

    tomarDocumentoParaRevision(documentoId: string): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(
            `${this.apiUrl}/documentos/${documentoId}/tomar`,
            {},
            { headers: this.getHeaders() }
        ).pipe(
            tap(response => console.log(`Documento ${documentoId} tomado:`, response)),
            catchError(err => throwError(() => new Error(err.error?.message || 'Error al tomar documento')))
        );
    }

    obtenerDocumentosEnRevision(): Observable<DocumentoContable[]> {
        return this.http.get<ApiResponse<DocumentoContable[]> | DocumentoContable[]>(
            `${this.apiUrl}/mis-documentos`,
            { headers: this.getHeaders() }
        ).pipe(
            map((response: ApiResponse<DocumentoContable[]> | DocumentoContable[]) => {
                return this.extractDocumentos(response);
            }),
            catchError(err => {
                console.error('Error obteniendo documentos en revisión:', err);
                return throwError(() => new Error(err.error?.message || 'No se pudieron cargar los documentos'));
            })
        );
    }

    obtenerDetalleDocumento(documentoId: string): Observable<ApiResponse<DocumentoContable>> {
        return this.http.get<ApiResponse<DocumentoContable>>(
            `${this.apiUrl}/documentos/${documentoId}`,
            { headers: this.getHeaders() }
        ).pipe(
            catchError(err => throwError(() => new Error(err.error?.message || 'Error al obtener detalle')))
        );
    }

    definirGlosa(documentoId: string, tieneGlosa: boolean): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(
            `${this.apiUrl}/documentos/${documentoId}/definir-glosa`,
            { tieneGlosa },
            { headers: this.getHeaders() }
        ).pipe(
            catchError(err => throwError(() => new Error(err.error?.message || 'Error al definir glosa')))
        );
    }

    subirDocumentosContabilidad(
        documentoId: string,
        formData: FormData
    ): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(
            `${this.apiUrl}/documentos/${documentoId}/subir-documentos`,
            formData,
            { headers: this.getHeadersFormData() }
        ).pipe(
            tap(response => console.log('Archivos subidos:', response)),
            catchError(err => {
                console.error('Error al subir documentos:', err);
                return throwError(() => new Error(err.error?.message || 'No se pudieron subir los archivos'));
            })
        );
    }

    finalizarRevision(
        documentoId: string,
        estado: string,
        observaciones?: string
    ): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(
            `${this.apiUrl}/documentos/${documentoId}/finalizar`,
            { estado, observaciones },
            { headers: this.getHeaders() }
        ).pipe(
            catchError(err => throwError(() => new Error(err.error?.message || 'Error al finalizar revisión')))
        );
    }

    liberarDocumento(documentoId: string): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(
            `${this.apiUrl}/documentos/${documentoId}/liberar`,
            { headers: this.getHeaders() }
        ).pipe(
            catchError(err => throwError(() => new Error(err.error?.message || 'Error al liberar documento')))
        );
    }

    previsualizarArchivoContabilidad(documentoId: string, tipo: string): Observable<Blob> {
        const url = `${this.apiUrl}/documentos/${documentoId}/descargar/${tipo}`;

        return this.http.get(url, {
            responseType: 'blob',
            headers: this.getHeaders()
        }).pipe(
            tap(() => console.log(`[PREVISUALIZAR CONTABILIDAD] Éxito: ${tipo}`)),
            catchError(err => {
                console.error(`[PREVISUALIZAR CONTABILIDAD] Error ${tipo}:`, err);
                return throwError(() => new Error('No se pudo previsualizar el archivo de contabilidad'));
            })
        );
    }

    descargarArchivoContabilidad(documentoId: string, tipo: string): Observable<Blob> {
        const url = `${this.apiUrl}/documentos/${documentoId}/descargar/${tipo}`;

        return this.http.get(url, {
            responseType: 'blob',
            headers: this.getHeaders()
        }).pipe(
            tap(() => console.log(`[DESCARGA CONTABILIDAD] Éxito: ${tipo}`)),
            catchError(err => {
                console.error(`[DESCARGA CONTABILIDAD] Error ${tipo}:`, err);
                return throwError(() => new Error('No se pudo descargar el archivo de contabilidad'));
            })
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
            catchError(err => {
                console.error('Error descargando archivo radicado:', err);
                return throwError(() => new Error('No se pudo descargar el archivo'));
            })
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
            catchError(err => {
                console.error('Error previsualizando archivo:', err);
                return throwError(() => new Error('No se pudo previsualizar el archivo'));
            })
        );
    }

    obtenerVistaDocumento(documentoId: string): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(
            `${this.apiUrl}/documentos/${documentoId}/vista`,
            { headers: this.getHeaders() }
        ).pipe(
            catchError(err => throwError(() => new Error(err.error?.message || 'Error al obtener vista')))
        );
    }

    obtenerMisAuditorias(): Observable<DocumentoContable[]> {
        return this.http.get<ApiResponse<DocumentoContable[]> | DocumentoContable[]>(
            `${this.apiUrl}/mis-auditorias`,
            { headers: this.getHeaders() }
        ).pipe(
            map((response: ApiResponse<DocumentoContable[]> | DocumentoContable[]) => {
                return this.extractDocumentos(response);
            }),
            catchError(err => {
                console.error('Error obteniendo mis auditorías:', err);
                return throwError(() => new Error(err.error?.message || 'No se pudieron cargar las auditorías'));
            })
        );
    }

    obtenerEstadisticas(): Observable<any> {
        const headers = this.getHeaders();
        console.log('📊 [CONTABILIDAD] Solicitando estadísticas...');

        return this.http.get<any>(`${this.apiUrl}/estadisticas`, { headers }).pipe(
            map(response => {
                console.log('📊 [CONTABILIDAD] Respuesta de estadísticas:', response);

                if (response?.ok === true && response.data) {
                    return response.data;
                }
                if (response?.success === true) {
                    return response.data || response;
                }
                return response;
            }),
            catchError(error => {
                console.error('❌ [CONTABILIDAD] Error obteniendo estadísticas:', error);
                return throwError(() => new Error(`Error obteniendo estadísticas: ${error.message}`));
            })
        );
    }

    getEstadisticas(): Observable<{ success: boolean; data: any }> {
        return this.obtenerEstadisticas().pipe(
            map(data => ({
                success: true,
                data: {
                    pendientes: data?.totales?.pendientes || 0,
                    procesados: data?.totales?.procesados || 0,
                    observados: data?.totales?.observados || 0,
                    rechazados: data?.totales?.rechazados || 0,
                    total: data?.totales?.total || 0
                }
            })),
            catchError(error => {
                console.error('❌ Error en getEstadisticas:', error);
                return throwError(() => new Error(`Error obteniendo estadísticas: ${error.message}`));
            })
        );
    }
}