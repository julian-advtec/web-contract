// src/app/layout/sidebar/sidebar.component.ts
import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { User, UserRole } from '../../core/models/user.types';
import { AppModule, ModulesService } from '../../core/services/modules.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private modulesService = inject(ModulesService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // Variables privadas
  private _availableModules: AppModule[] = [];
  private _currentUser: User | null = null;

  // Inputs con setters
  @Input()
  set currentUser(user: User | null) {
    console.log('SIDEBAR DEBUG ──────────────────────────────');
    console.log('currentUser RECIBIDO (completo):', user);
    console.log('Rol del usuario:', user?.role);
    console.log('Tipo de rol:', typeof user?.role);
    this._currentUser = user;

    if (user && user.role) {
      const modules = this.modulesService.getModulesForUser(user.role);
      console.log('Módulos calculados para este rol:', modules.map(m => ({
        id: m.id,
        title: m.title,
        required: m.requiredRole
      })));
      console.log('¿Aparece contabilidad?', modules.some(m => m.id === 'contabilidad'));
      this._availableModules = modules;
    } else {
      console.log('Usuario o rol inválido → usando módulos por defecto');
      this._availableModules = this.getDefaultModules();
    }
  }



  get currentUser(): User | null {
    return this._currentUser;
  }

  @Input()
  set availableModules(modules: AppModule[]) {
    console.log('Sidebar - Módulos recibidos:', modules);

    if (modules && modules.length > 0) {
      this._availableModules = modules;
    } else {
      this._availableModules = this.getDefaultModules();
    }

    console.log('Sidebar - Módulos normalizados:', this._availableModules);
  }

  get availableModules(): AppModule[] {
    return this._availableModules;
  }

  @Input() getUserRoleName!: (role: UserRole | undefined | null) => string;
  @Input() sidebarCollapsed: boolean = false;

  @Output() toggleSidebar = new EventEmitter<boolean>();
  @Output() logout = new EventEmitter<void>();

  ngOnInit() {
    console.log('SIDEBAR ngOnInit ──────────────────────────────');
    console.log('Módulos FINALES que se van a renderizar:', this.availableModules.map(m => m.title));
    console.log('Sidebar collapsed?', this.sidebarCollapsed);

    if (this.isMobile()) {
      this.sidebarCollapsed = true;
    } else {
      this.sidebarCollapsed = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onNavigateToModule(module: AppModule) {
    console.log('Sidebar - onNavigateToModule llamado con:', module);

    if (!module || !module.path) {
      console.error('ERROR: Módulo inválido o sin path');
      console.error('Módulo recibido:', module);
      return;
    }

    const path = module.path;
    console.log('Sidebar - Navegando a:', path);

    try {
      this.router.navigate([path]);

      if (this.isMobile()) {
        this.sidebarCollapsed = true;
        this.toggleSidebar.emit(true);
      }
    } catch (error) {
      console.error('Error al navegar:', error);
    }
  }

  onToggleSidebar() {
    const newState = !this.sidebarCollapsed;
    this.sidebarCollapsed = newState;
    this.toggleSidebar.emit(newState);
  }

  onLogout() {
    this.notificationService.confirm(
      'Confirmar Cierre de Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      () => {
        this.logout.emit();
      }
    );
  }

  isMobile(): boolean {
    return window.innerWidth <= 770;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (this.isMobile()) {
      // En móvil, mantener el estado actual
    } else {
      if (this.sidebarCollapsed) {
        this.sidebarCollapsed = false;
        this.toggleSidebar.emit(false);
      }
    }
  }

  private getDefaultModules(): AppModule[] {
    return [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Panel principal del sistema',
        path: '/dashboard',
        route: '/dashboard',
        icon: 'dashboard',
        requiredRole: UserRole.RADICADOR,
        isActive: true
      }
    ];
  }

  isModuleActive(module: AppModule): boolean {
    if (!module || !module.path) return false;

    const currentPath = this.router.url;
    return currentPath === module.path || currentPath.startsWith(module.path + '/');
  }

  canShowModule(module: AppModule): boolean {
    if (!this.currentUser) return false;

    if (!module.requiredRole) return true;

    const userRole = this.currentUser.role?.toLowerCase();
    const requiredRole = module.requiredRole.toLowerCase();

    // Admin ve todo
    if (userRole === 'admin') return true;

    // Radicador ve radicación
    if (userRole === 'radicador') {
      return ['radicador', 'admin'].includes(requiredRole);
    }

    // Supervisor ve supervisión
    if (userRole === 'supervisor') {
      return ['supervisor', 'admin'].includes(requiredRole);
    }

    return userRole === requiredRole;
  }

  getModuleIcon(moduleId: string): SafeHtml {
    const icons: { [key: string]: string } = {
      'dashboard': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M120-120v-480l360-240 360 240v480H600v-280H360v280H120Zm80-80h80v-200h400v200h80v-349L480-739 200-549v349Zm400-200h-80v120h80v-120Zm-240 0h-80v120h80v-120Zm120-275Z"/>
      </svg>`,

      'contratistas': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
      <path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113Z"/>
    </svg>`,

      'gestion-usuarios': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113Z"/>
      </svg>`,

      'radicacion': `<svg xmlns="http://www.w3.org2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M280-280h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm-80 480q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>
      </svg>`,

      'supervisor': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M120-120v-120q0-34 23.5-56.5T200-320h120q8 0 15 2t13 6q-5 14-7.5 29t-2.5 31H200v120H120Zm640 0v-120H640q0 16-2.5 31t-7.5 29q6-4 13-6t15-2h120q33 0 56.5 23.5T880-240v120H760ZM400-320q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm160-320q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM120-640v-120h120v120H120Zm640 0v-120h120v120H760ZM360-400q17 0 28.5-11.5T400-440q0-17-11.5-28.5T360-480q-17 0-28.5 11.5T320-440q0 17 11.5 28.5T360-400Zm240-400q17 0 28.5-11.5T640-840q0-17-11.5-28.5T600-880q-17 0-28.5 11.5T560-840q0 17 11.5 28.5T600-800Z"/>
      </svg>`,

      'reportes': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M320-320h80v-240h-80v240Zm120 0h80v-320h-80v320Zm120 0h80v-160h-80v160ZM240-160q-33 0-56.5-23.5T160-240v-480q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v480q0 33-23.5 56.5T720-160H240Zm0-80h480v-480H240v480Zm0 0v-480 480Z"/>
      </svg>`,

      'auditoria': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M120-120v-240h80v160h160v80H120Zm480 0v-80h160v-160h80v240H600ZM120-600v-240h240v80H200v160h-80Zm640 0v-160H600v-80h240v240h-80Zm-360 40q-58 0-99-41t-41-99q0-58 41-99t99-41q58 0 99 41t41 99q0 58-41 99t-99 41Zm0-80q33 0 56.5-23.5T480-700q0-33-23.5-56.5T400-780q-33 0-56.5 23.5T320-700q0 33 23.5 56.5T400-620Zm0-80Zm0 400q-83 0-156-31.5T118-342q-54-54-85.5-127T1-625q0-83 31.5-156T118-908q54-54 127-85.5T402-1025q83 0 156 31.5T685-908q54 54 85.5 127T802-625q0 83-31.5 156T685-342q-54 54-127 85.5T402-225Zm0-320q100 0 170-70t70-170q0-100-70-170t-170-70q-100 0-170 70t-70 170q0 100 70 170t170 70Z"/>
      </svg>`,

      'contabilidad': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M560-440q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM280-320q-33 0-56.5-23.5T200-400v-320q0-33 23.5-56.5T280-800h560q33 0 56.5 23.5T920-720v320q0 33-23.5 56.5T840-320H280Zm80-80h400q0-33 23.5-56.5T840-480v-160q-33 0-56.5-23.5T760-720H360q0 33-23.5 56.5T280-640v160q33 0 56.5 23.5T360-400Zm440 240H120q-33 0-56.5-23.5T40-240v-400q0-17 11.5-28.5T80-680q17 0 28.5 11.5T120-640v400h680q17 0 28.5 11.5T840-200q0 17-11.5 28.5T800-160ZM280-400h560-560Z"/>
      </svg>`,

      'tesoreria': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M560-440v-120h-80v-80h80v-80h80v80h80v80h-80v120h-80Zm-400-40q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm0 80q83 0 141.5-58.5T360-600q0-83-58.5-141.5T160-800q-83 0-141.5 58.5T-40-600q0 83 58.5 141.5T160-400Zm0 240q-33 0-56.5-23.5T80-240v-80q0-17 11.5-28.5T120-360q17 0 28.5 11.5T160-320v80h640v-80q0-17 11.5-28.5T840-360q17 0 28.5 11.5T880-320v80q0 33-23.5 56.5T800-160H160Zm0-240q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Z"/>
      </svg>`,

      'configuracion': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/>
      </svg>`,

      'asesor-gerencia': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm80-80h240v-80H240v80Zm0-160h160v-80H240v80Zm400 160h80v-240h-80v80h-80v80h80v80Zm-160-80h80v-80h-80v80Zm0-160h80v-80h-80v80ZM160-160v-480 480Z"/>
      </svg>`,

      'rendicion-cuentas': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320ZM280-360h400v-80H280v80Zm0-160h400v-80H280v80Z"/>
      </svg>`,

      'nueva-radicacion': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
      <path d="M440-440v120q0 17 11.5 28.5T480-280q17 0 28.5 11.5T520-320v-120h120q17 0 28.5-11.5T680-480q0 17-11.5-28.5T640-520H520v-120q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v120H320q-17 0-28.5 11.5T280-480q0 17 11.5 28.5T320-440h120Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
    </svg>`,

      'mis-estadisticas': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
      <path d="M320-320h80v-240h-80v240Zm120 0h80v-320h-80v320Zm120 0h80v-160h-80v160ZM240-160q-33 0-56.5-23.5T160-240v-480q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v480q0 33-23.5 56.5T720-160H240Zm0-80h480v-480H240v480Zm0 0v-480 480Z"/>
    </svg>`,

      'rechazados': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
      <path d="m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
    </svg>`,

      'lista-radicacion': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
      <path d="M280-280h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm-80 480q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>
    </svg>`,

      'mis-radicaciones': `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
      <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/>
    </svg>`,


    };

    const iconSvg = icons[moduleId] || `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
    <path d="M240-160q-33 0-56.5-23.5T160-240v-480q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v480q0 33-23.5 56.5T720-160H240Zm0-80h480v-480H240v480Z"/>
  </svg>`;

    return this.sanitizer.bypassSecurityTrustHtml(iconSvg);
  }

  // Método para obtener el nombre del módulo (para tooltips)
  getModuleTitle(module: AppModule): string {
    return module.title || module.id;
  }

  // Método para obtener la descripción del módulo
  getModuleDescription(module: AppModule): string {
    return module.description || '';
  }
}