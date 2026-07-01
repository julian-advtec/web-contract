// src/app/core/services/supervisor/supervisor-revision.service.ts

import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupervisorCoreService } from './supervisor-core.service';

@Injectable({
    providedIn: 'root'
})
export class SupervisorRevisionService extends SupervisorCoreService {
    
guardarRevision(documentoId: string, datosRevision: any): Observable<any> {
    const headers = this.getAuthHeaders();

    const payload: any = {
        estado: datosRevision.estado,
        observacion: datosRevision.observacion || '',
        correcciones: datosRevision.correcciones || null,
        requierePazSalvo: datosRevision.requierePazSalvo || false,
        esUltimoRadicado: datosRevision.esUltimoRadicado || false
    };

    // ✅ Agregar firma si existe
    if (datosRevision.signatureId && datosRevision.signaturePosition) {
        payload.signatureId = datosRevision.signatureId;
        payload.signaturePosition = datosRevision.signaturePosition;
        console.log('📤 Enviando revisión CON firma digital');
    } else {
        console.log('📤 Enviando revisión SIN firma digital');
    }

    return this.http.post<any>(`${this.revisionApiUrl}/${documentoId}`, payload, { headers });
}

guardarRevisionConArchivo(
    documentoId: string,
    datosRevision: any,
    archivoAprobacion?: File | null,
    archivoPazSalvo?: File | null
): Observable<any> {
    const formData = new FormData();

    formData.append('estado', datosRevision.estado);
    formData.append('observacion', datosRevision.observacion || '');
    
    if (datosRevision.correcciones) {
        formData.append('correcciones', datosRevision.correcciones);
    }
    formData.append('requierePazSalvo', datosRevision.requierePazSalvo ? 'true' : 'false');
    formData.append('esUltimoRadicado', datosRevision.esUltimoRadicado ? 'true' : 'false');
    
    // ✅ Agregar firma si existe
    if (datosRevision.signatureId && datosRevision.signaturePosition) {
        formData.append('signatureId', datosRevision.signatureId);
        formData.append('signaturePosition', datosRevision.signaturePosition);
        console.log('📤 Enviando revisión CON firma digital (con archivos)');
    }

    if (archivoAprobacion) {
        formData.append('archivoAprobacion', archivoAprobacion);
    }
    if (archivoPazSalvo) {
        formData.append('pazSalvo', archivoPazSalvo);
    }

    const token = this.getAuthToken();
    const headers = new HttpHeaders({ 'Authorization': token });

    return this.http.post<any>(`${this.revisionApiUrl}/${documentoId}`, formData, { headers });
}

    tomarDocumentoParaRevision(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🤝 Tomando documento ${documentoId} para revisión...`);

        // ✅ Usar apiUrl (documentos) para tomar/liberar
        return this.http.post<any>(`${this.apiUrl}/tomar/${documentoId}`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta tomar documento:', response);
                if (response?.success === true) {
                    return response;
                }
                return response;
            }),
            catchError(this.handleError)
        );
    }

    liberarDocumento(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`🔄 Liberando documento ${documentoId}...`);

        // ✅ Usar apiUrl (documentos) para tomar/liberar
        return this.http.post<any>(`${this.apiUrl}/liberar/${documentoId}`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta liberar documento:', response);
                if (response?.success === true) {
                    return response;
                }
                return response;
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

        // ✅ Usar revisionApiUrl
        return this.http.post<any>(`${this.revisionApiUrl}/aprobar/${id}`, body, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta aprobarDocumento:', response);
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

    rechazarDocumento(id: string, motivo: string): Observable<any> {
        const body = {
            estado: 'RECHAZADO',
            observacion: motivo
        };
        const headers = this.getAuthHeaders();
        console.log(`❌ Rechazando documento ${id}...`);

        // ✅ Usar revisionApiUrl
        return this.http.post<any>(`${this.revisionApiUrl}/rechazar/${id}`, body, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta rechazarDocumento:', response);
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

    observarDocumento(id: string, observaciones: string): Observable<any> {
        const body = {
            estado: 'OBSERVADO',
            observacion: observaciones
        };
        const headers = this.getAuthHeaders();
        console.log(`🔍 Observando documento ${id}...`);

        // ✅ Usar revisionApiUrl
        return this.http.post<any>(`${this.revisionApiUrl}/observar/${id}`, body, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta observarDocumento:', response);
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

    devolverDocumento(documentoId: string, motivo: string, instrucciones: string): Observable<any> {
        const headers = this.getAuthHeaders();
        const body = { motivo, instrucciones };
        console.log(`↩️ Devolviendo documento ${documentoId}...`);

        // ✅ Usar revisionApiUrl
        return this.http.post<any>(`${this.revisionApiUrl}/devolver/${documentoId}`, body, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta devolver documento:', response);
                if (response?.success === true) {
                    return response;
                }
                return response;
            }),
            catchError(this.handleError)
        );
    }

    guardarRevisionConDocumentos(documentoId: string, formData: FormData): Observable<any> {
        const headers = this.getAuthHeaders();
        // ✅ Usar revisionApiUrl
        return this.http.post(`${this.revisionApiUrl}/con-documentos/${documentoId}`, formData, { headers })
            .pipe(catchError(this.handleError));
    }

    subirDocumentosCorregidos(formData: FormData): Observable<any> {
        const headers = this.getAuthHeaders();
        // ✅ Usar revisionApiUrl
        return this.http.post(`${this.revisionApiUrl}/subir-corregidos`, formData, { headers })
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
        // ✅ Usar revisionApiUrl
        return this.http.post(`${this.revisionApiUrl}/subir-archivo`, formData, { headers }).pipe(
            map((response: any) => response),
            catchError(this.handleError)
        );
    }

    obtenerHistorialConArchivos(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        // ✅ Usar revisionApiUrl
        return this.http.get(`${this.revisionApiUrl}/historial/${documentoId}/archivos`, { headers }).pipe(
            map((response: any) => response),
            catchError(this.handleError)
        );
    }

   // src/app/core/services/supervisor/supervisor-revision.service.ts

firmarActa(documentoId: string, signatureId: string, position: any): Observable<any> {
    const headers = this.getAuthHeaders();
    // Enviar signatureId y position como campos separados, no dentro de un objeto anidado
    const body = {
        signatureId: signatureId,
        position: position
    };
    console.log('📤 Enviando firma al backend:', body);
    return this.http.post(`${this.apiUrl}/${documentoId}/firmar-acta`, body, { headers });
}
}