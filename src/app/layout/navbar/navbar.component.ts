// navbar.component.ts
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
        console.log('🔄 Cambio de ruta detectado:', event.url);
        this.updateTitle();
      }
    });
  }

  isDashboardPage(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/dashboard' || url === '/' || url === '';
  }

  private updateTitle() {
    this.currentUrl = this.router.url;
    const cleanUrl = this.currentUrl.split('?')[0];
    
    // Solo actualizar si NO es el dashboard
    if (this.isDashboardPage()) {
      this.currentPageTitle = 'Dashboard';
      this.currentPageSubtitle = 'Panel principal';
      return;
    }
    
    // Mapeo de rutas a títulos (para páginas que no sean dashboard)
    const titleMap: Record<string, { title: string, subtitle?: string }> = {
      '/users-management': { title: 'Gestión de Usuarios', subtitle: 'Administración de usuarios' },
      '/user-management': { title: 'Gestión de Usuarios', subtitle: 'Administración de usuarios' },
      '/usuarios': { title: 'Gestión de Usuarios', subtitle: 'Administración de usuarios' },
      '/gestion-usuarios': { title: 'Gestión de Usuarios', subtitle: 'Administración de usuarios' },
      '/gestion-usuarios/': { title: 'Gestión de Usuarios', subtitle: 'Administración de usuarios' },
      '/document-management': { title: 'Gestión Documental', subtitle: 'Administración de documentos' },
      '/radicacion': { title: 'Radicación', subtitle: 'Radicación de documentos' },
      '/seguimiento': { title: 'Seguimiento', subtitle: 'Seguimiento de documentos' },
      '/reportes': { title: 'Reportes', subtitle: 'Reportes y estadísticas' },
      '/configuracion': { title: 'Configuración', subtitle: 'Configuración del sistema' },
      '/perfil': { title: 'Mi Perfil', subtitle: 'Administrar mi cuenta' },
    };
    
    // DEBUG: Para ver qué está pasando
    console.log('🔍 URL actual:', cleanUrl);
    console.log('📋 Buscando en mapeo:', Object.keys(titleMap));
    
    // Buscar coincidencia exacta
    if (titleMap[cleanUrl]) {
      this.currentPageTitle = titleMap[cleanUrl].title;
      this.currentPageSubtitle = titleMap[cleanUrl].subtitle || '';
      console.log('✅ Título encontrado:', this.currentPageTitle);
      return;
    }
    
    // Buscar coincidencia parcial (sin importar / al final)
    for (const [route, info] of Object.entries(titleMap)) {
      const normalizedRoute = route.replace(/\/$/, ''); // Quitar / final
      const normalizedUrl = cleanUrl.replace(/\/$/, ''); // Quitar / final
      
      if (normalizedUrl === normalizedRoute) {
        this.currentPageTitle = info.title;
        this.currentPageSubtitle = info.subtitle || '';
        console.log('✅ Coincidencia parcial:', this.currentPageTitle);
        return;
      }
    }
    
    // Si no encuentra coincidencia, usar la última parte de la URL formateada
    const segments = cleanUrl.split('/').filter(seg => seg.trim() !== '');
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      this.currentPageTitle = this.formatToTitle(lastSegment);
      this.currentPageSubtitle = '';
      console.log('⚠️ Usando título formateado:', this.currentPageTitle);
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

  // Método para obtener el nombre del rol
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