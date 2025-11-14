// auth.service.ts - COMPLETO Y CORREGIDO
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  ok: boolean;
  success?: boolean;
  access_token?: string;
  user?: User;
  message: string;
  requiresTwoFactor?: boolean;
  userId?: string;
  expiresIn?: string;
  data?: any;
  path?: string;
  timestamp?: string;
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
   * Login principal - MEJORADO
   */
  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
      username,
      password
    }).pipe(
      map(response => {
        console.log('🔐 AuthService - Login response mapped:', response);
        return response;
      }),
      catchError(error => {
        console.error('🔐 AuthService - Error en login:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verificar código 2FA
   */
  verify2FA(userId: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-2fa`, {
      userId,
      code
    }).pipe(
      catchError(error => {
        console.error('🔐 AuthService - Error en verificación 2FA:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Reenviar código 2FA
   */
  resend2FACode(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-2fa`, {
      userId
    }).pipe(
      catchError(error => {
        console.error('🔐 AuthService - Error al reenviar código:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Login directo
   */
  loginDirect(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login-direct`, {
      username,
      password
    }).pipe(
      catchError(error => {
        console.error('🔐 AuthService - Error en login directo:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Guardar datos de autenticación
   */
  setToken(token: string): void {
    try {
      localStorage.setItem('token', token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  setUser(user: User): void {
    try {
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
    } catch (error) {
      console.error('Error saving user:', error);
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
    return this.pendingUserId.value;
  }

  /**
   * Establecer userId pendiente
   */
  setPendingUserId(userId: string): void {
    this.pendingUserId.next(userId);
  }

  /**
   * Limpiar estado pendiente (2FA)
   */
  clearPendingAuth(): void {
    this.pendingUserId.next(null);
  }

  /**
   * Verificar si hay autenticación pendiente (2FA) - MÉTODO AGREGADO
   */
  hasPendingAuth(): boolean {
    return !!this.pendingUserId.value;
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email }).pipe(
      catchError(error => {
        console.error('🔐 AuthService - Error en forgot password:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Reset password
   */
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, {
      token,
      newPassword
    }).pipe(
      catchError(error => {
        console.error('🔐 AuthService - Error en reset password:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Validate reset token
   */
  validateResetToken(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/validate-reset-token`, { token }).pipe(
      catchError(error => {
        console.error('🔐 AuthService - Error validando reset token:', error);
        return throwError(() => error);
      })
    );
  }
}