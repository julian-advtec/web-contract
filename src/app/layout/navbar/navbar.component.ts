import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { User, UserRole } from '../../core/models/user.types';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class NavbarComponent implements OnInit {
  @Input() currentUser: User | null = null;
  @Input() sidebarCollapsed: boolean = false;
  @Output() logout = new EventEmitter<void>();
  @Output() toggleSidebar = new EventEmitter<boolean>();

  currentPageTitle: string = 'Dashboard';
  currentPageSubtitle: string = 'Panel principal';
  currentUrl: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    // Inicializar con la ruta actual
    this.updateTitle();
    
    // Escuchar cambios de ruta
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateTitle();
      }
    });
  }

  isDashboardPage(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/dashboard' || url === '/' || url === '';
  }

  isUserManagementPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    
    const isExactRoute = cleanUrl === '/gestion-usuarios' || 
                         cleanUrl === '/gestion-usuarios/nuevo';
    
    const isEditRoute = cleanUrl.startsWith('/gestion-usuarios/editar/');
    
    return isExactRoute || isEditRoute;
  }

  isRadicacionPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    
    const isExactRoute = cleanUrl === '/radicacion';
    const isNewRoute = cleanUrl === '/radicacion/nuevo';
    const isEditRoute = cleanUrl.startsWith('/radicacion/editar/');
    
    return isExactRoute || isNewRoute || isEditRoute;
  }

  private updateTitle() {
    this.currentUrl = this.router.url.split('?')[0];
    const cleanUrl = this.currentUrl;
    
    if (this.isDashboardPage()) {
      this.currentPageTitle = 'Dashboard';
      this.currentPageSubtitle = 'Panel principal';
      return;
    }
    
    const titleMap: Record<string, { title: string, subtitle?: string }> = {
      '/gestion-usuarios': { 
        title: 'Gestión de Usuarios', 
        subtitle: 'Administración de usuarios' 
      },
      '/gestion-usuarios/nuevo': { 
        title: 'Nuevo Usuario', 
        subtitle: 'Administración de usuarios' 
      },
      '/radicacion': { 
        title: 'Radicación', 
        subtitle: 'Radicación de documentos' 
      },
      '/radicacion/nuevo': { 
        title: 'Nuevo Radicado', 
        subtitle: 'Radicación de documentos' 
      },
    };
    
    if (titleMap[cleanUrl]) {
      this.currentPageTitle = titleMap[cleanUrl].title;
      this.currentPageSubtitle = titleMap[cleanUrl].subtitle || '';
      return;
    }
    
    if (cleanUrl.startsWith('/gestion-usuarios/editar/')) {
      this.currentPageTitle = 'Editar Usuario';
      this.currentPageSubtitle = 'Administración de usuarios';
      return;
    }
    
    if (cleanUrl.startsWith('/radicacion/editar/')) {
      this.currentPageTitle = 'Editar Radicado';
      this.currentPageSubtitle = 'Radicación de documentos';
      return;
    }
    
    const segments = cleanUrl.split('/').filter(seg => seg.trim() !== '');
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      
      if (cleanUrl.startsWith('/gestion-usuarios')) {
        this.currentPageTitle = 'Gestión de Usuarios';
        this.currentPageSubtitle = 'Administración de usuarios';
      } else if (cleanUrl.startsWith('/radicacion')) {
        this.currentPageTitle = 'Radicación';
        this.currentPageSubtitle = 'Radicación de documentos';
      } else {
        this.currentPageTitle = this.formatToTitle(lastSegment);
        this.currentPageSubtitle = '';
      }
    } else {
      this.currentPageTitle = 'Dashboard';
      this.currentPageSubtitle = 'Panel principal';
    }
  }

  private formatToTitle(text: string): string {
    return text
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => 
        word.charAt(0).toUpperCase() + 
        word.slice(1).toLowerCase()
      )
      .join(' ');
  }

  getUserRoleName(role: UserRole | undefined | null): string {
    if (!role) return 'Usuario';

    const roles: Record<UserRole, string> = {
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
}