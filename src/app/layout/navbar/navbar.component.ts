import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, UserRole } from '../../core/models/user.types';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class NavbarComponent {
  @Input() currentUser: User | null = null;
  @Input() sidebarCollapsed: boolean = false;
  @Output() logout = new EventEmitter<void>();
  @Output() toggleSidebar = new EventEmitter<boolean>();

  // Método para obtener el nombre del rol
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
    this.logout.emit();
  }

  onToggleSidebar() {
    this.toggleSidebar.emit(!this.sidebarCollapsed);
  }
}