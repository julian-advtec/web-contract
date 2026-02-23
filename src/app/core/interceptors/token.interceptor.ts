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
  constructor(private router: Router) {
    console.log('[TokenInterceptor] ✅ INICIALIZADO');
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // LOG IMPORTANTE - Ver todas las peticiones interceptadas
    console.log(`[TokenInterceptor] 📡 INTERCEPTANDO: ${request.method} ${request.url}`);
    
    // Excluir endpoints públicos
    if (request.url.includes('/auth/') || 
        request.url.includes('/health') ||
        request.url.includes('/public/')) {
      console.log('[TokenInterceptor] ⏭️ URL pública, omitiendo');
      return next.handle(request);
    }
    
    // BUSCAR EN AMBOS FORMATOS
    let token = localStorage.getItem('access_token');
    
    if (!token) {
      token = localStorage.getItem('token');
      if (token) {
        console.log('[TokenInterceptor] ✅ Migrando token de "token" a "access_token"');
        localStorage.setItem('access_token', token);
      }
    }
    
    console.log(`[TokenInterceptor] Token existe: ${!!token}`);
    
    if (token) {
      console.log(`[TokenInterceptor] Token (primeros 20): ${token.substring(0, 20)}...`);
      
      const authRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log(`[TokenInterceptor] ✅ Header agregado: Bearer ${token.substring(0, 20)}...`);
      
      return next.handle(authRequest).pipe(
        catchError((error: HttpErrorResponse) => {
          console.log(`[TokenInterceptor] Error ${error.status} en ${request.url}`);
          
          if (error.status === 401) {
            console.log('[TokenInterceptor] 401 - Token inválido, cerrando sesión');
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/auth/login']);
          }
          
          return throwError(() => error);
        })
      );
    }
    
    console.warn('[TokenInterceptor] ⚠️ No hay token disponible');
    return next.handle(request);
  }
}