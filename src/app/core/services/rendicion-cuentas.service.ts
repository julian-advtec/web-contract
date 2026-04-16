// src/app/core/services/rendicion-cuentas.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import {
  RendicionCuentasProceso,
  TomarDecisionDto,
  RendicionCuentasEstado
} from '../models/rendicion-cuentas.model';

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
    if (!documentoId) return throwError(() => new Error('ID requerido'));

    return this.http.post<any>(`${this.apiUrl}/documentos/${documentoId}/tomar`, {}).pipe(
      map(res => {
        if (res.ok || res.success) return res;
        throw new Error(res.message || 'No se pudo tomar el documento');
      }),
      catchError(err => this.handleError(err, `tomar documento ${documentoId}`))
    );
  }

  obtenerMisDocumentos(): Observable<RendicionCuentasProceso[]> {
    return this.http.get<any>(`${this.apiUrl}/mis-documentos`).pipe(
      map(res => this.handleListResponse(res)),
      catchError(err => this.handleError(err, 'cargar mis documentos'))
    );
  }

  obtenerDetalleRendicion(rendicionId: string): Observable<RendicionCuentasProceso> {
    if (!rendicionId) return throwError(() => new Error('ID de rendición requerido'));

    return this.http.get<any>(`${this.apiUrl}/rendiciones/${rendicionId}/detalle`).pipe(
      map(res => {
        let datos = res.data || res;
        if (!datos) throw new Error('No se encontraron datos en la respuesta');
        return this.mapearProceso(datos);
      }),
      catchError(err => this.handleError(err, `obtener detalle rendición ${rendicionId}`))
    );
  }

  tomarDecision(rendicionId: string, dto: TomarDecisionDto): Observable<RendicionCuentasProceso> {
    return this.http.patch<any>(`${this.apiUrl}/documentos/${rendicionId}/decision`, dto).pipe(
      map(res => this.handleActionResponse(res)),
      catchError(err => this.handleError(err, `tomar decisión en ${rendicionId}`))
    );
  }

descargarCarpeta(documentoId: string): Observable<Blob> {
  if (!documentoId) {
    console.error('[Service] ID de documento requerido pero no recibido');
    return throwError(() => new Error('ID de documento requerido'));
  }

  const url = `${this.apiUrl}/documentos/${documentoId}/descargar`;
  console.log('[Service] URL de descarga:', url);
  console.log('[Service] documentoId:', documentoId);

  return this.http.get(url, {
    responseType: 'blob',
    observe: 'response'
  }).pipe(
    map(response => {
      console.log('[Service] Respuesta recibida:', response);
      const blob = response.body as Blob;
      console.log('[Service] Tamaño del blob:', blob.size);
      
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `documento_${documentoId}.zip`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return blob;
    }),
    catchError(err => {
      console.error('[Service] Error en descarga:', err);
      const errorMsg = err.error?.message || err.message || 'Error al descargar la carpeta';
      return throwError(() => new Error(errorMsg));
    })
  );
}
  obtenerDetalleRevision(id: string): Observable<RendicionCuentasProceso> {
    return this.obtenerDetalleRendicion(id);
  }

  obtenerTodosDocumentos(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/todos-documentos`).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        if (res?.ok === true && Array.isArray(res.data)) return res.data;
        if (res?.data && Array.isArray(res.data)) return res.data;
        if (res?.data?.documentos && Array.isArray(res.data.documentos)) return res.data.documentos;
        return [];
      }),
      catchError(err => {
        console.error('Error en obtenerTodosDocumentos:', err);
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
        console.error('Error en obtenerHistorial:', err);
        return of([]);
      })
    );
  }

  liberarDocumento(id: string): Observable<any> {
    return throwError(() => new Error('Método no implementado'));
  }

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
    if (!data) throw new Error('No se recibieron datos para mapear');

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
      estado = 'PENDIENTE';
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

  normalizarEstado(estadoRaw: string | undefined): string {
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
    if (e.includes('PENDIENTE')) return 'badge-secondary';
    return 'badge-dark';
  }

  getEstadoTexto(estado: string | undefined): string {
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