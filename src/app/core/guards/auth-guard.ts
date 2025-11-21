import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (this.auth.isAuthenticated()) {
      console.log('🔐 AuthGuard: User is authenticated, allowing access');
      return true;
    } else {
      console.log('🔐 AuthGuard: User not authenticated, redirecting to login');
      this.router.navigate(['/auth/login']);
      return false;
    }
  }
}