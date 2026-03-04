import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs'; // Añadido throwError
import { map, catchError } from 'rxjs/operators';
import { SupervisorCoreService } from './supervisor-core.service';

@Injectable({
    providedIn: 'root'
})
export class SupervisorRevisionService extends SupervisorCoreService {
    
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

    // CAMBIA ESTA LÍNEA - usa '/revision/' en lugar de '/revisar/'
    return this.http.post<any>(`${this.apiUrl}/revision/${documentoId}`, payload, { headers })
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
                    return throwError(() => new Error(`Error ${error.status}: ${error.error?.message || error.message}`)); // Corregido
                })
            );
    }

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

    guardarRevisionConDocumentos(documentoId: string, formData: FormData): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.post(`${this.apiUrl}/documentos/${documentoId}/documentos-corregidos`, formData, { headers })
            .pipe(catchError(this.handleError));
    }

    subirDocumentosCorregidos(formData: FormData): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.post(`${this.apiUrl}/subir-documentos-corregidos`, formData, { headers })
            .pipe(
                map((response: any) => response),
                catchError(this.handleError)
            );
    }

    subirArchivoRevision(documentoId: string, indice: number, archivo: File): Observable<any> {
        const formData = new FormData();
        formData.append('archivoAprobacion', archivo, archivo.name);
        formData.append('indice', indice.toString());
        formData.append('documentoId', documentoId);

        const headers = this.getAuthHeaders();
        return this.http.post(`${this.apiUrl}/subir-archivo`, formData, { headers }).pipe(
            map((response: any) => response),
            catchError(this.handleError)
        );
    }

    obtenerHistorialConArchivos(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.get(`${this.apiUrl}/historial/${documentoId}/archivos`, { headers }).pipe(
            map((response: any) => response),
            catchError(this.handleError)
        );
    }
}