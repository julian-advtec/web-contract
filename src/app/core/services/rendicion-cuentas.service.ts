// src/app/core/services/rendicion-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import { RendicionCuentasProceso, RendicionCuentasEstado, TomarDecisionDto } from '../models/rendicion-cuentas.model';

@Injectable({
  providedIn: 'root'
})
export class RendicionCuentasService {
  private apiUrl = `${environment.apiUrl}/rendicion-cuentas`;

  constructor(private http: HttpClient) { }

  obtenerDocumentosDisponibles(): Observable<RendicionCuentasProceso[]> {
    return this.http.get<any>(`${this.apiUrl}/documentos/disponibles`).pipe(
      map(res => this.handleListResponse(res)),
      catchError(err => this.handleError(err, 'cargar documentos disponibles'))
    );
  }

  tomarDocumentoParaRevision(documentoId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/documentos/${documentoId}/tomar`, {}).pipe(
      map(res => res),
      catchError(err => this.handleError(err, `tomar documento ${documentoId}`))
    );
  }

  tomarDocumento(documentoId: string): Observable<any> {
    return this.tomarDocumentoParaRevision(documentoId);
  }

  obtenerMisDocumentos(): Observable<RendicionCuentasProceso[]> {
    return this.http.get<any>(`${this.apiUrl}/mis-documentos-en-revision`).pipe(
      map(res => this.handleListResponse(res)),
      catchError(err => this.handleError(err, 'cargar mis documentos'))
    );
  }

  /**
   * ✅ MÉTODO RESTAURADO - Obtener detalle por rendicionId (para compatibilidad)
   */
  obtenerDetalleRendicion(rendicionId: string): Observable<RendicionCuentasProceso> {
    if (!rendicionId) return throwError(() => new Error('ID de rendición requerido'));
    
    console.log(`[Service] Obteniendo detalle rendición: ${rendicionId}`);
    
    return this.http.get<any>(`${this.apiUrl}/rendiciones/${rendicionId}/detalle`).pipe(
      map(res => {
        console.log('[Service] Respuesta detalle rendición:', res);
        let datos = res.data || res;
        if (!datos) throw new Error('No se encontraron datos');
        return this.mapearProceso(datos);
      }),
      catchError(err => this.handleError(err, `obtener detalle rendición ${rendicionId}`))
    );
  }

  /**
   * 🆕 MÉTODO NUEVO - Obtener detalle por documento radicado (como Asesor Gerencia)
   */
  obtenerDetallePorDocumentoRadicado(documentoId: string): Observable<RendicionCuentasProceso> {
    if (!documentoId) return throwError(() => new Error('ID del documento requerido'));
    
    console.log(`[Service] Obteniendo detalle por documento radicado: ${documentoId}`);
    
    return this.http.get<any>(`${this.apiUrl}/documento/${documentoId}`).pipe(
      map(res => {
        console.log('[Service] Respuesta documento radicado:', res);
        let datos = res.data || res;
        if (!datos) throw new Error('No se encontraron datos');
        return this.mapearProceso(datos);
      }),
      catchError(err => this.handleError(err, `obtener detalle por documento ${documentoId}`))
    );
  }

  tomarDecision(rendicionId: string, dto: TomarDecisionDto): Observable<RendicionCuentasProceso> {
    return this.http.patch<any>(`${this.apiUrl}/documentos/${rendicionId}/decision`, dto).pipe(
      map(res => this.handleActionResponse(res)),
      catchError(err => this.handleError(err, `tomar decisión`))
    );
  }

  descargarCarpeta(documentoId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/${documentoId}/descargar`, {
      responseType: 'blob'
    });
  }

  obtenerTodosDocumentos(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/todos-documentos`).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        if (res?.ok === true && Array.isArray(res.data)) return res.data;
        if (res?.data && Array.isArray(res.data)) return res.data;
        return [];
      }),
      catchError(err => {
        console.error('❌ Error:', err);
        return of([]);
      })
    );
  }

  obtenerHistorial(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/historial`).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        if (res?.ok === true && Array.isArray(res.data)) return res.data;
        if (res?.data && Array.isArray(res.data)) return res.data;
        return [];
      }),
      catchError(err => {
        console.error('❌ Error:', err);
        return of([]);
      })
    );
  }

  liberarDocumento(rendicionId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/documentos/${rendicionId}/liberar`, {}).pipe(
      catchError(err => this.handleError(err, `liberar documento`))
    );
  }

  private handleListResponse(response: any): RendicionCuentasProceso[] {
    if (response?.ok === true && Array.isArray(response.data)) {
      return response.data.map((d: any) => this.mapearProceso(d));
    }
    if (Array.isArray(response)) {
      return response.map((d: any) => this.mapearProceso(d));
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
    throw new Error(response?.message || 'Error en la operación');
  }

  private mapearProceso(data: any): RendicionCuentasProceso {
    const procesoData = data.data || data;
    
    return {
      id: procesoData.id || procesoData.rendicionId || '',
      documentoId: procesoData.documentoId || procesoData.documento?.id || '',
      rendicionId: procesoData.id || procesoData.rendicionId || '',
      responsableId: procesoData.responsableId,
      responsable: procesoData.responsable,
      responsableNombre: procesoData.responsableNombre,
      estado: this.normalizarEstado(procesoData.estado),
      observaciones: procesoData.observaciones || procesoData.observacionesRendicion,
      fechaAsignacion: procesoData.fechaAsignacion ? new Date(procesoData.fechaAsignacion) : undefined,
      fechaInicioRevision: procesoData.fechaInicioRevision ? new Date(procesoData.fechaInicioRevision) : undefined,
      fechaDecision: procesoData.fechaDecision ? new Date(procesoData.fechaDecision) : undefined,
      fechaCreacion: new Date(procesoData.fechaCreacion || procesoData.fechaRadicacion || new Date()),
      fechaActualizacion: new Date(procesoData.fechaActualizacion || new Date()),
      numeroRadicado: procesoData.numeroRadicado || procesoData.documento?.numeroRadicado || '',
      nombreContratista: procesoData.nombreContratista || procesoData.documento?.nombreContratista || '',
      documentoContratista: procesoData.documentoContratista || procesoData.documento?.documentoContratista || '',
      numeroContrato: procesoData.numeroContrato || procesoData.documento?.numeroContrato || '',
      disponible: procesoData.disponible === true,
      observacionesRendicion: procesoData.observacionesRendicion,
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
    if (upper.includes('COMPLETADO') || upper.includes('APROBADO')) return 'COMPLETADO';
    if (upper.includes('EN_REVISION')) return 'EN_REVISION';
    if (upper.includes('PENDIENTE')) return 'PENDIENTE';
    if (upper.includes('OBSERVADO')) return 'OBSERVADO';
    if (upper.includes('RECHAZADO')) return 'RECHAZADO';
    return upper;
  }

  getEstadoClass(estado: string | undefined): string {
    const e = (estado || '').toString().toUpperCase();
    if (e.includes('APROBADO') || e.includes('COMPLETADO')) return 'badge-success';
    if (e.includes('OBSERVADO')) return 'badge-warning';
    if (e.includes('RECHAZADO')) return 'badge-danger';
    if (e.includes('EN_REVISION')) return 'badge-info';
    return 'badge-secondary';
  }

  getEstadoTexto(estado: string | undefined): string {
    const e = (estado || '').toString().toUpperCase();
    if (e.includes('APROBADO')) return 'Aprobado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    if (e.includes('COMPLETADO')) return 'Completado';
    if (e.includes('EN_REVISION')) return 'En Revisión';
    return estado?.toString() || 'Desconocido';
  }

  obtenerDetalleDocumento(documentoId: string): Observable<any> {
  if (!documentoId) return throwError(() => new Error('ID del documento requerido'));
  
  console.log(`[Service] Obteniendo detalle por documento: ${documentoId}`);
  
  return this.http.get<any>(`${this.apiUrl}/documentos/${documentoId}/detalle`).pipe(
    map(res => {
      console.log('[Service] Respuesta:', res);
      let datos = res.data || res;
      if (!datos) throw new Error('No se encontraron datos');
      return datos;
    }),
    catchError(err => this.handleError(err, `obtener detalle documento ${documentoId}`))
  );
}

obtenerDetalleCompleto(documentoId: string): Observable<any> {
  if (!documentoId) return throwError(() => new Error('ID del documento requerido'));
  
  console.log(`[Service] Obteniendo detalle completo para documento: ${documentoId}`);
  
  return this.http.get<any>(`${this.apiUrl}/documentos/${documentoId}/detalle-completo`).pipe(
    map(res => {
      console.log('[Service] Respuesta completa:', res);
      let datos = res.data || res;
      if (!datos) throw new Error('No se encontraron datos');
      return datos;
    }),
    catchError(err => this.handleError(err, `obtener detalle completo ${documentoId}`))
  );
}
}