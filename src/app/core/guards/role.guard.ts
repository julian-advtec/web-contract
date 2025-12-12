// src/app/core/guards/role.guard.ts
import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      return this.router.createUrlTree(['/auth/login']);
    }

    const requiredRoles = route.data['roles'] as string[];
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const userRole = currentUser.role;
    
    // Verificar si el usuario tiene alguno de los roles requeridos
    const hasRequiredRole = requiredRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      console.warn(`Usuario con rol ${userRole} intentó acceder a ruta que requiere: ${requiredRoles.join(', ')}`);
      alert('No tienes permisos para acceder a esta sección');
      return this.router.createUrlTree(['/dashboard']);
    }

    return true;
  }
}