import { Component, Input, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, UserRole } from '../../core/models/user.types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class SidebarComponent implements OnInit {
  @Input() currentUser: User | null = null;
  @Input() availableModules: any[] = [];
  @Input() getUserRoleName!: (role: UserRole | undefined | null) => string;
  @Input() sidebarCollapsed: boolean = false; // ✅ Cambiado de isCollapsed a sidebarCollapsed
  @Output() navigateToModule = new EventEmitter<string>();
  @Output() toggleSidebar = new EventEmitter<boolean>();
  @Output() logout = new EventEmitter<void>();

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    // ✅ EN MÓVIL, POR DEFECTO COLAPSADO
    if (this.isMobile()) {
      this.sidebarCollapsed = true;
    } else {
      this.sidebarCollapsed = false; // En desktop, por defecto abierto
    }
  }

  onNavigateToModule(route: string) {
    this.navigateToModule.emit(route);
    // ✅ EN MÓVIL, CERRAR EL SIDEBAR DESPUÉS DE NAVEGAR
    if (this.isMobile()) {
      this.sidebarCollapsed = true;
      this.toggleSidebar.emit(true);
    }
  }

  onToggleSidebar() {
    // ✅ PERMITIR TOGGLE EN MÓVIL
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.toggleSidebar.emit(this.sidebarCollapsed);
    console.log('Sidebar collapsed:', this.sidebarCollapsed);
  }

  onLogout() {
    this.logout.emit();
  }

  // Detectar si es móvil
  isMobile(): boolean {
    return window.innerWidth <= 770;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // ✅ AL CAMBIAR DE TAMAÑO, AJUSTAR EL ESTADO
    if (this.isMobile()) {
      // En móvil, mantener el estado actual (puede estar abierto o cerrado)
    } else {
      // Al cambiar a desktop, asegurar que esté abierto
      if (this.sidebarCollapsed) {
        this.sidebarCollapsed = false;
        this.toggleSidebar.emit(false);
      }
    }
  }

  // ✅ MÉTODO PARA CERRAR EL SIDEBAR AL HACER CLIC EN EL OVERLAY
  closeSidebarOnOverlay(event: MouseEvent) {
    if (this.isMobile() && !this.sidebarCollapsed) {
      // Verificar si el clic fue en el overlay (fuera del sidebar)
      const sidebarElement = (event.target as HTMLElement).closest('.sidebar');
      if (!sidebarElement) {
        this.sidebarCollapsed = true;
        this.toggleSidebar.emit(true);
      }
    }
  }

  getModuleIcon(moduleId: string): SafeHtml {
    const icons: { [key: string]: string } = {
      'admin': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M120-120v-80h80v-280q0-43 24-78t64-54v-28q0-25 17.5-42.5T360-720q25 0 42.5 17.5T420-660v28q40 17 64 54t24 78v280h80v80H120Zm240-600q-8 0-14-6t-6-14q0-8 6-14t14-6q8 0 14 6t6 14q0 8-6 14t-14 6ZM240-200h240v-280q0-33-23.5-56.5T400-560q-33 0-56.5 23.5T320-480v280Zm240 0h240v-280q0-33-23.5-56.5T640-560q-33 0-56.5 23.5T560-480v280ZM360-720q-8 0-14-6t-6-14q0-8 6-14t14-6q8 0 14 6t6 14q0 8-6 14t-14 6Zm240 0q-8 0-14-6t-6-14q0-8 6-14t14-6q8 0 14 6t6 14q0 8-6 14t-14 6Z"/>
      </svg>`,

      'radicador': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M280-280h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm-80 480q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>
      </svg>`,

      'supervisor': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M120-120v-120q0-33 23.5-56.5T200-320h120q8 0 15 2t13 6q-5 14-7.5 29t-2.5 31H200v120H120Zm640 0v-120H640q0 16-2.5 31t-7.5 29q6-4 13-6t15-2h120q33 0 56.5 23.5T880-240v120H760ZM400-320q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm160-320q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM120-640v-120h120v120H120Zm640 0v-120h120v120H760ZM360-400q17 0 28.5-11.5T400-440q0-17-11.5-28.5T360-480q-17 0-28.5 11.5T320-440q0 17 11.5 28.5T360-400Zm240-400q17 0 28.5-11.5T640-840q0-17-11.5-28.5T600-880q-17 0-28.5 11.5T560-840q0 17 11.5 28.5T600-800Z"/>
      </svg>`,

      'auditor-cuentas': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M560-440q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM280-320q-33 0-56.5-23.5T200-400v-320q0-33 23.5-56.5T280-800h560q33 0 56.5 23.5T920-720v320q0 33-23.5 56.5T840-320H280Zm80-80h400q0-33 23.5-56.5T840-480v-160q-33 0-56.5-23.5T760-720H360q0 33-23.5 56.5T280-640v160q33 0 56.5 23.5T360-400Zm440 240H120q-33 0-56.5-23.5T40-240v-400h80v400h680v80ZM280-400h560-560Z"/>
      </svg>`,

      'contabilidad': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M560-440q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM280-320q-33 0-56.5-23.5T200-400v-320q0-33 23.5-56.5T280-800h560q33 0 56.5 23.5T920-720v320q0 33-23.5 56.5T840-320H280Zm80-80h400q0-33 23.5-56.5T840-480v-160q-33 0-56.5-23.5T760-720H360q0 33-23.5 56.5T280-640v160q33 0 56.5 23.5T360-400Zm440 240H120q-33 0-56.5-23.5T40-240v-400h80v400h680v80ZM280-400h560-560Z"/>
      </svg>`,

      'tesoreria': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M560-520q-17 0-28.5-11.5T520-560q0-17 11.5-28.5T560-600q17 0 28.5 11.5T600-560q0 17-11.5 28.5T560-520ZM440-320h240v-80H520v-40h120v-80H520v-40h160v-80H440v320ZM240-240h560v-480H240v480Zm0 80q-33 0-56.5-23.5T160-240v-480q0-33 23.5-56.5T240-800h560q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H240Zm0-80v-480 480Z"/>
      </svg>`,

      'asesor-gerencia': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/>
      </svg>`,

      'rendicion-cuentas': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M240-320h320v-80H240v80Zm0-160h320v-80H240v80Zm0-160h320v-80H240v80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"/>
      </svg>`,

      'reportes': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M320-320h80v-240h-80v240Zm120 0h80v-320h-80v320Zm120 0h80v-160h-80v160ZM240-160q-33 0-56.5-23.5T160-240v-480q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v480q0 33-23.5 56.5T720-160H240Zm0-80h480v-480H240v480Zm0 0v-480 480Z"/>
      </svg>`,

      'gestion-usuarios': `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
        <path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113Z"/>
      </svg>`
    };

    const iconSvg = icons[moduleId] || `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
      <path d="M240-160q-33 0-56.5-23.5T160-240v-480q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v480q0 33-23.5 56.5T720-160H240Zm0-80h480v-480H240v480Z"/>
    </svg>`;

    return this.sanitizer.bypassSecurityTrustHtml(iconSvg);
  }
}