import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, UserRole } from '../../core/models/user.types';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class SidebarComponent {
  @Input() currentUser: User | null = null;
  @Input() availableModules: any[] = [];
  @Input() getUserRoleName!: (role: UserRole | undefined | null) => string;
  @Output() navigateToModule = new EventEmitter<string>();
  @Output() toggleSidebar = new EventEmitter<boolean>();
  @Output() logout = new EventEmitter<void>();

  isCollapsed = true; // ✅ Por defecto colapsado en móvil

  ngOnInit() {
    // ✅ EN MÓVIL, POR DEFECTO COLAPSADO
    if (this.isMobile()) {
      this.isCollapsed = true;
    } else {
      this.isCollapsed = false; // En desktop, por defecto abierto
    }
  }

  onNavigateToModule(route: string) {
    this.navigateToModule.emit(route);
    // ✅ EN MÓVIL, CERRAR EL SIDEBAR DESPUÉS DE NAVEGAR
    if (this.isMobile()) {
      this.isCollapsed = true;
      this.toggleSidebar.emit(true);
    }
  }

  onToggleSidebar() {
    // ✅ PERMITIR TOGGLE EN MÓVIL
    this.isCollapsed = !this.isCollapsed;
    this.toggleSidebar.emit(this.isCollapsed);
    console.log('Sidebar collapsed:', this.isCollapsed);
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
      if (this.isCollapsed) {
        this.isCollapsed = false;
        this.toggleSidebar.emit(false);
      }
    }
  }

  // ✅ MÉTODO PARA CERRAR EL SIDEBAR AL HACER CLIC EN EL OVERLAY
  closeSidebarOnOverlay(event: MouseEvent) {
    if (this.isMobile() && !this.isCollapsed) {
      // Verificar si el clic fue en el overlay (fuera del sidebar)
      const sidebarElement = (event.target as HTMLElement).closest('.sidebar');
      if (!sidebarElement) {
        this.isCollapsed = true;
        this.toggleSidebar.emit(true);
      }
    }
  }
}