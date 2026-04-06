// src/app/pages/contratistas/contratistas.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';

import { User, UserRole, getUserRoleName, stringToUserRole } from '../../core/models/user.types';
import { AuthService } from '../../core/services/auth.service';
import { ContratistasService } from '../../core/services/contratistas.service';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
  selector: 'app-contratistas',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    SidebarComponent,
    NavbarComponent
  ],
  templateUrl: './contratistas.component.html',
  styleUrls: ['./contratistas.component.scss']
})
export class ContratistasComponent implements OnInit {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  availableModules: AppModule[] = [];
  puedeCrear = false;
  puedeVer = false;

  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private contratistaService: ContratistasService,
    private modulesService: ModulesService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('🚀 Inicializando componente de contratistas...');
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
      this.puedeVer = true;
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

          this.puedeCrear = this.userCanCreate(normalizedRole);
          this.puedeVer = true;

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
    // Método simplificado - asigna permisos basados en el rol
    if (this.currentUser) {
      this.puedeCrear = this.userCanCreate(this.currentUser.role);
      this.puedeVer = true;
    }
  }

  loadAvailableModules(): void {
    if (!this.currentUser) {
      this.availableModules = [];
      return;
    }

    const modulesToShow: AppModule[] = [];

    // Módulo Inicio (siempre visible)
    modulesToShow.push({
      id: 'dashboard',
      title: 'Inicio',
      description: 'Panel principal del sistema',
      path: '/dashboard',
      route: '/dashboard',
      icon: 'dashboard',
      requiredRole: UserRole.RADICADOR,
      isActive: true
    });

    // Módulo Contratistas
    modulesToShow.push({
      id: 'contratistas',
      title: 'Contratistas',
      description: 'Gestión de contratistas y proveedores',
      path: '/contratistas',
      route: '/contratistas',
      icon: 'contratistas',
      requiredRole: UserRole.RADICADOR,
      isActive: true
    });

    this.availableModules = modulesToShow;

    console.log('📦 [ContratistasComponent] Módulos para sidebar:',
      this.availableModules.map(m => `${m.id} → ${m.title}`));
  }

  getUserRoleName(): string {
    if (!this.currentUser) return 'Usuario';
    return getUserRoleName(this.currentUser.role);
  }

  userCanCreate(role: UserRole): boolean {
    return role === UserRole.RADICADOR || role === UserRole.ADMIN || role === UserRole.JURIDICA;
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