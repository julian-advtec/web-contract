// app.routes.ts - VERSIÓN CORREGIDA Y OPTIMIZADA
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';
import { RoleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/user.types';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard],
    data: { title: 'Dashboard' }
  },
  {
    path: 'gestion-usuarios',
    loadChildren: () => import('./pages/users-management/users-management.routes').then(m => m.usersManagementRoutes),
    canActivate: [AuthGuard],
    data: { roles: [UserRole.ADMIN], title: 'Gestión de Usuarios' }
  },
  {
    path: 'radicacion',
    loadChildren: () => import('./pages/radicacion/radicacion-routing.module').then(m => m.RadicacionRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.RADICADOR, UserRole.ADMIN], title: 'Radicación' }
  },
  {
    path: 'supervisor',
    loadChildren: () => import('./pages/supervisor/supervisor-routing.module').then(m => m.SupervisorRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.SUPERVISOR, UserRole.ADMIN], title: 'Supervisión' }
  },
  {
    path: 'auditor',
    loadChildren: () => import('./pages/auditor/auditor-routing.module').then(m => m.AuditorRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.AUDITOR_CUENTAS, UserRole.ADMIN], title: 'Auditoría' }
  },
  {
    path: 'contabilidad',
    loadChildren: () => import('./pages/contabilidad/contabilidad-routing.module').then(m => m.ContabilidadRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.CONTABILIDAD, UserRole.ADMIN], title: 'Contabilidad' }
  },
  {
    path: 'tesoreria',
    loadChildren: () => import('./pages/tesoreria/tesoreria-routing.module').then(m => m.TesoreriaRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.TESORERIA, UserRole.ADMIN], title: 'Tesorería' }
  },
  {
    path: 'asesor-gerencia',
    loadChildren: () => import('./pages/asesor-gerencia/asesor-gerencia-routing.module').then(m => m.AsesorGerenciaComponentRoutes),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.ASESOR_GERENCIA, UserRole.ADMIN], title: 'Asesoría de Gerencia' }
  },
  {
    path: 'rendicion-cuentas',
    loadChildren: () => import('./pages/rendicion-cuentas/rendicion-cuentas-routing.module').then(m => m.RendicionCuentasRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.RENDICION_CUENTAS, UserRole.ADMIN], title: 'Rendición de Cuentas' }
  },
  {
    path: 'juridica',
    loadChildren: () => import('./pages/juridica/juridica.module').then(m => m.JuridicaModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      roles: [UserRole.JURIDICA, UserRole.ADMIN], 
      title: 'Gestión Jurídica' 
    }
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];