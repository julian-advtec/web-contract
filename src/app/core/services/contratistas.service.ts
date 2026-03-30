import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Contratista, CreateContratistaDto, UpdateContratistaDto, FiltrosContratistaDto, DocumentoContratista, TipoDocumento } from '../models/contratista.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContratistasService {
  private apiUrl = `${environment.apiUrl}/contratistas`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private extraerDatosAutocomplete(response: any): any[] {
    console.log('🔍 Extrayendo datos de autocomplete...');

    if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
      return response.data.data.data;
    }

    if (response?.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response)) {
      return response;
    }

    console.warn('⚠️ No se pudo extraer array de la respuesta:', response);
    return [];
  }

  private mapearContratista(item: any): Contratista {
    return {
      id: item.id || item._id || '',
      tipoDocumento: item.tipoDocumento || 'CC',
      documentoIdentidad: item.documentoIdentidad || item.documento || '',
      razonSocial: item.razonSocial || item.nombreCompleto || item.nombre || item.label || item.value || 'Nombre no disponible',
      representanteLegal: item.representanteLegal || '',
      documentoRepresentante: item.documentoRepresentante || '',
      telefono: item.telefono || '',
      email: item.email || '',
      direccion: item.direccion || '',
      departamento: item.departamento || '',
      ciudad: item.ciudad || '',
      tipoContratista: item.tipoContratista || item.tipo || '',
      estado: item.estado || 'ACTIVO',
      numeroContrato: item.numeroContrato || item.numero_contrato || '',
      cargo: item.cargo || '',
      observaciones: item.observaciones || '',
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      nombreCompleto: item.razonSocial || item.nombreCompleto || item.nombre || '',
      fechaCreacion: item.createdAt ? new Date(item.createdAt) : new Date(),
      fechaActualizacion: item.updatedAt ? new Date(item.updatedAt) : new Date()
    };
  }

  buscarPorDocumento(documento: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      console.warn('⚠️ No autenticado para buscar por documento');
      return of([]);
    }

    if (!documento || documento.trim().length < 1) {
      return of([]);
    }

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/documento?q=${encodeURIComponent(documento.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        const contratistasData = this.extraerDatosAutocomplete(response);
        return contratistasData.map(item => this.mapearContratista(item));
      }),
      catchError(error => {
        console.error('❌ Error buscando por documento:', error);
        return of([]);
      })
    );
  }

  buscarPorNombre(nombre: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return of([]);
    }

    if (!nombre || nombre.trim().length < 1) {
      return of([]);
    }

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/nombre?q=${encodeURIComponent(nombre.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        const contratistasData = this.extraerDatosAutocomplete(response);
        return contratistasData.map(item => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  buscarPorNumeroContrato(numeroContrato: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return of([]);
    }

    if (!numeroContrato || numeroContrato.trim().length < 1) {
      return of([]);
    }

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/contrato?q=${encodeURIComponent(numeroContrato.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        const contratistasData = this.extraerDatosAutocomplete(response);
        return contratistasData.map(item => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  buscarPorRazonSocial(razonSocial: string): Observable<Contratista[]> {
    return this.buscarPorNombre(razonSocial);
  }

  obtenerTodos(filtros?: FiltrosContratistaDto): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return of([]);
    }

    let params = new HttpParams();
    if (filtros) {
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
      if (filtros.offset) params = params.set('offset', filtros.offset.toString());
      if (filtros.nombre) params = params.set('nombre', filtros.nombre);
      if (filtros.documento) params = params.set('documento', filtros.documento);
      if (filtros.contrato) params = params.set('contrato', filtros.contrato);
      if (filtros.tipoContratista) params = params.set('tipoContratista', filtros.tipoContratista);
      if (filtros.estado) params = params.set('estado', filtros.estado);
    }

    return this.http.get<any>(this.apiUrl, { headers, params }).pipe(
      map(response => {
        if (response?.data?.data && Array.isArray(response.data.data)) {
          return response.data.data.map((item: any) => this.mapearContratista(item));
        }
        if (Array.isArray(response)) {
          return response.map((item: any) => this.mapearContratista(item));
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  obtenerPorId(id: string): Observable<Contratista | null> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return throwError(() => new Error('No autenticado'));
    }

    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return this.mapearContratista(response.data.data);
        }
        if (response?.data) {
          return this.mapearContratista(response.data);
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  obtenerCompleto(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/${id}/completo`, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return response.data.data;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  buscarPorTermino(termino: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/buscar`, { headers, params: { termino } }).pipe(
      map(response => {
        const data = this.extraerDatosAutocomplete(response);
        return data.map((item: any) => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  buscarCombinado(tipo: 'nombre' | 'documento' | 'contrato', termino: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/buscar/combinado`, { headers, params: { tipo, termino } }).pipe(
      map(response => {
        const data = this.extraerDatosAutocomplete(response);
        return data.map((item: any) => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  buscarAvanzado(filtros: FiltrosContratistaDto): Observable<{ contratistas: Contratista[]; total: number }> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();

    if (filtros.nombre) params = params.set('nombre', filtros.nombre);
    if (filtros.documento) params = params.set('documento', filtros.documento);
    if (filtros.contrato) params = params.set('contrato', filtros.contrato);
    if (filtros.tipoContratista) params = params.set('tipoContratista', filtros.tipoContratista);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde.toString());
    if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta.toString());
    if (filtros.limit) params = params.set('limit', filtros.limit.toString());
    if (filtros.offset) params = params.set('offset', filtros.offset.toString());

    return this.http.get<any>(`${this.apiUrl}/buscar/avanzado`, { headers, params }).pipe(
      map(response => {
        if (response?.data?.data && Array.isArray(response.data.data)) {
          return {
            contratistas: response.data.data.map((item: any) => this.mapearContratista(item)),
            total: response.data.total || response.data.data.length
          };
        }
        return { contratistas: [], total: 0 };
      }),
      catchError(() => of({ contratistas: [], total: 0 }))
    );
  }

  crearContratista(contratista: CreateContratistaDto): Observable<Contratista> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return throwError(() => new Error('No autenticado'));
    }

    return this.http.post<any>(this.apiUrl, contratista, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return this.mapearContratista(response.data.data);
        }
        throw new Error('Error al crear contratista');
      }),
      catchError(error => {
        console.error('❌ Error creando contratista:', error);
        throw error;
      })
    );
  }

  crearConDocumentos(formData: FormData): Observable<any> {
    const headers = this.getAuthHeaders();

    return this.http.post<any>(`${this.apiUrl}/completo`, formData, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return response.data.data;
        }
        throw new Error('Error al crear contratista con documentos');
      }),
      catchError(error => {
        console.error('❌ Error en la petición HTTP:', error);
        throw error;
      })
    );
  }

  actualizarContratista(id: string, contratista: UpdateContratistaDto): Observable<Contratista> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return throwError(() => new Error('No autenticado'));
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, contratista, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return this.mapearContratista(response.data.data);
        }
        throw new Error('Error al actualizar contratista');
      }),
      catchError(error => {
        console.error('❌ Error actualizando contratista:', error);
        throw error;
      })
    );
  }

  verificarDocumento(documento: string): Observable<{ existe: boolean }> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/verificar/documento/${documento}`, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return response.data.data;
        }
        return { existe: false };
      }),
      catchError(() => of({ existe: false }))
    );
  }

  subirDocumento(contratistaId: string, tipo: TipoDocumento, archivo: File): Observable<DocumentoContratista> {
    const headers = this.getAuthHeaders();
    headers.delete('Content-Type');

    const formData = new FormData();
    formData.append('documento', archivo);
    formData.append('tipo', tipo);

    return this.http.post<any>(`${this.apiUrl}/${contratistaId}/documentos`, formData, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return response.data.data;
        }
        throw new Error('Error al subir documento');
      }),
      catchError(error => {
        console.error('❌ Error subiendo documento:', error);
        throw error;
      })
    );
  }

  obtenerDocumentos(contratistaId: string): Observable<DocumentoContratista[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/${contratistaId}/documentos`, { headers }).pipe(
      map(response => {
        if (response?.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  descargarDocumento(contratistaId: string, documentoId: string): Observable<Blob> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/${contratistaId}/documentos/${documentoId}/descargar`, {
      headers,
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('❌ Error descargando documento:', error);
        throw error;
      })
    );
  }

  eliminarDocumento(contratistaId: string, documentoId: string): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${contratistaId}/documentos/${documentoId}`, { headers }).pipe(
      map(response => {
        if (response?.data?.success) {
          return;
        }
        throw new Error('Error al eliminar documento');
      }),
      catchError(error => {
        console.error('❌ Error eliminando documento:', error);
        throw error;
      })
    );
  }

  obtenerEstadisticas(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/estadisticas`, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return response.data.data;
        }
        return { total: 0, ultimoMes: 0 };
      }),
      catchError(() => of({ total: 0, ultimoMes: 0 }))
    );
  }

  obtenerRecientes(limit: number = 10): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/recientes`, { headers, params: { limit: limit.toString() } }).pipe(
      map(response => {
        const data = this.extraerDatosAutocomplete(response);
        return data.map((item: any) => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(() => of({ status: 'error' }))
    );
  }

  probarEndpointDocumento(documento: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/documento?q=${encodeURIComponent(documento)}`,
      { headers }
    ).pipe(
      tap(response => {
        console.log('🔍 RESPUESTA CRUDA DEL ENDPOINT:', response);
      })
    );
  }

  verificarPermisosUsuario(): Observable<any> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization')) {
      return of({ success: false, data: { puedeCrear: false, puedeVer: false } });
    }
    return this.http.get<any>(`${this.apiUrl}/verificar/permisos`, { headers }).pipe(
      catchError(() => of({ success: false, data: { puedeCrear: true, puedeVer: true } }))
    );
  }
}