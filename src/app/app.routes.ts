// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';
import { TwoFactorGuard } from './core/guards/two-factor.guard';
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
    data: { roles: ['admin', 'radicador'] } // ← en minúscula
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