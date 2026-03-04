import { AuditorRoutingModule } from './pages/auditor/auditor-routing.module';
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
    canActivate: [AuthGuard]
  },
  {
    path: 'gestion-usuarios',
    loadChildren: () => import('./pages/users-management/users-management.routes').then(m => m.usersManagementRoutes),
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }
  },
 /* {
    path: 'radicacion',
    loadComponent: () => import('./pages/radicacion/radicacion.component').then(m => m.RadicacionComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'radicador'] },
    children: [
      { path: '', redirectTo: 'lista', pathMatch: 'full' },
      {
        path: 'lista',
        loadComponent: () => import('./pages/radicacion/components/radicacion-list/radicacion-list.component')
          .then(m => m.RadicacionListComponent)
      },
      {
        path: 'nuevo',
        loadComponent: () => import('./pages/radicacion/components/radicacion-form/radicacion-form.component')
          .then(m => m.RadicacionFormComponent)
      },
      {
        path: 'mis-radicaciones',
        loadComponent: () => import('./pages/radicacion/components/mis-radicaciones/mis-radicaciones.component')
          .then(m => m.MisRadicacionesComponent)
      },
      {
        path: 'rechazados',
        loadComponent: () => import('./pages/radicacion/components/lista-rechazados/lista-rechazados.component')
          .then(m => m.ListaRechazadosComponent)
      }
    ]
  }, */

    {
    path: 'radicacion',
    loadChildren: () => import('./pages/radicacion/radicacion-routing.module').then(m => m.RadicacionRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['radicador', 'admin'] }
  },
  {
    path: 'supervisor',
    loadChildren: () => import('./pages/supervisor/supervisor-routing.module').then(m => m.SupervisorRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['supervisor', 'admin'] }
  },
  // ── MÓDULO DE AUDITOR ───────────────────────────────────────────────
  {
    path: 'auditor',
    loadChildren: () => import('./pages/auditor/auditor-routing.module').then(m => m.AuditorRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['auditor de Cuentas', 'admin'] }
  },
  // ─────────────────────────────────────────────────────────────────────
  {
    path: 'contabilidad',
    loadChildren: () => import('./pages/contabilidad/contabilidad-routing.module')
      .then(m => m.ContabilidadRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.CONTABILIDAD, UserRole.ADMIN] }
  },
  {
    path: 'tesoreria',
    loadChildren: () => import('./pages/tesoreria/tesoreria-routing.module')
      .then(m => m.TesoreriaRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.TESORERIA, UserRole.ADMIN] }
  },
  {
    path: 'asesor-gerencia',
    loadChildren: () => import('./pages/asesor-gerencia/asesor-gerencia-routing.module')
      .then(m => m.AsesorGerenciaComponentRoutes),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.ASESOR_GERENCIA, UserRole.ADMIN] }
  },
  // ── NUEVO MÓDULO DE RENDICIÓN DE CUENTAS ────────────────────────────
 {
  path: 'rendicion-cuentas',
  loadChildren: () => import('./pages/rendicion-cuentas/rendicion-cuentas-routing.module')
    .then(m => m.RendicionCuentasRoutingModule),
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: [UserRole.RENDICION_CUENTAS, UserRole.ADMIN] }
},
  // ────────────────────────────────────────────────────────────────────
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