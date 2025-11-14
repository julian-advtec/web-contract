// src/app/app.routes.ts
import { Routes } from '@angular/router';
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
    canActivate: [AuthGuard]
  },
  { 
    path: 'verify-2fa', 
    loadComponent: () => import('./auth/pages/verify-2fa/verify-2fa.component').then(m => m.Verify2faComponent),
    canActivate: [TwoFactorGuard]
  },

  // 🔥 ESTE DEBE QUEDAR, pero al final
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // ❗❗ MOVER ESTA RUTA AL FINAL SIEMPRE ❗❗
  { path: '**', redirectTo: '/auth/login' }
];