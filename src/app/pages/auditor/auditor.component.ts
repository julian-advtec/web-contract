import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { User, UserRole, getUserRoleName, stringToUserRole } from '../../core/models/user.types';
import { ModulesService, AppModule } from '../../core/services/modules.service';

@Component({
    selector: 'app-auditor',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        RouterOutlet,
        SidebarComponent,
        NavbarComponent
    ],
    templateUrl: './auditor.component.html',
    styleUrls: ['./auditor.component.scss']
})
export class AuditorComponent implements OnInit, OnDestroy {
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
        console.log('🚀 Inicializando componente de auditor...');
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
                    let normalizedRole: UserRole = UserRole.AUDITOR_CUENTAS;

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

        console.log('👤 Usuario auditor actual:', this.currentUser);
    }

    loadAvailableModules(): void {
        if (!this.currentUser) {
            this.availableModules = [];
            return;
        }

        // Módulos específicos para auditor
        this.availableModules = [
            {
                id: 'dashboard',
                title: 'Dashboard',
                description: 'Panel principal del sistema',
                path: '/dashboard',
                route: '/dashboard',
                icon: 'dashboard',
                requiredRole: UserRole.AUDITOR_CUENTAS,
                isActive: true
            },
            {
                id: 'pendientes',
                title: 'Documentos Pendientes',
                description: 'Documentos disponibles para auditoría',
                path: '/auditor/pendientes',
                route: '/auditor/pendientes',
                icon: 'clock',
                requiredRole: UserRole.AUDITOR_CUENTAS,
                isActive: true
            },
            {
                id: 'mis-documentos',
                title: 'Mis Documentos',
                description: 'Documentos en revisión',
                path: '/auditor/mis-documentos',
                route: '/auditor/mis-documentos',
                icon: 'assignment',
                requiredRole: UserRole.AUDITOR_CUENTAS,
                isActive: true
            },
            {
                id: 'historial',
                title: 'Historial',
                description: 'Historial de auditorías',
                path: '/auditor/historial',
                route: '/auditor/historial',
                icon: 'history',
                requiredRole: UserRole.AUDITOR_CUENTAS,
                isActive: true
            },
            {
                id: 'Rechazados',
                title: 'Rechazados',
                description: 'Rechazados de auditoría',
                path: '/auditor/lista-rechazados',
                route: '/auditor/lista-rechazados',
                icon: 'chart-bar',
                requiredRole: UserRole.AUDITOR_CUENTAS,
                isActive: true
            },
            {
                id: 'estadisticas',
                title: 'Estadísticas',
                description: 'Estadísticas de auditoría',
                path: '/auditor/estadisticas',
                route: '/auditor/estadisticas',
                icon: 'chart-bar',
                requiredRole: UserRole.AUDITOR_CUENTAS,
                isActive: true
            }
        ];

        console.log('📋 Módulos disponibles para auditor:', this.availableModules);
    }

    getUserRoleName(): string {
        if (!this.currentUser) {
            return 'Auditor';
        }
        return getUserRoleName(this.currentUser.role);
    }

    esAuditor(): boolean {
        return this.currentUser?.role === UserRole.AUDITOR_CUENTAS || this.currentUser?.role === UserRole.ADMIN;
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
            case 'APROBADO_SUPERVISOR':
                return 'aprobado-supervisor';
            case 'EN_REVISION_AUDITOR':
                return 'en-revision-auditor';
            case 'APROBADO_AUDITOR':
                return 'aprobado-auditor';
            case 'OBSERVADO_AUDITOR':
                return 'observado-auditor';
            case 'RECHAZADO_AUDITOR':
                return 'rechazado-auditor';
            case 'COMPLETADO_AUDITOR':
                return 'completado-auditor';
            default:
                return 'default';
        }
    }
}