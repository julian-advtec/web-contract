import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

// Importar componentes de layout
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';

// Importar componentes de radicación
import { RadicacionFormComponent } from './components/radicacion-form/radicacion-form.component';
import { RadicacionListComponent } from './components/radicacion-list/radicacion-list.component';

// Importar tipos y servicios
import { User, UserRole, getUserRoleName, stringToUserRole } from '../../core/models/user.types';
import { AuthService } from '../../core/services/auth.service';
import { RadicacionService } from '../../core/services/radicacion.service';

@Component({
  selector: 'app-radicacion',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    SidebarComponent,
    NavbarComponent,
    RadicacionFormComponent,
    RadicacionListComponent
  ],
  templateUrl: './radicacion.component.html',
  styleUrls: ['./radicacion.component.scss']
})
export class RadicacionComponent implements OnInit {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  showForm = false;
  availableModules: any[] = [];
  puedeRadicar = false;
  puedeVer = false;
  
  // Propiedades para mensajes
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private radicacionService: RadicacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🚀 Inicializando componente de radicación...');
    this.verificarAutenticacion();
    this.loadCurrentUser();
    this.loadAvailableModules();
    this.verificarPermisos();
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
    
    console.log('✅ Usuario autenticado, token presente');
  }

  loadCurrentUser(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser = user;
      console.log('✅ Usuario cargado desde AuthService:', {
        username: user.username,
        role: user.role,
        fullName: user.fullName
      });
      
      // También verificar localmente si puede radicar
      this.puedeRadicar = this.userCanRadicar(user.role);
    } else {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          console.log('✅ Usuario cargado desde localStorage:', parsedUser);
          
          // Convertir el rol del localStorage al UserRole
          let normalizedRole: UserRole = UserRole.RADICADOR;
          
          if (parsedUser.role) {
            normalizedRole = stringToUserRole(parsedUser.role);
          }
          
          this.currentUser = {
            ...parsedUser,
            role: normalizedRole
          };
          
          console.log('✅ Usuario normalizado:', this.currentUser);
          
          // Verificar localmente si puede radicar
          this.puedeRadicar = this.userCanRadicar(normalizedRole);
          
        } catch (error) {
          console.error('❌ Error parseando usuario:', error);
          this.router.navigate(['/auth/login']);
        }
      } else {
        console.error('❌ No hay usuario autenticado');
        this.router.navigate(['/auth/login']);
      }
    }
  }

  verificarPermisos(): void {
    this.radicacionService.verificarPermisosUsuario().subscribe({
      next: (response) => {
        console.log('🔐 Respuesta de permisos:', response);
        
        // Verificar que la respuesta tenga el formato esperado
        if (response && response.success && response.data) {
          const permisos = response.data;
          console.log('🔐 Permisos del usuario:', permisos);
          
          // Usar los permisos del backend
          this.puedeRadicar = permisos.puedeRadicar;
          this.puedeVer = permisos.puedeVer;
          
          if (!this.puedeVer) {
            this.errorMessage = 'No tienes permisos para acceder a la radicación';
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 3000);
          }
        } else {
          console.warn('⚠️ Respuesta de permisos inesperada:', response);
          // Si falla la verificación del backend, usar la verificación local
          if (this.currentUser) {
            this.puedeRadicar = this.userCanRadicar(this.currentUser.role);
            this.puedeVer = this.puedeRadicar; // Asumir que si puede radicar, puede ver
          }
        }
      },
      error: (error) => {
        console.error('❌ Error verificando permisos:', error);
        // Si hay error, usar la verificación local
        if (this.currentUser) {
          this.puedeRadicar = this.userCanRadicar(this.currentUser.role);
          this.puedeVer = this.puedeRadicar;
        }
      }
    });
  }

  userCanRadicar(role: UserRole): boolean {
    console.log('🔍 Verificando si usuario puede radicar:', {
      role: role,
      roleName: getUserRoleName(role),
      esAdmin: role === UserRole.ADMIN,
      esRadicador: role === UserRole.RADICADOR,
      resultado: role === UserRole.RADICADOR || role === UserRole.ADMIN
    });
    
    return role === UserRole.RADICADOR || role === UserRole.ADMIN;
  }

  esAdmin(): boolean {
    return this.currentUser?.role === UserRole.ADMIN;
  }

  esRadicador(): boolean {
    return this.currentUser?.role === UserRole.RADICADOR;
  }

  puedeTestSistema(): boolean {
    // Solo admin puede testear el sistema
    return this.esAdmin();
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
        requiredRole: UserRole.RADICADOR,
        isActive: true
      },
      {
        id: 'radicacion',
        title: 'Radicación',
        description: 'Radicación de documentos',
        path: '/radicacion',
        route: '/radicacion',
        icon: 'file-alt',
        requiredRole: UserRole.RADICADOR,
        isActive: true
      }
    ];

    console.log('📋 Módulos disponibles:', this.availableModules);
  }

  // Esta función es solo para uso interno
  getUserRoleName(role: UserRole): string {
    return getUserRoleName(role);
  }

  onToggleSidebar(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleView(): void {
    this.showForm = !this.showForm;
    
    if (this.showForm) {
      // Verificar permisos antes de mostrar el formulario
      if (!this.puedeRadicar) {
        this.errorMessage = 'No tienes permisos para radicar documentos';
        this.showForm = false;
        setTimeout(() => {
          this.errorMessage = '';
        }, 3000);
      }
    }
  }

  onDocumentoRadicado(documento: any): void {
    console.log('✅ Documento radicado:', documento);
    this.showForm = false;
    this.successMessage = 'Documento radicado exitosamente';
    
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  onCancelarRadicacion(): void {
    this.showForm = false;
  }

  // Método para test del sistema
  testSistema(): void {
    console.log('🧪 Probando sistema...');
    
    this.radicacionService.testFilesystem().subscribe({
      next: (result) => {
        console.log('✅ Resultado test filesystem:', result);
        if (result.success) {
          this.successMessage = '✅ Sistema de archivos funcionando correctamente';
          setTimeout(() => {
            this.successMessage = '';
          }, 5000);
        } else {
          this.errorMessage = `❌ Error: ${result.message}`;
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      },
      error: (error) => {
        console.error('❌ Error en test:', error);
        this.errorMessage = '❌ No se pudo conectar con el backend';
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  // Métodos para manejar mensajes
  refreshData(): void {
    console.log('🔄 Actualizando datos...');
    // Emitir evento al componente hijo o recargar datos
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }
}