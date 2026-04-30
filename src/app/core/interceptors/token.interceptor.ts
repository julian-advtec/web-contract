// src/app/core/interceptors/token.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isPublicEndpoint(request.url)) {
      return next.handle(request);
    }
    
    const token = localStorage.getItem('token');
    
    let authRequest = request;
    
    if (token) {
      authRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('/auth/refresh-token')) {
          console.log('🔐 401 Unauthorized - Token expirado');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/auth/login'], {
            queryParams: { sessionExpired: 'true' }
          });
        }
        
        return throwError(() => error);
      })
    );
  }

  private isPublicEndpoint(url: string): boolean {
    const publicEndpoints = [
      '/auth/login',
      '/auth/login-direct',
      '/auth/verify-2fa',
      '/auth/resend-2fa',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh-token',
      '/auth/health',
      '/health'
    ];
    
    return publicEndpoints.some(endpoint => url.includes(endpoint));
  }
}