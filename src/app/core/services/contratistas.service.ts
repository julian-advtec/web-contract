// src/app/core/services/contratistas.service.ts
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

  /**
   * Método Helper para extraer datos del autocomplete
   */
  private extraerDatosAutocomplete(response: any): any[] {
    console.log('🔍 Extrayendo datos de autocomplete...');

    // Nivel 1: response.data.data.data (estructura anidada)
    if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
      console.log('✅ Nivel 3: response.data.data.data');
      return response.data.data.data;
    }

    // Nivel 2: response.data.data
    if (response?.data?.data && Array.isArray(response.data.data)) {
      console.log('✅ Nivel 2: response.data.data');
      return response.data.data;
    }

    // Nivel 3: response.data
    if (response?.data && Array.isArray(response.data)) {
      console.log('✅ Nivel 1: response.data');
      return response.data;
    }

    // Nivel 4: response directo (array)
    if (Array.isArray(response)) {
      console.log('✅ Nivel 0: response (array directo)');
      return response;
    }

    console.warn('⚠️ No se pudo extraer array de la respuesta:', response);
    return [];
  }

  /**
   * Mapear respuesta a Contratista
   */
  private mapearContratista(item: any): Contratista {
    return {
      id: item.id || item._id || '',
      nombreCompleto: item.nombreCompleto || item.nombre || item.label || item.value || 'Nombre no disponible',
      documentoIdentidad: item.documentoIdentidad || item.documento || item.documentoIdentidad || '',
      numeroContrato: item.numeroContrato || item.numero_contrato || '',
      email: item.email || '',
      telefono: item.telefono || '',
      direccion: item.direccion || '',
      tipoContratista: item.tipoContratista || item.tipo || '',
      estado: item.estado || 'ACTIVO',
      observaciones: item.observaciones || '',
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      fechaCreacion: item.fechaCreacion ? new Date(item.fechaCreacion) : new Date(),
      fechaActualizacion: item.fechaActualizacion ? new Date(item.fechaActualizacion) : new Date()
    };
  }

  // ==================== AUTOCOMPLETADO ====================

  /**
   * Buscar contratistas por documento
   */
  buscarPorDocumento(documento: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      console.warn('⚠️ No autenticado para buscar por documento');
      return of([]);
    }

    if (!documento || documento.trim().length < 1) {
      return of([]);
    }

    console.log(`🔍 FRONTEND: Buscando contratista por documento: "${documento}"`);

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

  /**
   * Buscar contratistas por nombre
   */
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

  /**
   * Buscar contratistas por número de contrato
   */
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

  // ==================== CRUD CONTRATISTAS ====================

  /**
   * Obtener todos los contratistas
   */
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

  /**
   * Obtener contratista por ID
   */
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

  /**
   * Obtener contratista completo con documentos
   */
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

  /**
   * Buscar por término general
   */
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

  /**
   * Búsqueda combinada
   */
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

  /**
   * Búsqueda avanzada
   */
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

  /**
   * Crear contratista
   */
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

  /**
   * Crear contratista con documentos
   */
  crearConDocumentos(formData: FormData): Observable<any> {
    console.log('📤 Servicio: Enviando petición POST a /contratistas/completo');

    // Log de todos los campos del FormData
    console.log('📋 Contenido del FormData:');
    formData.forEach((value, key) => {
      if (value instanceof File) {
        console.log(`  - ${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  - ${key}: ${value}`);
      }
    });

    const headers = this.getAuthHeaders();
    console.log('🔑 Headers de autenticación:', headers.get('Authorization') ? 'Presentes' : 'Faltantes');

    // IMPORTANTE: No eliminar Content-Type para que el navegador lo configure automáticamente con boundary
    // headers.delete('Content-Type'); // ❌ NO HACER ESTO

    return this.http.post<any>(`${this.apiUrl}/completo`, formData, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta del servidor:', response);
        if (response?.data?.data) {
          return response.data.data;
        }
        throw new Error('Error al crear contratista con documentos');
      }),
      catchError(error => {
        console.error('❌ Error en la petición HTTP:');
        console.error('  - Status:', error.status);
        console.error('  - Message:', error.message);
        console.error('  - Error:', error.error);
        if (error.error?.message) {
          console.error('  - Mensaje del servidor:', error.error.message);
        }
        throw error;
      })
    );
  }

  /**
   * Actualizar contratista
   */
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

  /**
   * Verificar si existe documento
   */
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

  // ==================== DOCUMENTOS ====================

  /**
   * Subir documento
   */
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

  /**
   * Obtener documentos de un contratista
   */
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

  /**
   * Descargar documento
   */
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

  /**
   * Eliminar documento
   */
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

  // ==================== ESTADÍSTICAS ====================

  /**
   * Obtener estadísticas
   */
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

  /**
   * Obtener contratistas recientes
   */
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

  /**
   * Health check
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(() => of({ status: 'error' }))
    );
  }

  /**
   * Método de prueba para verificar endpoint
   */
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