// core/guards/two-factor.guard.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TwoFactorGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.hasPendingAuth()) {
      return true;
    } else {
      this.router.navigate(['/auth/login']);
      return false;
    }
  }
}