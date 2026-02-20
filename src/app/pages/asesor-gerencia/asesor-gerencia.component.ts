// src/app/modules/asesor-gerencia/asesor-gerencia.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { User, UserRole } from '../../core/models/user.types';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
  selector: 'app-asesor-gerencia',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    SidebarComponent,
    NavbarComponent
  ],
  templateUrl: './asesor-gerencia.component.html',
  styleUrls: ['./asesor-gerencia.component.scss']
})
export class AsesorGerenciaComponent implements OnInit {
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
            role: UserRole.ASESOR_GERENCIA
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
        requiredRole: UserRole.ASESOR_GERENCIA,
        isActive: true
      },
      {
        id: 'pendientes',
        title: 'Pendientes',
        description: 'Documentos pendientes para revisión gerencial',
        path: '/asesor-gerencia/pendientes',
        route: '/asesor-gerencia/pendientes',
        icon: 'pending_actions',
        requiredRole: UserRole.ASESOR_GERENCIA,
        isActive: true
      },
      {
        id: 'historial',
        title: 'Mi historial',
        description: 'Historial de procesos gerenciales',
        path: '/asesor-gerencia/historial',
        route: '/asesor-gerencia/historial',
        icon: 'history',
        requiredRole: UserRole.ASESOR_GERENCIA,
        isActive: true
      },
      {
        id: 'lista-completa',
        title: 'Lista Completa',
        description: 'Todos los documentos en etapa gerencial',
        path: '/asesor-gerencia/lista',
        route: '/asesor-gerencia/lista',
        icon: 'list_alt',
        requiredRole: UserRole.ASESOR_GERENCIA,
        isActive: true
      },
      {
        id: 'rechazados',
        title: 'Rechazados',
        description: 'Documentos rechazados por niveles superiores',
        path: '/asesor-gerencia/rechazados',
        route: '/asesor-gerencia/rechazados',
        icon: 'cancel',
        requiredRole: UserRole.ASESOR_GERENCIA,
        isActive: true
      },
      {
        id: 'estadisticas',
        title: 'Mis Estadísticas',
        description: 'Estadísticas y métricas de mi desempeño',
        path: '/asesor-gerencia/estadisticas',
        route: '/asesor-gerencia/estadisticas',
        icon: 'bar_chart',
        requiredRole: UserRole.ASESOR_GERENCIA,
        isActive: true
      }
    ];

    console.log('Módulos locales Asesor Gerencia:', this.availableModules);
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