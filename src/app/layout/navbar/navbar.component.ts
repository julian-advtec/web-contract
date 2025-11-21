import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
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
  @Input() getUserRoleName!: (role: UserRole | undefined | null) => string;
  @Input() sidebarCollapsed: boolean = false;
  @Input() isMobileView: boolean = false;

  @Output() logout = new EventEmitter<void>();
  @Output() toggleMobileSidebar = new EventEmitter<void>();

  onLogout() {
    this.logout.emit();
  }

  onToggleMobile() {
    this.toggleMobileSidebar.emit();
  }
}