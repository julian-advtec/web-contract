// users-management.component.ts
import { Component, inject, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { UsersService, ApiResponse } from '../../core/services/users.service';
import { User, UserRole } from '../../core/models/user.types';
import { ModulesService, AppModule } from '../../core/services/modules.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-users-management',
  templateUrl: './users-management.component.html',
  styleUrls: ['./users-management.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NavbarComponent,
    SidebarComponent
  ]
})
export class UsersManagementComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private modulesService = inject(ModulesService);
  private usersService = inject(UsersService);
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

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

  // Añadir esta propiedad para pasar al sidebar
  getUserRoleName = this.getUserRoleDisplayName.bind(this);

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    this.currentUser = this.auth.getCurrentUser();
    this.loadAvailableModules();
    this.sidebarCollapsed = this.isMobile();
    this.loadUsers();
    this.setNavbarTitle();
  }

  private setNavbarTitle(): void {
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

    this.usersService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
            this.notificationService.error('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
            this.router.navigate(['/auth/login']);
          } else if (error.status === 403) {
            this.notificationService.error('No tienes permisos para ver los usuarios.');
          } else if (error.status === 404) {
            this.loadUsersAlternative();
          } else {
            this.notificationService.error('Error al cargar usuarios. Intente nuevamente.');
          }
        }
      });
  }

  private loadUsersAlternative(): void {
    this.isLoading = true;

    this.usersService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
          this.notificationService.error('Error al cargar usuarios.');
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

    const search = this.searchTerm.toLowerCase().trim();
    return this.users.filter(user =>
      user.fullName?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      this.getUserRoleDisplayName(user.role).toLowerCase().includes(search)
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
  onToggleSidebar(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  onLogout(): void {
    this.notificationService.confirm(
      'Confirmar Cierre de Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      () => {
        this.auth.logout();
        this.notificationService.success('Sesión cerrada correctamente');
      }
    );
  }

  closeSidebarOnOverlay(event: MouseEvent): void {
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
  onResize(): void {
    if (this.isMobile()) {
      this.sidebarCollapsed = true;
    }
  }

  // =============================
  // ROLES Y COLORES
  // =============================
  getUserRoleDisplayName(role: UserRole | undefined | null): string {
    if (!role) return 'Sin rol';

    const roleNames: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.RADICADOR]: 'Radicador',
      [UserRole.SUPERVISOR]: 'Supervisor',
      [UserRole.AUDITOR_CUENTAS]: 'Auditor de Cuentas',
      [UserRole.CONTABILIDAD]: 'Contabilidad',
      [UserRole.TESORERIA]: 'Tesorería',
      [UserRole.ASESOR_GERENCIA]: 'Asesor de Gerencia',
      [UserRole.RENDICION_CUENTAS]: 'Rendición de Cuentas'
    };
    
    return roleNames[role] || role;
  }

  getRoleColor(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-danger';
      case UserRole.SUPERVISOR:
        return 'bg-warning';
      case UserRole.RADICADOR:
        return 'bg-info';
      default:
        return 'bg-primary';
    }
  }

  // =============================
  // NAVEGACIÓN AL FORMULARIO - CORREGIDO
  // =============================
  createNewUser(): void {
    console.log('Navegando a nuevo usuario...');
    // Ruta absoluta
    this.router.navigate(['/gestion-usuarios/nuevo']);
  }

  editUser(user: User): void {
    console.log('Navegando a editar usuario:', user.id);
    // Ruta absoluta
    this.router.navigate(['/gestion-usuarios/editar', user.id]);
  }

  // =============================
  // ACCIONES CRUD
  // =============================
  viewUser(user: User): void {
    this.notificationService.info(`Viendo detalles de: ${user.fullName || user.username}`);
  }

  toggleUserStatus(user: User): void {
    const action = user.isActive ? 'desactivar' : 'activar';
    const userName = user.fullName || user.username;
    
    this.notificationService.confirm(
      `${user.isActive ? 'Desactivar' : 'Activar'} Usuario`,
      `¿Está seguro de ${action} al usuario "${userName}"?`,
      () => {
        this.usersService.toggleUserStatus(user.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadUsers();
              this.notificationService.success(
                `Usuario ${user.isActive ? 'desactivado' : 'activado'} correctamente`
              );
            },
            error: (error) => {
              this.notificationService.error('Error al cambiar estado del usuario');
            }
          });
      }
    );
  }

  deleteUser(user: User): void {
    const userName = user.fullName || user.username;
    
    this.notificationService.confirm(
      'Eliminar Usuario',
      `¿Está seguro de eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`,
      () => {
        this.usersService.deleteUser(user.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadUsers();
              this.notificationService.success('Usuario eliminado exitosamente');
            },
            error: (error) => {
              if (error.status === 404) {
                this.notificationService.error(`El usuario "${userName}" no existe`);
              } else if (error.status === 403) {
                this.notificationService.error('No tiene permisos para eliminar usuarios');
              } else {
                this.notificationService.error('Error al eliminar usuario');
              }
            }
          });
      }
    );
  }
}