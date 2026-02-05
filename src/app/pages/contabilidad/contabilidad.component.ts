import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { User, UserRole } from '../../core/models/user.types';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
    selector: 'app-contabilidad',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        RouterOutlet,
        SidebarComponent,
        NavbarComponent
    ],
    templateUrl: './contabilidad.component.html',
    styleUrls: ['./contabilidad.component.scss']
})
export class ContabilidadComponent implements OnInit {
    currentUser: User | null = null;
    sidebarCollapsed = false;
    availableModules: AppModule[] = [];

    errorMessage = '';
    successMessage = '';

    constructor(
        private authService: AuthService,
        private modulesService: ModulesService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadCurrentUser();
        this.loadAvailableModules();
    }

    loadCurrentUser(): void {
        const user = this.authService.getCurrentUser();
        if (user) {
            this.currentUser = user;
        } else {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const parsedUser = JSON.parse(userStr);
                    this.currentUser = {
                        ...parsedUser,
                        role: UserRole.CONTABILIDAD
                    };
                } catch {
                    this.router.navigate(['/auth/login']);
                }
            } else {
                this.router.navigate(['/auth/login']);
            }
        }
    }

    loadAvailableModules(): void {
        if (!this.currentUser) {
            this.availableModules = [];
            return;
        }

        this.availableModules = [
            {
                id: 'dashboard',
                title: 'Dashboard',
                description: 'Panel principal del sistema',
                path: '/dashboard',
                route: '/dashboard',
                icon: 'dashboard',
                requiredRole: UserRole.CONTABILIDAD,
                isActive: true
            },
            {
                id: 'pendientes',
                title: 'Pendientes',
                description: 'Documentos pendientes para contabilidad',
                path: '/contabilidad/pendientes',
                route: '/contabilidad/pendientes',
                icon: 'pending_actions',   // o el que uses en tu getModuleIcon
                requiredRole: UserRole.CONTABILIDAD,
                isActive: true
            },
            {
                id: 'historial',
                title: 'Historial',
                description: 'Historial de procesos contables',
                path: '/contabilidad/historial',
                route: '/contabilidad/historial',
                icon: 'history',
                requiredRole: UserRole.CONTABILIDAD,
                isActive: true
            }
            // Si más adelante quieres agregar "Procesar" o algo, agrégalo aquí
        ];

        console.log('Módulos locales Contabilidad:', this.availableModules);
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
}