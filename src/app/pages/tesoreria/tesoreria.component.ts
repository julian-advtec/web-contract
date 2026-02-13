import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { User, UserRole } from '../../core/models/user.types';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
    selector: 'app-tesoreria',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        RouterOutlet,
        SidebarComponent,
        NavbarComponent
    ],
    templateUrl: './tesoreria.component.html',
    styleUrls: ['./tesoreria.component.scss']
})
export class TesoreriaComponent implements OnInit {
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
                        role: UserRole.TESORERIA
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
                requiredRole: UserRole.TESORERIA,
                isActive: true
            },
            {
                id: 'pendientes',
                title: 'Pendientes',
                description: 'Documentos pendientes para tesorería',
                path: '/tesoreria/pendientes',
                route: '/tesoreria/pendientes',
                icon: 'pending_actions',
                requiredRole: UserRole.TESORERIA,
                isActive: true
            },
            {
                 id: 'historial',
                title: 'Mi historial',
                description: 'Historial de procesos de tesorería',
                path: '/tesoreria/historial',
                route: '/tesoreria/historial',
                icon: 'history',
                requiredRole: UserRole.TESORERIA,
                isActive: true
            },
            {
               id: 'lista-completa',
                title: 'Lista Completa',
                description: 'Todos los documentos de tesorería',
                path: '/tesoreria/lista',
                route: '/tesoreria/lista',
                icon: 'list_alt',
                requiredRole: UserRole.TESORERIA,
                isActive: true
            },
            {
                id: 'rechazados',
                title: 'Rechazados',
                description: 'Documentos rechazados por niveles superiores',
                path: '/tesoreria/rechazados',
                route: '/tesoreria/rechazados',
                icon: 'cancel',
                requiredRole: UserRole.TESORERIA,
                isActive: true
            },
         {
                id: 'estadisticas',
                title: 'Mis Estadísticas',
                description: 'Estadísticas y métricas de mi desempeño',
                path: '/tesoreria/estadisticas',
                route: '/tesoreria/estadisticas',
                icon: 'bar_chart',
                requiredRole: UserRole.TESORERIA,
                isActive: true
            } 
        ];

        console.log('Módulos locales Tesorería:', this.availableModules);
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