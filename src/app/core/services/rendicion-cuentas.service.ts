// src/app/core/services/rendicion-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  constructor(private http: HttpClient) {}

  // ==================== MÉTODOS PRINCIPALES ====================

  obtenerDocumentosDisponibles(): Observable<RendicionCuentasProceso[]> {
    return this.http.get<any>(`${this.apiUrl}/pendientes`).pipe(
      map(response => {
        if (response.ok && response.data) {
          return response.data.map((d: any) => this.mapearProceso(d));
        }
        return [];
      })
    );
  }

  obtenerDocumentosPendientes(filtros?: FiltrosRendicionCuentas): Observable<{ data: RendicionCuentasProceso[]; total: number }> {
    let params = new HttpParams();

    if (filtros?.estados?.length) {
      params = params.set('estados', filtros.estados.join(','));
    }
    if (filtros?.responsableId) {
      params = params.set('responsableId', filtros.responsableId);
    }
    if (filtros?.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros?.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    if (filtros?.limit) {
      params = params.set('limit', filtros.limit.toString());
    }
    if (filtros?.offset) {
      params = params.set('offset', filtros.offset.toString());
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        if (response.ok && response.data) {
          return {
            data: response.data.map((d: any) => this.mapearProceso(d)),
            total: response.meta?.total || 0
          };
        }
        return { data: [], total: 0 };
      })
    );
  }

  obtenerMisDocumentos(filtros?: { estados?: string[]; desde?: Date; hasta?: Date }): Observable<RendicionCuentasProceso[]> {
    let params = new HttpParams();

    if (filtros?.estados?.length) {
      params = params.set('estados', filtros.estados.join(','));
    }
    if (filtros?.desde) {
      params = params.set('desde', filtros.desde.toISOString());
    }
    if (filtros?.hasta) {
      params = params.set('hasta', filtros.hasta.toISOString());
    }

    return this.http.get<any>(`${this.apiUrl}/mis-documentos`, { params }).pipe(
      map(response => {
        if (response.ok && response.data) {
          return response.data.map((d: any) => this.mapearProceso(d));
        }
        return [];
      })
    );
  }

  obtenerDetalleRevision(id: string): Observable<RendicionCuentasProceso> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        if (response.ok && response.data) {
          return this.mapearProceso(response.data);
        }
        throw new Error(response.error || 'Error al obtener documento');
      })
    );
  }

  getHistorial(): Observable<RendicionCuentasHistorialItem[]> {
    return this.http.get<any>(`${this.apiUrl}/historial`).pipe(
      map(response => {
        if (response.ok && response.data) {
          return response.data.map((h: any) => this.mapearHistorial(h));
        }
        if (Array.isArray(response)) {
          return response.map((h: any) => this.mapearHistorial(h));
        }
        return [];
      })
    );
  }

  // ==================== ACCIONES ====================

  tomarDocumentoParaRevision(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/tomar`, {}).pipe(
      map(response => {
        if (!response.ok && !response.success) {
          throw new Error(response.error || 'Error al tomar documento');
        }
        return response;
      })
    );
  }

  iniciarRevision(id: string, dto: IniciarRevisionDto): Observable<RendicionCuentasProceso> {
    return this.http.post<any>(`${this.apiUrl}/${id}/iniciar-revision`, dto).pipe(
      map(response => {
        if (response.ok && response.data) {
          return this.mapearProceso(response.data);
        }
        throw new Error(response.error || 'Error al iniciar revisión');
      })
    );
  }

  tomarDecision(id: string, dto: TomarDecisionDto): Observable<RendicionCuentasProceso> {
    return this.http.post<any>(`${this.apiUrl}/${id}/decision`, dto).pipe(
      map(response => {
        if (response.ok && response.data) {
          return this.mapearProceso(response.data);
        }
        throw new Error(response.error || 'Error al tomar decisión');
      })
    );
  }

  liberarDocumento(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/liberar`, {}).pipe(
      map(response => {
        if (!response.ok && !response.success) {
          throw new Error(response.error || 'Error al liberar documento');
        }
        return response;
      })
    );
  }

  // ==================== ADMINISTRACIÓN ====================

  crearDocumento(dto: CreateRendicionCuentasDto): Observable<RendicionCuentasProceso> {
    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(response => {
        if (response.ok && response.data) {
          return this.mapearProceso(response.data);
        }
        throw new Error(response.error || 'Error al crear documento');
      })
    );
  }

  // ==================== ARCHIVOS ====================

  verArchivo(documentoId: string, tipo: 'informe' | 'adjunto' | 'resumen'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${documentoId}/archivo/${tipo}`, {
      responseType: 'blob'
    });
  }

  // ==================== UTILIDADES ====================

  private mapearProceso(data: any): RendicionCuentasProceso {
    const estado = this.normalizarEstado(data.estado || data.estadoRendicion);
    
    return {
      id: data.id,
      documentoId: data.documentoId || data.id,
      documento: data.documento,
      responsableId: data.responsableId,
      responsable: data.responsable,
      estado: estado,
      observaciones: data.observaciones || data.observacionesRendicion,
      fechaAsignacion: data.fechaAsignacion ? new Date(data.fechaAsignacion) : undefined,
      fechaInicioRevision: data.fechaInicioRevision ? new Date(data.fechaInicioRevision) : undefined,
      fechaDecision: data.fechaDecision ? new Date(data.fechaDecision) : undefined,
      fechaCreacion: new Date(data.fechaCreacion),
      fechaActualizacion: new Date(data.fechaActualizacion),
      
      // Campos de ayuda
      numeroRadicado: data.documento?.numeroRadicado || data.numeroRadicado,
      nombreContratista: data.documento?.nombreContratista || data.nombreContratista,
      documentoContratista: data.documento?.documentoContratista || data.documentoContratista,
      numeroContrato: data.documento?.numeroContrato || data.numeroContrato,
      contadorAsignado: data.documento?.contadorAsignado || data.contadorAsignado,
      fechaCompletadoContabilidad: data.documento?.fechaCompletadoContabilidad ? new Date(data.documento.fechaCompletadoContabilidad) : undefined,
      disponible: estado === 'PENDIENTE' && !data.responsableId,
      
      // Campos específicos
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

  normalizarEstado(estadoRaw: string | undefined): string {
    if (!estadoRaw) return 'DESCONOCIDO';
    
    const upper = estadoRaw.toUpperCase().trim();
    
    if (upper.includes('COMPLETADO') || upper.includes('APROBADO')) {
      return 'COMPLETADO';
    }
    if (upper.includes('EN_REVISION') || upper.includes('PENDIENTE')) {
      return upper.includes('EN_REVISION') ? 'EN_REVISION' : 'PENDIENTE';
    }
    if (upper.includes('OBSERVADO')) {
      return 'OBSERVADO';
    }
    if (upper.includes('RECHAZADO')) {
      return 'RECHAZADO';
    }
    
    return upper;
  }

  getEstadoClass(estado: string): string {
    const e = estado?.toUpperCase() || '';
    if (e.includes('APROBADO') || e.includes('COMPLETADO')) return 'badge-success';
    if (e.includes('OBSERVADO')) return 'badge-warning';
    if (e.includes('RECHAZADO')) return 'badge-danger';
    if (e.includes('EN_REVISION')) return 'badge-info';
    if (e.includes('PENDIENTE')) return 'badge-secondary';
    return 'badge-dark';
  }

  getEstadoTexto(estado: string): string {
    const e = estado?.toUpperCase() || '';
    if (e.includes('APROBADO')) return 'Aprobado';
    if (e.includes('OBSERVADO')) return 'Observado';
    if (e.includes('RECHAZADO')) return 'Rechazado';
    if (e.includes('COMPLETADO')) return 'Completado';
    if (e.includes('EN_REVISION')) return 'En Revisión';
    if (e.includes('PENDIENTE')) return 'Pendiente';
    return estado || 'Desconocido';
  }
}