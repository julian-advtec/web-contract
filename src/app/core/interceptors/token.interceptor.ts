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
    // Excluir endpoints públicos
    if (request.url.includes('/auth/') || 
        request.url.includes('/health') ||
        request.url.includes('/public/')) {
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
        console.log(`🔐 Interceptor: Error ${error.status} en ${request.url}`);
        
        // IMPORTANTE: Solo cerrar sesión con 401
        if (error.status === 401) {
          console.log('🔐 401 Unauthorized - Cerrando sesión');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/auth/login']);
        }
        
        // 403 = Forbidden (sin permisos pero autenticado)
        // NO cerramos sesión, solo pasamos el error
        if (error.status === 403) {
          console.log('🚫 403 Forbidden - Sin permisos, manteniendo sesión');
        }
        
        // 404 = Not Found
        if (error.status === 404) {
          console.log('🔍 404 Not Found - Recurso no encontrado');
        }
        
        return throwError(() => error);
      })
    );
  }
}