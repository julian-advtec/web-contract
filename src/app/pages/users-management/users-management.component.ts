// src/app/pages/users-management/users-management.component.ts
import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { UsersService, ApiResponse, PaginatedResponse } from '../../core/services/users.service';
import { User, UserRole } from '../../core/models/user.types';
import { Router } from '@angular/router';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
    selector: 'app-users-management',
    templateUrl: './users-management.component.html',
    styleUrls: ['./users-management.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NavbarComponent,
        SidebarComponent
    ]
})
export class UsersManagementComponent implements OnInit {
    private auth = inject(AuthService);
    private router = inject(Router);
    private modulesService = inject(ModulesService);
    private usersService = inject(UsersService);

    currentUser: User | null = null;
    showLogoutConfirm = false;
    sidebarCollapsed = false;
    availableModules: AppModule[] = [];

    // Datos de usuarios
    users: User[] = [];
    UserRole = UserRole;
    searchTerm: string = '';
    isLoading = false;

    // Paginación
    currentPage: number = 1;
    itemsPerPage: number = 10;
    totalItems: number = 0;
    totalPages: number = 0;

    ngOnInit() {
        this.currentUser = this.auth.getCurrentUser();
        this.loadAvailableModules();

        if (!this.isMobile()) {
            this.sidebarCollapsed = false;
        } else {
            this.sidebarCollapsed = true;
        }

        this.loadUsers();
    }

    private loadAvailableModules(): void {
        if (this.currentUser?.role) {
            this.availableModules = this.modulesService.getModulesForUser(this.currentUser.role);
        } else {
            this.availableModules = this.modulesService.getDefaultModules();
        }
        console.log('Módulos disponibles:', this.availableModules);
    }

    // CORREGIDO: Extrae correctamente los datos de la respuesta
    loadUsers(): void {
        this.isLoading = true;

        this.usersService.getUsers().subscribe({
            next: (response: ApiResponse<User[]>) => {
                console.log('✅ Respuesta API:', response);

                // Extraer los usuarios del objeto data
                if (response && response.data) {
                    this.users = response.data;
                    this.totalItems = response.data.length;
                    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
                    console.log('✅ Usuarios cargados:', this.users.length);
                } else {
                    console.warn('⚠️ Respuesta sin datos:', response);
                    this.users = [];
                    this.totalItems = 0;
                    this.totalPages = 0;
                }

                this.isLoading = false;
            },
            error: (error) => {
                console.error('❌ Error cargando usuarios:', error);
                this.isLoading = false;

                if (error.status === 401) {
                    alert('No autorizado. Por favor inicia sesión nuevamente.');
                    this.router.navigate(['/auth/login']);
                } else if (error.status === 403) {
                    alert('No tienes permisos para ver los usuarios.');
                } else if (error.status === 404) {
                    // Si el endpoint no existe, intenta obtener usuarios sin paginación
                    console.log('⚠️ Endpoint no encontrado, intentando método alternativo...');
                    this.loadUsersAlternative();
                } else {
                    alert('Error al cargar usuarios. Verifica la conexión.');
                }
            }
        });
    }

    // Método alternativo si el endpoint con API Response no funciona
    private loadUsersAlternative(): void {
        this.isLoading = true;

        // Intenta obtener usuarios directamente sin el wrapper ApiResponse
        this.usersService.getUsers().subscribe({
            next: (response: any) => {
                console.log('✅ Respuesta alternativa:', response);

                // Intenta determinar el formato de la respuesta
                if (Array.isArray(response)) {
                    // Si es directamente un array
                    this.users = response;
                } else if (response && response.data && Array.isArray(response.data)) {
                    // Si es {data: [], ...}
                    this.users = response.data;
                } else if (response && response.users && Array.isArray(response.users)) {
                    // Si es {users: [], ...}
                    this.users = response.users;
                } else {
                    console.warn('⚠️ Formato de respuesta desconocido:', response);
                    this.users = [];
                }

                this.totalItems = this.users.length;
                this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
                this.isLoading = false;
            },
            error: (error) => {
                console.error('❌ Error en método alternativo:', error);
                this.isLoading = false;
            }
        });
    }

    // Métodos de paginación
    get paginatedUsers(): User[] {
        if (!this.users.length) return [];

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.users.slice(startIndex, endIndex);
    }

    get filteredUsers(): User[] {
        if (!this.searchTerm) {
            return this.paginatedUsers;
        }

        const search = this.searchTerm.toLowerCase();
        return this.users.filter(user =>
            (user.fullName?.toLowerCase().includes(search)) ||
            (user.username?.toLowerCase().includes(search)) ||
            (user.email?.toLowerCase().includes(search)) ||
            (this.getUserRoleName(user.role).toLowerCase().includes(search))
        ).slice(0, this.itemsPerPage); // Mostrar solo 10 resultados filtrados
    }

    changePage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    get pages(): number[] {
        const pages = [];
        for (let i = 1; i <= this.totalPages; i++) {
            pages.push(i);
        }
        return pages;
    }

    // Resto de métodos igual...
    onToggleSidebar(collapsed: boolean) {
        this.sidebarCollapsed = collapsed;
        console.log('🔄 Sidebar collapsed:', collapsed);
    }

    onLogout() {
        this.showLogoutConfirm = true;
    }

    confirmLogout() {
        this.auth.logout();
        this.showLogoutConfirm = false;
        this.router.navigate(['/auth/login']);
    }

    cancelLogout() {
        this.showLogoutConfirm = false;
    }

    closeSidebarOnOverlay(event: MouseEvent) {
        if (this.isMobile() && !this.sidebarCollapsed) {
            const sidebarElement = (event.target as HTMLElement).closest('app-sidebar');
            if (!sidebarElement) {
                this.sidebarCollapsed = true;
            }
        }
    }

    isMobile(): boolean {
        return window.innerWidth <= 770;
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
        if (this.isMobile() && !this.sidebarCollapsed) {
            this.sidebarCollapsed = true;
        }
    }

    getUserRoleName(role: UserRole | undefined | null): string {
        if (!role) return 'Sin rol';

        const roles: { [key: string]: string } = {
            [UserRole.ADMIN]: 'Administrador',
            [UserRole.RADICADOR]: 'Radicador',
            [UserRole.SUPERVISOR]: 'Supervisor',
            [UserRole.AUDITOR_CUENTAS]: 'Auditor Cuentas',
            [UserRole.CONTABILIDAD]: 'Contabilidad',
            [UserRole.TESORERIA]: 'Tesorería',
            [UserRole.ASESOR_GERENCIA]: 'Asesor Gerencia',
            [UserRole.RENDICION_CUENTAS]: 'Rendición Cuentas'
        };
        return roles[role] || role;
    }

    getUserInitials(user: User): string {
        if (user.fullName) {
            const names = user.fullName.split(' ');
            if (names.length >= 2) {
                return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
            }
            return names[0].substring(0, 2).toUpperCase();
        }
        return user.username.substring(0, 2).toUpperCase();
    }

    // También actualiza getRoleColor para devolver solo el nombre de la clase:
    getRoleColor(role: UserRole): string {
        switch (role) {
            case UserRole.ADMIN:
                return 'bg-danger'; // Cambia a 'danger' para las clases CSS
            case UserRole.SUPERVISOR:
                return 'bg-warning'; // Cambia a 'warning'
            default:
                return 'bg-primary'; // Cambia a 'primary'
        }
    }

    createNewUser(): void {
        alert('Función para crear nuevo usuario');
    }

    viewUser(user: User): void {
        console.log('Ver usuario:', user);
        alert(`Viendo detalles de: ${user.fullName || user.username}`);
    }

    editUser(user: User): void {
        console.log('Editar usuario:', user);
        alert(`Editando usuario: ${user.fullName || user.username}`);
    }

    toggleUserStatus(user: User): void {
        if (confirm(`¿Está seguro de ${user.isActive ? 'desactivar' : 'activar'} al usuario ${user.username}?`)) {
            this.usersService.toggleUserStatus(user.id).subscribe({
                next: (response: any) => {
                    const updatedUser = response.data || response;
                    this.loadUsers();
                    alert(`Usuario ${updatedUser.isActive ? 'activado' : 'desactivado'} exitosamente`);
                },
                error: (error) => {
                    console.error('Error cambiando estado:', error);
                    alert('Error al cambiar estado del usuario');
                }
            });
        }
    }

    deleteUser(user: User): void {
        if (confirm(`¿Está seguro de eliminar al usuario ${user.username}? Esta acción no se puede deshacer.`)) {
            this.usersService.deleteUser(user.id).subscribe({
                next: () => {
                    this.loadUsers();
                    alert('Usuario eliminado exitosamente');
                },
                error: (error) => {
                    console.error('Error eliminando usuario:', error);
                    alert('Error al eliminar usuario');
                }
            });
        }
    }
}