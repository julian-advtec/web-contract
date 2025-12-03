// core/guards/role.guard.ts
import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ModulesService } from '../services/modules.service';
import { UserRole } from '../models/user.types';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard {
  constructor(
    private authService: AuthService,
    private modulesService: ModulesService,
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

    const currentPath = state.url.split('?')[0]; // Obtener path sin query params
    
    const canAccess = this.modulesService.canAccessRoute(
      currentPath,
      currentUser.role as UserRole
    );

    if (!canAccess) {
      alert('No tienes permisos para acceder a esta sección');
      return this.router.createUrlTree(['/dashboard']);
    }

    return true;
  }
}