import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, Subscription } from 'rxjs';
import { catchError, tap, debounceTime, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, UserRole } from '../models/user.types';
import { TokenUtils } from '../utils/token.util';
import { NotificationService } from './notification.service';
import { UserActivityService } from './user-activity.service';

interface LoginResponse {
  token?: string;
  access_token?: string;
  user?: User;
  userId?: string;
  requiresTwoFactor?: boolean;
  message?: string;
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
  private notificationService = inject(NotificationService);
  private userActivityService = inject(UserActivityService);
  private apiUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private pendingUserId = new BehaviorSubject<string | null>(null);
  public pendingUserId$ = this.pendingUserId.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private tokenExpirationSubject = new BehaviorSubject<Date | null>(null);
  public tokenExpiration$ = this.tokenExpirationSubject.asObservable();

  private timeRemainingSubject = new BehaviorSubject<number>(0);
  public timeRemaining$ = this.timeRemainingSubject.asObservable();

  private activitySubscription: Subscription | null = null;
  private warningShown = false;
  private lastRefreshTime = 0;
  
  private readonly MIN_REFRESH_INTERVAL = 15 * 60 * 1000;
  
  private timeInterval: any = null;

  constructor() {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr && token !== 'undefined' && userStr !== 'undefined' && userStr !== 'null') {
        if (TokenUtils.isTokenExpired(token)) {
          this.clearStoredAuth();
          return;
        }

        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);

        this.startActivityMonitoring();
        this.updateTimeRemaining();
        this.startTimeInterval();
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      this.clearStoredAuth();
    }
  }

  private startActivityMonitoring(): void {
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
    }

    this.userActivityService.startMonitoring();

    this.activitySubscription = this.userActivityService.activity$
      .pipe(debounceTime(1000))
      .subscribe(event => {
        if (event.type === 'user-interaction') {
          this.onUserActivity();
        } else if (event.type === 'inactivity-warning') {
          this.showInactivityWarning();
        }
      });
  }

  private stopActivityMonitoring(): void {
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
      this.activitySubscription = null;
    }
    this.userActivityService.stopMonitoring();
  }

  private startTimeInterval(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    this.timeInterval = setInterval(() => this.updateTimeRemaining(), 1000);
  }

  private stopTimeInterval(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  }

  private updateTimeRemaining(): void {
    const token = this.getToken();
    if (!token) {
      this.timeRemainingSubject.next(0);
      this.tokenExpirationSubject.next(null);
      return;
    }

    const timeLeft = TokenUtils.getTimeToExpiration(token);
    this.timeRemainingSubject.next(Math.max(0, timeLeft));
    this.tokenExpirationSubject.next(TokenUtils.getTokenExpiration(token));

    if (timeLeft <= 0) {
      this.logout('Tu sesión ha expirado');
      return;
    }

    if (timeLeft <= 300 && timeLeft > 0 && !this.warningShown) {
      this.warningShown = true;
      this.showExpirationWarning(timeLeft);
    }
  }

  private onUserActivity(): void {
    const token = this.getToken();
    if (!token) return;

    const now = Date.now();
    const shouldRefresh = (now - this.lastRefreshTime) >= this.MIN_REFRESH_INTERVAL;
    
    if (shouldRefresh) {
      const userId = this.getCurrentUser()?.id;
      if (userId) {
        this.refreshToken(userId).subscribe({
          next: () => {
            this.lastRefreshTime = Date.now();
            this.warningShown = false;
          },
          error: (error) => {
            console.error('Error renovando token:', error);
            if (error.status === 401) {
              this.logout('Tu sesión ha expirado');
            }
          }
        });
      }
    }
  }

  private showInactivityWarning(): void {
    this.notificationService.warning(
      'Has estado inactivo por 15 minutos. Interactúa con la página para mantener tu sesión activa.',
      '⚠️ Sesión por expirar por inactividad',
      10000
    );
  }

  private showExpirationWarning(secondsLeft: number): void {
    const minutes = Math.floor(secondsLeft / 60);
    this.notificationService.warning(
      `Tu sesión expirará en ${minutes} minutos. Interactúa con la página para renovarla automáticamente.`,
      '⚠️ Sesión próxima a expirar',
      10000
    );
  }

  refreshToken(userId: string): Observable<{ token: string }> {
    return this.http.post<any>(`${this.apiUrl}/auth/refresh-token`, { userId }).pipe(
      map(response => {
        let token = null;
        if (response.token) {
          token = response.token;
        } else if (response.data && response.data.token) {
          token = response.data.token;
        } else if (response.access_token) {
          token = response.access_token;
        }
        
        if (!token) {
          throw new Error('No se recibió token en la respuesta');
        }
        
        return { token };
      }),
      tap(({ token }) => {
        localStorage.setItem('token', token);
        this.timeRemainingSubject.next(TokenUtils.getTimeToExpiration(token));
        this.tokenExpirationSubject.next(TokenUtils.getTokenExpiration(token));
        this.warningShown = false;
        
        this.notificationService.success(
          `Sesión renovada por actividad. Próxima renovación en 15 minutos.`,
          '🔄 Sesión actualizada',
          3000
        );
      }),
      catchError(error => {
        console.error('Error en refresh token:', error);
        return throwError(() => error);
      })
    );
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      tap(response => {
        if (response.requiresTwoFactor && response.userId) {
          this.setPendingUserId(response.userId);
          this.router.navigate(['/two-factor']);
        } else if ((response.token || response.access_token) && response.user) {
          const token = response.token || response.access_token || '';
          this.completeLogin(token, response.user);
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(error => {
        console.error('Error en login:', error);
        return throwError(() => error);
      })
    );
  }

  verify2FA(userId: string, code: string): Observable<TwoFactorResponse> {
    return this.http.post<TwoFactorResponse>(`${this.apiUrl}/auth/verify-2fa`, { userId, code }).pipe(
      tap(response => {
        if ((response.token || response.access_token) && response.user) {
          const token = response.token || response.access_token || '';
          this.completeLogin(token, response.user);
          this.clearPendingAuth();
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(error => {
        console.error('Error en verificación 2FA:', error);
        return throwError(() => error);
      })
    );
  }

  resend2FACode(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-2fa`, { userId }).pipe(
      catchError(error => {
        console.error('Error al reenviar código:', error);
        return throwError(() => error);
      })
    );
  }

  loginDirect(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login-direct`, { username, password }).pipe(
      tap(response => {
        if ((response.token || response.access_token) && response.user) {
          const token = response.token || response.access_token || '';
          this.completeLogin(token, response.user);
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(error => {
        console.error('Error en login directo:', error);
        return throwError(() => error);
      })
    );
  }

  public completeLogin(token: string, user: User): void {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(true);

      this.startActivityMonitoring();
      this.updateTimeRemaining();
      this.startTimeInterval();

      this.warningShown = false;
      this.lastRefreshTime = Date.now();

    } catch (error) {
      console.error('Error completando login:', error);
    }
  }

  public setToken(token: string): void {
    try {
      localStorage.setItem('token', token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  public setUser(user: User): void {
    try {
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(true);
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  private clearStoredAuth(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.currentUserSubject.next(null);
      this.isLoggedInSubject.next(false);
    } catch (error) {
      console.error('Error clearing stored auth:', error);
    }
  }

  logout(message?: string): void {
    this.stopActivityMonitoring();
    this.stopTimeInterval();
    this.clearStoredAuth();
    this.clearPendingAuth();
    this.tokenExpirationSubject.next(null);
    this.timeRemainingSubject.next(0);
    this.warningShown = false;
    this.lastRefreshTime = 0;

    if (message) {
      this.notificationService.info(message, 'Sesión cerrada', 3000);
    }

    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();

    if (!token || !user) return false;

    if (TokenUtils.isTokenExpired(token)) {
      this.logout('Tu sesión ha expirado');
      return false;
    }

    return true;
  }

  getPendingUserId(): string | null {
    return this.pendingUserId.value;
  }

  setPendingUserId(userId: string): void {
    this.pendingUserId.next(userId);
  }

  clearPendingAuth(): void {
    this.pendingUserId.next(null);
  }

  hasPendingAuth(): boolean {
    return !!this.pendingUserId.value;
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email }).pipe(
      catchError(error => {
        console.error('Error en forgot password:', error);
        return throwError(() => error);
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, { token, newPassword }).pipe(
      catchError(error => {
        console.error('Error en reset password:', error);
        return throwError(() => error);
      })
    );
  }

  validateResetToken(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/validate-reset-token`, { token }).pipe(
      catchError(error => {
        console.error('Error validando reset token:', error);
        return throwError(() => error);
      })
    );
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  getFormattedTimeRemaining(): string {
    const seconds = this.timeRemainingSubject.value;
    if (seconds <= 0) return '00:00';

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getTimePercentage(): number {
    const seconds = this.timeRemainingSubject.value;
    if (seconds <= 0) return 0;
    const maxSeconds = 1800;
    return Math.min(100, Math.max(0, (seconds / maxSeconds) * 100));
  }

  isJuridica(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.JURIDICA;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.ADMIN;
  }

  getFullName(): string {
    const user = this.getCurrentUser();
    return user?.fullName || user?.username || 'Usuario';
  }

  getRoleName(): string {
    const user = this.getCurrentUser();
    if (!user) return 'Usuario';

    const roleNames: Record<string, string> = {
      'admin': 'Administrador',
      'contratista': 'Contratista',
      'juridica': 'Jurídica',
      'radicador': 'Radicador',
      'supervisor': 'Supervisor',
      'auditor_cuentas': 'Auditor de Cuentas',
      'contabilidad': 'Contabilidad',
      'tesoreria': 'Tesorería',
      'asesor_gerencia': 'Asesor de Gerencia',
      'rendicion_cuentas': 'Rendición de Cuentas'
    };

    return roleNames[user.role] || user.role;
  }

  public forceAuthState(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('auth_force_token', token);
    localStorage.setItem('auth_force_user', JSON.stringify(user));
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_user', JSON.stringify(user));

    this.currentUserSubject.next(user);
    this.isLoggedInSubject.next(true);

    this.startActivityMonitoring();
    this.startTimeInterval();
  }

  public updateUser(user: User): void {
    try {
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  getUsersStats(): Observable<UsersStats> {
    return this.http.get<UsersStats>(`${this.apiUrl}/users/stats`).pipe(
      catchError(error => {
        console.error('Error obteniendo estadísticas:', error);
        return throwError(() => error);
      })
    );
  }
}