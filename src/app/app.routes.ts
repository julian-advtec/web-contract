// app.routes.ts
import { Routes } from '@angular/router';
// Importar con el nombre correcto (con mayúscula)
import { AuthGuard } from './core/guards/auth-guard';
import { TwoFactorGuard } from './core/guards/two-factor.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard] // Usar AuthGuard con mayúscula
  },
  {
    path: 'gestion-usuarios', // Cambiado de 'users' a 'gestion-usuarios'
    loadComponent: () => import('./pages/users-management/users-management.component').then(m => m.UsersManagementComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'two-factor',
    loadComponent: () => import('./auth/pages/verify-2fa/verify-2fa.component').then(m => m.Verify2faComponent),
    canActivate: [TwoFactorGuard]
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