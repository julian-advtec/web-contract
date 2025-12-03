// auth.service.ts - CORREGIR
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, UserRole } from '../models/user.types';

// Definir interfaces locales
interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  token?: string;
  access_token?: string;
  user?: User;
  userId?: string;
  requiresTwoFactor?: boolean;
  message?: string;
}

interface TwoFactorRequest {
  userId: string;
  code: string;
}

interface TwoFactorResponse {
  token?: string;
  access_token?: string;
  user?: User;
  message?: string;
}

interface UsersStats {
  total: number;
  active: number;
  inactive: number;
  byRole: { [key: string]: number };
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

  private pendingUserId = new BehaviorSubject<string | null>(null);
  public pendingUserId$ = this.pendingUserId.asObservable();

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
   * Login principal
   */
  login(username: string, password: string): Observable<LoginResponse> {
    const loginRequest: LoginRequest = { username, password };
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, loginRequest).pipe(
      tap(response => {
        console.log('🔐 AuthService - Login response:', response);
        
        if (response.requiresTwoFactor && response.userId) {
          // Guardar userId para 2FA
          this.setPendingUserId(response.userId);
          console.log('🔐 2FA required for user:', response.userId);
          this.router.navigate(['/two-factor']);
        } else if (response.token && response.user) {
          // Login directo exitoso
          this.completeLogin(response.token, response.user);
          this.router.navigate(['/dashboard']);
        }
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
  verify2FA(userId: string, code: string): Observable<TwoFactorResponse> {
    const request: TwoFactorRequest = { userId, code };
    
    return this.http.post<TwoFactorResponse>(`${this.apiUrl}/auth/verify-2fa`, request).pipe(
      tap(response => {
        console.log('🔐 AuthService - 2FA verification successful:', response);
        if (response.token && response.user) {
          this.completeLogin(response.token, response.user);
          this.clearPendingAuth();
          this.router.navigate(['/dashboard']);
        }
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
    return this.http.post(`${this.apiUrl}/auth/resend-2fa`, { userId }).pipe(
      catchError(error => {
        console.error('🔐 AuthService - Error al reenviar código:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Login directo (sin 2FA)
   */
  loginDirect(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login-direct`, {
      username,
      password
    }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.completeLogin(response.token, response.user);
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(error => {
        console.error('🔐 AuthService - Error en login directo:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Completar login
   */
    public completeLogin(token: string, user: User): void {
    try {
      console.log('🔐 Completing login process...');
      
      // Establecer token y usuario
      this.setToken(token);
      this.setUser(user);
      
      console.log('🔐 ✅ Login completed successfully for user:', user.username);
    } catch (error) {
      console.error('🔐 ❌ Error completing login:', error);
    }
  }

  /**
   * Guardar token (público)
   */
  public setToken(token: string): void {
    try {
      localStorage.setItem('token', token);
      console.log('🔐 Token saved to storage');
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * Guardar usuario (público)
   */
  public setUser(user: User): void {
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
    const user = this.getCurrentUser();
    const isAuth = !!token && !!user;
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

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Verificar si el usuario tiene alguno de los roles
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }
}

// Export types from here for backward compatibility
export { User, UserRole };