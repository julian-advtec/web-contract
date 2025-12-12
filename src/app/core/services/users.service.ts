import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, UserRole } from '../models/user.types';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  status?: number;
  errors?: any[];
}

export interface CreateUserData {
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  password?: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  password?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUserById(id: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  createUser(userData: CreateUserData): Observable<ApiResponse<User>> {
    console.log('UsersService: Enviando datos al backend:', userData); // DEBUG
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateUser(id: string, userData: UpdateUserData): Observable<ApiResponse<User>> {
    console.log('UsersService: Actualizando usuario:', id, userData); // DEBUG
    return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/${id}`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  getUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(this.apiUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  toggleUserStatus(id: string): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/${id}/toggle-status`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteUser(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('UsersService - Error completo:', error); // DEBUG
    console.error('UsersService - Error status:', error.status);
    console.error('UsersService - Error message:', error.message);
    console.error('UsersService - Error body:', error.error);
    
    // Extraer el mensaje de error del backend
    let errorMessage = 'Error desconocido';
    let statusCode = error.status || 500;
    let errors: any[] = [];
    
    // Si el backend devuelve un mensaje específico
    if (error.error?.message) {
      if (Array.isArray(error.error.message)) {
        errorMessage = 'Errores de validación';
        errors = error.error.message;
      } else {
        errorMessage = error.error.message;
      }
    } 
    // Si el backend devuelve errores de validación (class-validator)
    else if (error.error?.errors && Array.isArray(error.error.errors)) {
      errorMessage = 'Errores de validación';
      error.error.errors.forEach((err: any) => {
        if (err.constraints) {
          Object.values(err.constraints).forEach((msg: any) => {
            errors.push(msg);
          });
        }
      });
    }
    // Si es un error HTTP estándar
    else if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.message || 'Error del servidor';
    }
    
    return throwError(() => ({
      status: statusCode,
      message: errorMessage,
      errors: errors,
      error: error.error // Incluir el error completo para procesamiento detallado
    }));
  }
}