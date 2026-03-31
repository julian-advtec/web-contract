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

  currentPageTitle: string = 'Inicio'; // ✅ Cambiado de Dashboard a Inicio
  currentPageSubtitle: string = 'Panel principal';
  currentUrl: string = '';

  constructor(private router: Router) { }

  ngOnInit() {
    this.updateTitle();

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
    return cleanUrl === '/gestion-usuarios' ||
      cleanUrl === '/gestion-usuarios/nuevo' ||
      cleanUrl.startsWith('/gestion-usuarios/editar/');
  }

  isRadicacionPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/radicacion' ||
      cleanUrl === '/radicacion/nuevo' ||
      cleanUrl.startsWith('/radicacion/editar/');
  }

  isSupervisorPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/supervisor' ||
      cleanUrl === '/supervisor/pendientes' ||
      cleanUrl === '/supervisor/historial' ||
      cleanUrl === '/supervisor/estadisticas' ||
      cleanUrl.startsWith('/supervisor/revisar/');
  }

  isAuditorPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/auditor' ||
      cleanUrl === '/auditor/disponibles' ||
      cleanUrl === '/auditor/en-revision' ||
      cleanUrl === '/auditor/historial' ||
      cleanUrl === '/auditor/estadisticas' ||
      cleanUrl.startsWith('/auditor/revisar/') ||
      cleanUrl.startsWith('/auditor/documentos/');
  }

  isContabilidadPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/contabilidad' ||
      cleanUrl === '/contabilidad/pendientes' ||
      cleanUrl.startsWith('/contabilidad/procesar/');
  }

  isContratistasPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/contratistas' ||
      cleanUrl === '/contratistas/list' ||
      cleanUrl === '/contratistas/crear' ||
      cleanUrl.startsWith('/contratistas/editar/') ||
      cleanUrl.startsWith('/contratistas/ver/');
  }

  isJuridicaPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/juridica' ||
      cleanUrl === '/juridica/list' ||
      cleanUrl === '/juridica/crear' ||
      cleanUrl === '/juridica/stats' ||
      cleanUrl.startsWith('/juridica/editar/');
  }

  private updateTitle() {
    this.currentUrl = this.router.url.split('?')[0];
    const cleanUrl = this.currentUrl;

    if (this.isDashboardPage()) {
      this.currentPageTitle = 'Inicio'; // ✅ Cambiado de Dashboard a Inicio
      this.currentPageSubtitle = 'Panel principal';
      return;
    }

    const titleMap: Record<string, { title: string, subtitle?: string }> = {
      // =========== GESTIÓN DE USUARIOS ===========
      '/gestion-usuarios': {
        title: 'Gestión de Usuarios',
        subtitle: 'Administración de usuarios'
      },
      '/gestion-usuarios/nuevo': {
        title: 'Nuevo Usuario',
        subtitle: 'Administración de usuarios'
      },

      // =========== RADICACIÓN ===========
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

      // =========== AUDITOR ===========
      '/auditor': {
        title: 'Auditor de Cuentas',
        subtitle: 'Auditoría de documentos contables'
      },
      '/auditor/disponibles': {
        title: 'Documentos Disponibles',
        subtitle: 'Documentos para auditoría'
      },
      '/auditor/en-revision': {
        title: 'En Revisión',
        subtitle: 'Documentos en auditoría'
      },
      '/auditor/historial': {
        title: 'Historial de Auditoría',
        subtitle: 'Historial de auditorías realizadas'
      },
      '/auditor/estadisticas': {
        title: 'Estadísticas de Auditoría',
        subtitle: 'Estadísticas de actividad'
      },

      // =========== CONTRATISTAS ===========
      '/contratistas': {
        title: 'Contratistas',
        subtitle: 'Gestión de contratistas y proveedores'
      },
      '/contratistas/list': {
        title: 'Lista de Contratistas',
        subtitle: 'Gestión de contratistas'
      },
      '/contratistas/crear': {
        title: 'Nuevo Contratista',
        subtitle: 'Crear contratista'
      },
      '/contratistas/editar': {
        title: 'Editar Contratista',
        subtitle: 'Modificar datos del contratista'
      },
      '/contratistas/ver': {
        title: 'Detalle del Contratista',
        subtitle: 'Información completa del contratista'
      },

      // =========== JURÍDICA ===========
      '/juridica': {
        title: 'Jurídica',
        subtitle: 'Gestión de contratos'
      },
      '/juridica/list': {
        title: 'Lista de Contratos',
        subtitle: 'Gestión de contratos'
      },
      '/juridica/crear': {
        title: 'Nuevo Contrato',
        subtitle: 'Crear contrato'
      },
      '/juridica/editar': {
        title: 'Editar Contrato',
        subtitle: 'Modificar datos del contrato'
      },
      '/juridica/stats': {
        title: 'Estadísticas',
        subtitle: 'Estadísticas de contratos'
      },

      // =========== OTROS MÓDULOS ===========
      '/reportes': {
        title: 'Reportes',
        subtitle: 'Reportes y estadísticas del sistema'
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

    // Rutas dinámicas
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

    if (cleanUrl.startsWith('/auditor/revisar/')) {
      this.currentPageTitle = 'Revisar Documento';
      this.currentPageSubtitle = 'Auditoría de documento';
      return;
    }

    if (cleanUrl.startsWith('/auditor/documentos/')) {
      this.currentPageTitle = 'Detalle de Documento';
      this.currentPageSubtitle = 'Auditoría de cuentas';
      return;
    }

    if (cleanUrl.startsWith('/contratistas/editar/')) {
      this.currentPageTitle = 'Editar Contratista';
      this.currentPageSubtitle = 'Modificar datos del contratista';
      return;
    }

    if (cleanUrl.startsWith('/contratistas/ver/')) {
      this.currentPageTitle = 'Detalle del Contratista';
      this.currentPageSubtitle = 'Información completa del contratista';
      return;
    }

    if (cleanUrl.startsWith('/juridica/editar/')) {
      this.currentPageTitle = 'Editar Contrato';
      this.currentPageSubtitle = 'Modificar datos del contrato';
      return;
    }

    if (this.isContabilidadPage()) {
      this.currentPageTitle = 'Contabilidad';
      this.currentPageSubtitle = 'Gestión contable y glosas';
      return;
    }

    if (this.isContratistasPage()) {
      this.currentPageTitle = 'Contratistas';
      this.currentPageSubtitle = 'Gestión de contratistas y proveedores';
      return;
    }

    if (this.isJuridicaPage()) {
      this.currentPageTitle = 'Jurídica';
      this.currentPageSubtitle = 'Gestión de contratos';
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
      } else if (cleanUrl.startsWith('/auditor')) {
        this.currentPageTitle = 'Auditor de Cuentas';
        this.currentPageSubtitle = 'Auditoría de documentos contables';
      } else if (cleanUrl.startsWith('/contratistas')) {
        this.currentPageTitle = 'Contratistas';
        this.currentPageSubtitle = 'Gestión de contratistas y proveedores';
      } else if (cleanUrl.startsWith('/juridica')) {
        this.currentPageTitle = 'Jurídica';
        this.currentPageSubtitle = 'Gestión de contratos';
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
      this.currentPageTitle = 'Inicio'; // ✅ Cambiado de Dashboard a Inicio
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

    const roleNames: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.RADICADOR]: 'Radicador',
      [UserRole.SUPERVISOR]: 'Supervisor',
      [UserRole.AUDITOR_CUENTAS]: 'Auditor de Cuentas',
      [UserRole.CONTABILIDAD]: 'Contabilidad',
      [UserRole.TESORERIA]: 'Tesorería',
      [UserRole.ASESOR_GERENCIA]: 'Asesor de Gerencia',
      [UserRole.RENDICION_CUENTAS]: 'Rendición de Cuentas',
      [UserRole.JURIDICA]: 'Jurídica'
    };
    return roleNames[role] || role;
  }
}