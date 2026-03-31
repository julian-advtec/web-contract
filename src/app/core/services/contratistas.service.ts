// core/services/contratistas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      nombreCompleto: item.razonSocial || item.nombreCompleto || '',
      userId: item.userId || null
    };
  }

  // ==================== AUTOCOMPLETADO ====================

  buscarPorDocumento(documento: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization') || !documento || documento.trim().length < 1) {
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
      catchError(() => of([]))
    );
  }

  buscarPorRazonSocial(razonSocial: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization') || !razonSocial || razonSocial.trim().length < 1) {
      return of([]);
    }
    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/razonSocial?q=${encodeURIComponent(razonSocial.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        const contratistasData = this.extraerDatosAutocomplete(response);
        return contratistasData.map(item => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  buscarPorNombre(nombre: string): Observable<Contratista[]> {
    return this.buscarPorRazonSocial(nombre);
  }

  buscarPorNumeroContrato(numeroContrato: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization') || !numeroContrato || numeroContrato.trim().length < 1) {
      return of([]);
    }
    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/numeroContrato?q=${encodeURIComponent(numeroContrato.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        const contratistasData = this.extraerDatosAutocomplete(response);
        return contratistasData.map(item => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  // ==================== CRUD CONTRATISTAS ====================

  obtenerTodos(filtros?: FiltrosContratistaDto): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization')) return of([]);

    let params = new HttpParams();
    if (filtros) {
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
      if (filtros.offset) params = params.set('offset', filtros.offset.toString());
      if (filtros.nombre) params = params.set('nombre', filtros.nombre);
      if (filtros.documento) params = params.set('documento', filtros.documento);
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
        if (response?.data?.data) return this.mapearContratista(response.data.data);
        if (response?.data) return this.mapearContratista(response.data);
        return null;
      }),
      catchError(() => of(null))
    );
  }

  obtenerCompleto(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/${id}/completo`, { headers }).pipe(
      map(response => response?.data?.data || null),
      catchError(() => of(null))
    );
  }

  /**
   * Obtener perfil del contratista autenticado
   */
  obtenerMiPerfil(): Observable<any> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization')) {
      return of({ success: false, data: null });
    }
    return this.http.get<any>(`${this.apiUrl}/mi-perfil`, { headers }).pipe(
      map(response => response),
      catchError(() => of({ success: false, data: null }))
    );
  }

  /**
   * Obtener documentos del contratista autenticado
   */
  obtenerMisDocumentos(): Observable<DocumentoContratista[]> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization')) {
      return of([]);
    }
    return this.http.get<any>(`${this.apiUrl}/mis-documentos`, { headers }).pipe(
      map(response => response?.data?.data || []),
      catchError(() => of([]))
    );
  }

  /**
   * Subir documento como contratista autenticado
   */
  subirMiDocumento(tipo: TipoDocumento, archivo: File): Observable<DocumentoContratista> {
    const headers = this.getAuthHeaders();
    headers.delete('Content-Type');

    const formData = new FormData();
    formData.append('documento', archivo);
    formData.append('tipo', tipo);

    return this.http.post<any>(`${this.apiUrl}/mis-documentos`, formData, { headers }).pipe(
      map(response => response?.data?.data || null),
      catchError(error => throwError(() => error))
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

  crearContratista(contratista: CreateContratistaDto): Observable<Contratista> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization')) {
      return throwError(() => new Error('No autenticado'));
    }
    return this.http.post<any>(this.apiUrl, contratista, { headers }).pipe(
      map(response => {
        if (response?.data?.data) return this.mapearContratista(response.data.data);
        throw new Error('Error al crear contratista');
      }),
      catchError(error => throwError(() => error))
    );
  }

  crearConDocumentos(formData: FormData): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/completo`, formData, { headers }).pipe(
      map(response => response?.data?.data || null),
      catchError(error => throwError(() => error))
    );
  }

  actualizarContratista(id: string, contratista: UpdateContratistaDto): Observable<Contratista> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization')) {
      return throwError(() => new Error('No autenticado'));
    }
    return this.http.put<any>(`${this.apiUrl}/${id}`, contratista, { headers }).pipe(
      map(response => {
        if (response?.data?.data) return this.mapearContratista(response.data.data);
        throw new Error('Error al actualizar contratista');
      }),
      catchError(error => throwError(() => error))
    );
  }

  verificarDocumento(documento: string): Observable<{ existe: boolean }> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/verificar/documento/${documento}`, { headers }).pipe(
      map(response => response?.data?.data || { existe: false }),
      catchError(() => of({ existe: false }))
    );
  }

  // ==================== DOCUMENTOS ====================

  subirDocumento(contratistaId: string, tipo: TipoDocumento, archivo: File): Observable<DocumentoContratista> {
    const headers = this.getAuthHeaders();
    headers.delete('Content-Type');

    const formData = new FormData();
    formData.append('documento', archivo);
    formData.append('tipo', tipo);

    return this.http.post<any>(`${this.apiUrl}/${contratistaId}/documentos`, formData, { headers }).pipe(
      map(response => response?.data?.data || null),
      catchError(error => throwError(() => error))
    );
  }

  obtenerDocumentos(contratistaId: string): Observable<DocumentoContratista[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/${contratistaId}/documentos`, { headers }).pipe(
      map(response => {
        if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
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
      catchError(error => throwError(() => error))
    );
  }

  eliminarDocumento(contratistaId: string, documentoId: string): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${contratistaId}/documentos/${documentoId}`, { headers }).pipe(
      map(response => {
        if (!response?.data?.success) throw new Error('Error al eliminar documento');
      }),
      catchError(error => throwError(() => error))
    );
  }

  // ==================== ESTADÍSTICAS ====================

  obtenerEstadisticas(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/estadisticas`, { headers }).pipe(
      map(response => response?.data?.data || { total: 0, ultimoMes: 0 }),
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

  // ==================== UTILIDADES ====================

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(() => of({ status: 'error' }))
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

  buscarContratistaPorDocumento(documento: string): Observable<Contratista | null> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization') || !documento || documento.trim().length < 3) {
      return of(null);
    }
    return this.http.get<any>(`${this.apiUrl}/buscar-por-documento/${encodeURIComponent(documento.trim())}`, { headers }).pipe(
      map(response => response?.data?.data || null),
      catchError(() => of(null))
    );
  }
}