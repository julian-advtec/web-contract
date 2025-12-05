// src/app/pages/users-management/users-management.component.ts
import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { UsersService, ApiResponse } from '../../core/services/users.service';
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

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
    this.loadAvailableModules();

    this.sidebarCollapsed = this.isMobile();

    this.loadUsers();
    this.setNavbarTitle();
  }

  private setNavbarTitle() {
    sessionStorage.setItem('currentPageTitle', 'Gestión de Usuarios');
    sessionStorage.setItem('currentPageSubtitle', 'Administración de usuarios del sistema');
  }

  private loadAvailableModules(): void {
    if (this.currentUser?.role) {
      this.availableModules = this.modulesService.getModulesForUser(this.currentUser.role);
    } else {
      this.availableModules = this.modulesService.getDefaultModules();
    }
  }

  // =============================
  // CARGA DE USUARIOS
  // =============================
  loadUsers(): void {
    this.isLoading = true;

    this.usersService.getUsers().subscribe({
      next: (response: ApiResponse<User[]>) => {
        if (response && response.data) {
          this.users = response.data;
        } else {
          this.users = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando usuarios:', error);
        this.isLoading = false;

        if (error.status === 401) {
          this.router.navigate(['/auth/login']);
        } else if (error.status === 403) {
          alert('No tienes permisos para ver los usuarios.');
        } else if (error.status === 404) {
          this.loadUsersAlternative();
        }
      }
    });
  }

  private loadUsersAlternative(): void {
    this.isLoading = true;

    this.usersService.getUsers().subscribe({
      next: (response: any) => {
        if (Array.isArray(response)) {
          this.users = response;
        } else if (response?.data && Array.isArray(response.data)) {
          this.users = response.data;
        } else if (response?.users && Array.isArray(response.users)) {
          this.users = response.users;
        } else {
          this.users = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error en método alternativo:', error);
        this.isLoading = false;
      }
    });
  }

  // =============================
  // PAGINACIÓN
  // =============================
  get paginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, endIndex);
  }

  get filteredUsers(): User[] {
    if (!this.searchTerm) return this.users;

    const search = this.searchTerm.toLowerCase();
    return this.users.filter(user =>
      user.fullName?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      this.getUserRoleName(user.role).toLowerCase().includes(search)
    );
  }

  get totalItems(): number {
    return this.filteredUsers.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pages(): number[] {
    const pages = [];
    const maxVisiblePages = 5;

    let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(this.totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
  }

  // =============================
  // SIDEBAR Y LOGOUT
  // =============================
  onToggleSidebar(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
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

  @HostListener('window:resize')
  onResize() {
    if (this.isMobile()) {
      this.sidebarCollapsed = true;
    }
  }

  // =============================
  // ROLES Y COLORES
  // =============================
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

  getRoleColor(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-danger';
      case UserRole.SUPERVISOR:
        return 'bg-warning';
      default:
        return 'bg-primary';
    }
  }

  // =============================
  // ACCIONES CRUD
  // =============================
  createNewUser(): void {
    alert('Función para crear nuevo usuario');
  }

  viewUser(user: User): void {
    alert(`Viendo detalles de: ${user.fullName || user.username}`);
  }

  editUser(user: User): void {
    alert(`Editando usuario: ${user.fullName || user.username}`);
  }

  toggleUserStatus(user: User): void {
    if (confirm(`¿Está seguro de ${user.isActive ? 'desactivar' : 'activar'} al usuario ${user.username}?`)) {
      this.usersService.toggleUserStatus(user.id).subscribe({
        next: () => {
          this.loadUsers();
          alert(`Usuario actualizado correctamente`);
        },
        error: () => {
          alert('Error al cambiar estado del usuario');
        }
      });
    }
  }

  deleteUser(user: User): void {
    if (confirm(`¿Está seguro de eliminar al usuario ${user.username}?`)) {
      this.usersService.deleteUser(user.id).subscribe({
        next: () => {
          this.loadUsers();
          alert('Usuario eliminado exitosamente');
        },
        error: () => {
          alert('Error al eliminar usuario');
        }
      });
    }
  }
}
