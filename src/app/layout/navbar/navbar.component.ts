// navbar.component.ts - COMPLETO CORREGIDO
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { User, UserRole } from '../../core/models/user.types';
import { AuthService } from '../../core/services/auth.service';
import { TokenUtils } from '../../core/utils/token.util';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | null = null;
  @Input() sidebarCollapsed: boolean = false;
  @Output() logout = new EventEmitter<void>();
  @Output() toggleSidebar = new EventEmitter<boolean>();

  currentPageTitle: string = 'Dashboard';
  currentPageSubtitle: string = 'Panel principal';
  currentUrl: string = '';

  timeRemaining: string = '30:00';
  timePercentage: number = 100;
  private subscriptions: Subscription = new Subscription();
  private manualInterval: any;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.updateTitle();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateTitle();
      }
    });

    // SUSCRIPCIÓN PRINCIPAL AL SUBJECT
    this.subscriptions.add(
      this.authService.timeRemaining$.subscribe(seconds => {
       
        this.ngZone.run(() => {
          if (seconds > 0) {
            this.updateTimeDisplay(seconds);
          } else if (seconds === 0) {
            this.timeRemaining = '00:00';
            this.timePercentage = 0;
          }
          this.cdr.detectChanges();
        });
      })
    );

    // ACTUALIZACIÓN MANUAL CADA SEGUNDO (FALLBACK)
    this.startManualUpdates();
  }

  private startManualUpdates(): void {
    this.manualInterval = setInterval(() => {
      const token = this.authService.getToken();
      if (token) {
        const timeLeft = TokenUtils.getTimeToExpiration(token);
        if (timeLeft > 0) {
          const currentDisplay = this.timeRemaining;
          const newDisplay = this.formatTime(timeLeft);
          if (currentDisplay !== newDisplay) {
            
            this.ngZone.run(() => {
              this.updateTimeDisplay(timeLeft);
              this.cdr.detectChanges();
            });
          }
        }
      }
    }, 1000);
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private updateTimeDisplay(seconds: number): void {
    const newTimeRemaining = this.formatTime(seconds);
    const newPercentage = (seconds / 1800) * 100;

  

    if (this.timeRemaining !== newTimeRemaining) {
      this.timeRemaining = newTimeRemaining;
      this.timePercentage = newPercentage;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
    if (this.manualInterval) {
      clearInterval(this.manualInterval);
    }
  }

  onLogout(): void {
    this.logout.emit();
  }

  isDashboardPage(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/dashboard' || url === '/' || url === '';
  }

  isUserManagementPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/gestion-usuarios' ||
      cleanUrl === '/gestion-usuarios/nuevo' ||
      cleanUrl.startsWith('/gestion-usuarios/editar/');
  }

  isRadicacionPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/radicacion' ||
      cleanUrl === '/radicacion/nuevo' ||
      cleanUrl.startsWith('/radicacion/editar/');
  }

  isSupervisorPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/supervisor' ||
      cleanUrl === '/supervisor/pendientes' ||
      cleanUrl === '/supervisor/historial' ||
      cleanUrl === '/supervisor/estadisticas' ||
      cleanUrl.startsWith('/supervisor/revisar/');
  }

  isAuditorPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/auditor' ||
      cleanUrl === '/auditor/disponibles' ||
      cleanUrl === '/auditor/en-revision' ||
      cleanUrl === '/auditor/historial' ||
      cleanUrl === '/auditor/estadisticas' ||
      cleanUrl.startsWith('/auditor/revisar/') ||
      cleanUrl.startsWith('/auditor/documentos/');
  }

  isContabilidadPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/contabilidad' ||
      cleanUrl === '/contabilidad/pendientes' ||
      cleanUrl.startsWith('/contabilidad/procesar/');
  }

  isContratistasPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/contratistas' ||
      cleanUrl === '/contratistas/list' ||
      cleanUrl.startsWith('/contratistas/ver/') ||
      cleanUrl.startsWith('/contratistas/editar/') ||
      cleanUrl.startsWith('/contratistas/crear') ||
      cleanUrl.startsWith('/contratistas/documentos/');
  }

  isJuridicaPage(): boolean {
    const cleanUrl = this.currentUrl || this.router.url.split('?')[0];
    return cleanUrl === '/juridica' ||
      cleanUrl === '/juridica/list' ||
      cleanUrl === '/juridica/nuevo' ||
      cleanUrl.startsWith('/juridica/editar/') ||
      cleanUrl.startsWith('/juridica/ver/') ||
      cleanUrl === '/juridica/estadisticas' ||
      cleanUrl === '/juridica/dashboard';
  }

  private updateTitle() {
    this.currentUrl = this.router.url.split('?')[0];
    const cleanUrl = this.currentUrl;

    if (this.isDashboardPage()) {
      this.currentPageTitle = 'Dashboard';
      this.currentPageSubtitle = 'Panel principal';
      return;
    }

    if (this.isContratistasPage()) {
      if (cleanUrl === '/contratistas/list' || cleanUrl === '/contratistas') {
        this.currentPageTitle = 'Lista Contratistas';
        this.currentPageSubtitle = 'Gestión de contratistas';
      } else if (cleanUrl === '/contratistas/crear') {
        this.currentPageTitle = 'Nuevo Contratista';
        this.currentPageSubtitle = 'Registro de contratista';
      } else if (cleanUrl.startsWith('/contratistas/editar/')) {
        this.currentPageTitle = 'Editar Contratista';
        this.currentPageSubtitle = 'Modificar información';
      } else if (cleanUrl.startsWith('/contratistas/ver/')) {
        this.currentPageTitle = 'Detalle Contratista';
        this.currentPageSubtitle = 'Información completa';
      } else if (cleanUrl.startsWith('/contratistas/documentos/')) {
        this.currentPageTitle = 'Documentos';
        this.currentPageSubtitle = 'Archivos del contratista';
      } else {
        this.currentPageTitle = 'Contratistas';
        this.currentPageSubtitle = 'Gestión de contratistas';
      }
      return;
    }

    if (this.isJuridicaPage()) {
      if (cleanUrl === '/juridica' || cleanUrl === '/juridica/list') {
        this.currentPageTitle = 'Lista de Contratos';
        this.currentPageSubtitle = 'Gestión de contratos';
      } else if (cleanUrl === '/juridica/nuevo') {
        this.currentPageTitle = 'Nuevo Contrato';
        this.currentPageSubtitle = 'Creación de contrato';
      } else if (cleanUrl === '/juridica/estadisticas') {
        this.currentPageTitle = 'Estadísticas';
        this.currentPageSubtitle = 'Estadísticas de contratos';
      } else if (cleanUrl === '/juridica/dashboard') {
        this.currentPageTitle = 'Dashboard Jurídica';
        this.currentPageSubtitle = 'Panel de control de contratos';
      } else if (cleanUrl.startsWith('/juridica/editar/')) {
        this.currentPageTitle = 'Editar Contrato';
        this.currentPageSubtitle = 'Modificación de contrato';
      } else if (cleanUrl.startsWith('/juridica/ver/')) {
        this.currentPageTitle = 'Detalle de Contrato';
        this.currentPageSubtitle = 'Información del contrato';
      } else {
        this.currentPageTitle = 'Jurídica';
        this.currentPageSubtitle = 'Gestión de contratos';
      }
      return;
    }

    const titleMap: Record<string, { title: string, subtitle?: string }> = {
      '/gestion-usuarios': { title: 'Gestión de Usuarios', subtitle: 'Administración de usuarios' },
      '/gestion-usuarios/nuevo': { title: 'Nuevo Usuario', subtitle: 'Administración de usuarios' },
      '/radicacion': { title: 'Radicación', subtitle: 'Radicación de documentos' },
      '/radicacion/nuevo': { title: 'Nueva Radicación', subtitle: 'Radicación de documentos' },
      '/radicacion/lista': { title: 'Lista de Radicaciones', subtitle: 'Radicación de documentos' },
      '/radicacion/mis-radicaciones': { title: 'Mis Radicaciones', subtitle: 'Radicación de documentos' },
      '/radicacion/rechazados': { title: 'Documentos Rechazados', subtitle: 'Radicación de documentos' },
      '/supervisor': { title: 'Supervisión', subtitle: 'Revisión y aprobación de documentos' },
      '/supervisor/pendientes': { title: 'Pendientes de Supervisión', subtitle: 'Documentos pendientes de revisión' },
      '/supervisor/historial': { title: 'Historial de Supervisión', subtitle: 'Historial de supervisiones realizadas' },
      '/supervisor/estadisticas': { title: 'Estadísticas de Supervisión', subtitle: 'Estadísticas de actividad' },
      '/auditor': { title: 'Auditor de Cuentas', subtitle: 'Auditoría de documentos contables' },
      '/auditor/disponibles': { title: 'Documentos Disponibles', subtitle: 'Documentos para auditoría' },
      '/auditor/en-revision': { title: 'En Revisión', subtitle: 'Documentos en auditoría' },
      '/auditor/historial': { title: 'Historial de Auditoría', subtitle: 'Historial de auditorías realizadas' },
      '/auditor/estadisticas': { title: 'Estadísticas de Auditoría', subtitle: 'Estadísticas de actividad' },
      '/reportes': { title: 'Reportes', subtitle: 'Reportes y estadísticas del sistema' },
      '/contabilidad': { title: 'Contabilidad', subtitle: 'Gestión contable' },
      '/tesoreria': { title: 'Tesorería', subtitle: 'Gestión de tesorería' },
      '/asesor-gerencia': { title: 'Asesoría de Gerencia', subtitle: 'Revisión gerencial de documentos' },
      '/rendicion-cuentas': { title: 'Rendición de Cuentas', subtitle: 'Proceso de rendición de cuentas' },
      '/configuracion': { title: 'Configuración', subtitle: 'Configuración del sistema' }
    };

    if (titleMap[cleanUrl]) {
      this.currentPageTitle = titleMap[cleanUrl].title;
      this.currentPageSubtitle = titleMap[cleanUrl].subtitle || '';
      return;
    }

    if (cleanUrl.startsWith('/gestion-usuarios/editar/')) {
      this.currentPageTitle = 'Editar Usuario';
      this.currentPageSubtitle = 'Administración de usuarios';
      return;
    }

    if (cleanUrl.startsWith('/radicacion/editar/')) {
      this.currentPageTitle = 'Editar Radicado';
      this.currentPageSubtitle = 'Radicación de documentos';
      return;
    }

    if (cleanUrl.startsWith('/supervisor/revisar/')) {
      this.currentPageTitle = 'Revisar Documento';
      this.currentPageSubtitle = 'Supervisión de documento';
      return;
    }

    if (cleanUrl.startsWith('/auditor/revisar/')) {
      this.currentPageTitle = 'Revisar Documento';
      this.currentPageSubtitle = 'Auditoría de documento';
      return;
    }

    if (cleanUrl.startsWith('/auditor/documentos/')) {
      this.currentPageTitle = 'Detalle de Documento';
      this.currentPageSubtitle = 'Auditoría de cuentas';
      return;
    }

    if (this.isContabilidadPage()) {
      this.currentPageTitle = 'Contabilidad';
      this.currentPageSubtitle = 'Gestión contable y glosas';
      return;
    }

    const segments = cleanUrl.split('/').filter(seg => seg.trim() !== '');
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      this.currentPageTitle = this.formatToTitle(lastSegment);
      this.currentPageSubtitle = '';
    } else {
      this.currentPageTitle = 'Dashboard';
      this.currentPageSubtitle = 'Panel principal';
    }
  }

  private formatToTitle(text: string): string {
    return text
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  getUserRoleName(role: UserRole | undefined | null): string {
    if (!role) return 'Usuario';

    const roleNames: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.RADICADOR]: 'Radicador',
      [UserRole.SUPERVISOR]: 'Supervisor',
      [UserRole.AUDITOR_CUENTAS]: 'Auditor de Cuentas',
      [UserRole.CONTABILIDAD]: 'Contabilidad',
      [UserRole.TESORERIA]: 'Tesorería',
      [UserRole.ASESOR_GERENCIA]: 'Asesor de Gerencia',
      [UserRole.RENDICION_CUENTAS]: 'Rendición de Cuentas',
      [UserRole.JURIDICA]: 'Jurídica'
    };
    return roleNames[role] || role;
  }
}