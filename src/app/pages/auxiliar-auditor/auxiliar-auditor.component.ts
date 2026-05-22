// src/app/pages/auxiliar-auditor/auxiliar-auditor.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ModulesService, AppModule } from '../../core/services/modules.service';
import { User, UserRole, getUserRoleName, stringToUserRole } from '../../core/models/user.types';

// NOTA: Este componente NO es standalone, se declara en el módulo
@Component({
  selector: 'app-auxiliar-auditor',
  templateUrl: './auxiliar-auditor.component.html',
  styleUrls: ['./auxiliar-auditor.component.scss']
})
export class AuxiliarAuditorComponent implements OnInit {
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
    console.log('🚀 Inicializando componente de Auxiliar Auditor...');
    this.verificarAutenticacion();
    this.loadCurrentUser();
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
    } else {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          let normalizedRole: UserRole = UserRole.AUXILIAR_AUDITOR;

          if (parsedUser.role) {
            normalizedRole = stringToUserRole(parsedUser.role);
          }

          this.currentUser = {
            ...parsedUser,
            role: normalizedRole
          };
        } catch (error) {
          console.error('❌ Error parseando usuario:', error);
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

    this.availableModules = this.modulesService.getModulesForUser(this.currentUser.role);
  }

  getUserRoleName(): string {
    if (!this.currentUser) {
      return 'Usuario';
    }
    return getUserRoleName(this.currentUser.role);
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