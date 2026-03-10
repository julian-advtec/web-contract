import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Contrato, CreateContratoDto, UpdateContratoDto, FiltrosContratoDto } from '../models/juridica.model';
import { NotificationService } from './notification.service';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class JuridicaService {
  private apiUrl = `${environment.apiUrl}/juridica`;

  constructor(
    private http: HttpClient,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  private getToken(): string {
    return localStorage.getItem('access_token') || localStorage.getItem('token') || '';
  }

  private getAuthHeaders(): HttpHeaders {
    try {
      const token = this.getToken();

      if (!token) {
        console.warn('⚠️ No hay token disponible');
        return new HttpHeaders();
      }

      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      });
    } catch (error) {
      console.error('❌ Error obteniendo headers:', error);
      return new HttpHeaders();
    }
  }

  // ==================== CONTRATOS ====================

  obtenerContratos(filtros?: FiltrosContratoDto): Observable<Contrato[]> {
    console.log('📋 Solicitando contratos...');

    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      this.notificationService.warning('No estás autenticado', 'Por favor inicia sesión');
      return of([]);
    }

    return this.http.get<any>(this.apiUrl, { headers, params: filtros as any }).pipe(
      tap(response => {
        console.log('📦 Respuesta completa del backend:', response);
      }),
      map(response => {
        console.log('🔍 Procesando respuesta...');

        if (response && response.success === true && Array.isArray(response.data)) {
          console.log(`✅ ${response.data.length} contratos recibidos`);
          return response.data;
        }

        if (Array.isArray(response)) {
          console.log(`✅ Respuesta es array: ${response.length} contratos`);
          return response;
        }

        if (response && response.data && Array.isArray(response.data)) {
          console.log(`✅ Data.data es array: ${response.data.length} contratos`);
          return response.data;
        }

        console.warn('⚠️ No se pudo extraer contratos de la respuesta:', response);
        return [];
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error obteniendo contratos:', error);

        if (error.status === 401) {
          this.notificationService.error('Sesión expirada', 'Por favor inicia sesión nuevamente');
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/auth/login']);
          return throwError(() => new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.'));
        }

        if (error.status === 403) {
          this.notificationService.warning('Sin permisos', 'No tienes permisos para ver contratos');
          return of([]);
        }

        if (error.status === 0) {
          this.notificationService.error('Error de conexión', 'No se pudo conectar con el servidor');
          return of([]);
        }

        const errorMsg = error.error?.message || error.message || 'Error desconocido';
        this.notificationService.error('Error', errorMsg);
        return of([]);
      })
    );
  }

  obtenerContratoPorId(id: string): Observable<Contrato | null> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return throwError(() => new Error('No estás autenticado'));
    }

    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers }).pipe(
      map(response => {
        if (response && response.success === true && response.data) {
          return response.data;
        }
        if (response && response.data) {
          return response.data;
        }
        return response || null;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo contrato:', error);
        return throwError(() => error);
      })
    );
  }

  crearContrato(createContratoDto: CreateContratoDto): Observable<Contrato> {
    console.log('📝 Creando contrato:', createContratoDto);

    const headers = this.getAuthHeaders();

    return this.http.post<any>(this.apiUrl, createContratoDto, { headers }).pipe(
      tap(response => {
        console.log('✅ Respuesta del backend:', response);
      }),
      map(response => {
        if (response && response.success === true && response.data) {
          this.notificationService.success('Contrato creado exitosamente');
          return response.data;
        }

        if (response && response.id && response.numeroContrato) {
          this.notificationService.success('Contrato creado exitosamente');
          return response;
        }

        throw new Error('Respuesta inválida del servidor');
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error creando contrato:', error);

        if (error.status === 401) {
          this.notificationService.error('Sesión expirada', 'Por favor inicia sesión nuevamente');
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/auth/login']);
          return throwError(() => new Error('Sesión expirada'));
        }

        if (error.status === 400) {
          const errorMsg = error.error?.message || 'Datos inválidos. Verifique los campos.';
          this.notificationService.error('Error de validación', errorMsg);
          return throwError(() => new Error(errorMsg));
        }

        const errorMsg = error.error?.message || error.message || 'Error al crear contrato';
        this.notificationService.error('Error', errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  actualizarContrato(id: string, updateContratoDto: UpdateContratoDto): Observable<Contrato> {
    const headers = this.getAuthHeaders();

    return this.http.put<any>(`${this.apiUrl}/${id}`, updateContratoDto, { headers }).pipe(
      tap(response => {
        console.log('✅ Contrato actualizado:', response);
      }),
      map(response => {
        if (response && response.success === true && response.data) {
          this.notificationService.success('Contrato actualizado exitosamente');
          return response.data;
        }
        return response;
      }),
      catchError(error => {
        console.error('❌ Error actualizando contrato:', error);
        const errorMsg = error.error?.message || error.message || 'Error al actualizar contrato';
        this.notificationService.error('Error', errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  // ==================== UTILIDADES ====================

  obtenerSupervisores(): Observable<any[]> {
    // Esto debería venir de un servicio de usuarios
    return new Observable(observer => {
      observer.next([
        { id: '1', nombre: 'Carlos Rodríguez' },
        { id: '2', nombre: 'María González' },
        { id: '3', nombre: 'Juan Pérez' },
        { id: '4', nombre: 'Ana Martínez' },
        { id: '5', nombre: 'Luis Sánchez' }
      ]);
      observer.complete();
    });
  }

  verificarPermisosUsuario(): Observable<any> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return of({
        success: false,
        data: { puedeCrear: false, puedeVer: false, usuario: null }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/verificar/permisos`, { headers }).pipe(
      catchError(() => of({
        success: false,
        data: { puedeCrear: true, puedeVer: true, usuario: null }
      }))
    );
  }

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(() => of({ status: 'error' }))
    );
  }
}