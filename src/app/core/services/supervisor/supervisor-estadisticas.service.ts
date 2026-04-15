// src/app/core/services/supervisor/supervisor-estadisticas.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../notification.service';
import { SupervisorEstadisticas, PeriodoStats, FiltrosEstadisticasSupervisor } from '../../models/supervisor-estadisticas.model';

@Injectable({
  providedIn: 'root'
})
export class SupervisorEstadisticasService {
  private apiUrl = `${environment.apiUrl}/supervisor/estadisticas`;
  private supervisorApiUrl = `${environment.apiUrl}/supervisor`; // ✅ NUEVO: URL base de supervisor

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });
  }

  // ✅ CORREGIDO: Usar el endpoint correcto que SÍ tiene los datos
  obtenerHistorial(limit: number = 20): Observable<any[]> {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
      console.warn('[Historial] No hay token de autenticación');
      return of([]);
    }

    // ✅ Usar el endpoint correcto: /supervisor/documentos/mis-supervisiones
    const url = `${this.supervisorApiUrl}/documentos/mis-supervisiones`;
    console.log('[Historial] Llamando a:', url);

    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        console.log('[DEBUG Supervisor Historial] Respuesta completa:', response);

        // Extraer los datos correctamente de la estructura response.data.data
        let documentos: any[] = [];
        
        // Estructura que se ve en tu log: { ok: true, data: { success: true, count: 3, data: [...] } }
        if (response?.data?.data && Array.isArray(response.data.data)) {
          documentos = response.data.data;
          console.log('[Historial] ✅ Usando response.data.data:', documentos.length);
        }
        // Fallback: response.data
        else if (response?.data && Array.isArray(response.data)) {
          documentos = response.data;
          console.log('[Historial] Usando response.data:', documentos.length);
        }
        // Fallback: response directo
        else if (Array.isArray(response)) {
          documentos = response;
          console.log('[Historial] Usando response directo:', documentos.length);
        }
        
        console.log(`[Historial] ${documentos.length} registros encontrados`);
        
        // Mostrar los estados para debug
        documentos.forEach((doc, idx) => {
          console.log(`[Historial] Documento ${idx + 1}: ${doc.numeroRadicado} → ESTADO: "${doc.estado}"`);
        });
        
        return documentos;
      }),
      catchError(err => {
        console.error('[Supervisor Historial] Error en la petición:', err);
        this.notificationService.error('Error', 'No se pudo cargar el historial');
        return of([]);
      })
    );
  }

  // Resto de métodos existentes...
  obtenerEstadisticas(filtros: FiltrosEstadisticasSupervisor): Observable<SupervisorEstadisticas | null> {
    // ... tu código existente ...
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
        console.log('[Supervisor Stats] Respuesta POST completa:', JSON.stringify(response, null, 2));

        let data = response;

        if (data?.ok === true && data?.data) data = data.data;
        if (data?.data) data = data.data;
        if (data?.success === true && data?.data) data = data.data;
        if (data?.data) data = data.data;
        if (data?.success || data?.ok) data = data.data || data;

        const estadisticas: SupervisorEstadisticas = {
          totalDocumentosRadicados: data?.totalDocumentosRadicados ?? 0,
          enRevision: data?.enRevision ?? 0,
          aprobados: data?.aprobados ?? 0,
          observados: data?.observados ?? 0,
          rechazados: data?.rechazados ?? 0,
          tiempoPromedioHoras: data?.tiempoPromedioHoras ?? 0,
          eficiencia: data?.eficiencia ?? 0,
          distribucion: (data?.distribucion || []).map((item: any) => ({
            estado: item.estado || 'Desconocido',
            cantidad: Number(item.cantidad) || 0,
            porcentaje: Number(item.porcentaje) || 0,
            color: item.color || '#6c757d'
          })),
          ultimosProcesados: (data?.ultimosProcesados || []).map((item: any) => ({
            id: item.id,
            numeroRadicado: item.numeroRadicado || item.documento?.numeroRadicado || 'N/A',
            contratista: item.contratista || item.documento?.nombreContratista || 'N/A',
            fecha: item.fecha || item.fechaAprobacion || item.fechaCreacion || item.fechaActualizacion || '',
            estado: item.estado || 'N/A'
          })),
          totales: {
            enRevision: Number(data?.enRevision) || 0,
            aprobados: Number(data?.aprobados) || 0,
            observados: Number(data?.observados) || 0,
            rechazados: Number(data?.rechazados) || 0,
            total: Number(data?.totales?.total) ||
                   (Number(data?.enRevision) || 0) +
                   (Number(data?.aprobados) || 0) +
                   (Number(data?.observados) || 0) +
                   (Number(data?.rechazados) || 0)
          },
          fechaConsulta: data?.fechaConsulta || new Date().toISOString(),
          desde: data?.desde || '',
          hasta: data?.hasta || ''
        };

        console.log('[Supervisor Stats] Datos finales mapeados:', estadisticas);
        return estadisticas;
      }),
      catchError(err => {
        console.error('[Supervisor Stats] Error en POST:', err);
        this.notificationService.error('Error', 'No se pudieron cargar las estadísticas');
        return of(null);
      })
    );
  }
}