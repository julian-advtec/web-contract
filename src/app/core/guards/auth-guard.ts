import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree,
} from '@angular/router';
import { StorageService } from '../services/storage.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private storage: StorageService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    const token = this.storage.getToken();
    if (!token) {
      return this.router.parseUrl('/auth/login');
    }
    return true;
  }
}
