import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean | UrlTree {
    const isAuthenticated = this.auth.isAuthenticated();
    const hasPending2FA = this.auth.hasPendingAuth();

    // 🔹 Si no está autenticado, enviarlo al login
    if (!isAuthenticated) {
      return this.router.parseUrl('/auth/login');
    }

    // 🔹 Si hay 2FA pendiente, redirigir a /auth/verify-2fa
    if (hasPending2FA) {
      return this.router.parseUrl('/auth/verify-2fa');
    }

    // 🔹 Autenticado y sin 2FA pendiente → puede acceder
    return true;
  }
}
