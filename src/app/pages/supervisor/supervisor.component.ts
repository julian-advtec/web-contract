// src/app/pages/supervisor/supervisor.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { User, UserRole, getUserRoleName, stringToUserRole } from '../../core/models/user.types';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
    selector: 'app-supervisor',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        RouterOutlet,
        SidebarComponent,
        NavbarComponent
    ],
    templateUrl: './supervisor.component.html',
    styleUrls: ['./supervisor.component.scss']
})
export class SupervisorComponent implements OnInit, OnDestroy {
    currentUser: User | null = null;
    sidebarCollapsed = false;
    availableModules: AppModule[] = [];

    // Propiedades para mensajes
    errorMessage = '';
    successMessage = '';

    constructor(
        private authService: AuthService,
        private modulesService: ModulesService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        console.log('🚀 Inicializando componente de supervisor...');
        this.verificarAutenticacion();
        this.loadCurrentUser();
        this.loadAvailableModules();
    }

    ngOnDestroy(): void {
        // Limpieza si es necesario
    }

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
        } else {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const parsedUser = JSON.parse(userStr);
                    let normalizedRole: UserRole = UserRole.SUPERVISOR;

                    if (parsedUser.role) {
                        normalizedRole = stringToUserRole(parsedUser.role);
                    }

                    this.currentUser = {
                        ...parsedUser,
                        role: normalizedRole
                    };

                } catch (error) {
                    console.error('❌ Error parseando usuario:', error);
                    this.router.navigate(['/auth/login']);
                }
            } else {
                this.router.navigate(['/auth/login']);
            }
        }

        console.log('👤 Usuario supervisor actual:', this.currentUser);
    }

    loadAvailableModules(): void {
        if (!this.currentUser) {
            this.availableModules = [];
            return;
        }

        // Módulos específicos para supervisor
        this.availableModules = [
            {
                id: 'dashboard',
                title: 'Dashboard',
                description: 'Panel principal del sistema',
                path: '/dashboard',
                route: '/dashboard',
                icon: 'dashboard',
                requiredRole: UserRole.SUPERVISOR,
                isActive: true
            },
            {
                id: 'pendientes',
                title: 'Pendientes',
                description: 'Documentos pendientes de revisión',
                path: '/supervisor/pendientes',
                route: '/supervisor/pendientes',
                icon: 'clock',
                requiredRole: UserRole.SUPERVISOR,
                isActive: true
            },
            {
                id: 'historial',
                title: 'Historial',
                description: 'Historial de revisiones',
                path: '/supervisor/historial',
                route: '/supervisor/historial',
                icon: 'history',
                requiredRole: UserRole.SUPERVISOR,
                isActive: true
            },
            {
                id: 'estadisticas',
                title: 'Estadísticas',
                description: 'Estadísticas de revisión',
                path: '/supervisor/estadisticas',
                route: '/supervisor/estadisticas',
                icon: 'chart-bar',
                requiredRole: UserRole.SUPERVISOR,
                isActive: true
            }
        ];

        console.log('📋 Módulos disponibles para supervisor:', this.availableModules);
    }

    getUserRoleName(): string {
        if (!this.currentUser) {
            return 'Supervisor';
        }
        return getUserRoleName(this.currentUser.role);
    }

    esSupervisor(): boolean {
        return this.currentUser?.role === UserRole.SUPERVISOR || this.currentUser?.role === UserRole.ADMIN;
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

    // En el SupervisorFormComponent, agrega estos métodos:
    formatDate(date: Date | string): string {
        if (!date) return 'N/A';

        try {
            const fecha = new Date(date);
            return fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    getEstadoClass(estado: string): string {
        if (!estado) return 'default';

        switch (estado.toUpperCase()) {
            case 'RADICADO':
                return 'radicado';
            case 'PENDIENTE':
                return 'pendiente';
            case 'APROBADO':
                return 'aprobado';
            case 'RECHAZADO':
                return 'rechazado';
            case 'EN_REVISION':
                return 'en-revision';
            case 'OBSERVADO':
                return 'observado';
            default:
                return 'default';
        }
    }
}