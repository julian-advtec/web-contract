// src/app/layout/navbar/navbar.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { User, UserRole } from '../../core/models/user.types';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
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

  isSupervisorPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    
    const isSupervisorRoutes = cleanUrl === '/supervisor' || 
                              cleanUrl === '/supervisor/pendientes' ||
                              cleanUrl === '/supervisor/historial' ||
                              cleanUrl === '/supervisor/estadisticas' ||
                              cleanUrl.startsWith('/supervisor/revisar/');
    
    return isSupervisorRoutes;
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
        title: 'Nueva Radicación', 
        subtitle: 'Radicación de documentos' 
      },
      '/radicacion/lista': { 
        title: 'Lista de Radicaciones', 
        subtitle: 'Radicación de documentos' 
      },
      '/radicacion/mis-radicaciones': { 
        title: 'Mis Radicaciones', 
        subtitle: 'Radicación de documentos' 
      },
      '/radicacion/rechazados': { 
        title: 'Documentos Rechazados', 
        subtitle: 'Radicación de documentos' 
      },
      // =========== SUPERVISOR ===========
      '/supervisor': { 
        title: 'Supervisión', 
        subtitle: 'Revisión y aprobación de documentos' 
      },
      '/supervisor/pendientes': { 
        title: 'Pendientes de Supervisión', 
        subtitle: 'Documentos pendientes de revisión' 
      },
      '/supervisor/historial': { 
        title: 'Historial de Supervisión', 
        subtitle: 'Historial de supervisiones realizadas' 
      },
      '/supervisor/estadisticas': { 
        title: 'Estadísticas de Supervisión', 
        subtitle: 'Estadísticas de actividad' 
      },
      // =================================
      '/reportes': { 
        title: 'Reportes', 
        subtitle: 'Reportes y estadísticas del sistema' 
      },
      '/auditoria': { 
        title: 'Auditoría de Cuentas', 
        subtitle: 'Auditoría de documentos contables' 
      },
      '/contabilidad': { 
        title: 'Contabilidad', 
        subtitle: 'Gestión contable' 
      },
      '/tesoreria': { 
        title: 'Tesorería', 
        subtitle: 'Gestión de tesorería' 
      },
      '/asesor-gerencia': { 
        title: 'Asesoría de Gerencia', 
        subtitle: 'Revisión gerencial de documentos' 
      },
      '/rendicion-cuentas': { 
        title: 'Rendición de Cuentas', 
        subtitle: 'Proceso de rendición de cuentas' 
      },
      '/configuracion': { 
        title: 'Configuración', 
        subtitle: 'Configuración del sistema' 
      }
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
    
    if (cleanUrl.startsWith('/supervisor/revisar/')) {
      this.currentPageTitle = 'Revisar Documento';
      this.currentPageSubtitle = 'Supervisión de documento';
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
      } else if (cleanUrl.startsWith('/supervisor')) {
        this.currentPageTitle = 'Supervisión';
        this.currentPageSubtitle = 'Revisión y aprobación de documentos';
      } else if (cleanUrl.startsWith('/auditoria')) {
        this.currentPageTitle = 'Auditoría de Cuentas';
        this.currentPageSubtitle = 'Auditoría de documentos contables';
      } else if (cleanUrl.startsWith('/contabilidad')) {
        this.currentPageTitle = 'Contabilidad';
        this.currentPageSubtitle = 'Gestión contable';
      } else if (cleanUrl.startsWith('/tesoreria')) {
        this.currentPageTitle = 'Tesorería';
        this.currentPageSubtitle = 'Gestión de tesorería';
      } else if (cleanUrl.startsWith('/asesor-gerencia')) {
        this.currentPageTitle = 'Asesoría de Gerencia';
        this.currentPageSubtitle = 'Revisión gerencial de documentos';
      } else if (cleanUrl.startsWith('/rendicion-cuentas')) {
        this.currentPageTitle = 'Rendición de Cuentas';
        this.currentPageSubtitle = 'Proceso de rendición de cuentas';
      } else if (cleanUrl.startsWith('/reportes')) {
        this.currentPageTitle = 'Reportes';
        this.currentPageSubtitle = 'Reportes y estadísticas del sistema';
      } else if (cleanUrl.startsWith('/configuracion')) {
        this.currentPageTitle = 'Configuración';
        this.currentPageSubtitle = 'Configuración del sistema';
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