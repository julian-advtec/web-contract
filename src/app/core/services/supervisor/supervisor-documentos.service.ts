import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Documento } from '../../models/documento.model';
import { SupervisorCoreService } from './supervisor-core.service';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupervisorDocumentosService extends SupervisorCoreService {

    obtenerDocumentosDisponibles(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando documentos APROBADOS POR AUDITOR...');

        return this.http.get<any>(`${this.apiUrl}/documentos-disponibles`, { headers }).pipe(
            map(response => {
                console.log('📊 Procesando respuesta...');

                let documentos: Documento[] = [];

                if (response?.data && Array.isArray(response.data)) {
                    console.log('✅ Usando response.data');
                    documentos = this.mapearDocumentosDesdeBackend(response.data);
                } else if (Array.isArray(response)) {
                    console.log('✅ Usando response como array');
                    documentos = this.mapearDocumentosDesdeBackend(response);
                }

                const filtrados = documentos.filter(doc => {
                    const estado = (doc.estado || '').toUpperCase();
                    return estado === 'APROBADO_AUDITOR';
                });

                console.log(`✅ ${filtrados.length} documentos APROBADOS POR AUDITOR encontrados`);
                return filtrados;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo documentos:', error);
                return of([]);
            })
        );
    }

// En supervisor-documentos.service.ts

// src/app/core/services/supervisor/supervisor-documentos.service.ts

obtenerDocumentoPorId(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    console.log(`🔍 Supervisor obteniendo documento con ID: ${id}`);

    return this.http.get<any>(`${this.apiUrl}/documento/${id}`, { headers }).pipe(
        map(response => {
            console.log('📊 Respuesta obtenerDocumentoPorId:', response);
            
            // ✅ Extraer correctamente el documento
            let documento = null;
            
            // Caso 1: response.data.documento (estructura común)
            if (response?.data?.documento) {
                documento = response.data.documento;
                console.log('✅ response.data.documento');
            }
            // Caso 2: response.data (si tiene id y estado directamente)
            else if (response?.data && response.data.id && response.data.estado) {
                documento = response.data;
                console.log('✅ response.data (con id y estado)');
            }
            // Caso 3: response.data.data (estructura anidada)
            else if (response?.data?.data && response.data.data.id) {
                documento = response.data.data;
                console.log('✅ response.data.data');
            }
            // Caso 4: response.documento
            else if (response?.documento) {
                documento = response.documento;
                console.log('✅ response.documento');
            }
            // Caso 5: response directamente
            else if (response?.id) {
                documento = response;
                console.log('✅ response');
            }
            // Caso 6: response.data y luego buscar dentro
            else if (response?.data) {
                // Intentar encontrar cualquier objeto con id y estado
                const findDocumento = (obj: any): any => {
                    if (!obj) return null;
                    if (obj.id && obj.estado) return obj;
                    for (const key in obj) {
                        if (obj[key] && typeof obj[key] === 'object') {
                            const found = findDocumento(obj[key]);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                documento = findDocumento(response.data);
                if (documento) console.log('✅ Encontrado documento buscando recursivamente');
            }

            if (documento) {
                console.log('📄 Documento extraído:', {
                    id: documento.id,
                    numeroRadicado: documento.numeroRadicado,
                    estado: documento.estado
                });
            } else {
                console.error('❌ No se pudo extraer documento de la respuesta:', JSON.stringify(response, null, 2));
            }

            return documento || response;
        }),
        catchError(error => {
            console.error('❌ Error obteniendo documento:', error);
            return throwError(() => new Error('Error al cargar el documento'));
        })
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

    obtenerDocumentosPendientes(): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.get(`${this.apiUrl}/pendientes`, { headers }).pipe(
            catchError(this.handleError)
        );
    }

    obtenerDocumentosRevisados(): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.get(`${this.apiUrl}/revisados`, { headers }).pipe(
            catchError(this.handleError)
        );
    }

    obtenerMisSupervisiones(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando todas mis supervisiones...');

        return this.http.get<any>(`${this.apiUrl}/documentos/mis-supervisiones`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta mis supervisiones:', JSON.stringify(response, null, 2));

                let documentos: Documento[] = [];

                if (response?.data && Array.isArray(response.data)) {
                    console.log('✅ Usando response.data');
                    documentos = this.mapearDocumentosDesdeBackend(response.data);
                } else if (response?.data?.data && Array.isArray(response.data.data)) {
                    console.log('✅ Usando response.data.data');
                    documentos = this.mapearDocumentosDesdeBackend(response.data.data);
                } else if (Array.isArray(response)) {
                    console.log('✅ Usando response como array');
                    documentos = this.mapearDocumentosDesdeBackend(response);
                }

                console.log(`📊 Documentos mapeados: ${documentos.length}`);
                return documentos;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo mis supervisiones:', error);
                return of([]);
            })
        );
    }

    verArchivoAuditor(documentoId: string, tipo: string): void {
        if (!documentoId || !tipo) {
            console.warn('[verArchivoAuditor] Falta documentoId o tipo');
            return;
        }

        console.log(`👁️ Supervisor viendo archivo auditor: ${tipo} del documento ${documentoId}`);

        const token = this.getAuthToken();
        const apiBase = environment.apiUrl;
        const url = `${apiBase}/supervisor/ver-archivo-auditor/${documentoId}/${tipo}?token=${encodeURIComponent(token.replace('Bearer ', ''))}`;

        window.open(url, '_blank');
    }

    getUrlArchivoAuditor(documentoId: string, tipo: string): string {
        if (!documentoId || !tipo) return '#';

        const token = this.getAuthToken();
        const apiBase = environment.apiUrl;
        const rawToken = token.replace('Bearer ', '');

        return `${apiBase}/supervisor/ver-archivo-auditor/${documentoId}/${tipo}?token=${encodeURIComponent(rawToken)}`;
    }

    obtenerRevisionSupervisorPorDocumento(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🔍 Buscando revisión de supervisor para documento: ${documentoId}`);

        return this.http.get<any>(`${this.apiUrl}/revision/${documentoId}`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta revisión supervisor (raw):', response);

                let revision = response?.data || response;

                if (revision?.revision) {
                    revision = revision.revision;
                }

                console.log('📊 Revisión extraída:', revision);
                return revision;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo revisión de supervisor:', error);
                return of(null);
            })
        );
    }
}