// src/app/core/services/auditor-estadisticas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { AuditorEstadisticas, PeriodoStats, FiltrosEstadisticasAuditor, AuditorRechazadoResponse } from '../models/auditor-estadisticas.model';

@Injectable({
    providedIn: 'root'
})
export class AuditorEstadisticasService {
    private apiUrl = `${environment.apiUrl}/auditor/estadisticas`;

    constructor(
        private http: HttpClient,
        private notificationService: NotificationService
    ) { }

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('access_token') || '';
        return new HttpHeaders({
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
        });
    }

    obtenerEstadisticas(filtros: FiltrosEstadisticasAuditor): Observable<AuditorEstadisticas | null> {
        const headers = this.getAuthHeaders();
        if (!headers.has('Authorization')) {
            this.notificationService.error('Error', 'No estás autenticado');
            return of(null);
        }

        const periodoLimpio = filtros?.periodo?.toLowerCase().trim() || PeriodoStats.ANO;
        const body = { periodo: periodoLimpio };

        return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
            timeout(15000),
            map(response => {
                console.log('[Auditor Stats] Respuesta POST completa:', JSON.stringify(response, null, 2));

                // CORREGIDO: Navegación correcta por la estructura anidada
                let data = response;

                // Nivel 1: {ok: true, data: {...}}
                if (data?.ok === true && data?.data) {
                    data = data.data;
                }

                // Nivel 2: {ok: true, data: {...}} (segundo nivel)
                if (data?.ok === true && data?.data) {
                    data = data.data;
                }

                // Nivel 3: {success: true, data: {...}}
                if (data?.success === true && data?.data) {
                    data = data.data;  // ← Aquí están los datos reales
                }

                console.log('[Auditor Stats] Datos extraídos:', data);

                // Si no hay datos, retornar null
                if (!data) {
                    console.warn('[Auditor Stats] No se encontraron datos en la respuesta');
                    return null;
                }

                // Mapear a la interfaz AuditorEstadisticas
                const estadisticas: AuditorEstadisticas = {
                    totalDocumentosDisponibles: data?.totalDocumentosDisponibles ?? 0,
                    misDocumentos: {
                        enRevision: data?.misDocumentos?.enRevision ?? 0,
                        aprobados: data?.misDocumentos?.aprobados ?? 0,
                        observados: data?.misDocumentos?.observados ?? 0,
                        rechazados: data?.misDocumentos?.rechazados ?? 0,
                        completados: data?.misDocumentos?.completados ?? 0,
                        primerRadicados: data?.misDocumentos?.primerRadicados ?? 0,
                        total: data?.misDocumentos?.total ?? 0,
                    },
                    rechazados: {
                        total: data?.rechazados?.total ?? 0,
                        rechazadosAuditor: data?.rechazados?.rechazadosAuditor ?? 0,
                        rechazadosOtrasAreas: data?.rechazados?.rechazadosOtrasAreas ?? 0,
                        porPeriodo: data?.rechazados?.porPeriodo ?? 0,
                    },
                    tiempoPromedioHoras: data?.tiempoPromedioHoras ?? 0,
                    eficiencia: data?.eficiencia ?? 0,
                    recientes: data?.recientes ?? 0,
                    distribucion: (data?.distribucion || []).map((item: any) => ({
                        estado: item.estado || 'Desconocido',
                        cantidad: Number(item.cantidad) || 0,
                        porcentaje: Number(item.porcentaje) || 0,
                        color: item.color || '#6c757d'
                    })),
                    ultimosProcesados: (data?.ultimosProcesados || []).map((item: any) => ({
                        id: item.id,
                        numeroRadicado: item.numeroRadicado || 'N/A',
                        contratista: item.contratista || item.documento?.nombreContratista || 'N/A',
                        fecha: item.fecha || item.fechaAprobacion || item.fechaCreacion || item.fechaActualizacion || '',
                        estado: item.estado || 'N/A',
                        primerRadicado: item.primerRadicado || false,
                    })),
                    totales: {
                        enRevision: Number(data?.misDocumentos?.enRevision) || 0,
                        aprobados: Number(data?.misDocumentos?.aprobados) || 0,
                        observados: Number(data?.misDocumentos?.observados) || 0,
                        rechazados: Number(data?.misDocumentos?.rechazados) || 0,
                        completados: Number(data?.misDocumentos?.completados) || 0,
                        total: Number(data?.misDocumentos?.total) || 0
                    },
                    fechaConsulta: data?.fechaConsulta || new Date().toISOString(),
                    desde: data?.desde || '',
                    hasta: data?.hasta || ''
                };

                console.log('[Auditor Stats] Datos finales mapeados:', estadisticas);
                return estadisticas;
            }),
            catchError(err => {
                console.error('[Auditor Stats] Error:', err);
                this.notificationService.error('Error', 'No se pudieron cargar las estadísticas');
                return of(null);
            })
        );
    }

    obtenerHistorial(limit: number = 20): Observable<any[]> {
        const headers = this.getAuthHeaders();
        if (!headers.has('Authorization')) {
            return of([]);
        }

        const params = new HttpParams().set('limit', limit.toString());

        return this.http.get<any>(`${this.apiUrl}/historial`, { headers, params }).pipe(
            map(response => {
                let historialData = response?.data?.data ||
                    response?.data ||
                    response?.historial ||
                    response?.records ||
                    response ||
                    [];
                return Array.isArray(historialData) ? historialData : [];
            }),
            catchError(err => {
                console.error('[Auditor Historial] Error:', err);
                return of([]);
            })
        );
    }

    obtenerRechazados(filtros?: { desde?: Date; hasta?: Date; soloMios?: boolean }): Observable<AuditorRechazadoResponse[]> {
        const headers = this.getAuthHeaders();
        let params = new HttpParams();

        if (filtros?.desde) {
            params = params.set('desde', filtros.desde.toISOString());
        }
        if (filtros?.hasta) {
            params = params.set('hasta', filtros.hasta.toISOString());
        }
        if (filtros?.soloMios !== undefined) {
            params = params.set('soloMios', filtros.soloMios.toString());
        }

        return this.http.get<any>(`${this.apiUrl}/rechazados`, { headers, params }).pipe(
            map(response => {
                console.log('[Rechazados] Respuesta completa:', JSON.stringify(response, null, 2));

                // Extraer los datos de la estructura anidada
                let data = response;

                // Nivel 1: {ok: true, data: {...}}
                if (data?.ok === true && data?.data) {
                    data = data.data;
                }

                // Nivel 2: {success: true, data: [...]} o array directo
                if (data?.success === true && data?.data) {
                    data = data.data;
                } else if (Array.isArray(data)) {
                    data = data;
                } else if (data?.data && Array.isArray(data.data)) {
                    data = data.data;
                } else {
                    // Si no es array, intentamos extraer cualquier propiedad que sea array
                    const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
                    if (possibleArrays.length > 0) {
                        data = possibleArrays[0];
                    } else {
                        data = [];
                    }
                }

                // Asegurar que es un array
                const result = Array.isArray(data) ? data : [];
                console.log(`[Rechazados] Documentos extraídos: ${result.length}`, result);
                return result;
            }),
            catchError(err => {
                console.error('[Rechazados] Error:', err);
                this.notificationService.error('Error', 'No se pudieron cargar los documentos rechazados');
                return of([]);
            })
        );
    }
}