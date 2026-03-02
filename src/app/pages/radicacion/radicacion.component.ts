// src/app/pages/radicacion/radicacion.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';

// Importar componentes de layout
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';

// Importar tipos y servicios
import { User, UserRole, getUserRoleName, stringToUserRole } from '../../core/models/user.types';
import { AuthService } from '../../core/services/auth.service';
import { RadicacionService } from '../../core/services/radicacion.service';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
  selector: 'app-radicacion',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    SidebarComponent,
    NavbarComponent
  ],
  templateUrl: './radicacion.component.html',
  styleUrls: ['./radicacion.component.scss']
})
export class RadicacionComponent implements OnInit {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  availableModules: AppModule[] = [];
  puedeRadicar = false;
  puedeVer = false;

  // Propiedades para mensajes
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private radicacionService: RadicacionService,
    private modulesService: ModulesService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Inicializando componente de radicación...');
    this.verificarAutenticacion();
    this.loadCurrentUser();
    this.verificarPermisos();
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
      this.puedeRadicar = this.userCanRadicar(user.role);
    } else {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          let normalizedRole: UserRole = UserRole.RADICADOR;

          if (parsedUser.role) {
            normalizedRole = stringToUserRole(parsedUser.role);
          }

          this.currentUser = {
            ...parsedUser,
            role: normalizedRole
          };

          this.puedeRadicar = this.userCanRadicar(normalizedRole);

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
    this.radicacionService.verificarPermisosUsuario().subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          const permisos = response.data;
          this.puedeRadicar = permisos.puedeRadicar;
          this.puedeVer = permisos.puedeVer;

          this.loadAvailableModules();

          if (!this.puedeVer) {
            this.errorMessage = 'No tienes permisos para acceder a la radicación';
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 3000);
          }
        } else {
          if (this.currentUser) {
            this.puedeRadicar = this.userCanRadicar(this.currentUser.role);
            this.puedeVer = this.puedeRadicar;
            this.loadAvailableModules();
          }
        }
      },
      error: (error) => {
        console.error('❌ Error verificando permisos:', error);
        if (this.currentUser) {
          this.puedeRadicar = this.userCanRadicar(this.currentUser.role);
          this.puedeVer = this.puedeRadicar;
          this.loadAvailableModules();
        }
      }
    });
  }

  // En RadicacionComponent, actualiza loadAvailableModules():
  loadAvailableModules(): void {
    if (!this.currentUser) {
      this.availableModules = [];
      return;
    }

    // SOLUCIÓN TEMPORAL: Crear manualmente los módulos
    this.availableModules = [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Panel principal del sistema',
        path: '/dashboard',
        route: '/dashboard',
        icon: 'dashboard',
        requiredRole: UserRole.RADICADOR,
        isActive: true
      },
      {
        id: 'nuevo-radicado',
        title: 'Nuevo Radicado',
        description: 'Crear nuevo radicado',
        path: '/radicacion/nuevo',
        route: '/radicacion/nuevo',
        icon: 'lista-radicacion',
        requiredRole: UserRole.RADICADOR,
        isActive: true
      },
      {
        id: 'lista-radicacion',
        title: 'Lista General',
        description: 'Ver todos los documentos radicados',
        path: '/radicacion/lista',
        route: '/radicacion/lista',
        icon: 'lista-radicacion',
        requiredRole: UserRole.RADICADOR,
        isActive: true
      },
      {
        id: 'mis-radicaciones',
        title: 'Mis Radicaciones',
        description: 'Ver mis documentos radicados',
        path: '/radicacion/mis-radicaciones',
        route: '/radicacion/mis-radicaciones',
        icon: 'mis-radicaciones',
        requiredRole: UserRole.RADICADOR,
        isActive: true
      },
      {
        id: 'rechazados',
        title: 'Documentos Rechazados',
        description: 'Ver documentos con estado rechazado',
        path: '/radicacion/rechazados', // <-- CORRECTO
        route: '/radicacion/rechazados',
        icon: 'rechazados',
        requiredRole: UserRole.RADICADOR,
        isActive: true
      },
      {
        id: 'mis-estadisticas',
        title: 'Mis Estadísticas',
        description: 'Ver mis estadísticas de radicación',
        path: '/radicacion/mis-estadisticas',
        route: '/radicacion/mis-estadisticas',
        icon: 'chart-bar',           // o el icono que prefieras (fas fa-chart-bar)
        requiredRole: UserRole.RADICADOR,
        isActive: true
      },

    ];

    console.log('📋 Módulos disponibles (manual):', this.availableModules);
  }

  getUserRoleName(): string {
    if (!this.currentUser) {
      return 'Usuario';
    }
    return getUserRoleName(this.currentUser.role);
  }

  userCanRadicar(role: UserRole): boolean {
    return role === UserRole.RADICADOR || role === UserRole.ADMIN;
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