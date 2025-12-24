import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';
import { RoleGuard } from './core/guards/role.guard';

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
  {
    path: 'radicacion',
    loadComponent: () => import('./pages/radicacion/radicacion.component').then(m => m.RadicacionComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'radicador'] },
    children: [
      {
        path: '',
        redirectTo: 'lista',
        pathMatch: 'full'
      },
      {
        path: 'lista',
        loadComponent: () => import('./pages/radicacion/components/radicacion-list/radicacion-list.component')
          .then(m => m.RadicacionListComponent)
      },
      {
        path: 'nuevo',  // ✅ RUTA CORREGIDA: Este es el componente de formulario
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
  },
  {
    path: 'supervisor',
    loadChildren: () => import('./pages/supervisor/supervisor-routing.module').then(m => m.SupervisorRoutingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['supervisor', 'admin'] }
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