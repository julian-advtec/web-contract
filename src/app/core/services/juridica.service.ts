// src/app/core/services/juridica.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Contrato, CreateContratoDto, UpdateContratoDto, FiltrosContratoDto } from '../models/juridica.model';

@Injectable({
  providedIn: 'root'
})
export class JuridicaService {
  private apiUrl = `${environment.apiUrl}/juridica`;

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  private getToken(): string {
    return localStorage.getItem('access_token') || localStorage.getItem('token') || '';
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      console.warn('⚠️ No hay token disponible');
      return new HttpHeaders();
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });
  }

  // ==================== CONTRATOS ====================

  obtenerContratos(filtros?: FiltrosContratoDto): Observable<Contrato[]> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params = params.set(key, value.toString());
      });
    }

    console.log('📡 Obteniendo contratos desde:', this.apiUrl);

    return this.http.get<any>(this.apiUrl, { headers, params }).pipe(
      map(response => {
        console.log('📥 Respuesta completa de contratos:', response);

        // ✅ La respuesta tiene estructura: { success: true, count: 3, data: [...] }
        if (response && response.success === true && Array.isArray(response.data)) {
          console.log(`✅ ${response.data.length} contratos encontrados en response.data`);
          return response.data;
        }

        // ✅ Otra estructura posible: { ok: true, data: [...] }
        if (response && response.ok === true && Array.isArray(response.data)) {
          console.log(`✅ ${response.data.length} contratos encontrados en response.data (ok)`);
          return response.data;
        }

        // ✅ Otra estructura: { data: { data: [...] } }
        if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
          console.log(`✅ ${response.data.data.length} contratos encontrados en response.data.data`);
          return response.data.data;
        }

        // ✅ Si es directamente un array
        if (Array.isArray(response)) {
          console.log(`✅ ${response.length} contratos encontrados (array directo)`);
          return response;
        }

        console.warn('⚠️ Estructura de respuesta no reconocida:', response);
        return [];
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error en petición de contratos:', error);
        if (error.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          this.router.navigate(['/auth/login']);
          return throwError(() => new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.'));
        }
        const errorMsg = error.error?.message || error.message || 'Error al cargar los contratos';
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  obtenerContratoPorId(id: string): Observable<Contrato | null> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/contratos/${id}`, { headers }).pipe(
      map(response => {
        if (response && response.success === true && response.data) return response.data;
        if (response && response.data) return response.data;
        return response || null;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  crearContrato(createContratoDto: CreateContratoDto): Observable<Contrato> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/contratos`, createContratoDto, { headers }).pipe(
      map(response => {
        console.log('📥 Respuesta de creación:', response);

        // ✅ La respuesta tiene estructura: { success: true, data: {...} }
        if (response && response.success === true && response.data) {
          return response.data;
        }

        // ✅ Otra estructura: { data: {...} }
        if (response && response.data) {
          return response.data;
        }

        // ✅ Si el response es directamente el contrato
        if (response && response.id) {
          return response;
        }

        throw new Error('Respuesta inválida del servidor');
      }),
      catchError(this.handleError.bind(this))
    );
  }

  actualizarContrato(id: string, updateContratoDto: UpdateContratoDto): Observable<Contrato> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.apiUrl}/contratos/${id}`, updateContratoDto, { headers }).pipe(
      map(response => {
        if (response && response.success === true && response.data) return response.data;
        return response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ==================== BÚSQUEDA DE CONTRATISTAS ====================

  buscarContratistaPorDocumento(documento: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${environment.apiUrl}/contratistas/buscar-por-documento/${documento}`, { headers }).pipe(
      map(response => {
        if (response?.ok === true && response?.data?.data) return response.data.data;
        if (response?.data?.data) return response.data.data;
        return null;
      }),
      catchError(() => of(null))
    );
  }

  buscarContratistasPorTermino(termino: string): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${environment.apiUrl}/contratistas/buscar?termino=${termino}`, { headers }).pipe(
      map(response => {
        if (response?.ok === true && response?.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
        if (Array.isArray(response)) return response;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  // ==================== DOCUMENTOS ====================

  obtenerDocumentosContrato(contratoId: string): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/contratos/${contratoId}/documentos`, { headers }).pipe(
      map(response => {
        if (response?.success === true && Array.isArray(response.data)) return response.data;
        if (Array.isArray(response)) return response;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  // ==================== UTILIDADES ====================

  obtenerSupervisores(): Observable<any[]> {
    return of([
      { id: '1', nombre: 'Carlos Rodríguez' },
      { id: '2', nombre: 'María González' },
      { id: '3', nombre: 'Juan Pérez' },
      { id: '4', nombre: 'Ana Martínez' },
      { id: '5', nombre: 'Luis Sánchez' }
    ]);
  }

  verificarPermisosUsuario(): Observable<any> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization')) {
      return of({ success: false, data: { puedeCrear: false, puedeVer: false, usuario: null } });
    }
    return this.http.get<any>(`${this.apiUrl}/verificar/permisos`, { headers }).pipe(
      catchError(() => of({ success: false, data: { puedeCrear: true, puedeVer: true, usuario: null } }))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('❌ Error en petición:', error);
    if (error.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.router.navigate(['/auth/login']);
      return throwError(() => new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.'));
    }
    const errorMsg = error.error?.message || error.message || 'Error en la petición';
    return throwError(() => new Error(errorMsg));
  }

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(() => of({ status: 'error' }))
    );
  }


  // Buscar contratista por ID (para obtener datos completos)
  buscarContratistaPorId(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${environment.apiUrl}/contratistas/${id}`, { headers }).pipe(
      map(response => {
        if (response?.ok === true && response?.data?.data) return response.data.data;
        if (response?.data?.data) return response.data.data;
        return null;
      }),
      catchError(() => of(null))
    );
  }

  // Obtener documentos del contratista
  obtenerDocumentosContratista(contratistaId: string): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${environment.apiUrl}/contratistas/${contratistaId}/documentos`, { headers }).pipe(
      map(response => {
        if (response?.ok === true && response?.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        if (Array.isArray(response)) return response;
        return [];
      }),
      catchError(() => of([]))
    );
  }

buscarContratistaPorNumeroContrato(numeroContrato: string): Observable<any> {
  const headers = this.getAuthHeaders();
  const url = `${environment.apiUrl}/contratistas/buscar-por-contrato/${encodeURIComponent(numeroContrato)}`;

  console.log('📡 Buscando contratista por contrato:', url);

  return this.http.get<any>(url, { headers }).pipe(
    map(response => {
      console.log('📥 Respuesta completa:', JSON.stringify(response, null, 2));

      let contratista = null;

      // Extraer el contratista de la estructura anidada
      if (response?.data?.data?.data) {
        contratista = response.data.data.data;
      } else if (response?.data?.data && response.data.data.id) {
        contratista = response.data.data;
      } else if (response?.data && response.data.id) {
        contratista = response.data;
      }

      if (contratista && contratista.id) {
        console.log(`✅ Contratista encontrado: ${contratista.razonSocial}`);
        console.log(`📋 objetivoContrato: ${contratista.objetivoContrato}`);
        console.log(`📎 Documentos: ${contratista.documentos?.length || 0}`);
        
        // ✅ Asegurar que los documentos se pasen correctamente
        return {
          ...contratista,
          objetivoContrato: contratista.objetivoContrato || '',
          documentos: contratista.documentos || []  // ✅ Incluir documentos
        };
      }

      console.warn('⚠️ No se encontró contratista con el número:', numeroContrato);
      return null;
    }),
    catchError((error) => {
      console.error('❌ Error en búsqueda por contrato:', error);
      return of(null);
    })
  );
}

  autocompleteContratos(termino: string): Observable<any[]> {
    const headers = this.getAuthHeaders();
    if (!termino || termino.trim().length < 2) return of([]);

    return this.http.get<any>(`${environment.apiUrl}/contratistas/autocomplete/contratos?q=${encodeURIComponent(termino)}`, { headers }).pipe(
      map(response => response?.ok === true && response?.data?.data ? response.data.data : []),
      catchError(() => of([]))
    );
  }

  // src/app/core/services/juridica.service.ts

/**
 * Obtener contrato y contratista por número de contrato
 * Retorna: { contratista: {nombre, documento}, contrato: {fechaInicio, fechaFin} }
 */
obtenerContratoYContratistaPorNumero(numeroContrato: string): Observable<any> {
  const headers = this.getAuthHeaders();
  const url = `${environment.apiUrl}/juridica/contrato-con-contratista/${encodeURIComponent(numeroContrato)}`;

  console.log('📡 Buscando contrato y contratista por número:', url);

  return this.http.get<any>(url, { headers }).pipe(
    map(response => {
      console.log('📥 Respuesta completa:', JSON.stringify(response, null, 2));

      // Extraer los datos de la estructura anidada
      if (response?.data?.data?.data) {
        return response.data.data.data;
      }
      if (response?.data?.data) {
        return response.data.data;
      }
      if (response?.data) {
        return response.data;
      }
      
      return null;
    }),
    catchError((error) => {
      console.error('❌ Error en búsqueda:', error);
      return of(null);
    })
  );
}

}