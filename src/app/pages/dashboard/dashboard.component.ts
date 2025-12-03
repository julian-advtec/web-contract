// src/app/pages/dashboard/dashboard.component.ts
import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { User, UserRole } from '../../core/models/user.types';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, NavbarComponent, SidebarComponent]
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private modulesService = inject(ModulesService);

  currentUser: User | null = null;
  showLogoutConfirm = false;
  backgroundImage: string = '';
  availableModules: AppModule[] = [];

  // ✅ Por defecto FALSE para que sidebar esté ABIERTO al inicio
  sidebarCollapsed = false;

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
    this.setBackgroundByRole();
    this.loadAvailableModules();

    // En desktop, por defecto abierto
    if (!this.isMobile()) {
      this.sidebarCollapsed = false;
    } else {
      this.sidebarCollapsed = true; // En móvil, por defecto colapsado
    }
  }

  // ✅ Establecer fondo según el rol usando el enum
  private setBackgroundByRole(): void {
    const role = this.currentUser?.role;

    switch (role) {
      case UserRole.ADMIN:
        this.backgroundImage = 'assets/images/admin.jpg';
        break;
      case UserRole.RADICADOR:
        this.backgroundImage = 'assets/images/radicador.jpg';
        break;
      case UserRole.SUPERVISOR:
        this.backgroundImage = 'assets/images/supervisor.jpg';
        break;
      case UserRole.AUDITOR_CUENTAS:
        this.backgroundImage = 'assets/images/auditor.jpg';
        break;
      case UserRole.CONTABILIDAD:
        this.backgroundImage = 'assets/images/contabilidad.jpg';
        break;
      case UserRole.TESORERIA:
        this.backgroundImage = 'assets/images/tesoreria.jpg';
        break;
      case UserRole.ASESOR_GERENCIA:
        this.backgroundImage = 'assets/images/asesor.jpg';
        break;
      case UserRole.RENDICION_CUENTAS:
        this.backgroundImage = 'assets/images/rendicion.jpg';
        break;
      default:
        this.backgroundImage = 'assets/images/default.jpg';
    }

    // Verificar si la imagen existe
    this.checkImageExists();
  }

  // Verificar si la imagen existe
  private checkImageExists(): void {
    const img = new Image();
    img.onload = () => {
      console.log(`✅ Imagen cargada: ${this.backgroundImage}`);
    };
    img.onerror = () => {
      console.warn(`⚠️ No se pudo cargar: ${this.backgroundImage}, usando imagen por defecto`);
      this.backgroundImage = 'assets/images/default.jpg';
    };
    img.src = this.backgroundImage;
  }

  // Cargar módulos disponibles desde el servicio
  private loadAvailableModules(): void {
    if (this.currentUser?.role) {
      this.availableModules = this.modulesService.getModulesForUser(this.currentUser.role);
    } else {
      this.availableModules = this.modulesService.getDefaultModules();
    }
    console.log('📋 Módulos disponibles:', this.availableModules);
  }

  // ✅ Obtener nombre del rol para mostrar
  getUserRoleName(role: UserRole | undefined | null): string {
    if (!role) return 'Usuario';

    const roles: { [key: string]: string } = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.RADICADOR]: 'Radicador',
      [UserRole.SUPERVISOR]: 'Supervisor',
      [UserRole.AUDITOR_CUENTAS]: 'Auditor de Cuentas',
      [UserRole.CONTABILIDAD]: 'Contabilidad',
      [UserRole.TESORERIA]: 'Tesorería',
      [UserRole.ASESOR_GERENCIA]: 'Asesor de Gerencia',
      [UserRole.RENDICION_CUENTAS]: 'Rendición de Cuentas'
    };
    return roles[role] || role;
  }

  // ✅ Clase CSS según rol
  getRoleClass(role: UserRole | null | undefined): string {
    if (!role) return 'default';
    
    switch (role) {
      case UserRole.ADMIN:
        return 'admin';
      case UserRole.SUPERVISOR:
        return 'supervisor';
      case UserRole.AUDITOR_CUENTAS:
        return 'auditor';
      case UserRole.CONTABILIDAD:
        return 'contabilidad';
      case UserRole.TESORERIA:
        return 'tesoreria';
      case UserRole.ASESOR_GERENCIA:
        return 'asesor';
      case UserRole.RENDICION_CUENTAS:
        return 'rendicion';
      default:
        return 'default';
    }
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

  onToggleSidebar(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
    console.log('🔄 Sidebar collapsed:', collapsed);
  }

  navigateToModule(route: string) {
    this.router.navigate([route]);
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
}