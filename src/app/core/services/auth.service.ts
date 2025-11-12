import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  access_token?: string;
  user?: User;
  message: string;
  success: boolean;
  requiresTwoFactor?: boolean;
  userId?: string;
  expiresIn?: string;
}

export interface TwoFactorResponse {
  success: boolean;
  message: string;
  access_token?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Para manejar el estado de 2FA
  private pendingUserId = new BehaviorSubject<string | null>(null);
  public pendingUserId$ = this.pendingUserId.asObservable();

  constructor() {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
          const user = JSON.parse(userStr);
          this.currentUserSubject.next(user);
        } else {
          this.clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      this.clearStoredAuth();
    }
  }

  /**
   * Login principal - CORREGIDO para extraer data
   */
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔐 AuthService - Iniciando login para:', username);
      
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/login`, {
          username,
          password
        })
      );

      console.log('🔐 AuthService - Respuesta completa:', response);
      
      // 🔥 EXTRAER LOS DATOS DE "data"
      const authData = response.data || response;
      
      console.log('🔐 AuthService - Datos de autenticación:', authData);

      // Si requiere 2FA, guardar userId pendiente
      if (authData.requiresTwoFactor && authData.userId) {
        console.log('🔐 AuthService - 2FA requerido, userId:', authData.userId);
        this.pendingUserId.next(authData.userId);
        sessionStorage.setItem('2faUserId', authData.userId);
        return authData;
      }

      // Si no requiere 2FA, login completo
      if (authData.access_token && authData.user) {
        console.log('🔐 AuthService - Login completo, guardando token');
        this.setAuthData(authData.access_token, authData.user);
      }

      return authData;
    } catch (error: any) {
      console.error('🔐 AuthService - Error en login:', error);
      throw error;
    }
  }

  /**
   * Verificar código 2FA - CORREGIDO para extraer data
   */
  async verifyTwoFactor(code: string): Promise<TwoFactorResponse> {
    let userId = this.pendingUserId.value;

    if (!userId) {
      userId = sessionStorage.getItem('2faUserId');
    }

    if (!userId) {
      throw new Error('No hay usuario pendiente de verificación');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/verify-2fa`, {
          userId,
          code
        })
      );

      // 🔥 EXTRAER DATOS DE "data"
      const result = response.data || response;
      console.log('🔐 AuthService - Resultado verificación 2FA:', result);

      if (result.success && result.access_token && result.user) {
        this.setAuthData(result.access_token, result.user);
        this.clearPendingAuth();
      }

      return result;
    } catch (error: any) {
      console.error('🔐 AuthService - Error en verificación 2FA:', error);
      throw error;
    }
  }

  /**
   * Reenviar código 2FA - CORREGIDO para extraer data
   */
  async resendTwoFactorCode(): Promise<{ success: boolean; message: string }> {
    let userId = this.pendingUserId.value;

    if (!userId) {
      userId = sessionStorage.getItem('2faUserId');
    }

    if (!userId) {
      throw new Error('No hay usuario pendiente de verificación');
    }

    const response = await firstValueFrom(
      this.http.post<any>(
        `${this.apiUrl}/auth/resend-2fa`,
        { userId }
      )
    );

    // 🔥 EXTRAER DATOS DE "data"
    return response.data || response;
  }

  /**
   * Login directo - CORREGIDO para extraer data
   */
  async loginDirect(username: string, password: string): Promise<AuthResponse> {
    const response = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/auth/login-direct`, {
        username,
        password
      })
    );

    // 🔥 EXTRAER DATOS DE "data"
    const authData = response.data || response;

    if (authData.access_token && authData.user) {
      this.setAuthData(authData.access_token, authData.user);
    }

    return authData;
  }

  /**
   * Guardar datos de autenticación
   */
  private setAuthData(token: string, user: User): void {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  }

  /**
   * Limpiar datos almacenados
   */
  private clearStoredAuth(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing stored auth:', error);
    }
  }

  /**
   * Logout
   */
  logout(): void {
    this.clearStoredAuth();
    sessionStorage.removeItem('2faUserId');
    this.currentUserSubject.next(null);
    this.pendingUserId.next(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Obtener token
   */
  getToken(): string | null {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Obtener userId pendiente (para 2FA)
   */
  getPendingUserId(): string | null {
    return this.pendingUserId.value || sessionStorage.getItem('2faUserId');
  }

  /**
   * Limpiar estado pendiente (2FA)
   */
  clearPendingAuth(): void {
    this.pendingUserId.next(null);
    sessionStorage.removeItem('2faUserId');
  }

  /**
   * Verificar si hay autenticación pendiente (2FA)
   */
  hasPendingAuth(): boolean {
    return !!this.getPendingUserId();
  }
}