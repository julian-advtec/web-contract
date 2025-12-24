import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Documento } from '../models/documento.model';
import { NotificationService } from './notification.service';

@Injectable({
    providedIn: 'root'
})
export class SupervisorService {
    private http = inject(HttpClient);
    private notificationService = inject(NotificationService);
    private apiUrl = `${environment.apiUrl}/supervisor`;

    /**
     * Obtener headers de autenticación
     */
    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');

        if (!token) {
            console.error('❌ No hay token disponible en localStorage');
            this.notificationService.warning('Sesión expirada', 'Por favor inicia sesión nuevamente');
            return new HttpHeaders();
        }

        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        return new HttpHeaders({
            'Authorization': authToken,
            'Content-Type': 'application/json'
        });
    }

    /**
     * Obtener headers para FormData (sin Content-Type)
     */
    private getAuthHeadersForFormData(): HttpHeaders {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');

        if (!token) {
            console.error('❌ No hay token disponible en localStorage');
            return new HttpHeaders();
        }

        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        return new HttpHeaders({
            'Authorization': authToken
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

        this.notificationService.error('Error', errorMessage);
        return throwError(() => new Error(errorMessage));
    }

    /**
     * Obtener documento por ID
     */
    obtenerDocumentoPorId(id: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🔍 Solicitando documento con ID: ${id}`);

        return this.http.get<any>(`${this.apiUrl}/documento/${id}`, { headers }).pipe(
            map(response => {
                if (response && response.success === true && response.data) {
                    return response.data;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Obtener todos los documentos (sin filtrar)
     */
    obtenerTodosDocumentos(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando todos los documentos...');

        return this.http.get<any>(`${this.apiUrl}/documentos-asignados`, { headers }).pipe(
            map(response => {
                if (response && response.success === true && response.data) {
                    return response.data;
                }
                return [];
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Aprobar documento
     */
    aprobarDocumento(id: string, observaciones?: string, archivo?: File): Observable<any> {
        const formData = new FormData();
        formData.append('estado', 'APROBADO');

        if (observaciones) {
            formData.append('observacion', observaciones);
        }

        if (archivo) {
            formData.append('archivo', archivo);
        }

        const headers = this.getAuthHeadersForFormData();
        console.log(`✅ Aprobando documento ${id}...`);

        return this.http.post<any>(`${this.apiUrl}/revisar/${id}`, formData, { headers }).pipe(
            map(response => {
                if (response && response.success === true) {
                    this.notificationService.success('Éxito', 'Documento aprobado correctamente');
                    return response.data;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Rechazar documento
     */
    rechazarDocumento(id: string, motivo: string, observaciones?: string): Observable<any> {
        const body = {
            estado: 'RECHAZADO',
            observacion: motivo
        };

        const headers = this.getAuthHeaders();
        console.log(`❌ Rechazando documento ${id}...`);

        return this.http.post<any>(`${this.apiUrl}/revisar/${id}`, body, { headers }).pipe(
            map(response => {
                if (response && response.success === true) {
                    this.notificationService.success('Éxito', 'Documento rechazado correctamente');
                    return response.data;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Observar documento (requiere cambios)
     */
    observarDocumento(id: string, observaciones: string, correcciones?: string): Observable<any> {
        const body = {
            estado: 'OBSERVADO',
            observacion: observaciones,
            correcciones: correcciones || ''
        };

        const headers = this.getAuthHeaders();
        console.log(`🔍 Observando documento ${id}...`);

        return this.http.post<any>(`${this.apiUrl}/revisar/${id}`, body, { headers }).pipe(
            map(response => {
                if (response && response.success === true) {
                    this.notificationService.success('Éxito', 'Se han registrado las observaciones');
                    return response.data;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Revisar documento (método general)
     */
    revisarDocumento(
        documentoId: string,
        estado: string,
        observacion?: string,
        archivo?: File,
        correcciones?: string
    ): Observable<any> {
        const formData = new FormData();
        formData.append('estado', estado);

        if (observacion) {
            formData.append('observacion', observacion);
        }

        if (correcciones) {
            formData.append('correcciones', correcciones);
        }

        if (archivo) {
            formData.append('archivo', archivo);
        }

        const headers = this.getAuthHeadersForFormData();
        console.log(`🔍 Revisando documento ${documentoId} con estado: ${estado}...`);

        return this.http.post<any>(`${this.apiUrl}/revisar/${documentoId}`, formData, { headers }).pipe(
            map(response => {
                if (response && response.success === true) {
                    this.notificationService.success('Éxito', response.message || 'Documento revisado correctamente');
                    return response.data;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Devolver documento al radicador
     */
    devolverDocumento(documentoId: string, motivo: string, instrucciones: string): Observable<any> {
        const body = { motivo, instrucciones };
        const headers = this.getAuthHeaders();
        console.log(`↩️ Devolviendo documento ${documentoId} al radicador...`);

        return this.http.post<any>(`${this.apiUrl}/devolver/${documentoId}`, body, { headers }).pipe(
            map(response => {
                if (response && response.success === true) {
                    this.notificationService.success('Éxito', 'Documento devuelto correctamente');
                    return response.data;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Descargar archivo del radicador
     */
    descargarArchivo(documentoId: string, numeroArchivo: number): Observable<Blob> {
        const headers = this.getAuthHeaders();
        console.log(`📥 Descargando archivo ${numeroArchivo} del documento ${documentoId}...`);

        return this.http.get(`${this.apiUrl}/descargar/${documentoId}/archivo/${numeroArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            tap(blob => {
                console.log(`✅ Archivo descargado, tamaño: ${blob.size} bytes`);
                this.descargarBlob(blob, `documento-${numeroArchivo}.pdf`);
            }),
            catchError(error => {
                console.error('❌ Error descargando archivo:', error);
                this.notificationService.error('Error', 'No se pudo descargar el archivo');
                return throwError(() => error);
            })
        );
    }

    /**
     * Descargar documento (alias)
     */
    descargarDocumento(documentoId: string, numeroArchivo: number): Observable<Blob> {
        return this.descargarArchivo(documentoId, numeroArchivo);
    }

    /**
     * Ver archivo en el navegador
     */
    previsualizarArchivo(documentoId: string, numeroArchivo: number): void {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            this.notificationService.error('Error', 'No estás autenticado');
            return;
        }

        const url = `${this.apiUrl}/ver/${documentoId}/archivo/${numeroArchivo}`;
        console.log(`👁️ Abriendo previsualización: ${url}`);

        window.open(url, '_blank', 'noopener,noreferrer');
    }

    /**
     * Helper para descargar blob
     */
    private descargarBlob(blob: Blob, nombreArchivo: string): void {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Obtener estadísticas del supervisor
     */
    obtenerEstadisticas(): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log('📊 Solicitando estadísticas...');
        
        return this.http.get<any>(`${this.apiUrl}/estadisticas`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta de estadísticas:', response);

                // Si la respuesta no es exitosa, retornar valores por defecto
                if (!response || response.success === false) {
                    console.warn('⚠️ Estadísticas con error, usando valores por defecto');
                    return {
                        totalPendientes: 0,
                        recientes: 0,
                        urgentes: 0,
                        aprobados: 0,
                        rechazados: 0,
                        totales: {
                            pendientes: 0,
                            aprobados: 0,
                            observados: 0,
                            rechazados: 0,
                            total: 0
                        }
                    };
                }

                // Extraer datos de la respuesta
                const estadisticasData = response.data || response;

                // Retornar estructura normalizada
                return {
                    totalPendientes: estadisticasData.totalPendientes || 
                                    estadisticasData.totales?.pendientes || 0,
                    recientes: estadisticasData.recientes || 0,
                    urgentes: estadisticasData.urgentes || 0,
                    aprobados: estadisticasData.aprobados || 
                              estadisticasData.totales?.aprobados || 0,
                    rechazados: estadisticasData.rechazados || 
                               estadisticasData.totales?.rechazados || 0,
                    totales: {
                        pendientes: estadisticasData.totales?.pendientes || 
                                   estadisticasData.totalPendientes || 0,
                        aprobados: estadisticasData.totales?.aprobados || 
                                  estadisticasData.aprobados || 0,
                        observados: estadisticasData.totales?.observados || 
                                   estadisticasData.observados || 0,
                        rechazados: estadisticasData.totales?.rechazados || 
                                   estadisticasData.rechazados || 0,
                        total: estadisticasData.totales?.total || 
                              (estadisticasData.totalPendientes || 0) + 
                              (estadisticasData.aprobados || 0) + 
                              (estadisticasData.observados || 0) + 
                              (estadisticasData.rechazados || 0)
                    }
                };
            }),
            catchError(error => {
                console.error('❌ Error obteniendo estadísticas:', error);
                return of({
                    totalPendientes: 0,
                    recientes: 0,
                    urgentes: 0,
                    aprobados: 0,
                    rechazados: 0,
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
     * Obtener historial del supervisor
     */
    obtenerHistorial(limit?: number): Observable<any[]> {
        const headers = this.getAuthHeaders();
        let url = `${this.apiUrl}/historial`;
        if (limit) {
            url += `?limit=${limit}`;
        }

        console.log('📊 Solicitando historial del supervisor...');

        return this.http.get<any>(url, { headers }).pipe(
            map(response => {
                if (response && response.success === true && response.data) {
                    return response.data;
                }
                return [];
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Obtener documentos pendientes de revisión
     */
    obtenerDocumentosPendientes(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📤 Solicitando documentos pendientes...');
        
        return this.http.get<any>(`${this.apiUrl}/documentos/pendientes`, { headers }).pipe(
            map(response => {
                console.log('📋 Respuesta completa del servidor:', response);

                // Verificar diferentes estructuras posibles
                if (response && response.success === true) {
                    // Caso 1: response.data es un array
                    if (Array.isArray(response.data)) {
                        console.log('✅ Documentos recibidos como array:', response.data.length);
                        return response.data;
                    }
                }
                
                // Caso 2: response directamente es un array
                if (Array.isArray(response)) {
                    console.log('✅ Documentos recibidos como respuesta directa:', response.length);
                    return response;
                }
                
                console.warn('⚠️ Respuesta inesperada del servidor, retornando array vacío');
                return [];
            }),
            catchError(error => {
                console.error('❌ Error obteniendo documentos pendientes:', error);
                return of([]);
            })
        );
    }

    /**
     * Descargar todos los documentos de un radicado
     */
    descargarTodosDocumentos(documentoId: string): Observable<Blob> {
        const headers = this.getAuthHeaders();
        console.log(`📦 Descargando todos los documentos para ${documentoId}...`);

        return this.http.get(`${this.apiUrl}/documento/${documentoId}/descargar-todos`, {
            headers,
            responseType: 'blob'
        }).pipe(
            tap(blob => {
                console.log(`✅ Todos los documentos descargados, tamaño: ${blob.size} bytes`);
                this.descargarBlob(blob, `documento-completo-${documentoId}.zip`);
            }),
            catchError(error => {
                console.error('❌ Error descargando todos los documentos:', error);
                this.notificationService.error('Error', 'No se pudieron descargar los documentos');
                return throwError(() => error);
            })
        );
    }

    /**
     * Ver archivo (alias para compatibilidad)
     */
    verArchivo(documentoId: string, numeroDocumento: number): Observable<Blob> {
        return this.descargarArchivo(documentoId, numeroDocumento);
    }

    /**
     * Verificar si el usuario tiene permisos de supervisor
     */
    verificarPermisosSupervisor(): boolean {
        const userStr = localStorage.getItem('user');
        if (!userStr) return false;

        try {
            const user = JSON.parse(userStr);
            const rol = user.role?.toLowerCase();

            const rolesPermitidos = ['supervisor', 'admin'];

            return rolesPermitidos.includes(rol);
        } catch (error) {
            console.error('Error validando permisos:', error);
            return false;
        }
    }
}