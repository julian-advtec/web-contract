import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupervisorCoreService } from './supervisor-core.service';

@Injectable({
    providedIn: 'root'
})
export class SupervisorOperacionesService extends SupervisorCoreService {
    
    forzarAsignacionDocumentos(): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log('🚀 Forzando asignación de documentos...');

        return this.http.post<any>(`${this.apiUrl}/asignar-todos`, {}, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta asignación forzada:', response);

                if (response?.success === true) {
                    return response.data;
                }
                throw new Error('Error en la asignación forzada');
            }),
            catchError(this.handleError)
        );
    }

    verificarUltimoRadicado(documentoId: string, contratistaId: string): Observable<boolean> {
        const headers = this.getAuthHeaders();
        console.log(`🔍 Verificando si es el último radicado del contratista ${contratistaId}...`);

        return this.http.get<any>(`${this.apiUrl}/verificar-ultimo-radicado/${contratistaId}/${documentoId}`, { headers })
            .pipe(
                map(response => {
                    console.log('📊 Respuesta verificación último radicado:', response);
                    return response?.data?.esUltimoRadicado || false;
                }),
                catchError(error => {
                    console.error('❌ Error verificando último radicado:', error);
                    return of(false);
                })
            );
    }

    obtenerInfoContratista(documentoId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log(`👤 Obteniendo información del contratista para documento ${documentoId}...`);

        return this.http.get<any>(`${this.apiUrl}/contratista-info/${documentoId}`, { headers })
            .pipe(
                map(response => {
                    console.log('📊 Información del contratista:', response);
                    return response?.data || {};
                }),
                catchError(error => {
                    console.error('❌ Error obteniendo información del contratista:', error);
                    return of({});
                })
            );
    }
}