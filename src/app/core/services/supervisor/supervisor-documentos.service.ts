import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs'; // Añadido throwError
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

                // Filtrar solo documentos en estado APROBADO_AUDITOR
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
                return throwError(() => new Error('Error al cargar el documento')); // Corregido
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
                console.log('📊 Respuesta mis supervisiones (completa):', JSON.stringify(response, null, 2));
                console.log('📊 Estructura data:', response?.data);
                console.log('📊 Es array?', Array.isArray(response?.data?.data));

                let documentos: Documento[] = [];

                // La respuesta del backend tiene estructura: { success: true, count: 10, data: [...] }
                if (response?.data && Array.isArray(response.data)) {
                    console.log('✅ Usando response.data');
                    documentos = this.mapearDocumentosDesdeBackend(response.data);
                }
                // Si viene como { success: true, data: { data: [...] } }
                else if (response?.data?.data && Array.isArray(response.data.data)) {
                    console.log('✅ Usando response.data.data');
                    documentos = this.mapearDocumentosDesdeBackend(response.data.data);
                }
                // Si viene como array directo
                else if (Array.isArray(response)) {
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

    /**
     * ✅ OBTENER URL PARA ARCHIVO DEL AUDITOR
     */
    getUrlArchivoAuditor(documentoId: string, tipo: string): string {
        if (!documentoId || !tipo) return '#';

        const token = this.getAuthToken();
        const apiBase = environment.apiUrl;
        const rawToken = token.replace('Bearer ', '');

        return `${apiBase}/supervisor/ver-archivo-auditor/${documentoId}/${tipo}?token=${encodeURIComponent(rawToken)}`;
    }
}