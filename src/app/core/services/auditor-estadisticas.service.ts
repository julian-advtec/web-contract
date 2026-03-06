// src/app/core/services/auditor/auditor-estadisticas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { EstadisticasAuditor, PeriodoStats, FiltrosEstadisticasAuditor } from '../models/auditor-estadisticas.model';

@Injectable({
  providedIn: 'root'
})
export class AuditorEstadisticasService {
  private apiUrl = `${environment.apiUrl}/auditor/estadisticas`;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });
  }

  obtenerEstadisticas(filtros: FiltrosEstadisticasAuditor): Observable<EstadisticasAuditor | null> {
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

        // Navegar por la estructura de respuesta
        let data = response;
        if (data?.ok === true && data?.data) data = data.data;
        if (data?.data) data = data.data;

        // Mapear a la interfaz EstadisticasAuditor
        const estadisticas: EstadisticasAuditor = {
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
            nombreContratista: item.nombreContratista || 'N/A',
            documentoContratista: item.documentoContratista || 'N/A',
            numeroContrato: item.numeroContrato || 'N/A',
            fechaRadicacion: item.fechaRadicacion,
            fechaRevision: item.fechaRevision || item.fecha,
            estado: item.estado || 'N/A',
            estadoAuditor: item.estadoAuditor || item.estado,
            observaciones: item.observaciones,
            primerRadicadoDelAno: item.primerRadicadoDelAno || false,
          })),
          fechaConsulta: data?.fechaConsulta || new Date().toISOString(),
          desde: data?.desde || '',
          hasta: data?.hasta || '',
          diagnostico: data?.diagnostico,
        };

        console.log('[Auditor Stats] Datos finales mapeados:', estadisticas);
        return estadisticas;
      }),
      catchError(err => {
        console.error('[Auditor Stats] Error en POST:', err);
        this.notificationService.error('Error', 'No se pudieron cargar las estadísticas');
        return of(null);
      })
    );
  }

  obtenerHistorial(limit: number = 20): Observable<any[]> {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
      console.warn('[Historial] No hay token de autenticación');
      return of([]);
    }

    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/historial`, { headers, params }).pipe(
      map(response => {
        console.log('[DEBUG Auditor Historial] Respuesta completa:', response);
        let historialData = response?.data?.data ||
                           response?.data ||
                           response?.historial ||
                           response?.records ||
                           response ||
                           [];

        return Array.isArray(historialData) ? historialData : [];
      }),
      catchError(err => {
        console.error('[Auditor Historial] Error en la petición:', err);
        this.notificationService.error('Error', 'No se pudo cargar el historial');
        return of([]);
      })
    );
  }

  obtenerRechazados(filtros?: {
    desde?: Date;
    hasta?: Date;
    soloMios?: boolean;
  }): Observable<any[]> {
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
        console.log('[Rechazados] Respuesta:', response);
        return response?.data || response || [];
      }),
      catchError(err => {
        console.error('[Rechazados] Error:', err);
        this.notificationService.error('Error', 'No se pudieron cargar los documentos rechazados');
        return of([]);
      })
    );
  }

  // src/app/core/services/auditor.service.ts
// AÑADIR este método junto a los otros métodos de previsualización

/**
 * Previsualizar archivo radicado (cuenta cobro, seguridad social, informe)
 */
previsualizarArchivoRadicado(documentoId: string, numeroArchivo: number): void {
  const url = `${this.apiUrl}/documentos/${documentoId}/descargar-radicado/${numeroArchivo}`;
  console.log('[PREVISUALIZAR RADICADO]', url);
  window.open(url, '_blank');
}

/**
 * Previsualizar archivo de auditor (rp, cdp, etc)
 */
previsualizarArchivoAuditor(documentoId: string, tipo: string): void {
  const url = `${this.apiUrl}/documentos/${documentoId}/archivo-auditor/${tipo}`;
  console.log('[PREVISUALIZAR AUDITOR]', url);
  window.open(url, '_blank');
}

/**
 * Descargar archivo radicado
 */
descargarArchivoRadicado(documentoId: string, numeroArchivo: number): Observable<Blob> {
  return this.http.get(
    `${this.apiUrl}/documentos/${documentoId}/descargar-radicado/${numeroArchivo}`,
    { responseType: 'blob', headers: this.getAuthHeaders() }
  );
}

/**
 * Descargar archivo de auditor
 */
descargarArchivoAuditor(documentoId: string, tipo: string): Observable<Blob> {
  return this.http.get(
    `${this.apiUrl}/documentos/${documentoId}/descargar-auditor/${tipo}`,
    { responseType: 'blob', headers: this.getAuthHeaders() }
  );
}
}

