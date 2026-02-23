// src/app/pages/rendicion-cuentas/rendicion-cuentas.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarComponent } from '../../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { User, UserRole } from '../../../core/models/user.types';
import { ModulesService, AppModule } from '../../../core/services/modules.service';

@Component({
  selector: 'app-rendicion-cuentas',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    SidebarComponent,
    NavbarComponent
  ],
  templateUrl: './rendicion-cuentas.component.html',
  styleUrls: ['./rendicion-cuentas.component.scss']
})
export class RendicionCuentasComponent implements OnInit {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  availableModules: AppModule[] = [];

  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private modulesService: ModulesService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadAvailableModules();
  }

  loadCurrentUser(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser = user;
    } else {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          this.currentUser = {
            ...parsedUser,
            role: UserRole.RENDICION_CUENTAS
          };
        } catch {
          this.router.navigate(['/auth/login']);
        }
      } else {
        this.router.navigate(['/auth/login']);
      }
    }
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
        requiredRole: UserRole.RENDICION_CUENTAS,
        isActive: true
      },
      {
        id: 'pendientes',
        title: 'Pendientes',
        description: 'Documentos pendientes para rendición de cuentas',
        path: '/rendicion-cuentas/pendientes',
        route: '/rendicion-cuentas/pendientes',
        icon: 'pending_actions',
        requiredRole: UserRole.RENDICION_CUENTAS,
        isActive: true
      },
      {
        id: 'historial',
        title: 'Mi historial',
        description: 'Historial de procesos de rendición',
        path: '/rendicion-cuentas/historial',
        route: '/rendicion-cuentas/historial',
        icon: 'history',
        requiredRole: UserRole.RENDICION_CUENTAS,
        isActive: true
      },
      {
        id: 'lista-completa',
        title: 'Lista Completa',
        description: 'Todos los documentos en etapa de rendición',
        path: '/rendicion-cuentas/lista',
        route: '/rendicion-cuentas/lista',
        icon: 'list_alt',
        requiredRole: UserRole.RENDICION_CUENTAS,
        isActive: true
      },
      {
        id: 'rechazados',
        title: 'Rechazados',
        description: 'Documentos rechazados',
        path: '/rendicion-cuentas/rechazados',
        route: '/rendicion-cuentas/rechazados',
        icon: 'cancel',
        requiredRole: UserRole.RENDICION_CUENTAS,
        isActive: true
      },
      {
        id: 'estadisticas',
        title: 'Mis Estadísticas',
        description: 'Estadísticas y métricas de mi desempeño',
        path: '/rendicion-cuentas/estadisticas',
        route: '/rendicion-cuentas/estadisticas',
        icon: 'bar_chart',
        requiredRole: UserRole.RENDICION_CUENTAS,
        isActive: true
      }
    ];

    console.log('Módulos locales Rendición de Cuentas:', this.availableModules);
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