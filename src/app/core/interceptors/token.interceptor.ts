// core/interceptors/token.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('🔐 TokenInterceptor - URL:', request.url);
    
    const token = this.authService.getToken();
    console.log('🔐 TokenInterceptor - Token disponible:', token ? '✅ SÍ' : '❌ NO');
    
    if (token) {
      console.log('🔐 TokenInterceptor - Añadiendo token a headers');
      const clonedRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(clonedRequest);
    } else {
      console.log('🔐 TokenInterceptor - Sin token, request original');
    }
    
    return next.handle(request);
  }
}