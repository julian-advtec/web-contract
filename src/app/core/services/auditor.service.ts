// src/app/core/services/auditor.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AuditorStats {
  totalDocumentosDisponibles: number;
  misDocumentos: {
    enRevision: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    completados: number;
    primerRadicados: number;
    total: number;
  };
  recientes: number;
  tiempoPromedioHoras: number;
  eficiencia: number;
  fechaConsulta: string;
}

export interface SubirDocumentosAuditorDto {
  observaciones?: string;
}

export interface RevisarAuditorDocumentoDto {
  estado: 'APROBADO' | 'OBSERVADO' | 'RECHAZADO' | 'COMPLETADO';
  observaciones?: string;
  correcciones?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditorService {
  private baseUrl = '/api/auditor';

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  // ✅ Obtener documentos disponibles para auditoría
  obtenerDocumentosDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/documentos/disponibles`);
  }

  // ✅ Tomar documento para revisión
  tomarDocumentoParaRevision(documentoId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/documentos/${documentoId}/tomar`, {});
  }

  // ✅ Obtener documentos que estoy revisando
  obtenerDocumentosEnRevision(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/mis-documentos`);
  }

  // ✅ Obtener detalle de un documento
  obtenerDetalleDocumento(documentoId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/documentos/${documentoId}`);
  }

  // ✅ Subir documentos del auditor (FormData)
  subirDocumentosAuditor(
    documentoId: string,
    formData: FormData
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/documentos/${documentoId}/subir-documentos`,
      formData
    );
  }

  // ✅ Revisar y aprobar/rechazar documento
  revisarDocumento(
    documentoId: string,
    datos: RevisarAuditorDocumentoDto
  ): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/documentos/${documentoId}/revisar`,
      datos
    );
  }

  // ✅ Descargar archivo del radicador
  descargarArchivoRadicado(documentoId: string, numeroArchivo: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/documentos/${documentoId}/descargar-radicado/${numeroArchivo}`,
      { responseType: 'blob' }
    );
  }

  // ✅ Descargar archivo subido por el auditor
  descargarArchivoAuditor(documentoId: string, tipoArchivo: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/documentos/${documentoId}/descargar-auditor/${tipoArchivo}`,
      { responseType: 'blob' }
    );
  }

  // ✅ Liberar documento
  liberarDocumento(documentoId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/documentos/${documentoId}/liberar`);
  }

  // ✅ Obtener estadísticas
  obtenerEstadisticas(): Observable<AuditorStats> {
    return this.http.get<AuditorStats>(`${this.baseUrl}/estadisticas`);
  }

  // ✅ Obtener historial
  obtenerHistorial(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/historial`);
  }

  // ✅ Buscar documentos
  buscarDocumentos(filtros: {
    numeroRadicado?: string;
    numeroContrato?: string;
    documentoContratista?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Observable<any[]> {
    let params = new HttpParams();
    
    if (filtros.numeroRadicado) params = params.append('numeroRadicado', filtros.numeroRadicado);
    if (filtros.numeroContrato) params = params.append('numeroContrato', filtros.numeroContrato);
    if (filtros.documentoContratista) params = params.append('documentoContratista', filtros.documentoContratista);
    if (filtros.estado) params = params.append('estado', filtros.estado);
    if (filtros.fechaDesde) params = params.append('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params = params.append('fechaHasta', filtros.fechaHasta);

    return this.http.get<any[]>(`${this.baseUrl}/buscar`, { params });
  }
}