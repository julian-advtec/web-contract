// core/services/users.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators'; // 👈 IMPORTAR TAP
import { environment } from '../../../environments/environment';
import { User, UserRole } from '../models/user.types';
import { Signature } from './signature.service';

// 👇 INTERFAZ PARA LA RESPUESTA ANIDADA
export interface UserResponseData {
  data: UserWithSignature;  // Los datos reales están dentro de "data"
}

export interface ApiResponse<T> {
  ok?: boolean;
  path?: string;
  timestamp?: string;
  data?: T;  // T será UserResponseData
  message?: string;
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

export interface UserWithSignature extends User {
  signature?: Signature | null;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener usuario por ID con su firma - VERSIÓN CORREGIDA (SOLO UNA)
   */
  getUserById(id: string): Observable<ApiResponse<UserResponseData>> {
    return this.http.get<ApiResponse<UserResponseData>>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(response => console.log('UsersService - getUserById response:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Crear nuevo usuario
   */
  createUser(userData: CreateUserData): Observable<ApiResponse<User>> {
    console.log('UsersService: Enviando datos al backend:', userData);
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Actualizar usuario existente
   */
  updateUser(id: string, userData: UpdateUserData): Observable<ApiResponse<User>> {
    console.log('UsersService: Actualizando usuario:', id, userData);
    return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/${id}`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtener todos los usuarios
   */
  getUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(this.apiUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Cambiar estado del usuario
   */
  toggleUserStatus(id: string): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/${id}/toggle-status`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Eliminar usuario
   */
  deleteUser(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Manejador de errores
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('UsersService - Error completo:', error);
    console.error('UsersService - Error status:', error.status);
    console.error('UsersService - Error message:', error.message);
    console.error('UsersService - Error body:', error.error);
    
    let errorMessage = 'Error desconocido';
    let statusCode = error.status || 500;
    let errors: any[] = [];
    
    if (error.error?.message) {
      if (Array.isArray(error.error.message)) {
        errorMessage = 'Errores de validación';
        errors = error.error.message;
      } else {
        errorMessage = error.error.message;
      }
    } 
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
    else if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.message || 'Error del servidor';
    }
    
    return throwError(() => ({
      status: statusCode,
      message: errorMessage,
      errors: errors,
      error: error.error
    }));
  }
}