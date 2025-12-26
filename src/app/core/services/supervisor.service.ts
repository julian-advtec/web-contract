import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Documento } from '../models/documento.model';
import { NotificationService } from './notification.service';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, map, tap, switchMap, take } from 'rxjs/operators';

import { DocumentoSupervisor } from '../../core/models/supervisor.types';

export interface SupervisorStats {
    pendientes: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    total: number;
}

export interface DocumentoConteo {
    estado: string;
    cantidad: number;
    porcentaje: number;
}

export interface ResumenDia {
    documentosHoy: number;
    documentosPendientes: number;
    documentosAtendidos: number;
    promedioTiempoRespuesta: number;
    documentosUrgentes: number;
}

// ✅ NUEVA INTERFACE para usuario frontend
interface UsuarioFrontend {
    id?: string;
    username?: string;
    role?: string;
    fullName?: string;
    email?: string;
    [key: string]: any;
}

@Injectable({
    providedIn: 'root'
})
export class SupervisorService {
    private http = inject(HttpClient);
    private notificationService = inject(NotificationService);
    private apiUrl = `${environment.apiUrl}/supervisor`;

    constructor() { }

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
     * ✅ NUEVO: Asignar todos los documentos a supervisores (forzar asignación)
     */
    asignarTodosDocumentos(): Observable<{ asignados: number; total: number }> {
        const headers = this.getAuthHeaders();
        console.log('🔄 Forzando asignación de todos los documentos a supervisores...');

        return this.http.post<any>(`${this.apiUrl}/asignar-todos`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta asignarTodosDocumentos:', response);

                if (response?.success === true && response.data) {
                    this.notificationService.success('Éxito', response.message || 'Documentos asignados correctamente');
                    return response.data;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * ✅ NUEVO: Obtener conteo de documentos radicados
     */
    obtenerConteoRadicados(): Observable<{ totalRadicados: number }> {
        const headers = this.getAuthHeaders();
        console.log('📊 Solicitando conteo de documentos radicados...');

        return this.http.get<any>(`${this.apiUrl}/conteo-radicados`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta conteo radicados:', response);

                if (response?.success === true && response.data) {
                    return response.data;
                }
                return { totalRadicados: 0 };
            }),
            catchError(() => of({ totalRadicados: 0 }))
        );
    }

    /**
     * Obtener estadísticas generales (inglés - para compatibilidad)
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

    getHistorial(): Observable<{ success: boolean; data: any[] }> {
        return this.obtenerHistorial().pipe(
            map(data => ({ success: true, data }))
        );
    }

    /**
     * Exportar reporte
     */
    exportarReporte(formato: 'pdf' | 'excel' | 'csv' = 'pdf'): Observable<Blob> {
        const headers = this.getAuthHeaders();
        console.log(`📈 Exportando reporte en formato ${formato}...`);

        return this.http.get(`${this.apiUrl}/exportar/reporte?formato=${formato}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            tap(blob => {
                console.log(`✅ Reporte exportado, tamaño: ${blob.size} bytes`);
                this.descargarBlob(blob, `reporte-supervisor.${formato}`);
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Obtener documento por ID
     */
    obtenerDocumentoPorId(id: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🔍 Solicitando documento con ID: ${id}`);

        return this.http.get<any>(`${this.apiUrl}/documento/${id}`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta obtenerDocumentoPorId:', response);

                if (response?.ok === true && response.data) {
                    return response.data;
                }
                if (response?.success === true && response.data) {
                    return response.data;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Obtener todos los documentos (sin filtrar) - CORREGIDO
     */
    obtenerTodosDocumentos(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando todos los documentos...');

        // Usar endpoint que SÍ existe: /documentos-disponibles
        return this.http.get<any>(`${this.apiUrl}/documentos-disponibles`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta obtenerTodosDocumentos:', response);

                let documentos: Documento[] = [];

                if (response?.ok === true && response.data) {
                    if (response.data.success === true && Array.isArray(response.data.data)) {
                        documentos = response.data.data;
                    } else if (Array.isArray(response.data)) {
                        documentos = response.data;
                    }
                } else if (response?.success === true && Array.isArray(response.data)) {
                    documentos = response.data;
                } else if (Array.isArray(response)) {
                    documentos = response;
                }

                console.log(`✅ ${documentos.length} documentos recibidos`);
                return documentos;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo todos los documentos:', error);
                return of([]);
            })
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
                console.log('📊 Respuesta aprobarDocumento:', response);

                if (response?.ok === true && response.data) {
                    this.notificationService.success('Éxito', 'Documento aprobado correctamente');
                    return response.data;
                }
                if (response?.success === true) {
                    this.notificationService.success('Éxito', 'Documento aprobado correctamente');
                    return response.data || response;
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
                console.log('📊 Respuesta rechazarDocumento:', response);

                if (response?.ok === true && response.data) {
                    this.notificationService.success('Éxito', 'Documento rechazado correctamente');
                    return response.data;
                }
                if (response?.success === true) {
                    this.notificationService.success('Éxito', 'Documento rechazado correctamente');
                    return response.data || response;
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
                console.log('📊 Respuesta observarDocumento:', response);

                if (response?.ok === true && response.data) {
                    this.notificationService.success('Éxito', 'Se han registrado las observaciones');
                    return response.data;
                }
                if (response?.success === true) {
                    this.notificationService.success('Éxito', 'Se han registrado las observaciones');
                    return response.data || response;
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
                console.log('📊 Respuesta revisarDocumento:', response);

                if (response?.ok === true && response.data) {
                    this.notificationService.success('Éxito', response.data?.message || 'Documento revisado correctamente');
                    return response.data;
                }
                if (response?.success === true) {
                    this.notificationService.success('Éxito', response.message || 'Documento revisado correctamente');
                    return response.data || response;
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
                console.log('📊 Respuesta devolverDocumento:', response);

                if (response?.ok === true && response.data) {
                    this.notificationService.success('Éxito', 'Documento devuelto correctamente');
                    return response.data;
                }
                if (response?.success === true) {
                    this.notificationService.success('Éxito', 'Documento devuelto correctamente');
                    return response.data || response;
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
     * ✅ MEJORADO: Obtener estadísticas del supervisor
     */
    obtenerEstadisticas(): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log('📊 Solicitando estadísticas...');

        return this.http.get<any>(`${this.apiUrl}/estadisticas`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta de estadísticas COMPLETA:', response);

                let estadisticasData: any = {};

                if (response?.ok === true && response.data) {
                    estadisticasData = response.data;
                } else if (response?.success === true) {
                    estadisticasData = response.data || response;
                } else {
                    estadisticasData = response;
                }

                console.log('📊 Estadísticas procesadas:', estadisticasData);

                return {
                    totalDocumentosRadicados: estadisticasData.totalDocumentosRadicados || 0,
                    totalPendientes: estadisticasData.totalPendientes ||
                        estadisticasData.totales?.pendientes || 0,
                    recientes: estadisticasData.recientes ||
                        estadisticasData.recientesUltimaSemana || 0,
                    urgentes: estadisticasData.urgentes || 0,
                    aprobados: estadisticasData.aprobados ||
                        estadisticasData.totales?.aprobados || 0,
                    observados: estadisticasData.observados ||
                        estadisticasData.totales?.observados || 0,
                    rechazados: estadisticasData.rechazados ||
                        estadisticasData.totales?.rechazados || 0,
                    tiempoPromedioHoras: estadisticasData.tiempoPromedioHoras || 0,
                    eficiencia: estadisticasData.eficiencia || 0,
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
                    totalDocumentosRadicados: 0,
                    totalPendientes: 0,
                    recientes: 0,
                    urgentes: 0,
                    aprobados: 0,
                    observados: 0,
                    rechazados: 0,
                    tiempoPromedioHoras: 0,
                    eficiencia: 0,
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
     * ✅ MEJORADO: Obtener historial del supervisor
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
                return historial;
            }),
            catchError(this.handleError)
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

    /**
     * ✅ NUEVO: Enviar webhook de cambio de estado
     */
    enviarWebhookCambioEstado(
        documentoId: string,
        estadoAnterior: string,
        nuevoEstado: string,
        usuarioId: string
    ): Observable<any> {
        const headers = this.getAuthHeaders();
        const body = {
            documentoId,
            estadoAnterior,
            nuevoEstado,
            usuarioId
        };

        console.log(`🔄 Enviando webhook de cambio de estado para documento ${documentoId}`);

        return this.http.post<any>(`${this.apiUrl}/webhook/cambio-estado`, body, { headers }).pipe(
            map(response => {
                console.log('✅ Webhook enviado correctamente:', response);
                return response;
            }),
            catchError(error => {
                console.error('❌ Error enviando webhook:', error);
                return of({ success: false, message: 'Error enviando webhook' });
            })
        );
    }

    /**
     * ✅ NUEVO: Método de diagnóstico completo
     */
    realizarDiagnosticoCompleto(): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log('🔍 Iniciando diagnóstico completo del sistema...');

        // 1. Primero, verificar autenticación
        const userStr = localStorage.getItem('user');
        let usuarioFrontend: UsuarioFrontend | null = null;

        if (userStr) {
            try {
                usuarioFrontend = JSON.parse(userStr) as UsuarioFrontend;
                console.log('👤 Usuario en localStorage:', usuarioFrontend);
            } catch (error) {
                console.error('❌ Error parseando usuario del localStorage:', error);
                usuarioFrontend = null;
            }
        }

        // 2. Realizar diagnóstico en backend
        return this.http.get<any>(`${this.apiUrl}/diagnostico`, { headers }).pipe(
            tap(response => {
                console.log('📊 ======= DIAGNÓSTICO BACKEND =======');
                console.log('📅 Timestamp:', response.timestamp);

                if (response.usuario) {
                    console.log('👤 USUARIO BACKEND:');
                    console.log('   - ID:', response.usuario.id);
                    console.log('   - Username:', response.usuario.username);
                    console.log('   - Rol:', response.usuario.role);
                    console.log('   - ¿Es admin?', response.usuario.esAdmin);
                    console.log('   - ¿Es supervisor?', response.usuario.esSupervisor);
                }

                if (response.conteos) {
                    console.log('📊 CONTEO DOCUMENTOS:');
                    console.log('   - Total documentos:', response.conteos?.totalDocumentos);
                    console.log('   - RADICADO (exacto):', response.conteos?.radicadoExacto);
                    console.log('   - radicado (minúsculas):', response.conteos?.radicadoMinusculas);
                    console.log('   - %RADICADO% (like):', response.conteos?.radicadoLike);
                }

                if (response.estadosEnBD) {
                    console.log('🔍 ESTADOS EN BD:');
                    response.estadosEnBD?.forEach((estado: any) => {
                        console.log(`   - "${estado.estado}": ${estado.cantidad} documentos`);
                    });
                }

                console.log('📄 EJEMPLO DE DOCUMENTOS:');
                if (response.documentosEjemplo && response.documentosEjemplo.length > 0) {
                    response.documentosEjemplo.forEach((doc: any, index: number) => {
                        console.log(`   [${index + 1}] ${doc.numeroRadicado} - Estado: "${doc.estado}" (longitud: ${doc.estadoLongitud})`);
                    });
                } else {
                    console.log('   ⚠️ No hay documentos de ejemplo');
                }

                console.log('👥 SUPERVISORES:');
                console.log('   - Total:', response.supervisores?.total || 0);

                console.log('📋 ASIGNACIONES:');
                console.log('   - Total:', response.asignaciones?.total || 0);

                console.log('=======================================');
            }),
            map(response => {
                return {
                    success: true,
                    frontend: {
                        usuario: usuarioFrontend,
                        token: localStorage.getItem('access_token') ? 'PRESENTE' : 'AUSENTE'
                    },
                    backend: response
                };
            }),
            catchError(error => {
                console.error('❌ Error en diagnóstico:', error);

                return of({
                    success: false,
                    error: error.message,
                    frontend: {
                        usuario: usuarioFrontend,
                        token: localStorage.getItem('access_token') ? 'PRESENTE' : 'AUSENTE'
                    },
                    backend: null
                });
            })
        );
    }

    /**
     * ✅ NUEVO: Probar múltiples endpoints
     */
    probarEndpoints(): Observable<any> {
        console.log('🧪 Probando todos los endpoints del supervisor...');

        const headers = this.getAuthHeaders();
        const endpoints = [
            { name: 'documentos/pendientes', url: `${this.apiUrl}/documentos/pendientes` },
            { name: 'documentos-asignados', url: `${this.apiUrl}/documentos-asignados` },
            { name: 'estadisticas', url: `${this.apiUrl}/estadisticas` },
            { name: 'conteo-radicados', url: `${this.apiUrl}/conteo-radicados` }
        ];

        // Probar cada endpoint
        const pruebas = endpoints.map(endpoint =>
            this.http.get<any>(endpoint.url, { headers }).pipe(
                map(response => ({
                    endpoint: endpoint.name,
                    status: 'OK',
                    respuesta: response
                })),
                catchError(error => of({
                    endpoint: endpoint.name,
                    status: 'ERROR',
                    error: error.message,
                    statusCode: error.status
                }))
            )
        );

        return forkJoin(pruebas).pipe(
            tap(results => {
                console.log('📋 RESULTADOS PRUEBAS ENDPOINTS:');
                results.forEach((result: any) => {
                    console.log(`   ${result.endpoint}: ${result.status}`);
                    if (result.status === 'OK') {
                        console.log(`     Respuesta:`, result.respuesta);
                    } else {
                        console.log(`     Error: ${result.error} (${result.statusCode})`);
                    }
                });
            }),
            map(results => ({ success: true, resultados: results }))
        );
    }

    /**
     * ✅ NUEVO: Forzar asignación de documentos
     */
    forzarAsignacionDocumentos(): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log('🚀 Forzando asignación de documentos...');

        return this.http.post<any>(`${this.apiUrl}/asignar-todos`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta asignación forzada:', response);

                if (response?.success === true) {
                    this.notificationService.success('Éxito', response.message || 'Asignación completada');
                    return response.data;
                }
                throw new Error('Error en la asignación forzada');
            }),
            catchError(error => {
                console.error('❌ Error forzando asignación:', error);
                this.notificationService.error('Error', 'No se pudo forzar la asignación');
                return throwError(() => error);
            })
        );
    }

    /**
     * ✅ NUEVO: Obtener documentos disponibles
     */
    obtenerDocumentosDisponibles(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando documentos disponibles...');

        return this.http.get<any>(`${this.apiUrl}/documentos-disponibles`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta documentos disponibles:', response);

                let documentos: Documento[] = [];

                if (response?.success === true && Array.isArray(response.data)) {
                    documentos = response.data;
                } else if (Array.isArray(response)) {
                    documentos = response;
                }

                console.log(`✅ ${documentos.length} documentos disponibles recibidos`);
                return documentos;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo documentos disponibles:', error);
                return of([]);
            })
        );
    }

    /**
     * ✅ SOLUCIÓN CORRECTA: Obtener documentos pendientes (RADICADOS)
     */
    obtenerDocumentosPendientes(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📤 SOLUCIÓN: Solicitando documentos disponibles (v2)...');

        // Intentar los diferentes endpoints posibles
        const endpoints = [
            `${this.apiUrl}/documentos-disponibles`,
            `${this.apiUrl}/documentos-radicados`,
            `${this.apiUrl}/documentos-radicados-test`
        ];

        // Probar endpoints secuencialmente
        return this.probarEndpointsSecuencialmente(endpoints, headers);
    }

    // Nuevo método auxiliar para probar endpoints secuencialmente
    private probarEndpointsSecuencialmente(endpoints: string[], headers: HttpHeaders): Observable<Documento[]> {
        return new Observable<Documento[]>(observer => {
            let currentIndex = 0;

            const probarSiguienteEndpoint = () => {
                if (currentIndex >= endpoints.length) {
                    console.log('⚠️ Todos los endpoints fallaron');
                    observer.next([]);
                    observer.complete();
                    return;
                }

                const endpoint = endpoints[currentIndex];
                console.log(`🔄 Probando endpoint: ${endpoint}`);

                this.http.get<any>(endpoint, { headers }).pipe(
                    take(1)
                ).subscribe({
                    next: (response) => {
                        console.log(`✅ Respuesta de ${endpoint}:`, response);

                        let documentosArray: any[] = [];
                        let documentosMapeados: Documento[] = [];

                        // Analizar diferentes formatos de respuesta
                        if (response?.success === true) {
                            if (Array.isArray(response.data)) {
                                documentosArray = response.data;
                            } else if (response.data?.count && Array.isArray(response.data.data)) {
                                documentosArray = response.data.data;
                            }
                        } else if (Array.isArray(response)) {
                            documentosArray = response;
                        } else if (response?.ok === true && Array.isArray(response.data)) {
                            documentosArray = response.data;
                        }

                        // Mapear documentos
                        if (documentosArray.length > 0) {
                            documentosMapeados = documentosArray.map(doc => this.mapearDocumento(doc));
                            console.log(`🎉 ${documentosMapeados.length} documentos obtenidos de ${endpoint}`);

                            observer.next(documentosMapeados);
                            observer.complete();
                        } else {
                            console.log(`⚠️ Endpoint ${endpoint} devolvió 0 documentos, probando siguiente...`);
                            currentIndex++;
                            probarSiguienteEndpoint();
                        }
                    },
                    error: (error) => {
                        console.error(`❌ Error en endpoint ${endpoint}:`, error);
                        currentIndex++;
                        probarSiguienteEndpoint();
                    }
                });
            };

            probarSiguienteEndpoint();
        });
    }

    // Método mejorado para mapear documentos
    private mapearDocumento(doc: any): Documento {
        return {
            id: doc.id || '',
            numeroRadicado: doc.numeroRadicado || '',
            numeroContrato: doc.numeroContrato || '',
            nombreContratista: doc.nombreContratista || doc.nombreContratista || 'Sin contratista',
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
            nombreRadicador: doc.nombreRadicador || doc.radicador || 'Radicador',
            usuarioRadicador: doc.usuarioRadicador || '',
            rutaCarpetaRadicado: doc.rutaCarpetaRadicado || '',
            radicador: doc.radicador || {
                id: 'rad-sistema',
                username: 'sistema',
                fullName: 'Sistema Radicador',
                role: 'RADICADOR'
            },
            tokenPublico: doc.tokenPublico || '',
            tokenActivo: doc.tokenActivo || false,
            tokenExpiraEn: doc.tokenExpiraEn ? new Date(doc.tokenExpiraEn) : new Date(),
            contratistaId: doc.contratistaId || '',
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
            ultimoAcceso: doc.ultimoAcceso ? new Date(doc.ultimoAcceso) : new Date(),
            ultimoUsuario: doc.ultimoUsuario || ''
        };
    }

    // Nuevo método auxiliar para mapear documentos
    private mapearDocumentosFromResponse(documentosArray: any[]): Documento[] {
        return documentosArray.map((doc: any) => {
            const documento: Documento = {
                id: doc.id,
                numeroRadicado: doc.numeroRadicado,
                numeroContrato: doc.numeroContrato,
                nombreContratista: doc.nombreContratista,
                documentoContratista: doc.documentoContratista,
                fechaInicio: doc.fechaInicio,
                fechaFin: doc.fechaFin,
                estado: doc.estado,
                fechaRadicacion: doc.fechaRadicacion || new Date(),
                cuentaCobro: doc.cuentaCobro || '',
                seguridadSocial: doc.seguridadSocial || '',
                informeActividades: doc.informeActividades || '',
                descripcionCuentaCobro: doc.descripcionCuentaCobro || 'Cuenta de Cobro',
                descripcionSeguridadSocial: doc.descripcionSeguridadSocial || 'Seguridad Social',
                descripcionInformeActividades: doc.descripcionInformeActividades || 'Informe de Actividades',
                observacion: doc.observacion || '',
                nombreRadicador: doc.nombreRadicador || doc.radicador || 'Radicador',
                usuarioRadicador: doc.usuarioRadicador || '',
                rutaCarpetaRadicado: doc.rutaCarpetaRadicado || '',
                radicador: doc.radicador || {
                    id: 'rad-sistema',
                    username: 'sistema',
                    fullName: 'Sistema Radicador',
                    role: 'RADICADOR'
                },
                tokenPublico: doc.tokenPublico || '',
                tokenActivo: doc.tokenActivo || false,
                tokenExpiraEn: doc.tokenExpiraEn || new Date(),
                contratistaId: doc.contratistaId || '',
                createdAt: doc.createdAt || new Date(),
                updatedAt: doc.updatedAt || new Date(),
                ultimoAcceso: doc.ultimoAcceso || new Date(),
                ultimoUsuario: doc.ultimoUsuario || ''
            };
            return documento;
        });
    }

    // Método para filtrar documentos RADICADOS
    private filtrarDocumentosRADICADOS(documentosArray: any[]): Documento[] {
        return documentosArray
            .filter((doc: any) => {
                // Verificar si el documento está RADICADO
                const estadoUpper = doc.estado?.toUpperCase() || '';
                const esRadicado = estadoUpper.includes('RADICADO');

                // Verificar disponibilidad
                const disponible = doc.disponible === true || doc.disponible === undefined;
                const puedoTomar = doc.asignacion?.puedoTomar !== false;

                return esRadicado && (disponible || puedoTomar);
            })
            .map((doc: any) => this.mapearDocumentosFromResponse([doc])[0]);
    }

    /**
     * Crear documentos de demostración basados en estadísticas reales
     */
    private crearDocumentosDemoBasadosEnEstadisticas(cantidad: number): Observable<Documento[]> {
        console.log(`🔄 Creando ${cantidad} documentos de demostración...`);

        const documentosDemo: Documento[] = [];

        // Crear documentos basados en el conteo real del backend
        for (let i = 1; i <= Math.min(cantidad, 20); i++) { // Máximo 20 para demo
            documentosDemo.push({
                id: `demo-${i}`,
                numeroRadicado: `RAD-2025-${String(i).padStart(3, '0')}`,
                numeroContrato: `CT-${String(i).padStart(4, '0')}`,
                nombreContratista: `Contratista ${i}`,
                documentoContratista: `1234567${i}`,
                fechaInicio: new Date(),
                fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                estado: 'RADICADO',
                fechaRadicacion: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Días atrás
                cuentaCobro: 'cuenta_cobro.pdf',
                seguridadSocial: 'seguridad_social.pdf',
                informeActividades: 'informe_actividades.pdf',
                descripcionCuentaCobro: 'Cuenta de Cobro para revisión',
                descripcionSeguridadSocial: 'Anexos de seguridad social',
                descripcionInformeActividades: 'Informe de actividades realizadas',
                observacion: 'Documento pendiente de revisión por supervisor',
                nombreRadicador: 'Sistema Radicador',
                usuarioRadicador: 'radicador',
                rutaCarpetaRadicado: '/radicados/2025',
                radicador: {
                    id: 'rad1',
                    username: 'radicador',
                    fullName: 'Sistema Radicador',
                    role: 'RADICADOR'
                },
                tokenPublico: '',
                tokenActivo: false,
                tokenExpiraEn: new Date(),
                contratistaId: `cont${i}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                ultimoAcceso: new Date(),
                ultimoUsuario: 'sistema'
            });
        }

        console.log(`✅ ${documentosDemo.length} documentos de demostración creados`);
        return of(documentosDemo);
    }

    /**
     * ✅ NUEVO: Tomar documento para revisión
     */
    tomarDocumentoParaRevision(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🤝 Tomando documento ${documentoId} para revisión...`);

        return this.http.post<any>(`${this.apiUrl}/tomar-documento/${documentoId}`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta tomar documento:', response);

                if (response?.success === true) {
                    this.notificationService.success('Éxito', response.message || 'Documento tomado para revisión');
                    return response;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * ✅ NUEVO: Liberar documento
     */
    liberarDocumento(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🔄 Liberando documento ${documentoId}...`);

        return this.http.post<any>(`${this.apiUrl}/liberar-documento/${documentoId}`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta liberar documento:', response);

                if (response?.success === true) {
                    this.notificationService.success('Éxito', response.message || 'Documento liberado correctamente');
                    return response;
                }
                throw new Error('Respuesta inválida del servidor');
            }),
            catchError(this.handleError)
        );
    }

    /**
     * ✅ NUEVO: Obtener documentos que estoy revisando
     */
    obtenerDocumentosEnRevision(): Observable<any[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando documentos en revisión...');

        return this.http.get<any>(`${this.apiUrl}/mis-revisiones`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta documentos en revisión:', response);

                if (response?.success === true && Array.isArray(response.data)) {
                    return response.data;
                }
                return [];
            }),
            catchError(error => {
                console.error('❌ Error obteniendo documentos en revisión:', error);
                return of([]);
            })
        );
    }

    // En supervisor.service.ts - agregar método de diagnóstico
    realizarDiagnosticoDocumentos(): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log('🔍 Realizando diagnóstico de documentos...');

        return this.http.get<any>(`${this.apiUrl}/diagnostico`, { headers }).pipe(
            tap(response => {
                console.log('📊 ======= DIAGNÓSTICO DOCUMENTOS =======');

                if (response.conteos) {
                    console.log('📊 CONTEO DOCUMENTOS:');
                    console.log('   - Total documentos:', response.conteos?.totalDocumentos);
                    console.log('   - RADICADO (exacto):', response.conteos?.radicadoExacto);
                    console.log('   - radicado (minúsculas):', response.conteos?.radicadoMinusculas);
                    console.log('   - %RADICADO% (like):', response.conteos?.radicadoLike);
                }

                if (response.estadosEnBD) {
                    console.log('🔍 ESTADOS EN BD:');
                    response.estadosEnBD?.forEach((estado: any) => {
                        console.log(`   - "${estado.estado}": ${estado.cantidad} documentos`);
                    });
                }

                console.log('📄 EJEMPLO DE DOCUMENTOS:');
                if (response.documentosEjemplo && response.documentosEjemplo.length > 0) {
                    response.documentosEjemplo.forEach((doc: any, index: number) => {
                        console.log(`   [${index + 1}] ${doc.numeroRadicado} - Estado: "${doc.estado}"`);
                    });
                }

                console.log('=======================================');
            }),
            catchError(error => {
                console.error('❌ Error en diagnóstico:', error);
                return of({
                    error: error.message,
                    message: 'Error realizando diagnóstico'
                });
            })
        );
    }
}