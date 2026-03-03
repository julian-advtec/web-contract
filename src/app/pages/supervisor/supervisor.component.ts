// src/app/pages/supervisor/supervisor.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { User, UserRole, getUserRoleName, stringToUserRole } from '../../core/models/user.types';
import { ModulesService, AppModule } from '../../core/services/modules.service';
import { filter } from 'rxjs/operators';

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
    currentPageTitle: string = '';

    // Propiedades para mensajes
    errorMessage = '';
    successMessage = '';

    constructor(
        private authService: AuthService,
        private modulesService: ModulesService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        // Escuchar cambios de ruta para actualizar el título
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.updatePageTitle();
        });
    }

    ngOnInit(): void {
        console.log('🚀 Inicializando componente de supervisor...');
        this.verificarAutenticacion();
        this.loadCurrentUser();
        this.loadAvailableModules();
        this.updatePageTitle();
    }

    ngOnDestroy(): void {
        console.log('🧹 Destruyendo componente de supervisor');
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

        // Módulos completos para supervisor
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
                id: 'mis-documentos',
                title: 'Mis Supervisiones',
                description: 'Documentos que estoy revisando',
                path: '/supervisor/mis-documentos',
                route: '/supervisor/mis-documentos',
                icon: 'folder-open',
                requiredRole: UserRole.SUPERVISOR,
                isActive: true
            },
            {
                id: 'rechazados',
                title: 'Rechazados',
                description: 'Documentos rechazados',
                path: '/supervisor/rechazados',
                route: '/supervisor/rechazados',
                icon: 'times-circle',
                requiredRole: UserRole.SUPERVISOR,
                isActive: true
            },
            {
                id: 'historial',
                title: 'Historial',
                description: 'Historial completo de revisiones',
                path: '/supervisor/historial',
                route: '/supervisor/historial',
                icon: 'history',
                requiredRole: UserRole.SUPERVISOR,
                isActive: true
            },
            {
                id: 'estadisticas',
                title: 'Estadísticas',
                description: 'Métricas y estadísticas',
                path: '/supervisor/estadisticas',
                route: '/supervisor/estadisticas',
                icon: 'chart-bar',
                requiredRole: UserRole.SUPERVISOR,
                isActive: true
            }
        ];

        console.log('📋 Módulos disponibles para supervisor:', this.availableModules);
    }

    updatePageTitle(): void {
        // Obtener el título de la ruta activa
        const child = this.route.firstChild;
        if (child && child.snapshot.data['title']) {
            this.currentPageTitle = child.snapshot.data['title'];
        } else {
            // Título por defecto según la URL
            const url = this.router.url;
            if (url.includes('pendientes')) this.currentPageTitle = 'Documentos Pendientes';
            else if (url.includes('mis-documentos')) this.currentPageTitle = 'Mis Supervisiones';
            else if (url.includes('rechazados')) this.currentPageTitle = 'Documentos Rechazados';
            else if (url.includes('historial')) this.currentPageTitle = 'Historial';
            else if (url.includes('estadisticas')) this.currentPageTitle = 'Estadísticas';
            else if (url.includes('revisar')) this.currentPageTitle = 'Revisar Documento';
            else this.currentPageTitle = 'Panel de Supervisor';
        }
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

    // Métodos de utilidad
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
            case 'APROBADO_SUPERVISOR':
                return 'aprobado';
            case 'RECHAZADO':
            case 'RECHAZADO_SUPERVISOR':
                return 'rechazado';
            case 'EN_REVISION':
            case 'EN_REVISION_SUPERVISOR':
                return 'en-revision';
            case 'OBSERVADO':
            case 'OBSERVADO_SUPERVISOR':
                return 'observado';
            default:
                return 'default';
        }
    }

    getInitials(): string {
        if (!this.currentUser) return 'S';
        
        if (this.currentUser.fullName) {
            const names = this.currentUser.fullName.split(' ');
            if (names.length >= 2) {
                return (names[0][0] + names[1][0]).toUpperCase();
            }
            return this.currentUser.fullName.substring(0, 2).toUpperCase();
        }
        
        return this.currentUser.username?.substring(0, 2).toUpperCase() || 'S';
    }
}