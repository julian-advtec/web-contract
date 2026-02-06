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
                title: 'Mi historial',
                description: 'Historial de procesos contables',
                path: '/contabilidad/historial',
                route: '/contabilidad/historial',
                icon: 'history',
                requiredRole: UserRole.CONTABILIDAD,
                isActive: true
            },
            {
                id: 'lista-completa',
                title: 'Lista Completa',
                description: 'Todos los documentos de contabilidad',
                path: '/contabilidad/lista',
                route: '/contabilidad/lista',
                icon: 'list_alt',
                requiredRole: UserRole.CONTABILIDAD,
                isActive: true
            },
            {
                id: 'rechazados',                        // ← NUEVO
                title: 'Rechazados',
                description: 'Documentos rechazados por niveles superiores',
                path: '/contabilidad/rechazados',
                route: '/contabilidad/rechazados',
                icon: 'cancel',                           // o 'block' o 'do_not_disturb'
                requiredRole: UserRole.CONTABILIDAD,
                isActive: true
            },
            {
                id: 'estadisticas',
                title: 'Mis Estadísticas',
                description: 'Estadísticas y métricas de mi desempeño',
                path: '/contabilidad/estadisticas',
                route: '/contabilidad/estadisticas',
                icon: 'bar_chart',
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