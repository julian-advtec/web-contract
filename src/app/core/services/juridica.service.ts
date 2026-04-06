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
  ) {}

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

    return this.http.get<any>(this.apiUrl, { headers, params }).pipe(
      map(response => {
        if (response && response.success === true && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) return response;
        if (response && response.data && Array.isArray(response.data)) return response.data;
        return [];
      }),
      catchError(this.handleError.bind(this))
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
        if (response && response.success === true && response.data) return response.data;
        if (response && response.id) return response;
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
}