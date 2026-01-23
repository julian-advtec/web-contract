import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupervisorCoreService } from './supervisor-core.service';

interface SupervisorStats {
    pendientes: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class SupervisorEstadisticasService extends SupervisorCoreService {
    
    obtenerEstadisticas(): Observable<any> {
        const headers = this.getAuthHeaders();
        console.log('📊 Solicitando estadísticas...');

        return this.http.get<any>(`${this.apiUrl}/estadisticas`, { headers }).pipe(
            map(response => {
                console.log('📊 Respuesta de estadísticas:', response);

                if (response?.ok === true && response.data) {
                    return response.data;
                }
                if (response?.success === true) {
                    return response.data || response;
                }
                return response;
            }),
            catchError(error => {
                console.error('❌ Error obteniendo estadísticas:', error);
                return of({
                    totalDocumentosRadicados: 0,
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
        const headers = this.getAuthHeaders();
        console.log('📊 Solicitando historial...');

        return this.http.get<any>(`${this.apiUrl}/historial`, { headers }).pipe(
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
                return { success: true, data: historial };
            }),
            catchError(error => {
                console.error('❌ Error obteniendo historial:', error);
                return of({ success: true, data: [] });
            })
        );
    }
}