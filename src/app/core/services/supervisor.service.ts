import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Documento } from '../models/documento.model';

interface SupervisorStats {
    pendientes: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class SupervisorService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/supervisor`;

    constructor() { }

    /**
     * Obtener headers de autenticación
     */
    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');

        if (!token) {
            console.error('❌ No hay token disponible en localStorage');
            return new HttpHeaders();
        }

        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        return new HttpHeaders({
            'Authorization': authToken,
            'Content-Type': 'application/json'
        });
    }

    /**
     * Manejar errores HTTP
     */
    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('❌ Error en SupervisorService:', error);

        let errorMessage = 'Error desconocido en el servidor';

        if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else {
            switch (error.status) {
                case 0:
                    errorMessage = 'Error de conexión con el servidor';
                    break;
                case 401:
                    errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente';
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = '/auth/login';
                    }, 2000);
                    break;
                case 403:
                    errorMessage = 'No tienes permisos para realizar esta acción';
                    break;
                case 404:
                    errorMessage = 'Recurso no encontrado';
                    break;
                case 409:
                    errorMessage = error.error?.message || 'Conflicto con el recurso';
                    break;
                case 500:
                    errorMessage = 'Error interno del servidor';
                    break;
                default:
                    errorMessage = `Error ${error.status}: ${error.error?.message || error.message}`;
            }
        }

        return throwError(() => new Error(errorMessage));
    }

    /**
     * ✅ Obtener documentos disponibles
     */
    obtenerDocumentosDisponibles(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando documentos disponibles...');

        return this.http.get<any>(`${this.apiUrl}/documentos-disponibles`, { headers }).pipe(
            map(response => {
                console.log('📊 Procesando respuesta...');

                let documentos: Documento[] = [];

                if (response?.data && Array.isArray(response.data)) {
                    console.log('✅ Caso CORRECTO: Usando response.data');
                    documentos = this.mapearDocumentosDesdeBackend(response.data);
                } else if (response?.ok && response?.data?.data && Array.isArray(response.data.data)) {
                    console.log('✅ Caso NestJS: Usando response.data.data');
                    documentos = this.mapearDocumentosDesdeBackend(response.data.data);
                } else if (Array.isArray(response)) {
                    console.log('✅ Caso directo: Usando response como array');
                    documentos = this.mapearDocumentosDesdeBackend(response);
                } else if (response?.data?.success && Array.isArray(response.data.data)) {
                    console.log('✅ Caso anidado: Usando response.data.data');
                    documentos = this.mapearDocumentosDesdeBackend(response.data.data);
                }

                console.log(`✅ ${documentos.length} documentos mapeados`);

                if (documentos.length === 0) {
                    console.warn('⚠️ No se pudieron mapear documentos');
                }

                return documentos;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo documentos disponibles:', error);
                return of([]);
            })
        );
    }

    /**
     * ✅ Forzar asignación de documentos
     */
    forzarAsignacionDocumentos(): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log('🚀 Forzando asignación de documentos...');

        return this.http.post<any>(`${this.apiUrl}/asignar-todos`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta asignación forzada:', response);

                if (response?.success === true) {
                    return response.data;
                }
                throw new Error('Error en la asignación forzada');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * ✅ Tomar documento para revisión
     */
    tomarDocumentoParaRevision(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🤝 Tomando documento ${documentoId} para revisión...`);

        return this.http.post<any>(`${this.apiUrl}/tomar-documento/${documentoId}`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta tomar documento (cruda):', response);

                if (response?.success === true) {
                    return response;
                }

                if (response) {
                    return response;
                }

                throw new Error('Respuesta inválida del servidor');
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('❌ Error tomando documento:', error);

                let errorMessage = 'Error desconocido';

                if (error.error instanceof ErrorEvent) {
                    errorMessage = `Error del cliente: ${error.error.message}`;
                } else {
                    switch (error.status) {
                        case 400:
                            errorMessage = error.error?.message || 'Solicitud incorrecta';
                            break;
                        case 403:
                            errorMessage = 'No tienes permisos para esta acción';
                            break;
                        case 404:
                            errorMessage = 'Documento no encontrado';
                            break;
                        case 409:
                            errorMessage = 'Documento ya está siendo revisado por otro supervisor';
                            break;
                        case 500:
                            errorMessage = 'Error interno del servidor';
                            break;
                        default:
                            errorMessage = `Error ${error.status}: ${error.error?.message || error.message}`;
                    }
                }

                return throwError(() => new Error(errorMessage));
            })
        );
    }

    /**
     * ✅ Método del supervisor: Guardar revisión de un documento
     */


    /**
     * ✅ Método del supervisor: Guardar revisión con archivo (si es APROBADO)
     */
    guardarRevisionConArchivo(
        documentoId: string,
        datosRevision: any,
        archivo: File | null
    ): Observable<any> {
        const formData = new FormData();

        // ✅ SOLO campos permitidos por el DTO del backend
        formData.append('estado', datosRevision.estado);
        formData.append('observacion', datosRevision.observacion || '');

        // ❌ NO incluir 'recomendacion' - no existe en el DTO

        console.log('📤 Enviando datos (FormData):', {
            estado: datosRevision.estado,
            observacion: datosRevision.observacion,
            tieneArchivo: !!archivo
        });

        // Agregar archivo solo si existe y el estado es APROBADO
        if (archivo && datosRevision.estado === 'APROBADO') {
            formData.append('archivo', archivo, archivo.name);
        }

        const headers = new HttpHeaders({
            'Authorization': this.getAuthToken()
            // No incluir Content-Type, FormData lo maneja automáticamente
        });

        return this.http.post<any>(`${this.apiUrl}/revisar/${documentoId}`, formData, { headers })
            .pipe(
                map(response => {
                    console.log('✅ Revisión con archivo guardada:', response);
                    return response;
                }),
                catchError(this.handleError)
            );
    }

    /**
     * ✅ Método del supervisor: Guardar revisión sin archivo
     */
    guardarRevision(documentoId: string, datosRevision: any): Observable<any> {
        const headers = this.getAuthHeaders();

        const payload = {
            estado: datosRevision.estado,
            observacion: datosRevision.observacion,
            
        };

        console.log(`📤 Enviando revisión para documento ${documentoId}:`, payload);

        return this.http.post<any>(`${this.apiUrl}/revisar/${documentoId}`, payload, { headers })
            .pipe(
                map(response => {
                    console.log('✅ Revisión guardada:', response);

                    if (response?.ok === true && response.data) {
                        return response.data;
                    }
                    if (response?.success === true) {
                        return response.data || response;
                    }
                    return response;
                }),
                catchError((error: any) => {
                    console.error('❌ Error guardando revisión:', error);
                    return throwError(() => new Error(error.message || 'Error al guardar la revisión'));
                })
            );
    }

    /**
     * ✅ Obtener token de autenticación para FormData
     */
    private getAuthToken(): string {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
        return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    /**
     * ✅ Aprobar documento (método alternativo)
     */
    aprobarDocumento(id: string, observaciones?: string): Observable<any> {
        const body = {
            estado: 'APROBADO',
            observacion: observaciones || ''
        };

        const headers = this.getAuthHeaders();
        console.log(`✅ Aprobando documento ${id}...`);

        return this.http.post<any>(`${this.apiUrl}/revisar/${id}`, body, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta aprobarDocumento:', response);

                if (response?.ok === true && response.data) {
                    return response.data;
                }
                if (response?.success === true) {
                    return response.data || response;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * ✅ Rechazar documento (método alternativo)
     */
    rechazarDocumento(id: string, motivo: string): Observable<any> {
        const body = {
            estado: 'RECHAZADO',
            observacion: motivo
        };

        const headers = this.getAuthHeaders();
        console.log(`❌ Rechazando documento ${id}...`);

        return this.http.post<any>(`${this.apiUrl}/revisar/${id}`, body, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta rechazarDocumento:', response);

                if (response?.ok === true && response.data) {
                    return response.data;
                }
                if (response?.success === true) {
                    return response.data || response;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * ✅ Observar documento (método alternativo)
     */
    observarDocumento(id: string, observaciones: string): Observable<any> {
        const body = {
            estado: 'OBSERVADO',
            observacion: observaciones
        };

        const headers = this.getAuthHeaders();
        console.log(`🔍 Observando documento ${id}...`);

        return this.http.post<any>(`${this.apiUrl}/revisar/${id}`, body, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta observarDocumento:', response);

                if (response?.ok === true && response.data) {
                    return response.data;
                }
                if (response?.success === true) {
                    return response.data || response;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * ✅ Obtener estadísticas
     */
    obtenerEstadisticas(): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log('📊 Solicitando estadísticas...');

        return this.http.get<any>(`${this.apiUrl}/estadisticas`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta de estadísticas:', response);

                if (response?.ok === true && response.data) {
                    return response.data;
                }
                if (response?.success === true) {
                    return response.data || response;
                }
                return response;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo estadísticas:', error);
                return of({
                    totalDocumentosRadicados: 0,
                    totales: {
                        pendientes: 0,
                        aprobados: 0,
                        observados: 0,
                        rechazados: 0,
                        total: 0
                    }
                });
            })
        );
    }

    /**
     * ✅ Obtener historial
     */
    getHistorial(): Observable<{ success: boolean; data: any[] }> {
        const headers = this.getAuthHeaders();
        console.log('📊 Solicitando historial...');

        return this.http.get<any>(`${this.apiUrl}/historial`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta historial:', response);

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

                console.log(`✅ ${historial.length} registros de historial recibidos`);
                return { success: true, data: historial };
            }),
            catchError(error => {
                console.error('❌ Error obteniendo historial:', error);
                return of({ success: true, data: [] });
            })
        );
    }

    /**
     * ✅ Obtener estadísticas (versión en inglés - compatibilidad)
     */
    getEstadisticas(): Observable<{ success: boolean; data: SupervisorStats }> {
        return this.obtenerEstadisticas().pipe(
            map(data => ({
                success: true,
                data: {
                    pendientes: data?.totales?.pendientes || 0,
                    aprobados: data?.totales?.aprobados || 0,
                    observados: data?.totales?.observados || 0,
                    rechazados: data?.totales?.rechazados || 0,
                    total: data?.totales?.total || 0
                }
            }))
        );
    }

    /**
     * ✅ Obtener documento por ID para el formulario de revisión
     */
    obtenerDocumentoPorId(id: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🔍 Supervisor obteniendo documento con ID: ${id}`);

        return this.http.get<any>(`${this.apiUrl}/documento/${id}`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta obtenerDocumentoPorId (supervisor):', response);

                // Procesar diferentes estructuras de respuesta
                if (response?.ok === true && response.data) {
                    return response.data;
                }
                if (response?.success === true && response.data) {
                    return response.data;
                }
                if (response?.documento) {
                    return response.documento;
                }

                return response;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo documento en supervisor service:', error);
                return throwError(() => new Error('Error al cargar el documento'));
            })
        );
    }

    /**
     * ✅ Obtener token de autenticación
     */

    /**
     * ✅ Método para obtener URL de archivo con token
     */
    getArchivoUrlConToken(id: string, index: number, download = false): string {
        const token = this.getAuthToken();
        const baseUrl = `${this.apiUrl}/${id}/archivo/${index}`;
        const params = new URLSearchParams();
        if (download) params.append('download', 'true');
        if (token) params.append('token', token);
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * ✅ Previsualizar archivo
     */
    previsualizarArchivo(id: string, index: number): void {
        const url = this.getArchivoUrlConToken(id, index, false);
        window.open(url, '_blank');
    }

    /**
     * ✅ Previsualizar documento (alias)
     */
    previsualizarDocumento(documentoId: string, index: number): void {
        this.previsualizarArchivo(documentoId, index);
    }

    /**
     * ✅ Método unificado para descargar archivos
     */
    descargarDocumento(documentoId: string, index: number, nombreArchivo?: string): void {
        this.descargarArchivoDirecto(documentoId, index, nombreArchivo);
    }

    /**
     * ✅ Método para obtener URL de previsualización
     */
    getPreviewUrl(documentoId: string, index: number): string {
        return this.getArchivoUrlConToken(documentoId, index, false);
    }

    /**
     * ✅ Método para obtener URL de descarga
     */
    getDownloadUrl(documentoId: string, index: number): string {
        return this.getArchivoUrlConToken(documentoId, index, true);
    }

    /**
     * ✅ Descarga directamente el archivo sin pasar por Blob
     */
    descargarArchivoDirecto(id: string, index: number, nombreArchivo?: string): void {
        const url = this.getArchivoUrlConToken(id, index, true);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo || `archivo-${index}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * ✅ Método para descargar archivo como Blob
     */
    descargarArchivo(documentoId: string, numeroArchivo: number): Observable<Blob> {
        const headers = this.getAuthHeaders();
        console.log(`📥 Descargando archivo ${numeroArchivo} del documento ${documentoId}...`);

        return this.http.get(`${this.apiUrl}/descargar/${documentoId}/archivo/${numeroArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * ✅ Método simplificado para mapear documentos
     */
    private mapearDocumentosDesdeBackend(documentosArray: any[]): Documento[] {
        if (!Array.isArray(documentosArray)) {
            console.error('❌ documentosArray no es un array:', documentosArray);
            return [];
        }

        console.log(`📊 Mapeando ${documentosArray.length} documentos...`);

        return documentosArray.map((doc: any) => {
            try {
                const documentoMapeado: Documento = {
                    id: doc.id || '',
                    numeroRadicado: doc.numeroRadicado || '',
                    numeroContrato: doc.numeroContrato || '',
                    nombreContratista: doc.nombreContratista || 'Sin contratista',
                    documentoContratista: doc.documentoContratista || '',
                    fechaInicio: doc.fechaInicio ? new Date(doc.fechaInicio) : new Date(),
                    fechaFin: doc.fechaFin ? new Date(doc.fechaFin) : new Date(),
                    estado: doc.estado || 'RADICADO',
                    fechaRadicacion: doc.fechaRadicacion ? new Date(doc.fechaRadicacion) : new Date(),
                    cuentaCobro: doc.cuentaCobro || '',
                    seguridadSocial: doc.seguridadSocial || '',
                    informeActividades: doc.informeActividades || '',
                    descripcionCuentaCobro: doc.descripcionCuentaCobro || 'Cuenta de Cobro',
                    descripcionSeguridadSocial: doc.descripcionSeguridadSocial || 'Seguridad Social',
                    descripcionInformeActividades: doc.descripcionInformeActividades || 'Informe de Actividades',
                    observacion: doc.observacion || '',
                    nombreRadicador: doc.radicador || doc.nombreRadicador || 'Radicador',
                    usuarioRadicador: doc.usuarioRadicador || '',
                    rutaCarpetaRadicado: doc.rutaCarpetaRadicado || '',
                    radicador: typeof doc.radicador === 'string' ? doc.radicador : doc.nombreRadicador,
                    tokenPublico: doc.tokenPublico || '',
                    tokenActivo: doc.tokenActivo || false,
                    tokenExpiraEn: doc.tokenExpiraEn ? new Date(doc.tokenExpiraEn) : new Date(),
                    contratistaId: doc.contratistaId || '',
                    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
                    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
                    ultimoAcceso: doc.ultimoAcceso ? new Date(doc.ultimoAcceso) : new Date(),
                    ultimoUsuario: doc.ultimoUsuario || '',
                    fechaActualizacion: doc.fechaActualizacion ? new Date(doc.fechaActualizacion) : new Date(),
                    usuarioAsignadoNombre: doc.usuarioAsignadoNombre || doc.asignacion?.usuarioAsignado,
                    disponible: doc.disponible || true,
                    asignacion: doc.asignacion || {
                        enRevision: doc.asignacion?.enRevision || false,
                        puedoTomar: doc.asignacion?.puedoTomar || true,
                        usuarioAsignado: doc.usuarioAsignadoNombre,
                        supervisorActual: doc.asignacion?.supervisorActual
                    }
                };

                return documentoMapeado;
            } catch (error) {
                console.error('❌ Error mapeando documento:', error, doc);
                return null;
            }
        }).filter((doc): doc is Documento => doc !== null);
    }

    /**
     * ✅ Métodos adicionales (manteniendo compatibilidad)
     */
    guardarRevisionConDocumentos(documentoId: string, formData: FormData): Observable<any> {
        return this.http.post(`${this.apiUrl}/documentos/${documentoId}/documentos-corregidos`, formData);
    }

    subirDocumentosCorregidos(formData: FormData): Observable<any> {
        return this.http.post(`${this.apiUrl}/subir-documentos-corregidos`, formData);
    }

    obtenerDocumentosPendientes(): Observable<any> {
        return this.http.get(`${this.apiUrl}/pendientes`).pipe(
            catchError(this.handleError)
        );
    }

    obtenerDocumentosRevisados(): Observable<any> {
        return this.http.get(`${this.apiUrl}/revisados`).pipe(
            catchError(this.handleError)
        );
    }

    subirArchivoRevision(documentoId: string, indice: number, archivo: File): Observable<any> {
        const formData = new FormData();
        formData.append('archivo', archivo, archivo.name);
        formData.append('indice', indice.toString());
        formData.append('documentoId', documentoId);

        return this.http.post(`${this.apiUrl}/subir-archivo`, formData).pipe(
            map((response: any) => response),
            catchError(this.handleError)
        );
    }

    obtenerHistorialConArchivos(documentoId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/historial/${documentoId}/archivos`).pipe(
            map((response: any) => response),
            catchError(this.handleError)
        );
    }
}