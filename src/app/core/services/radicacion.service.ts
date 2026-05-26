import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Documento, CreateDocumentoDto } from '../models/documento.model';
import { NotificationService } from './notification.service';
import { ContratistasService } from './contratistas.service';
import { Contratista } from '../models/contratista.model';

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
        private notificationService: NotificationService,
        private contratistasService: ContratistasService
    ) { }

    /**
     * Obtener token de autenticación
     */
    private getToken(): string {
        return localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    }

    /**
     * Obtener headers de autenticación
     */
    private getAuthHeaders(): HttpHeaders {
        try {
            const token = this.getToken();

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
     * Manejar errores de HTTP
     */
    private handleError(error: any): Observable<any> {
        console.error('❌ Error en servicio de radicación:', error);

        let errorMessage = 'Error desconocido';

        if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else {
            errorMessage = `Error ${error.status}: ${error.message}`;
        }

        return throwError(() => new Error(errorMessage));
    }

    /**
     * Obtener todos los documentos
     */
    obtenerDocumentos(): Observable<Documento[]> {
        console.log('📋 Solicitando documentos...');

        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            console.log('🔐 No hay token, no se puede solicitar documentos');
            console.log('🔐 Token en localStorage:', this.getToken());
            this.notificationService.warning('No estás autenticado', 'Por favor inicia sesión');
            return of([]);
        }

        console.log('🔑 Headers enviados:', headers.keys());

        return this.http.get<any>(this.apiUrl, { headers }).pipe(
            tap(response => {
                console.log('📦 Respuesta COMPLETA del backend:', response);
                console.log('📊 Estructura completa:', JSON.stringify(response, null, 2));

                if (response && response.data) {
                    console.log('📊 response.data tipo:', typeof response.data);
                    console.log('📊 response.data claves:', Object.keys(response.data));
                    console.log('📊 ¿response.data.data existe?', response.data.data !== undefined);
                    console.log('📊 ¿response.data.data es array?', Array.isArray(response.data.data));
                    console.log('📊 response.data.data:', response.data.data);
                }
            }),
            map(response => {
                console.log('🔍 Procesando respuesta...');

                if (response && response.ok === true && response.data) {
                    console.log('✅ Estructura con "ok" encontrada');

                    if (response.data.success === true && response.data.data && Array.isArray(response.data.data)) {
                        console.log(`✅ Estructura anidada encontrada: ${response.data.data.length} documentos`);
                        return response.data.data;
                    } else if (Array.isArray(response.data)) {
                        console.log(`✅ Data es array directamente: ${response.data.length} documentos`);
                        return response.data;
                    } else if (response.data.data && Array.isArray(response.data.data)) {
                        console.log(`✅ Data.data es array: ${response.data.data.length} documentos`);
                        return response.data.data;
                    }
                } else if (response && response.success === true) {
                    console.log('✅ Estructura con "success" encontrada');

                    if (response.data && Array.isArray(response.data)) {
                        console.log(`✅ ${response.data.length} documentos recibidos`);
                        return response.data;
                    }
                } else if (Array.isArray(response)) {
                    console.log(`✅ Respuesta es array directamente: ${response.length} documentos`);
                    return response;
                }

                console.warn('⚠️ No se pudo extraer documentos de la respuesta:', response);
                return [];
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('❌ Error obteniendo documentos:', {
                    status: error.status,
                    statusText: error.statusText,
                    message: error.message,
                    error: error.error
                });

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
        console.log('📝 ===== INICIANDO CREACIÓN DE DOCUMENTO =====');
        console.log('📦 DTO recibido:', createDocumentoDto);
        console.log('📁 Archivos a subir:', archivos.map(f => f.name));
        console.log('🔍 primerRadicadoDelAno:', createDocumentoDto.primerRadicadoDelAno, 'Tipo:', typeof createDocumentoDto.primerRadicadoDelAno);

        if (archivos.length !== 3) {
            const error = new Error('Debe adjuntar exactamente 3 documentos');
            this.notificationService.error('Error de validación', error.message);
            return throwError(() => error);
        }

        const radicadoRegex = /^R\d{4}-\d{4,8}$/;
        if (!radicadoRegex.test(createDocumentoDto.numeroRadicado)) {
            const error = new Error('Formato de radicado inválido. Debe ser RAAAA-NNNN (ej: R2025-0001) donde NNNN puede ser de 4 a 8 dígitos');
            this.notificationService.error('Error de validación', error.message);
            return throwError(() => error);
        }

        const formData = new FormData();

        let radicadoOriginal = createDocumentoDto.numeroRadicado.trim().toUpperCase();
        let radicadoParaBackend = radicadoOriginal;

        console.log('📤 ENVIANDO RADICACIÓN:');
        console.log('  📄 Original frontend:', radicadoOriginal);
        console.log('  📄 Enviando a backend:', radicadoParaBackend);

        const fechaInicioStr = createDocumentoDto.fechaInicio
            ? String(createDocumentoDto.fechaInicio).trim()
            : '';

        const fechaFinStr = createDocumentoDto.fechaFin
            ? String(createDocumentoDto.fechaFin).trim()
            : '';

        formData.append('numeroRadicado', radicadoParaBackend);
        formData.append('numeroContrato', createDocumentoDto.numeroContrato.trim());
        formData.append('nombreContratista', createDocumentoDto.nombreContratista.trim());
        formData.append('documentoContratista', createDocumentoDto.documentoContratista.trim());
        formData.append('emailContratista', createDocumentoDto.emailContratista?.trim() || '');
        formData.append('telefonoContratista', createDocumentoDto.telefonoContratista?.trim() || '');
        formData.append('fechaInicio', fechaInicioStr);
        formData.append('fechaFin', fechaFinStr);
        formData.append('descripcionCuentaCobro', createDocumentoDto.descripcionCuentaCobro?.trim() || 'Cuenta de Cobro');
        formData.append('descripcionSeguridadSocial', createDocumentoDto.descripcionSeguridadSocial?.trim() || 'Seguridad Social');
        formData.append('descripcionInformeActividades', createDocumentoDto.descripcionInformeActividades?.trim() || 'Informe de Actividades');

        if (createDocumentoDto.observacion?.trim()) {
            formData.append('observacion', createDocumentoDto.observacion.trim());
        }

        const primerRadicadoValue = createDocumentoDto.primerRadicadoDelAno === true ? 'true' : 'false';
        formData.append('primerRadicadoDelAno', primerRadicadoValue);

        console.log('🔍 Enviando primerRadicadoDelAno como:', primerRadicadoValue);

        archivos.forEach((archivo, index) => {
            formData.append('documentos', archivo, archivo.name);
            console.log(`Archivo ${index + 1} agregado:`, archivo.name, `(${archivo.size} bytes)`);
        });

        const headers = this.getAuthHeaders();
        const uploadHeaders = headers.delete('Content-Type');

        return this.http.post<any>(this.apiUrl, formData, { headers: uploadHeaders }).pipe(
            tap(response => {
                console.log('✅ Respuesta completa del backend:', response);
            }),
            map(response => {
                console.log('🔍 Procesando respuesta...');

                if (response && typeof response === 'object') {
                    if (response.ok === true && response.data) {
                        this.notificationService.success('Documento radicado exitosamente');
                        return response.data;
                    }

                    if (response.success === true && response.data) {
                        this.notificationService.success('Documento radicado exitosamente');
                        return response.data;
                    }

                    if (response.id && response.numeroRadicado) {
                        this.notificationService.success('Documento radicado exitosamente');
                        return response;
                    }

                    if (response.success === false || response.ok === false) {
                        throw new Error(response.message || 'Error del servidor al crear documento');
                    }
                }

                console.error('❌ Respuesta inesperada del servidor:', response);
                throw new Error('Estructura de respuesta inválida del servidor');
            }),
            catchError((error: any) => {
                console.error('❌ Error completo en crearDocumento:', error);

                if (error instanceof HttpErrorResponse) {
                    console.error('❌ Detalles HTTP:', {
                        status: error.status,
                        statusText: error.statusText,
                        message: error.message,
                        errorBody: error.error
                    });

                    const backendError = error.error?.message || error.error || error.message;

                    if (error.status === 401) {
                        this.notificationService.error('Sesión expirada', 'Por favor inicia sesión nuevamente');
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        this.router.navigate(['/auth/login']);
                        return throwError(() => new Error('Sesión expirada'));
                    }

                    if (error.status === 400) {
                        let errorMsg = 'Datos inválidos. Verifique los campos.';
                        if (typeof backendError === 'string') {
                            errorMsg = backendError;
                        } else if (Array.isArray(backendError)) {
                            errorMsg = backendError.join(', ');
                        } else if (backendError?.message) {
                            errorMsg = backendError.message;
                        }
                        this.notificationService.error('Error de validación', errorMsg);
                        return throwError(() => new Error(errorMsg));
                    }
                }

                const errorMsg = error.message || 'Error desconocido al crear documento';
                this.notificationService.error('Error', errorMsg);
                return throwError(() => new Error(errorMsg));
            })
        );
    }

    /**
     * ✅ MÉTODO SIMPLIFICADO: Marcar como primer radicado
     */
    marcarComoPrimerRadicado(documentoId: string, esPrimerRadicado: boolean): Observable<any> {
        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            return throwError(() => new Error('No autenticado'));
        }

        return this.http.put<any>(`${this.apiUrl}/${documentoId}/marcar-primer-radicado`,
            { esPrimerRadicado },
            { headers }
        ).pipe(
            map((response: any) => {
                if (response && response.success) {
                    this.notificationService.success('Operación exitosa', response.message);
                    return response.data;
                }
                throw new Error(response?.message || 'Error al actualizar');
            }),
            catchError(error => {
                console.error('❌ Error marcando primer radicado:', error);
                const errorMsg = error.error?.message || error.message || 'Error al actualizar';
                this.notificationService.error('Error', errorMsg);
                return throwError(() => new Error(errorMsg));
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

    /**
     * Obtener documento por ID
     */
  obtenerDocumentoPorId(id: string): Observable<Documento> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
        return throwError(() => new Error('No estás autenticado. Por favor inicia sesión.'));
    }

    return this.http.get<any>(`${this.apiUrl}/documento/${id}`, { headers }).pipe(
        map(response => {
            let documento = null;
            
            if (response && response.success === true && response.data) {
                documento = response.data;
            } else if (response && response.ok === true && response.data) {
                if (response.data.success === true && response.data.data) {
                    documento = response.data.data;
                } else {
                    documento = response.data;
                }
            } else if (response && response.id) {
                documento = response;
            }
            
            return documento as Documento;
        }),
        switchMap((documento: Documento): Observable<Documento> => {
            if (!documento) {
                return throwError(() => new Error('Documento no encontrado'));
            }
            
            // ✅ SIEMPRE buscar el contratista para obtener email y teléfono actualizados
            return this.contratistasService.buscarPorNumeroContrato(documento.numeroContrato).pipe(
                map((contratistas: Contratista[]) => {
                    if (contratistas && contratistas.length > 0) {
                        const contratista = contratistas[0];
                        // ✅ Sobrescribir email y teléfono con los datos del contratista
                        documento.emailContratista = contratista.email || '';
                        documento.telefonoContratista = contratista.telefono || '';
                        console.log('[RadicacionService] Datos actualizados desde contratista:', {
                            email: documento.emailContratista,
                            telefono: documento.telefonoContratista
                        });
                    }
                    return documento;
                }),
                catchError(() => {
                    console.warn('[RadicacionService] No se pudo obtener contratista, usando datos del documento');
                    return of(documento);
                })
            );
        }),
        catchError((error: HttpErrorResponse) => {
            console.error('[RadicacionService] Error obtenerDocumentoPorId:', error);
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

    /**
     * Descargar documento - CORREGIDO
     * @param id ID del documento
     * @param numeroDocumento Número del documento (1, 2, o 3)
     */
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

    /**
     * Obtener URL para previsualizar documento (usando el endpoint público)
     */
    getArchivoPreviewUrl(id: string, index: number): string {
        const token = this.getToken();
        return `${this.apiUrl}/${id}/archivo/${index}?token=${token}`;
    }

    /**
     * Método para previsualizar archivo en nueva pestaña
     */
    previsualizarArchivo(id: string, index: number): void {
        const url = this.getArchivoPreviewUrl(id, index);
        window.open(url, '_blank');
    }

    /**
     * Validar formato de radicado
     */
    validarFormatoRadicado(numeroRadicado: string): boolean {
        const regex = /^R\d{4}-\d{4,8}$/;
        return regex.test(numeroRadicado);
    }

    /**
     * Obtener año del radicado
     */
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

    /**
     * Test minimal
     */
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

    /**
     * Obtener archivos de una carpeta
     */
    obtenerArchivosCarpeta(documentoId: string): Observable<any[]> {
        const headers = this.getAuthHeaders();

        return this.http.get<any[]>(`${this.apiUrl}/${documentoId}/archivos`, { headers })
            .pipe(
                catchError(error => {
                    console.error('Error obteniendo archivos de carpeta:', error);
                    return throwError(() => error);
                })
            );
    }

    /**
     * Obtener URL de archivo
     */
    getArchivoUrl(id: string, index: number, download = false): string {
        const baseUrl = `${this.apiUrl}/${id}/archivo/${index}`;
        const params = new URLSearchParams();
        if (download) params.append('download', 'true');
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Genera la URL de un archivo con token incluido
     */
    getArchivoUrlConToken(id: string, index: number, download = false): string {
        const token = this.getToken();
        const baseUrl = `${this.apiUrl}/${id}/archivo/${index}`;
        const params = new URLSearchParams();
        if (download) params.append('download', 'true');
        if (token) params.append('token', token);
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Descarga directamente el archivo sin pasar por Blob
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
     * Descarga archivo como Blob y retorna Observable<Blob>
     */
    descargarArchivoBlob(id: string, index: number): Observable<Blob> {
        const token = this.getToken();
        if (!token) return throwError(() => new Error('No estás autenticado'));

        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

        return this.http.get(`${this.apiUrl}/${id}/archivo/${index}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError(error => {
                console.error('Error descargando archivo:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Obtener URL de preview para Word
     */
    getArchivoPreviewWordUrl(id: string, index: number): string {
        const token = this.getToken();
        return `${this.apiUrl}/${id}/archivo/${index}/preview?token=${token}`;
    }

    /**
     * Construye la URL base del archivo
     */
    private buildArchivoUrl(
        id: string,
        index: number,
        download = false
    ): string {
        const token = this.getToken();

        const params = new URLSearchParams();
        if (token) params.append('token', token);
        if (download) params.append('download', 'true');

        return `${this.apiUrl}/${id}/archivo/${index}?${params.toString()}`;
    }

    /**
     * Método para obtener MIS documentos (filtrando por usuario actual)
     */
    obtenerMisDocumentos(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            this.notificationService.warning('No estás autenticado', 'Por favor inicia sesión');
            return of([]);
        }

        console.log('📋 Solicitando MIS documentos...');

        return this.http.get<any>(`${this.apiUrl}`, { headers }).pipe(
            tap(response => {
                console.log('📦 Respuesta COMPLETA para MIS documentos:', response);
            }),
            map(response => {
                console.log('🔍 Procesando respuesta para MIS documentos...');

                let documentosArray: any[] = [];

                if (response && response.ok === true && response.data) {
                    if (response.data.success === true && response.data.data && Array.isArray(response.data.data)) {
                        console.log(`✅ Estructura anidada encontrada: ${response.data.data.length} documentos`);
                        documentosArray = response.data.data;
                    } else if (Array.isArray(response.data)) {
                        console.log(`✅ Data es array directamente: ${response.data.length} documentos`);
                        documentosArray = response.data;
                    } else if (response.data.data && Array.isArray(response.data.data)) {
                        console.log(`✅ Data.data es array: ${response.data.data.length} documentos`);
                        documentosArray = response.data.data;
                    }
                } else if (response && response.success === true) {
                    if (response.data && Array.isArray(response.data)) {
                        console.log(`✅ ${response.data.length} documentos recibidos`);
                        documentosArray = response.data;
                    }
                } else if (Array.isArray(response)) {
                    console.log(`✅ Respuesta es array directamente: ${response.length} documentos`);
                    documentosArray = response;
                }

                const userStr = localStorage.getItem('user');
                let currentUsername = '';

                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        currentUsername = user.username;
                        console.log('👤 Filtrando por usuario:', currentUsername);
                    } catch (error) {
                        console.error('Error parseando usuario:', error);
                    }
                }

                const documentosFiltrados = documentosArray.filter(doc => {
                    const radicadorUsername = doc.radicador?.username ||
                        doc.usuarioRadicador ||
                        doc.radicadoPor;

                    console.log(`📄 Documento ${doc.numeroRadicado}: radicador=${radicadorUsername}, usuarioActual=${currentUsername}`);

                    return radicadorUsername === currentUsername;
                });

                console.log(`📊 Total documentos después de filtrar: ${documentosFiltrados.length}`);

                return documentosFiltrados;
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('❌ Error obteniendo MIS documentos:', error);

                console.log('🔄 Intentando con endpoint específico...');

                return this.http.get<any>(`${this.apiUrl}/mis-documentos`, { headers }).pipe(
                    map(response => {
                        if (response?.success === true && Array.isArray(response.data)) {
                            return response.data;
                        }
                        if (Array.isArray(response)) {
                            return response;
                        }
                        return [];
                    }),
                    catchError(() => of([]))
                );
            })
        );
    }

    /**
     * ✅ NUEVO: Verificar si existe primer radicado para un año específico
     */
    verificarPrimerRadicadoDisponible(ano: string): Observable<{ disponible: boolean, mensaje: string, primerRadicadoExistente?: any }> {
        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            return of({ disponible: false, mensaje: 'No autenticado' });
        }

        return this.http.get<any>(`${this.apiUrl}/verificar-primer-radicado/${ano}`, { headers }).pipe(
            map(response => {
                if (response.success) {
                    return {
                        disponible: response.data.disponible,
                        mensaje: response.data.mensaje,
                        primerRadicadoExistente: response.data.primerRadicadoExistente
                    };
                }
                return { disponible: false, mensaje: 'Error verificando disponibilidad' };
            }),
            catchError(error => {
                console.error('❌ Error verificando primer radicado:', error);
                return of({
                    disponible: false,
                    mensaje: error.error?.message || 'Error al verificar disponibilidad'
                });
            })
        );
    }

    /**
     * ✅ NUEVO: Obtener estadísticas de primeros radicados por año
     */
    obtenerPrimerosRadicadosPorAno(ano?: string): Observable<any> {
        const headers = this.getAuthHeaders();

        if (!headers.get('Authorization')) {
            return of({ success: false, data: null, message: 'No autenticado' });
        }

        const url = ano
            ? `${this.apiUrl}/estadisticas/primer-radicado-ano?ano=${ano}`
            : `${this.apiUrl}/estadisticas/primer-radicado-ano`;

        return this.http.get<any>(url, { headers }).pipe(
            map(response => {
                if (response.success) {
                    return response.data;
                }
                throw new Error(response.message || 'Error obteniendo estadísticas');
            }),
            catchError(error => {
                console.error('❌ Error obteniendo primeros radicados:', error);
                return of({ total: 0, porAno: {}, detalles: [] });
            })
        );
    }

    /**
     * Obtener TODOS los documentos del sistema
     */
    getAllDocumentos(): Observable<any[]> {
        console.log('[RadicacionService] Solicitando TODOS los documentos del sistema');

        return this.http.get<any>(`${this.apiUrl}`, { headers: this.getAuthHeaders() }).pipe(
            map(response => {
                console.log('[RadicacionService] Respuesta getAllDocumentos:', response);

                if (response && response.success && response.data) {
                    return response.data;
                }

                if (Array.isArray(response)) {
                    return response;
                }

                if (response && response.data && Array.isArray(response.data)) {
                    return response.data;
                }

                console.warn('[RadicacionService] Formato de respuesta inesperado:', response);
                return [];
            }),
            catchError(error => {
                console.error('[RadicacionService] Error en getAllDocumentos:', error);
                return throwError(() => new Error(error.message || 'Error al obtener documentos'));
            })
        );
    }

    descargarArchivo(blob: Blob, nombreArchivo: string): void {
        try {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log(`✅ Archivo descargado: ${nombreArchivo}`);
        } catch (error) {
            console.error('❌ Error descargando archivo:', error);
            this.notificationService.error('Error', 'No se pudo descargar el archivo');
        }
    }
}