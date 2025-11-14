// two-factor.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TwoFactorGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    // Permitir acceso si hay una autenticación pendiente (2FA)
    if (this.auth.hasPendingAuth()) {
      return true;
    } else {
      this.router.navigate(['/auth/login']);
      return false;
    }
  }
}