import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs'; // Añadido throwError
import { catchError, map } from 'rxjs/operators';
import { Documento } from '../../models/documento.model';
import { SupervisorCoreService } from './supervisor-core.service';

@Injectable({
    providedIn: 'root'
})
export class SupervisorDocumentosService extends SupervisorCoreService {
    
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

// src/app/core/services/supervisor/supervisor-documentos.service.ts
// Agrega este método

obtenerMisSupervisiones(): Observable<Documento[]> {
  const headers = this.getAuthHeaders();
  console.log('📋 Solicitando todas mis supervisiones...');

  return this.http.get<any>(`${this.apiUrl}/mis-supervisiones`, { headers }).pipe(
    map(response => {
      console.log('📊 Respuesta mis supervisiones:', response);

      let documentos: Documento[] = [];

      if (response?.data && Array.isArray(response.data)) {
        documentos = this.mapearDocumentosDesdeBackend(response.data);
      } else if (Array.isArray(response)) {
        documentos = this.mapearDocumentosDesdeBackend(response);
      }

      return documentos;
    }),
    catchError(error => {
      console.error('❌ Error obteniendo mis supervisiones:', error);
      return of([]);
    })
  );
}
}