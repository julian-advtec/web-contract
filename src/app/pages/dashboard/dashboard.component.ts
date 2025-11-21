import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { User, UserRole } from '../../core/models/user.types';

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

  currentUser: User | null = null;
  showLogoutConfirm = false;
  backgroundImage: string = '';
  availableModules: any[] = [];

  // ✅ Por defecto FALSE para que sidebar esté ABIERTO al inicio
  sidebarCollapsed = false;

  // ✅ Módulos basados en los roles de usuario
  allModules = [
    {
      id: 'admin',
      icon: '👑',
      title: 'Panel de Administración',
      route: '/admin',
      description: 'Gestión completa del sistema',
      roles: [UserRole.ADMIN]
    },
    {
      id: 'radicador',
      icon: '📥',
      title: 'Radicación',
      route: '/radicador',
      description: 'Radicación de documentos',
      roles: [UserRole.RADICADOR, UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    {
      id: 'supervisor',
      icon: '👀',
      title: 'Supervisión',
      route: '/supervisor',
      description: 'Supervisión de procesos',
      roles: [UserRole.SUPERVISOR, UserRole.ADMIN]
    },
    {
      id: 'auditor-cuentas',
      icon: '🔍',
      title: 'Auditoría de Cuentas',
      route: '/auditor-cuentas',
      description: 'Auditoría y revisión de cuentas',
      roles: [UserRole.AUDITOR_CUENTAS, UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    {
      id: 'contabilidad',
      icon: '💰',
      title: 'Contabilidad',
      route: '/contabilidad',
      description: 'Gestión contable y financiera',
      roles: [UserRole.CONTABILIDAD, UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    {
      id: 'tesoreria',
      icon: '🏦',
      title: 'Tesorería',
      route: '/tesoreria',
      description: 'Gestión de tesorería',
      roles: [UserRole.TESORERIA, UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    {
      id: 'asesor-gerencia',
      icon: '💼',
      title: 'Asesoría de Gerencia',
      route: '/asesor-gerencia',
      description: 'Asesoría y consultoría gerencial',
      roles: [UserRole.ASESOR_GERENCIA, UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    {
      id: 'rendicion-cuentas',
      icon: '📑',
      title: 'Rendición de Cuentas',
      route: '/rendicion-cuentas',
      description: 'Rendición y reporte de cuentas',
      roles: [UserRole.RENDICION_CUENTAS, UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    {
      id: 'reportes',
      icon: '📊',
      title: 'Reportes',
      route: '/reportes',
      description: 'Generación de reportes del sistema',
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AUDITOR_CUENTAS]
    },
    {
      id: 'gestion-usuarios',
      icon: '👥',
      title: 'Gestión de Usuarios',
      route: '/gestion-usuarios',
      description: 'Administración de usuarios y roles',
      roles: [UserRole.ADMIN]
    }
  ];

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
    this.setBackgroundByRole();
    this.setAvailableModules();

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
  }

  // ✅ Filtrar módulos disponibles según el rol usando el enum
  private setAvailableModules(): void {
    const userRole = this.currentUser?.role;
    this.availableModules = this.allModules.filter(module =>
      userRole ? module.roles.includes(userRole) : false
    );
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

  onLogout() {
    this.showLogoutConfirm = true;
  }

  confirmLogout() {
    this.auth.logout();
    this.showLogoutConfirm = false;
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
      // Verificar si el clic fue en el overlay (fuera del sidebar)
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