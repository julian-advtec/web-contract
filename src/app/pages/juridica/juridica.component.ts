import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, Subscription } from 'rxjs';

import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';

import { User, UserRole, getUserRoleName, stringToUserRole } from '../../core/models/user.types';
import { AuthService } from '../../core/services/auth.service';
import { JuridicaService } from '../../core/services/juridica.service';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
  selector: 'app-juridica',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    SidebarComponent,
    NavbarComponent
  ],
  templateUrl: './juridica.component.html',
  styleUrls: ['./juridica.component.scss']
})
export class JuridicaComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  availableModules: AppModule[] = [];
  puedeCrear = false;
  puedeVer = false;

  errorMessage = '';
  successMessage = '';

  // ============ PROPIEDADES PARA EL TÍTULO DINÁMICO ============
  pageTitle = 'Gestión Jurídica';
  pageSubtitle = '';
  currentRouteTitle = '';
  currentRouteIcon = '';
  currentRouteDescription = '';
  breadcrumbItems: { label: string; link?: string; icon?: string }[] = [];

  private routerSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private juridicaService: JuridicaService,
    private modulesService: ModulesService,
    private router: Router,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    console.log('🚀 Inicializando componente de jurídica...');
    this.verificarAutenticacion();
    this.loadCurrentUser();
    this.verificarPermisos();
    this.loadAvailableModules();
    this.setupRouteListener(); // Configurar listener de rutas
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // ============ CONFIGURAR LISTENER DE RUTAS ============
  setupRouteListener(): void {
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updatePageTitle();
    });
    this.updatePageTitle(); // Título inicial
  }

  // ============ ACTUALIZAR TÍTULO SEGÚN LA RUTA ============
  updatePageTitle(): void {
    const currentUrl = this.router.url;
    let title = 'Gestión Jurídica';
    let subtitle = '';
    let icon = 'fas fa-gavel';
    let description = '';
    let breadcrumb: { label: string; link?: string; icon?: string }[] = [
      { label: 'Inicio', link: '/dashboard', icon: 'fas fa-home' },
      { label: 'Jurídica', link: '/juridica/list', icon: 'fas fa-gavel' }
    ];

    // Detectar la ruta actual y configurar el título correspondiente
    if (currentUrl.includes('/juridica/list') || currentUrl === '/juridica') {
      subtitle = 'Lista de Contratos';
      title = '📋 Contratos Jurídicos';
      icon = 'fas fa-list';
      description = 'Gestión y visualización de todos los contratos registrados';
      breadcrumb.push({ label: 'Lista de Contratos', icon: 'fas fa-file-contract' });
      
    } else if (currentUrl.includes('/juridica/crear')) {
      subtitle = 'Crear Nuevo Contrato';
      title = '✏️ Contratos Jurídicos';
      icon = 'fas fa-plus-circle';
      description = 'Complete el formulario para registrar un nuevo contrato';
      breadcrumb.push({ label: 'Nuevo Contrato', icon: 'fas fa-plus' });
      
    } else if (currentUrl.includes('/juridica/editar')) {
      subtitle = 'Editar Contrato';
      title = '✏️ Contratos Jurídicos';
      icon = 'fas fa-edit';
      description = 'Modifique la información del contrato seleccionado';
      breadcrumb.push({ label: 'Editar Contrato', icon: 'fas fa-edit' });
      
    } else if (currentUrl.includes('/juridica/ver')) {
      subtitle = 'Ver Contrato';
      title = '👁️ Contratos Jurídicos';
      icon = 'fas fa-eye';
      description = 'Visualización detallada del contrato';
      breadcrumb.push({ label: 'Ver Contrato', icon: 'fas fa-eye' });
      
    } else if (currentUrl.includes('/juridica/stats')) {
      subtitle = 'Estadísticas';
      title = '📊 Contratos Jurídicos';
      icon = 'fas fa-chart-line';
      description = 'Análisis y estadísticas de los contratos';
      breadcrumb.push({ label: 'Estadísticas', icon: 'fas fa-chart-bar' });
    }

    // Actualizar propiedades
    this.pageTitle = title;
    this.pageSubtitle = subtitle;
    this.currentRouteTitle = subtitle;
    this.currentRouteIcon = icon;
    this.currentRouteDescription = description;
    this.breadcrumbItems = breadcrumb;

    // Actualizar título de la pestaña del navegador
    const fullTitle = `${title} - ${subtitle}`;
    this.titleService.setTitle(fullTitle);
    
    console.log(`📍 Ruta actual: ${currentUrl} - Título: ${fullTitle}`);
  }

  // ============ OBTENER ÍCONO SEGÚN RUTA ============
  getRouteIcon(): string {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/list')) return 'fas fa-list';
    if (currentUrl.includes('/crear')) return 'fas fa-plus-circle';
    if (currentUrl.includes('/editar')) return 'fas fa-edit';
    if (currentUrl.includes('/ver')) return 'fas fa-eye';
    if (currentUrl.includes('/stats')) return 'fas fa-chart-line';
    return 'fas fa-gavel';
  }

  // ============ OBTENER COLOR DEL TÍTULO ============
  getTitleColor(): string {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/list')) return 'text-primary';
    if (currentUrl.includes('/crear')) return 'text-success';
    if (currentUrl.includes('/editar')) return 'text-warning';
    if (currentUrl.includes('/ver')) return 'text-info';
    if (currentUrl.includes('/stats')) return 'text-secondary';
    return 'text-primary';
  }

  // ============ OBTENER BADGE DEL TÍTULO ============
  getTitleBadge(): { text: string; class: string } {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/list')) return { text: 'LISTA', class: 'bg-primary' };
    if (currentUrl.includes('/crear')) return { text: 'NUEVO', class: 'bg-success' };
    if (currentUrl.includes('/editar')) return { text: 'EDICIÓN', class: 'bg-warning' };
    if (currentUrl.includes('/ver')) return { text: 'CONSULTA', class: 'bg-info' };
    if (currentUrl.includes('/stats')) return { text: 'ESTADÍSTICAS', class: 'bg-secondary' };
    return { text: 'JURÍDICA', class: 'bg-primary' };
  }

  // ============ MÉTODOS EXISTENTES (sin cambios) ============
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
    } else {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          let normalizedRole: UserRole = UserRole.JURIDICA;

          if (parsedUser.role) {
            normalizedRole = stringToUserRole(parsedUser.role);
          }

          this.currentUser = {
            ...parsedUser,
            role: normalizedRole
          };

          this.puedeCrear = this.userCanCreate(normalizedRole);

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
    this.juridicaService.verificarPermisosUsuario().subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.puedeCrear = response.data.puedeCrear;
          this.puedeVer = response.data.puedeVer;

          if (!this.puedeVer) {
            this.errorMessage = 'No tienes permisos para acceder al módulo jurídico';
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 3000);
          }
        }
      },
      error: () => {
        if (this.currentUser) {
          this.puedeCrear = this.userCanCreate(this.currentUser.role);
          this.puedeVer = this.puedeCrear;
        }
      }
    });
  }

  loadAvailableModules(): void {
    if (!this.currentUser) {
      this.availableModules = [];
      return;
    }

    this.availableModules = [
      {
        id: 'dashboard',
        title: 'Inicio',
        description: 'Panel principal del sistema',
        path: '/dashboard',
        route: '/dashboard',
        icon: 'dashboard',
        requiredRole: UserRole.JURIDICA,
        isActive: true
      },
      {
        id: 'lista-contratos',
        title: 'Lista de Contratos',
        description: 'Ver todos los contratos',
        path: '/juridica/list',
        route: '/juridica/list',
        icon: 'lista-radicacion',
        requiredRole: UserRole.JURIDICA,
        isActive: true
      },
      {
        id: 'nuevo-contrato',
        title: 'Nuevo Contrato',
        description: 'Crear nuevo contrato',
        path: '/juridica/crear',
        route: '/juridica/crear',
        icon: 'lista-radicacion',
        requiredRole: UserRole.JURIDICA,
        isActive: true
      },
      {
        id: 'estadisticas',
        title: 'Estadísticas',
        description: 'Ver estadísticas de contratos',
        path: '/juridica/stats',
        route: '/juridica/stats',
        icon: 'chart-bar',
        requiredRole: UserRole.JURIDICA,
        isActive: true
      }
    ];

    console.log('📋 Módulos disponibles para jurídica:', this.availableModules);
  }

  getUserRoleName(): string {
    if (!this.currentUser) return 'Usuario';
    return getUserRoleName(this.currentUser.role);
  }

  userCanCreate(role: UserRole): boolean {
    return role === UserRole.JURIDICA || role === UserRole.ADMIN;
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

  // ============ MÉTODO PARA OBTENER FECHA ACTUAL ============
  getFechaActual(): string {
    const now = new Date();
    return now.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}