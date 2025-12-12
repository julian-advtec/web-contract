import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Documento, CreateDocumentoDto } from '../models/documento.model';
import { NotificationService } from './notification.service';

// Interfaces para las respuestas del backend
interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
    count?: number;
}

interface DocumentosResponse extends ApiResponse<Documento[]> {
    count: number;
}

interface DocumentoResponse extends ApiResponse<Documento> { }

interface PermisosResponse extends ApiResponse<{
    puedeRadicar: boolean;
    puedeVer: boolean;
    puedeDescargar: boolean;
    usuario: any;
}> { }

@Injectable({
    providedIn: 'root'
})
export class RadicacionService {
    private apiUrl = `${environment.apiUrl}/radicacion`;

    constructor(
        private http: HttpClient,
        private router: Router,
        private notificationService: NotificationService
    ) { }

    /**
     * Obtener headers de autenticación
     */
    private getAuthHeaders(): HttpHeaders {
        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

            if (!token) {
                console.warn('⚠️ No hay token disponible');
                this.notificationService.warning('No estás autenticado', 'Por favor inicia sesión');
                return new HttpHeaders();
            }

            return new HttpHeaders({
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            });
        } catch (error) {
            console.error('❌ Error obteniendo headers:', error);
            return new HttpHeaders();
        }
    }

    /**
     * Obtener todos los documentos
     */
    obtenerDocumentos(): Observable<Documento[]> {
        console.log('📋 Solicitando documentos...');

        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            console.log('🔐 No hay token, no se puede solicitar documentos');
            return of([]);
        }

        return this.http.get<DocumentosResponse>(this.apiUrl, { headers }).pipe(
            tap(response => console.log('📦 Respuesta completa:', response)),
            map(response => {
                // Verificar que la respuesta tenga el formato esperado
                if (response && response.success && Array.isArray(response.data)) {
                    console.log(`✅ ${response.data.length} documentos recibidos`);
                    return response.data;
                }

                console.log('⚠️ Formato de respuesta inesperado:', response);
                return [];
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('❌ Error obteniendo documentos:', {
                    status: error.status,
                    statusText: error.statusText,
                    message: error.message,
                    error: error.error
                });

                // Manejo específico de errores
                if (error.status === 401) {
                    console.log('🔐 Token inválido o expirado (401) - Cerrando sesión');
                    this.notificationService.error('Sesión expirada', 'Por favor inicia sesión nuevamente');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    this.router.navigate(['/auth/login']);
                    return throwError(() => new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.'));
                }

                if (error.status === 403) {
                    console.log('🚫 Usuario autenticado pero sin permisos (403)');
                    this.notificationService.warning('Sin permisos', 'No tienes permisos para ver documentos');
                    return of([]);
                }

                if (error.status === 0) {
                    console.log('🌐 Error de conexión');
                    this.notificationService.error('Error de conexión', 'No se pudo conectar con el servidor');
                    return of([]);
                }

                // Para otros errores
                const errorMsg = error.error?.message || error.message || 'Error desconocido';
                this.notificationService.error('Error', errorMsg);
                return of([]);
            })
        );
    }

    /**
     * Crear documento
     */
    crearDocumento(createDocumentoDto: CreateDocumentoDto, archivos: File[]): Observable<Documento> {
        console.log('📝 Intentando crear documento:', createDocumentoDto);
        console.log('📁 Archivos a subir:', archivos.map(f => f.name));

        // Validar que haya 3 archivos
        if (archivos.length !== 3) {
            const error = new Error('Debe adjuntar exactamente 3 documentos');
            this.notificationService.error('Error de validación', error.message);
            return throwError(() => error);
        }

        // Validar formato del radicado
        const radicadoRegex = /^R\d{4}-\d{3}$/;
        if (!radicadoRegex.test(createDocumentoDto.numeroRadicado)) {
            const error = new Error('Formato de radicado inválido. Debe ser RAAAA-NNN');
            this.notificationService.error('Error de validación', error.message);
            return throwError(() => error);
        }

        const formData = new FormData();

        // Agregar datos del formulario
        formData.append('numeroRadicado', createDocumentoDto.numeroRadicado);
        formData.append('numeroContrato', createDocumentoDto.numeroContrato);
        formData.append('nombreContratista', createDocumentoDto.nombreContratista);
        formData.append('documentoContratista', createDocumentoDto.documentoContratista);
        formData.append('fechaInicio', createDocumentoDto.fechaInicio.toISOString());
        formData.append('fechaFin', createDocumentoDto.fechaFin.toISOString());
        formData.append('descripcionDoc1', createDocumentoDto.descripcionDoc1 || 'Documento 1');
        formData.append('descripcionDoc2', createDocumentoDto.descripcionDoc2 || 'Documento 2');
        formData.append('descripcionDoc3', createDocumentoDto.descripcionDoc3 || 'Documento 3');

        // Agregar archivos
        archivos.forEach((archivo) => {
            formData.append('documentos', archivo, archivo.name);
        });

        const headers = this.getAuthHeaders();

        // IMPORTANTE: No establecer Content-Type para FormData, el navegador lo hace automáticamente
        const uploadHeaders = headers.delete('Content-Type');

        return this.http.post<DocumentoResponse>(this.apiUrl, formData, { headers: uploadHeaders }).pipe(
            tap(response => console.log('✅ Respuesta de creación:', response)),
            map(response => {
                if (response && response.success && response.data) {
                    this.notificationService.success('Documento radicado exitosamente');
                    return response.data;
                }
                throw new Error(response?.message || 'Error desconocido al crear documento');
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('❌ Error creando documento:', {
                    status: error.status,
                    message: error.message,
                    error: error.error
                });

                // Manejo específico de errores
                if (error.status === 401) {
                    this.notificationService.error('Sesión expirada', 'Por favor inicia sesión nuevamente');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    this.router.navigate(['/auth/login']);
                    return throwError(() => new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.'));
                }

                if (error.status === 403) {
                    const errorMsg = error.error?.message || 'No tienes permisos para radicar documentos';
                    this.notificationService.error('Sin permisos', errorMsg);
                    return throwError(() => new Error(errorMsg));
                }

                if (error.status === 409) {
                    const errorMsg = error.error?.message || 'El número de radicado ya existe';
                    this.notificationService.error('Radicado duplicado', errorMsg);
                    return throwError(() => new Error(errorMsg));
                }

                if (error.status === 400) {
                    const errorMsg = error.error?.message || 'Datos inválidos';
                    this.notificationService.error('Error de validación', errorMsg);
                    return throwError(() => new Error(errorMsg));
                }

                if (error.status === 500) {
                    const errorMsg = error.error?.message || 'Error interno del servidor';
                    this.notificationService.error('Error del servidor', errorMsg);
                    return throwError(() => new Error(errorMsg));
                }

                // Error general
                const errorMsg = error.error?.message || error.message || 'Error desconocido';
                this.notificationService.error('Error', errorMsg);
                return throwError(() => new Error(errorMsg));
            })
        );
    }

    /**
     * Método para debug - verificar permisos del usuario actual
     */
    debugUserInfo(): Observable<ApiResponse<any>> {
        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            return throwError(() => new Error('No hay token disponible'));
        }

        return this.http.get<ApiResponse<any>>(`${this.apiUrl}/debug/user-info`, { headers }).pipe(
            catchError(error => {
                console.error('❌ Error debug:', error);
                // No mostrar notificación para este error
                return throwError(() => error);
            })
        );
    }

    /**
     * Verificar permisos del usuario actual
     */
    verificarPermisosUsuario(): Observable<PermisosResponse> {
        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            return of({
                success: false,
                data: {
                    puedeRadicar: false,
                    puedeVer: false,
                    puedeDescargar: false,
                    usuario: null
                },
                message: 'No autenticado'
            } as PermisosResponse);
        }

        return this.http.get<PermisosResponse>(`${this.apiUrl}/verificar/permisos`, { headers }).pipe(
            catchError(error => {
                console.log('⚠️ Error verificando permisos:', error.status);

                // Si es 401, usuario no autenticado
                if (error.status === 401) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    return of({
                        success: false,
                        data: {
                            puedeRadicar: false,
                            puedeVer: false,
                            puedeDescargar: false,
                            usuario: null
                        },
                        message: 'Sesión expirada'
                    } as PermisosResponse);
                }

                // Otros errores
                return of({
                    success: false,
                    data: {
                        puedeRadicar: false,
                        puedeVer: false,
                        puedeDescargar: false,
                        usuario: null
                    },
                    message: 'Error verificando permisos'
                } as PermisosResponse);
            })
        );
    }

    obtenerDocumentoPorId(id: string): Observable<Documento> {
        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            return throwError(() => new Error('No estás autenticado. Por favor inicia sesión.'));
        }

        return this.http.get<DocumentoResponse>(`${this.apiUrl}/${id}`, { headers }).pipe(
            map(response => {
                if (response && response.success && response.data) {
                    return response.data;
                }
                throw new Error('Documento no encontrado');
            }),
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    this.router.navigate(['/auth/login']);
                }
                return throwError(() => error);
            })
        );
    }

    descargarDocumento(id: string, numeroDocumento: number): Observable<Blob> {
        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            return throwError(() => new Error('No estás autenticado. Por favor inicia sesión.'));
        }

        return this.http.get(`${this.apiUrl}/${id}/descargar/${numeroDocumento}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError((error: HttpErrorResponse) => {
                console.error('❌ Error descargando documento:', error);

                if (error.status === 401) {
                    this.notificationService.error('Sesión expirada', 'Por favor inicia sesión nuevamente');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    this.router.navigate(['/auth/login']);
                } else if (error.status === 403) {
                    this.notificationService.error('Sin permisos', 'No tienes permisos para descargar este archivo');
                } else if (error.status === 404) {
                    this.notificationService.error('No encontrado', 'El archivo no existe');
                }

                return throwError(() => error);
            })
        );
    }

    descargarArchivo(blob: Blob, nombreArchivo: string): void {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    validarFormatoRadicado(numeroRadicado: string): boolean {
        const regex = /^R\d{4}-\d{3}$/;
        return regex.test(numeroRadicado);
    }

    obtenerAnoRadicado(numeroRadicado: string): string {
        if (this.validarFormatoRadicado(numeroRadicado)) {
            return numeroRadicado.substring(1, 5);
        }
        return '';
    }

    /**
     * Endpoint de test para sistema de archivos
     */
    testFilesystem(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.apiUrl}/test/filesystem`).pipe(
            catchError(error => {
                console.error('❌ Error test filesystem:', error);
                return of({
                    success: false,
                    message: 'No se pudo conectar con el backend'
                });
            })
        );
    }

    testMinimal(): Observable<any> {
        const headers = this.getAuthHeaders();

        return this.http.post(`${this.apiUrl}/test-minimal`, {}, { headers }).pipe(
            map(response => {
                console.log('✅ Resultado test minimal:', response);
                return response;
            }),
            catchError(error => {
                console.error('❌ Error test minimal:', error);
                return of({
                    success: false,
                    message: 'Error en test minimal'
                });
            })
        );
    }
}