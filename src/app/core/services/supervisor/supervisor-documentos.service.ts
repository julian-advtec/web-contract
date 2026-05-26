// src/app/core/services/supervisor/supervisor-documentos.service.ts

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Documento } from '../../models/documento.model';
import { SupervisorCoreService } from './supervisor-core.service';

@Injectable({
    providedIn: 'root'
})
export class SupervisorDocumentosService extends SupervisorCoreService {

    obtenerDocumentosDisponibles(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando documentos APROBADOS POR AUDITOR...');

        return this.http.get<any>(`${this.apiUrl}/disponibles`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta completa del backend:', response);

                // Usar el nuevo método de mapeo que extrae los datos correctamente
                const documentos = this.mapearDocumentosDesdeBackend(response);

                console.log(`📊 Documentos mapeados: ${documentos.length}`);

                // Filtrar solo los que están en estado APROBADO_AUDITOR
                const filtrados = documentos.filter(doc => {
                    const estado = (doc.estado || '').toUpperCase();
                    return estado === 'APROBADO_AUDITOR';
                });

                console.log(`✅ ${filtrados.length} documentos APROBADOS POR AUDITOR encontrados`);
                filtrados.forEach(doc => {
                    console.log(`   - ${doc.numeroRadicado} (${doc.estado})`);
                });

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

        return this.http.get<any>(`${this.apiUrl}/${id}`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta obtenerDocumentoPorId:', response);

                // Extraer el documento de la respuesta
                let documento = response?.data?.documento || response?.documento || response?.data || response;
                return documento;
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
                return this.mapearDocumentosDesdeBackend(response);
            }),
            catchError(error => {
                console.error('❌ Error obteniendo mis revisiones:', error);
                return of([]);
            })
        );
    }

    obtenerMisSupervisiones(): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        console.log('📋 Solicitando todas mis supervisiones...');

        return this.http.get<any>(`${this.apiUrl}/mis-supervisiones`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta mis supervisiones:', response);
                return this.mapearDocumentosDesdeBackend(response);
            }),
            catchError(error => {
                console.error('❌ Error obteniendo mis supervisiones:', error);
                return of([]);
            })
        );
    }

    obtenerDocumentosPendientes(): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.get(`${this.apiUrl}/pendientes`, { headers }).pipe(catchError(this.handleError));
    }

    obtenerDocumentosRevisados(): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.get(`${this.apiUrl}/revisados`, { headers }).pipe(catchError(this.handleError));
    }

    obtenerRevisionSupervisorPorDocumento(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🔍 Buscando revisión de supervisor para documento: ${documentoId}`);

        return this.http.get<any>(`${this.apiUrl}/revision/${documentoId}`, { headers }).pipe(
            map(response => {
                let revision = response?.data || response;
                if (revision?.revision) {
                    revision = revision.revision;
                }
                return revision;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo revisión de supervisor:', error);
                return of(null);
            })
        );
    }

    obtenerActaParaVisualizacion(documentoId: string, soloLectura: boolean): Observable<Blob> {
        const headers = this.getAuthHeaders();

        // ✅ USAR EL ENDPOINT INTELIGENTE /acta con parámetro soloLectura
        const url = `${this.apiUrl}/${documentoId}/acta?soloLectura=${soloLectura}`;
        console.log(`📄 Solicitando acta: ${url}`);

        return this.http.get(url, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError(error => {
                console.error('❌ Error obteniendo acta:', error);
                return throwError(() => new Error('No se pudo cargar el acta'));
            })
        );
    }

 


    // Mantener para compatibilidad pero usar internamente el inteligente
    obtenerActaOriginal(documentoId: string): Observable<Blob> {
        return this.obtenerActaParaVisualizacion(documentoId, false);
    }

    obtenerActaFirmada(documentoId: string): Observable<Blob> {
        return this.obtenerActaParaVisualizacion(documentoId, true);
    }

    firmarActa(documentoId: string, signatureData: { signatureId: string; position: any }): Observable<any> {
        const headers = this.getAuthHeaders();
        const body = {
            signatureId: signatureData.signatureId,
            position: signatureData.position
        };

        console.log('📤 Enviando firma al backend:', body);
        return this.http.post(`${this.apiUrl}/${documentoId}/firmar-acta`, body, { headers });
    }



}