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
            catchError(this.handleError)
        );
    }

    /**
     * ✅ Guardar revisión con PAZ Y SALVO y ÚLTIMO RADICADO
     */
    guardarRevisionConArchivo(
        documentoId: string,
        datosRevision: any,
        archivoAprobacion?: File | null,
        archivoPazSalvo?: File | null
    ): Observable<any> {
        const formData = new FormData();

        console.log('📤 Preparando FormData para enviar:', {
            estado: datosRevision.estado,
            requierePazSalvo: datosRevision.requierePazSalvo,
            esUltimoRadicado: datosRevision.esUltimoRadicado,
            tieneArchivoAprobacion: !!archivoAprobacion,
            tieneArchivoPazSalvo: !!archivoPazSalvo
        });

        formData.append('estado', datosRevision.estado);
        formData.append('observacion', datosRevision.observacion || '');

        if (datosRevision.correcciones) {
            formData.append('correcciones', datosRevision.correcciones);
        }

        formData.append('requierePazSalvo', datosRevision.requierePazSalvo ? 'true' : 'false');
        formData.append('esUltimoRadicado', datosRevision.esUltimoRadicado ? 'true' : 'false');

        if (archivoAprobacion) {
            formData.append('archivoAprobacion', archivoAprobacion, archivoAprobacion.name);
            console.log('📎 Archivo aprobación agregado:', archivoAprobacion.name);
        }

        if (archivoPazSalvo) {
            formData.append('pazSalvo', archivoPazSalvo, archivoPazSalvo.name);
            console.log('📎 Archivo paz y salvo agregado:', archivoPazSalvo.name);
        }

        console.log('🔍 Campos en FormData:');
        formData.forEach((value, key) => {
            if (value instanceof File) {
                console.log(`  - ${key}: ${value.name} (${value.size} bytes, ${value.type})`);
            } else {
                console.log(`  - ${key}: ${value} (tipo: ${typeof value})`);
            }
        });

        const token = this.getAuthToken();
        const headers = new HttpHeaders({
            'Authorization': token
        });

        console.log('🚀 Enviando revisión con archivos...');

        return this.http.post<any>(`${this.apiUrl}/revisar/${documentoId}`, formData, { headers })
            .pipe(
                map(response => {
                    console.log('✅ Revisión con archivo guardada exitosamente:', response);
                    return response;
                }),
                catchError(error => {
                    console.error('❌ Error en guardarRevisionConArchivo:', error);
                    console.error('❌ Error detallado:', {
                        status: error.status,
                        statusText: error.statusText,
                        error: error.error,
                        url: error.url,
                        detalles: error.error?.detalles
                    });
                    return throwError(() => new Error(`Error ${error.status}: ${error.error?.message || error.message}`));
                })
            );
    }

    /**
     * ✅ Guardar revisión sin archivos
     */
    guardarRevision(documentoId: string, datosRevision: any): Observable<any> {
        const headers = this.getAuthHeaders();

        const payload = {
            estado: datosRevision.estado,
            observacion: datosRevision.observacion,
            correcciones: datosRevision.correcciones || null,
            requierePazSalvo: datosRevision.requierePazSalvo || false,
            esUltimoRadicado: datosRevision.esUltimoRadicado || false
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
                catchError(this.handleError)
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
     * ✅ Descargar archivo de paz y salvo
     */
    descargarPazSalvo(nombreArchivo: string): Observable<Blob> {
        const headers = this.getAuthHeaders();
        console.log(`📥 Descargando paz y salvo: ${nombreArchivo}...`);

        return this.http.get(`${this.apiUrl}/descargar-paz-salvo/${nombreArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * ✅ Previsualizar paz y salvo (usando Blob para autenticación header)
     */
    previsualizarPazSalvo(nombreArchivo: string): void {
        if (!nombreArchivo) return;

        console.log(`👁️ Intentando PREVISUALIZAR paz y salvo: ${nombreArchivo}`);

        this.http.get(`${this.apiUrl}/ver-paz-salvo/${encodeURIComponent(nombreArchivo)}`, {
            headers: this.getAuthHeaders(),
            responseType: 'blob'
        }).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const nuevaVentana = window.open(url, '_blank');
                if (nuevaVentana) nuevaVentana.focus();
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                console.log('✅ Paz y salvo abierto en pestaña');
            },
            error: (err) => {
                console.error('Error previsualizando paz y salvo:', err);
            }
        });
    }

    /**
     * ✅ Verificar si es el último radicado del contratista
     */
    verificarUltimoRadicado(documentoId: string, contratistaId: string): Observable<boolean> {
        const headers = this.getAuthHeaders();
        console.log(`🔍 Verificando si es el último radicado del contratista ${contratistaId}...`);

        return this.http.get<any>(`${this.apiUrl}/verificar-ultimo-radicado/${contratistaId}/${documentoId}`, { headers })
            .pipe(
                map(response => {
                    console.log('📊 Respuesta verificación último radicado:', response);
                    return response?.data?.esUltimoRadicado || false;
                }),
                catchError(error => {
                    console.error('❌ Error verificando último radicado:', error);
                    return of(false);
                })
            );
    }

    /**
     * ✅ Obtener información del contratista
     */
    obtenerInfoContratista(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`👤 Obteniendo información del contratista para documento ${documentoId}...`);

        return this.http.get<any>(`${this.apiUrl}/contratista-info/${documentoId}`, { headers })
            .pipe(
                map(response => {
                    console.log('📊 Información del contratista:', response);
                    return response?.data || {};
                }),
                catchError(error => {
                    console.error('❌ Error obteniendo información del contratista:', error);
                    return of({});
                })
            );
    }

    /**
     * ✅ Descargar archivo como Blob
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
     * ✅ Obtener documento por ID
     */
    obtenerDocumentoPorId(id: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🔍 Supervisor obteniendo documento con ID: ${id}`);

        return this.http.get<any>(`${this.apiUrl}/documento/${id}`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta obtenerDocumentoPorId (supervisor):', response);

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
     * ✅ Método para obtener URL de archivo (mantener para compatibilidad, pero preferir blob)
     */
    getArchivoUrlConToken(id: string, index: number, download = false): string {
        const token = this.getAuthToken().replace('Bearer ', ''); // Remover 'Bearer ' para query
        const baseUrl = `${this.apiUrl}/descargar/${id}/archivo/${index}`;
        const params = new URLSearchParams();
        if (download) params.append('download', 'true');
        if (token) params.append('token', token);
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * ✅ Previsualizar archivo usando Blob con headers
     */
    previsualizarArchivo(id: string, index: number): void {
        console.log(`👁️ Previsualizando archivo ${index} del documento ${id}...`);
        this.descargarArchivo(id, index).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                console.log('✅ Archivo abierto en nueva pestaña');
            },
            error: (error) => {
                console.error('❌ Error previsualizando archivo:', error);
            }
        });
    }

    /**
     * ✅ Previsualizar documento (alias)
     */
    previsualizarDocumento(documentoId: string, index: number): void {
        this.previsualizarArchivo(documentoId, index);
    }

    /**
     * ✅ Método para obtener URL de previsualización (mantener compatibilidad)
     */
    getPreviewUrl(documentoId: string, index: number): string {
        return this.getArchivoUrlConToken(documentoId, index, false);
    }

    /**
     * ✅ Método para obtener URL de descarga (mantener compatibilidad)
     */
    getDownloadUrl(documentoId: string, index: number): string {
        return this.getArchivoUrlConToken(documentoId, index, true);
    }

    /**
     * ✅ Descarga directamente el archivo usando Blob
     */
    descargarArchivoDirecto(id: string, index: number, nombreArchivo?: string): void {
        this.descargarArchivo(id, index).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = nombreArchivo || `archivo-${index}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.log('✅ Archivo descargado directamente');
            },
            error: (error) => {
                console.error('❌ Error descargando archivo directo:', error);
            }
        });
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

                    supervisorAsignado: doc.supervisorAsignado || doc.asignacion?.supervisorActual || undefined,
                    fechaAsignacion: doc.fechaAsignacion ? new Date(doc.fechaAsignacion) : undefined,
                    supervisorEstado: doc.supervisorEstado || doc.asignacion?.estado || undefined,
                    requierePazSalvo: doc.requierePazSalvo || false,
                    pazSalvo: doc.pazSalvo || undefined,
                    fechaPazSalvo: doc.fechaPazSalvo ? new Date(doc.fechaPazSalvo) : undefined,
                    esUltimoRadicado: doc.esUltimoRadicado || false,
                    tipoContrato: doc.tipoContrato || 'SERVICIOS',
                    valorContrato: doc.valorContrato || 0,

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
        formData.append('archivoAprobacion', archivo, archivo.name);
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
     * ✅ Descargar archivo de aprobación
     */
    descargarArchivoAprobacion(nombreArchivo: string): Observable<Blob> {
        const headers = this.getAuthHeaders();
        console.log(`📥 Descargando archivo de aprobación: ${nombreArchivo}...`);

        return this.http.get(`${this.apiUrl}/descargar-archivo/${nombreArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * ✅ Ver archivo de aprobación usando Blob
     */
    verArchivoAprobacion(nombreArchivo: string): void {
        if (!nombreArchivo) return;

        console.log(`👁️ Intentando PREVISUALIZAR aprobación: ${nombreArchivo}`);

        this.http.get(`${this.apiUrl}/ver-archivo-supervisor/${encodeURIComponent(nombreArchivo)}`, {
            headers: this.getAuthHeaders(),
            responseType: 'blob'
        }).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const nuevaVentana = window.open(url, '_blank');
                if (nuevaVentana) nuevaVentana.focus();
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                console.log('✅ Aprobación abierto en pestaña');
            },
            error: (err) => {
                console.error('Error previsualizando aprobación:', err);
            }
        });
    }

    liberarDocumento(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🔄 Liberando documento ${documentoId}...`);

        return this.http.post<any>(`${this.apiUrl}/liberar-documento/${documentoId}`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta liberar documento:', response);

                if (response?.success === true) {
                    return response;
                }

                if (response) {
                    return response;
                }

                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }


    devolverDocumento(documentoId: string, motivo: string, instrucciones: string): Observable<any> {
        const headers = this.getAuthHeaders();
        const body = { motivo, instrucciones };

        console.log(`↩️ Devolviendo documento ${documentoId}...`);

        return this.http.post<any>(`${this.apiUrl}/devolver/${documentoId}`, body, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta devolver documento:', response);

                if (response?.success === true) {
                    return response;
                }

                if (response) {
                    return response;
                }

                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    obtenerMisRevisiones(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando mis revisiones...');

        return this.http.get<any>(`${this.apiUrl}/mis-revisiones`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta mis revisiones:', response);

                let documentos: Documento[] = [];

                if (response?.data && Array.isArray(response.data)) {
                    documentos = this.mapearDocumentosDesdeBackend(response.data);
                }

                return documentos;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo mis revisiones:', error);
                return of([]);
            })
        );
    }

    descargarTodosArchivosSimple(documentoId: string): Observable<void> {
        console.log(`📥 Preparando descarga múltiple para documento ${documentoId}...`);

        return new Observable<void>(observer => {
            observer.next();
            observer.complete();
        });
    }

    getUrlArchivoSupervisor(nombreArchivo: string | null): string {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            console.warn('[getUrlArchivoSupervisor] Nombre de archivo vacío o nulo');
            return '#';
        }

        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
        const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        const apiBase = environment.apiUrl;

        let url = `${apiBase}/supervisor/ver-archivo-supervisor/${encodeURIComponent(nombreArchivo)}`;

        if (rawToken) {
            url += `?token=${encodeURIComponent(rawToken)}`;
        } else {
            console.warn('[getUrlArchivoSupervisor] No se encontró token de autenticación');
        }

        console.log('[URL generada para archivo supervisor]:', url);
        return url;
    }


}