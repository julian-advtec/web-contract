import { Routes } from '@angular/router';
import { TwoFactorGuard } from '../core/guards/two-factor.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'verify-2fa',
    loadComponent: () => import('./pages/verify-2fa/verify-2fa.component')
      .then(m => m.Verify2faComponent),
    canActivate: [TwoFactorGuard]  // ✅ AGREGA EL GUARD AQUÍ
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.component')
      .then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password/:token',
    loadComponent: () => import('./pages/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];