import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private api: ApiService,
    private storage: StorageService
  ) {}

  async login(username: string, password: string) {
    const data = await this.api.post('auth/login', { username, password });
    this.storage.setToken(data.token);
    return data.user;
  }

  logout() {
    this.storage.clear();
  }
}
