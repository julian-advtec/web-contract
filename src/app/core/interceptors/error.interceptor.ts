import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Ha ocurrido un error';
        
        if (error.error instanceof ErrorEvent) {
          // Error del lado del cliente
          errorMessage = error.error.message;
        } else {
          // Error del lado del servidor
          switch (error.status) {
            case 400:
              errorMessage = error.error.message || 'Solicitud incorrecta';
              break;
            case 401:
              errorMessage = 'No autorizado. Por favor inicie sesión nuevamente.';
              localStorage.removeItem('access_token');
              this.router.navigate(['/auth/login']);
              break;
            case 403:
              errorMessage = 'No tiene permisos para realizar esta acción';
              break;
            case 404:
              errorMessage = 'Recurso no encontrado';
              break;
            case 409:
              errorMessage = error.error.message || 'Conflicto con el recurso';
              break;
            case 500:
              errorMessage = 'Error interno del servidor';
              break;
            default:
              errorMessage = `Error ${error.status}: ${error.statusText}`;
          }
        }
        
        console.error('Error en la petición:', errorMessage);
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}