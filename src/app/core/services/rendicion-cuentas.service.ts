// src/app/core/services/rendicion-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs'; // ← IMPORTAR 'of' aquí
import { map, catchError } from 'rxjs/operators';
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
  private apiUrl = `${environment.apiUrl}/rendicion-cuentas`;

  constructor(private http: HttpClient) { }

  // ==============================================
  // MÉTODOS PRINCIPALES
  // ==============================================

  /**
   * Obtener documentos disponibles (los que vienen de asesor gerencia)
   * GET /rendicion-cuentas/documentos/disponibles
   */
  obtenerDocumentosDisponibles(): Observable<RendicionCuentasProceso[]> {
    return this.http.get<any>(`${this.apiUrl}/documentos/disponibles`).pipe(
      map(res => {
        console.log('📥 Documentos disponibles:', res);
        return this.handleListResponse(res);
      }),
      catchError(err => this.handleError(err, 'cargar documentos disponibles'))
    );
  }

  /**
   * Tomar un documento para revisión
   * POST /rendicion-cuentas/documentos/:documentoId/tomar
   */
  tomarDocumentoParaRevision(documentoId: string): Observable<any> {
    if (!documentoId) return throwError(() => new Error('ID requerido'));

    console.log('📤 Tomando documento para revisión:', documentoId);

    return this.http.post<any>(`${this.apiUrl}/documentos/${documentoId}/tomar`, {}).pipe(
      map(res => {
        console.log('📥 Respuesta tomar documento:', res);
        if (res.ok || res.success) return res;
        throw new Error(res.message || 'No se pudo tomar el documento');
      }),
      catchError(err => this.handleError(err, `tomar documento ${documentoId}`))
    );
  }

  /**
   * Obtener mis documentos en revisión
   * GET /rendicion-cuentas/mis-documentos
   */
  obtenerMisDocumentos(): Observable<RendicionCuentasProceso[]> {
    return this.http.get<any>(`${this.apiUrl}/mis-documentos`).pipe(
      map(res => this.handleListResponse(res)),
      catchError(err => this.handleError(err, 'cargar mis documentos'))
    );
  }


  /**
   * Obtener detalle de una rendición por su ID
   * GET /rendicion-cuentas/rendiciones/:rendicionId/detalle
   */
  obtenerDetalleRendicion(rendicionId: string): Observable<RendicionCuentasProceso> {
    if (!rendicionId) return throwError(() => new Error('ID de rendición requerido'));

    console.log(`[Service] Obteniendo detalle rendición: ${rendicionId}`);

    return this.http.get<any>(`${this.apiUrl}/rendiciones/${rendicionId}/detalle`).pipe(
      map(res => {
        console.log('[Service] Respuesta cruda de detalle rendición:', res);

        let datos = res.data || res;
        if (!datos) throw new Error('No se encontraron datos en la respuesta');

        return this.mapearProceso(datos);
      }),
      catchError(err => this.handleError(err, `obtener detalle rendición ${rendicionId}`))
    );
  }

  tomarDecision(rendicionId: string, dto: TomarDecisionDto): Observable<RendicionCuentasProceso> {
    console.log(`[Service] Tomando decisión en rendición ${rendicionId}:`, dto);

    return this.http.patch<any>(`${this.apiUrl}/documentos/${rendicionId}/decision`, dto).pipe(
      map(res => this.handleActionResponse(res)),
      catchError(err => this.handleError(err, `tomar decisión en ${rendicionId}`))
    );
  }

  descargarCarpeta(documentoId: string): Observable<Blob> {
    console.log(`[Service] Descargando carpeta completa del documento: ${documentoId}`);

    return this.http.get(`${this.apiUrl}/documentos/${documentoId}/descargar`, {
      responseType: 'blob'
    });
  }

  /**
   * Alias para mantener compatibilidad
   */
  obtenerDetalleRevision(id: string): Observable<RendicionCuentasProceso> {
    return this.obtenerDetalleRendicion(id);
  }

  /**
   * Obtener todos los documentos de rendición (lista completa)
   * GET /rendicion-cuentas/todos-documentos
   */
  obtenerTodosDocumentos(): Observable<any[]> {
    console.log('📥 Solicitando todos los documentos de rendición...');

    return this.http.get<any>(`${this.apiUrl}/todos-documentos`).pipe(
      map(res => {
        console.log('📥 Respuesta completa de todos-documentos:', JSON.stringify(res, null, 2));

        // Caso 1: Respuesta directa array
        if (Array.isArray(res)) {
          console.log(`→ Array directo (${res.length} docs)`);
          return res;
        }

        // Caso 2: { ok: true, data: [...] }
        if (res?.ok === true && Array.isArray(res.data)) {
          console.log(`→ ok + data array (${res.data.length} docs)`);
          return res.data;
        }

        // Caso 3: { data: [...] }
        if (res?.data && Array.isArray(res.data)) {
          console.log(`→ data array (${res.data.length} docs)`);
          return res.data;
        }

        // Caso 4: doble anidamiento { ok: true, data: { ok: true, data: [...] } }
        if (res?.ok && res.data?.ok && Array.isArray(res.data.data)) {
          console.log(`→ doble anidamiento ok + data.data (${res.data.data.length} docs)`);
          return res.data.data;
        }

        // Caso 5: { data: { documentos: [...] } }
        if (res?.data?.documentos && Array.isArray(res.data.documentos)) {
          console.log(`→ data.documentos (${res.data.documentos.length} docs)`);
          return res.data.documentos;
        }

        // Caso 6: cualquier propiedad que sea array
        const arraysPosibles = Object.values(res || {}).filter(val => Array.isArray(val)) as any[];
        if (arraysPosibles.length > 0) {
          const primerArray = arraysPosibles[0];
          console.log(`→ Primer array encontrado (${primerArray.length} docs)`);
          return primerArray;
        }

        // Fallo total
        console.warn('⚠️ No se encontró array en la respuesta:', res);
        return [];
      }),
      catchError(err => {
        console.error('❌ Error en obtenerTodosDocumentos:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtener historial del usuario
   * GET /rendicion-cuentas/historial
   */
  obtenerHistorial(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/historial`).pipe(
      map(res => {
        console.log('📥 Respuesta historial:', res);

        // Si la respuesta es directamente un array
        if (Array.isArray(res)) {
          return res;
        }

        // Si tiene estructura { ok: true, data: [...] }
        if (res?.ok === true && Array.isArray(res.data)) {
          return res.data;
        }

        // Si tiene estructura { data: [...] }
        if (res?.data && Array.isArray(res.data)) {
          return res.data;
        }

        return [];
      }),
      catchError(err => {
        console.error('❌ Error en obtenerHistorial:', err);
        return of([]);
      })
    );
  }

  /**
   * Liberar documento (no implementado en backend)
   */
  liberarDocumento(id: string): Observable<any> {
    console.warn('liberarDocumento no está implementado en el backend actual');
    return throwError(() => new Error('Método no implementado'));
  }

  // =============================================================================
  // MÉTODOS DE MAPEO
  // =============================================================================

  private handleListResponse(response: any): RendicionCuentasProceso[] {
    if (response?.ok === true && Array.isArray(response.data)) {
      return response.data.map((d: any) => this.mapearProceso(d));
    }

    if (Array.isArray(response)) {
      return response.map((d: any) => this.mapearProceso(d));
    }

    if (response && Array.isArray(response.data)) {
      return response.data.map((d: any) => this.mapearProceso(d));
    }

    if (response?.data && Array.isArray(response.data.data)) {
      return response.data.data.map((d: any) => this.mapearProceso(d));
    }

    return [];
  }

  private handleActionResponse(response: any): RendicionCuentasProceso {
    if (response?.ok === true && response.data) {
      return this.mapearProceso(response.data);
    }

    if (response?.data) {
      return this.mapearProceso(response.data);
    }

    if (response?.id) {
      return this.mapearProceso(response);
    }

    throw new Error(response?.message || 'Error en la operación');
  }

  private mapearProceso(data: any): RendicionCuentasProceso {
    if (!data) {
      throw new Error('No se recibieron datos para mapear');
    }

    const procesoData = data.data || data;

    const posiblesIds = [
      procesoData.id,
      procesoData.documentoId,
      procesoData.documento?.id,
      procesoData.rendicionId
    ].filter(id => id !== undefined && id !== null && id !== '');

    const id = posiblesIds[0] || '';

    let estado = procesoData.estado || procesoData.estadoRendicion;
    const estaDisponible = procesoData.disponible === true;

    if (estaDisponible) {
      estado = RendicionCuentasEstado.PENDIENTE;
    } else {
      estado = this.normalizarEstado(estado);
    }

    return {
      id: id,
      documentoId: procesoData.documento?.id || procesoData.documentoId || procesoData.id || '',
      documento: procesoData.documento || {},
      responsableId: procesoData.responsableId,
      responsable: procesoData.responsable,
      estado: estado,
      observaciones: procesoData.observaciones || procesoData.observacionesRendicion,
      fechaAsignacion: procesoData.fechaAsignacion ? new Date(procesoData.fechaAsignacion) : undefined,
      fechaInicioRevision: procesoData.fechaInicioRevision ? new Date(procesoData.fechaInicioRevision) : undefined,
      fechaDecision: procesoData.fechaDecision ? new Date(procesoData.fechaDecision) : undefined,
      fechaCreacion: new Date(procesoData.fechaCreacion || procesoData.fechaRadicacion || new Date()),
      fechaActualizacion: new Date(procesoData.fechaActualizacion || new Date()),

      numeroRadicado: procesoData.documento?.numeroRadicado || procesoData.numeroRadicado,
      nombreContratista: procesoData.documento?.nombreContratista || procesoData.nombreContratista,
      documentoContratista: procesoData.documento?.documentoContratista || procesoData.documentoContratista,
      numeroContrato: procesoData.documento?.numeroContrato || procesoData.numeroContrato,
      contadorAsignado: procesoData.documento?.contadorAsignado || procesoData.contadorAsignado,
      fechaCompletadoContabilidad: procesoData.documento?.fechaCompletadoContabilidad
        ? new Date(procesoData.documento.fechaCompletadoContabilidad)
        : undefined,
      disponible: estaDisponible,

      informesPresentados: procesoData.informesPresentados || [],
      documentosAdjuntos: procesoData.documentosAdjuntos || [],
      montoRendido: procesoData.montoRendido,
      montoAprobado: procesoData.montoAprobado,
      observacionesRendicion: procesoData.observacionesRendicion
    };
  }

  private handleError(error: any, context: string): Observable<never> {
    const msg = error.error?.message || error.message || `Error al ${context}`;
    console.error(`[RendicionService] ${context}:`, error);
    return throwError(() => new Error(msg));
  }

  normalizarEstado(estadoRaw: string | undefined): RendicionCuentasEstado | string {
    if (!estadoRaw) return 'DESCONOCIDO';

    const upper = estadoRaw.toUpperCase().trim();

    if (upper.includes('COMPLETADO') || upper.includes('APROBADO')) return RendicionCuentasEstado.COMPLETADO;
    if (upper.includes('EN_REVISION')) return RendicionCuentasEstado.EN_REVISION;
    if (upper.includes('PENDIENTE')) return RendicionCuentasEstado.PENDIENTE;
    if (upper.includes('OBSERVADO')) return RendicionCuentasEstado.OBSERVADO;
    if (upper.includes('RECHAZADO')) return RendicionCuentasEstado.RECHAZADO;

    return upper;
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