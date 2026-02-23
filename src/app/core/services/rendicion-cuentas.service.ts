// src/app/core/services/rendicion-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { map, catchError, switchMap, retryWhen, delay, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import {
  RendicionCuentasProceso,
  RendicionCuentasHistorialItem,
  TomarDecisionDto,
  IniciarRevisionDto,
  CreateRendicionCuentasDto,
  FiltrosRendicionCuentas,
  RendicionCuentasEstado
} from '../models/rendicion-cuentas.model';

@Injectable({
  providedIn: 'root'
})
export class RendicionCuentasService {
  private apiUrl = `${environment.apiUrl}/rendicion-cuentas`;  // ej: http://localhost:3000/api/rendicion-cuentas

  constructor(private http: HttpClient) {}

  /**
   * Espera hasta que el token esté disponible en localStorage (máximo 12 segundos)
   * Una vez que aparece → ejecuta la petición real
   */
  private waitForTokenAndExecute<T>(
    requestFactory: () => Observable<T>,
    maxWaitSeconds: number = 12
  ): Observable<T> {
    const start = Date.now();

    return timer(0, 200).pipe(  // chequea cada 200ms para ser más rápido
      switchMap(() => {
        const token = localStorage.getItem('token');
        const elapsed = (Date.now() - start) / 1000;

        if (token) {
          console.log(`[RendicionService] Token encontrado tras ${elapsed.toFixed(1)}s → ejecutando petición`);
          return requestFactory();
        }

        if (elapsed > maxWaitSeconds) {
          console.warn(`[RendicionService] Timeout: token no apareció después de ${maxWaitSeconds}s`);
          return throwError(() => new Error('No se encontró token después de esperar'));
        }

        console.log(`[RendicionService] Esperando token... (${elapsed.toFixed(1)}s)`);
        return throwError(() => 'waiting');
      }),
      retryWhen(errors =>
        errors.pipe(
          delay(200),
          take(maxWaitSeconds * 5 + 1)  // ~12 segundos de intentos
        )
      ),
      catchError(err => {
        if (err === 'waiting') {
          return throwError(() => new Error('Timeout esperando token de autenticación'));
        }
        console.error('[RendicionService] Error en petición:', err);
        return throwError(() => err);
      })
    );
  }

  // ────────────────────────────────────────────────
  // TODOS LOS MÉTODOS USAN LA ESPERA DEL TOKEN
  // ────────────────────────────────────────────────

  obtenerDocumentosDisponibles(): Observable<RendicionCuentasProceso[]> {
    return this.waitForTokenAndExecute(() =>
      this.http.get<any>(`${this.apiUrl}/pendientes`).pipe(
        map(res => this.handleListResponse(res, 'documentos disponibles')),
        catchError(err => this.handleError(err, 'cargar documentos disponibles'))
      )
    );
  }

  obtenerDocumentosPendientes(filtros?: FiltrosRendicionCuentas): Observable<{ data: RendicionCuentasProceso[]; total: number }> {
    let params = new HttpParams();
    if (filtros?.estados?.length) params = params.set('estados', filtros.estados.join(','));
    if (filtros?.responsableId) params = params.set('responsableId', filtros.responsableId);
    if (filtros?.desde) params = params.set('desde', filtros.desde);
    if (filtros?.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros?.limit) params = params.set('limit', filtros.limit.toString());
    if (filtros?.offset) params = params.set('offset', filtros.offset.toString());

    return this.waitForTokenAndExecute(() =>
      this.http.get<any>(this.apiUrl, { params }).pipe(
        map(res => ({
          data: this.handleListResponse(res, 'documentos con filtros'),
          total: res.meta?.total || 0
        })),
        catchError(err => this.handleError(err, 'cargar documentos con filtros'))
      )
    );
  }

  obtenerMisDocumentos(filtros?: { estados?: string[]; desde?: Date; hasta?: Date }): Observable<RendicionCuentasProceso[]> {
    let params = new HttpParams();
    if (filtros?.estados?.length) params = params.set('estados', filtros.estados.join(','));
    if (filtros?.desde) params = params.set('desde', filtros.desde.toISOString());
    if (filtros?.hasta) params = params.set('hasta', filtros.hasta.toISOString());

    return this.waitForTokenAndExecute(() =>
      this.http.get<any>(`${this.apiUrl}/mis-documentos`, { params }).pipe(
        map(res => this.handleListResponse(res, 'mis documentos')),
        catchError(err => this.handleError(err, 'cargar mis documentos'))
      )
    );
  }

  obtenerDetalleRevision(id: string): Observable<RendicionCuentasProceso> {
    if (!id) return throwError(() => new Error('ID requerido'));

    return this.waitForTokenAndExecute(() =>
      this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
        map(res => {
          if (res.ok && res.data) return this.mapearProceso(res.data);
          throw new Error(res.message || 'No se encontró el documento');
        }),
        catchError(err => this.handleError(err, `obtener detalle ${id}`))
      )
    );
  }

  getHistorial(id: string): Observable<RendicionCuentasHistorialItem[]> {
    if (!id) return throwError(() => new Error('ID requerido'));

    return this.waitForTokenAndExecute(() =>
      this.http.get<any>(`${this.apiUrl}/${id}/historial`).pipe(
        map(res => {
          if (res.ok && res.data) return res.data.map((h: any) => this.mapearHistorial(h));
          if (Array.isArray(res)) return res.map((h: any) => this.mapearHistorial(h));
          return [];
        }),
        catchError(err => this.handleError(err, `cargar historial ${id}`))
      )
    );
  }

  tomarDocumentoParaRevision(id: string): Observable<any> {
    if (!id) return throwError(() => new Error('ID requerido'));

    return this.waitForTokenAndExecute(() =>
      this.http.post<any>(`${this.apiUrl}/${id}/tomar`, {}).pipe(
        map(res => {
          if (res.ok || res.success) return res;
          throw new Error(res.message || 'No se pudo tomar el documento');
        }),
        catchError(err => this.handleError(err, `tomar documento ${id}`))
      )
    );
  }

  iniciarRevision(id: string, dto: IniciarRevisionDto): Observable<RendicionCuentasProceso> {
    return this.waitForTokenAndExecute(() =>
      this.http.post<any>(`${this.apiUrl}/${id}/iniciar-revision`, dto).pipe(
        map(res => this.handleActionResponse(res, 'iniciar revisión')),
        catchError(err => this.handleError(err, `iniciar revisión ${id}`))
      )
    );
  }

  tomarDecision(id: string, dto: TomarDecisionDto): Observable<RendicionCuentasProceso> {
    return this.waitForTokenAndExecute(() =>
      this.http.post<any>(`${this.apiUrl}/${id}/decision`, dto).pipe(
        map(res => this.handleActionResponse(res, 'tomar decisión')),
        catchError(err => this.handleError(err, `tomar decisión ${id}`))
      )
    );
  }

  liberarDocumento(id: string): Observable<any> {
    return this.waitForTokenAndExecute(() =>
      this.http.post<any>(`${this.apiUrl}/${id}/liberar`, {}).pipe(
        map(res => {
          if (res.ok || res.success) return res;
          throw new Error(res.message || 'No se pudo liberar el documento');
        }),
        catchError(err => this.handleError(err, `liberar ${id}`))
      )
    );
  }

  crearDocumento(dto: CreateRendicionCuentasDto): Observable<RendicionCuentasProceso> {
    return this.waitForTokenAndExecute(() =>
      this.http.post<any>(this.apiUrl, dto).pipe(
        map(res => this.handleActionResponse(res, 'crear documento')),
        catchError(err => this.handleError(err, 'crear documento'))
      )
    );
  }

  verArchivo(documentoId: string, tipo: 'informe' | 'adjunto' | 'resumen'): Observable<Blob> {
    return this.waitForTokenAndExecute(() =>
      this.http.get(`${this.apiUrl}/${documentoId}/archivo/${tipo}`, {
        responseType: 'blob'
      })
    );
  }

  // =============================================================================
  // UTILIDADES (sin cambios)
  // =============================================================================

 // src/app/core/services/rendicion-cuentas.service.ts
private handleListResponse(response: any, context: string): RendicionCuentasProceso[] {
  console.log(`[RendicionService] Respuesta recibida en ${context}:`, response);
  
  // Caso 1: Respuesta con { ok: true, data: [...] }
  if (response && response.ok === true && Array.isArray(response.data)) {
    return response.data.map((d: any) => this.mapearProceso(d));
  }
  
  // Caso 2: Respuesta directa como array
  if (Array.isArray(response)) {
    return response.map((d: any) => this.mapearProceso(d));
  }
  
  // Caso 3: Respuesta con { data: [...] } (sin ok)
  if (response && Array.isArray(response.data)) {
    return response.data.map((d: any) => this.mapearProceso(d));
  }
  
  // Caso 4: Respuesta con { data: { data: [...] } } (anidado)
  if (response && response.data && Array.isArray(response.data.data)) {
    return response.data.data.map((d: any) => this.mapearProceso(d));
  }
  
  console.warn(`[RendicionService] Formato inesperado en ${context}:`, response);
  return [];
}

private handleActionResponse(response: any, action: string): RendicionCuentasProceso {
  console.log(`[RendicionService] Respuesta de ${action}:`, response);
  
  if (response && response.ok === true && response.data) {
    return this.mapearProceso(response.data);
  }
  
  if (response && response.data) {
    return this.mapearProceso(response.data);
  }
  
  if (response && response.id) {
    return this.mapearProceso(response);
  }
  
  throw new Error(response?.message || `Fallo al ${action}`);
}

  private handleError(error: any, context: string): Observable<never> {
    const msg = error.error?.message || error.message || `Error al ${context}`;
    console.error(`[RendicionService] ${context}:`, error);
    return throwError(() => new Error(msg));
  }

  private mapearProceso(data: any): RendicionCuentasProceso {
    const estado = this.normalizarEstado(data.estado || data.estadoRendicion);
    
    return {
      id: data.id,
      documentoId: data.documentoId || data.id,
      documento: data.documento,
      responsableId: data.responsableId,
      responsable: data.responsable,
      estado,
      observaciones: data.observaciones || data.observacionesRendicion,
      fechaAsignacion: data.fechaAsignacion ? new Date(data.fechaAsignacion) : undefined,
      fechaInicioRevision: data.fechaInicioRevision ? new Date(data.fechaInicioRevision) : undefined,
      fechaDecision: data.fechaDecision ? new Date(data.fechaDecision) : undefined,
      fechaCreacion: new Date(data.fechaCreacion),
      fechaActualizacion: new Date(data.fechaActualizacion),
      
      numeroRadicado: data.documento?.numeroRadicado || data.numeroRadicado,
      nombreContratista: data.documento?.nombreContratista || data.nombreContratista,
      documentoContratista: data.documento?.documentoContratista || data.documentoContratista,
      numeroContrato: data.documento?.numeroContrato || data.numeroContrato,
      contadorAsignado: data.documento?.contadorAsignado || data.contadorAsignado,
      fechaCompletadoContabilidad: data.documento?.fechaCompletadoContabilidad 
        ? new Date(data.documento.fechaCompletadoContabilidad) 
        : undefined,
      disponible: estado === RendicionCuentasEstado.PENDIENTE && !data.responsableId,
      
      informesPresentados: data.informesPresentados || [],
      documentosAdjuntos: data.documentosAdjuntos || [],
      montoRendido: data.montoRendido,
      montoAprobado: data.montoAprobado,
      observacionesRendicion: data.observacionesRendicion
    };
  }

  private mapearHistorial(data: any): RendicionCuentasHistorialItem {
    return {
      id: data.id,
      documentoId: data.documentoId,
      usuarioId: data.usuarioId,
      usuarioNombre: data.usuario?.nombreCompleto || data.usuarioNombre || 'Sistema',
      estadoAnterior: this.normalizarEstado(data.estadoAnterior),
      estadoNuevo: this.normalizarEstado(data.estadoNuevo),
      accion: data.accion,
      observacion: data.observacion,
      fechaCreacion: new Date(data.fechaCreacion),
      documento: data.documento ? {
        numeroRadicado: data.documento.numeroRadicado,
        nombreContratista: data.documento.nombreContratista,
        numeroContrato: data.documento.numeroContrato
      } : undefined
    };
  }

  normalizarEstado(estadoRaw: string | undefined): RendicionCuentasEstado | string {
    if (!estadoRaw) return 'DESCONOCIDO';
    
    const upper = estadoRaw.toUpperCase().trim();
    
    switch (true) {
      case upper.includes('COMPLETADO') || upper.includes('APROBADO'): return RendicionCuentasEstado.COMPLETADO;
      case upper.includes('EN_REVISION'): return RendicionCuentasEstado.EN_REVISION;
      case upper.includes('PENDIENTE'): return RendicionCuentasEstado.PENDIENTE;
      case upper.includes('OBSERVADO'): return RendicionCuentasEstado.OBSERVADO;
      case upper.includes('RECHAZADO'): return RendicionCuentasEstado.RECHAZADO;
      default: return upper;
    }
  }

  getEstadoClass(estado: string | RendicionCuentasEstado | undefined): string {
    const e = (estado || '').toString().toUpperCase();
    if (e.includes('APROBADO') || e.includes('COMPLETADO')) return 'badge-success';
    if (e.includes('OBSERVADO')) return 'badge-warning';
    if (e.includes('RECHAZADO')) return 'badge-danger';
    if (e.includes('EN_REVISION')) return 'badge-info';
    if (e.includes('PENDIENTE')) return 'badge-secondary';
    return 'badge-dark';
  }

  getEstadoTexto(estado: string | RendicionCuentasEstado | undefined): string {
    const e = (estado || '').toString().toUpperCase();
    if (e.includes('APROBADO')) return 'Aprobado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    if (e.includes('COMPLETADO')) return 'Completado';
    if (e.includes('EN_REVISION')) return 'En Revisión';
    if (e.includes('PENDIENTE')) return 'Pendiente';
    return estado?.toString() || 'Desconocido';
  }
}