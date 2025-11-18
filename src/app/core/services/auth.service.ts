// auth.service.ts - COMPLETO Y CORREGIDO
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
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
  token?: string;
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

  // Para manejar estado de autenticación
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

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
          this.isLoggedInSubject.next(true);
          console.log('🔐 Auth loaded from storage:', user.username);
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
   * Verificar código 2FA - MEJORADO
   */
  verify2FA(userId: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-2fa`, {
      userId,
      code
    }).pipe(
      tap(response => {
        console.log('🔐 AuthService - 2FA verification successful:', response);
      }),
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
      console.log('🔐 Token saved to storage');
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  setUser(user: User): void {
    try {
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(true);
      console.log('🔐 User saved to storage:', user.username);
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  /**
   * ✅ NUEVO MÉTODO: Completar login después de 2FA
   */
  completeLogin(token: string, user: User): Observable<boolean> {
    return new Observable(observer => {
      try {
        console.log('🔐 Completing login process...');
        
        // Limpiar estado pendiente primero
        this.clearPendingAuth();
        
        // Establecer token y usuario
        this.setToken(token);
        this.setUser(user);
        
        console.log('🔐 ✅ Login completed successfully for user:', user.username);
        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('🔐 ❌ Error completing login:', error);
        observer.error(error);
      }
    });
  }

  /**
   * Limpiar datos almacenados
   */
  private clearStoredAuth(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.currentUserSubject.next(null);
      this.isLoggedInSubject.next(false);
      console.log('🔐 Auth data cleared from storage');
    } catch (error) {
      console.error('Error clearing stored auth:', error);
    }
  }

  /**
   * Logout
   */
  logout(): void {
    console.log('🔐 Logging out user...');
    this.clearStoredAuth();
    this.clearPendingAuth();
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
    const token = this.getToken();
    const isAuth = !!token;
    console.log('🔐 Authentication check:', isAuth);
    return isAuth;
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
    console.log('🔐 Pending user ID set:', userId);
  }

  /**
   * Limpiar estado pendiente (2FA)
   */
  clearPendingAuth(): void {
    this.pendingUserId.next(null);
    console.log('🔐 Pending auth cleared');
  }

  /**
   * Verificar si hay autenticación pendiente (2FA)
   */
  hasPendingAuth(): boolean {
    const hasPending = !!this.pendingUserId.value;
    console.log('🔐 Pending auth check:', hasPending);
    return hasPending;
  }

  /**
   * Forgot password
   */
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