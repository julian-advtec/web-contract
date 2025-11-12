import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class TwoFactorGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean | UrlTree {
    console.log('🛡️ TwoFactorGuard - Verificando...');
    
    if (this.auth.hasPendingAuth()) {
      console.log('🛡️ TwoFactorGuard - ACCESO PERMITIDO, hay usuario pendiente');
      return true;
    }
    
    console.log('🛡️ TwoFactorGuard - REDIRIGIENDO A LOGIN, no hay usuario pendiente');
    return this.router.parseUrl('/auth/login');
  }
}