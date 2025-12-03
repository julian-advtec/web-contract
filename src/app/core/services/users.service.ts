// src/app/core/services/users.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRole } from './auth.service';
import { AuthService } from './auth.service'; // <-- AÑADE ESTA IMPORTACIÓN

export interface CreateUserRequest {
    username: string;
    email: string;
    fullName: string;
    role: UserRole;
    password: string;
    isActive?: boolean;
}

export interface UpdateUserRequest {
    username?: string;
    email?: string;
    fullName?: string;
    role?: UserRole;
    password?: string;
    isActive?: boolean;
}

export interface UsersStats {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
}

export interface PaginatedUsersResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ApiResponse<T> {
    ok: boolean;
    path: string;
    timestamp: string;
    data: T;
}

export interface PaginatedResponse<T> {
    users: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}



@Injectable({
    providedIn: 'root'
})
export class UsersService {
    private http = inject(HttpClient);
    private authService = inject(AuthService); // Ahora AuthService está importado
    private apiUrl = environment.apiUrl;

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        console.log('🔐 UsersService.getHeaders() - Token:', token ? '✅ Presente' : '❌ Ausente');

        if (token) {
            return new HttpHeaders({
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            });
        }

        return new HttpHeaders({
            'Content-Type': 'application/json'
        });
    }


    // Luego actualiza el método getUsers:
    getUsers(): Observable<ApiResponse<User[]>> {
        console.log('🔗 UsersService.getUsers() - Llamando a:', `${this.apiUrl}/users`);

        const headers = this.getHeaders();
        console.log('🔗 UsersService.getUsers() - Headers:', headers.keys());

        return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users`, { headers });
    }

    // Añade un método para obtener usuarios paginados
    getUsersPaginated(page: number = 1, limit: number = 10): Observable<PaginatedResponse<User>> {
        const headers = this.getHeaders();
        const params = {
            page: page.toString(),
            limit: limit.toString()
        };

        return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}/users/paginated`, {
            headers,
            params
        });
    }

    // Obtener usuarios con filtros y paginación
    getUsersWithFilters(params: {
        search?: string;
        role?: UserRole;
        isActive?: boolean;
        page?: number;
        limit?: number;
    }): Observable<PaginatedUsersResponse> {
        const headers = this.getHeaders();
        const queryParams = new URLSearchParams();

        if (params.search) queryParams.set('search', params.search);
        if (params.role) queryParams.set('role', params.role);
        if (params.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());
        if (params.page) queryParams.set('page', params.page.toString());
        if (params.limit) queryParams.set('limit', params.limit.toString());

        const queryString = queryParams.toString();
        return this.http.get<PaginatedUsersResponse>(
            `${this.apiUrl}/users/filtered${queryString ? '?' + queryString : ''}`,
            { headers }
        );
    }

    // Obtener usuario por ID
    getUserById(id: string): Observable<User> {
        const headers = this.getHeaders();
        return this.http.get<User>(`${this.apiUrl}/users/${id}`, { headers });
    }

    // Obtener usuarios por rol
    getUsersByRole(role: UserRole): Observable<User[]> {
        const headers = this.getHeaders();
        return this.http.get<User[]>(`${this.apiUrl}/users/role/${role}`, { headers });
    }

    // Obtener estadísticas
    getUsersStats(): Observable<UsersStats> {
        const headers = this.getHeaders();
        return this.http.get<UsersStats>(`${this.apiUrl}/users/stats`, { headers });
    }

    // Crear usuario
    createUser(userData: CreateUserRequest): Observable<User> {
        const headers = this.getHeaders();
        return this.http.post<User>(`${this.apiUrl}/users`, userData, { headers });
    }

    // Actualizar usuario
    updateUser(id: string, userData: UpdateUserRequest): Observable<User> {
        const headers = this.getHeaders();
        return this.http.patch<User>(`${this.apiUrl}/users/${id}`, userData, { headers });
    }

    // Activar/Desactivar usuario
    toggleUserStatus(id: string): Observable<User> {
        const headers = this.getHeaders();
        return this.http.patch<User>(`${this.apiUrl}/users/${id}/toggle-status`, {}, { headers });
    }

    // Activar usuario
    activateUser(id: string): Observable<User> {
        const headers = this.getHeaders();
        return this.http.patch<User>(`${this.apiUrl}/users/${id}/activate`, {}, { headers });
    }

    // Desactivar usuario
    deactivateUser(id: string): Observable<User> {
        const headers = this.getHeaders();
        return this.http.patch<User>(`${this.apiUrl}/users/${id}/deactivate`, {}, { headers });
    }

    // Eliminar usuario
    deleteUser(id: string): Observable<void> {
        const headers = this.getHeaders();
        return this.http.delete<void>(`${this.apiUrl}/users/${id}`, { headers });
    }

    // Eliminación suave
    softDeleteUser(id: string): Observable<User> {
        const headers = this.getHeaders();
        return this.http.delete<User>(`${this.apiUrl}/users/${id}/soft`, { headers });
    }
}