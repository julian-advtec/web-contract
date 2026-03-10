import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';

import { User, UserRole, getUserRoleName, stringToUserRole } from '../../core/models/user.types';
import { AuthService } from '../../core/services/auth.service';
import { JuridicaService } from '../../core/services/juridica.service';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
  selector: 'app-juridica',
  standalone: true, // ✅ ESTO ESTÁ BIEN - MANTENERLO
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    SidebarComponent,
    NavbarComponent
  ],
  templateUrl: './juridica.component.html',
  styleUrls: ['./juridica.component.scss']
})
export class JuridicaComponent implements OnInit {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  availableModules: AppModule[] = [];
  puedeCrear = false;
  puedeVer = false;

  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private juridicaService: JuridicaService,
    private modulesService: ModulesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🚀 Inicializando componente de jurídica...');
    this.verificarAutenticacion();
    this.loadCurrentUser();
    this.verificarPermisos();
    this.loadAvailableModules();
  }

  verificarAutenticacion(): void {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      console.log('🔐 No hay token, redirigiendo al login');
      this.router.navigate(['/auth/login']);
      return;
    }

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.log('👤 No hay usuario, redirigiendo al login');
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      this.router.navigate(['/auth/login']);
      return;
    }
  }

  loadCurrentUser(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser = user;
      this.puedeCrear = this.userCanCreate(user.role);
    } else {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          let normalizedRole: UserRole = UserRole.JURIDICA;

          if (parsedUser.role) {
            normalizedRole = stringToUserRole(parsedUser.role);
          }

          this.currentUser = {
            ...parsedUser,
            role: normalizedRole
          };

          this.puedeCrear = this.userCanCreate(normalizedRole);

        } catch (error) {
          console.error('❌ Error parseando usuario:', error);
          this.router.navigate(['/auth/login']);
        }
      } else {
        this.router.navigate(['/auth/login']);
      }
    }
  }

  verificarPermisos(): void {
    this.juridicaService.verificarPermisosUsuario().subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.puedeCrear = response.data.puedeCrear;
          this.puedeVer = response.data.puedeVer;

          if (!this.puedeVer) {
            this.errorMessage = 'No tienes permisos para acceder al módulo jurídico';
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 3000);
          }
        }
      },
      error: () => {
        if (this.currentUser) {
          this.puedeCrear = this.userCanCreate(this.currentUser.role);
          this.puedeVer = this.puedeCrear;
        }
      }
    });
  }

  loadAvailableModules(): void {
    if (!this.currentUser) {
      this.availableModules = [];
      return;
    }

    this.availableModules = [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Panel principal del sistema',
        path: '/dashboard',
        route: '/dashboard',
        icon: 'dashboard',
        requiredRole: UserRole.JURIDICA,
        isActive: true
      },
      {
        id: 'lista-contratos',
        title: 'Lista de Contratos',
        description: 'Ver todos los contratos',
        path: '/juridica/list',
        route: '/juridica/list',
        icon: 'lista-radicacion',
        requiredRole: UserRole.JURIDICA,
        isActive: true
      },
      {
        id: 'nuevo-contrato',
        title: 'Nuevo Contrato',
        description: 'Crear nuevo contrato',
        path: '/juridica/crear',
        route: '/juridica/crear',
        icon: 'lista-radicacion',
        requiredRole: UserRole.JURIDICA,
        isActive: true
      },
      {
        id: 'estadisticas',
        title: 'Estadísticas',
        description: 'Ver estadísticas de contratos',
        path: '/juridica/stats',
        route: '/juridica/stats',
        icon: 'chart-bar',
        requiredRole: UserRole.JURIDICA,
        isActive: true
      }
    ];

    console.log('📋 Módulos disponibles para jurídica:', this.availableModules);
  }

  getUserRoleName(): string {
    if (!this.currentUser) return 'Usuario';
    return getUserRoleName(this.currentUser.role);
  }

  userCanCreate(role: UserRole): boolean {
    return role === UserRole.JURIDICA || role === UserRole.ADMIN;
  }

  esAdmin(): boolean {
    return this.currentUser?.role === UserRole.ADMIN;
  }

  onToggleSidebar(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }
}