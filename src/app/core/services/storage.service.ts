import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage: Storage;

  constructor() {
    this.storage = localStorage; // Puedes cambiar a sessionStorage si prefieres
  }

  setItem(key: string, value: any): void {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    this.storage.setItem(key, stringValue);
  }

  getItem<T>(key: string): T | null {
    const value = this.storage.getItem(key);
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return value as T | null;
    }
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }

  // Métodos específicos para autenticación
  getToken(): string | null {
    return this.getItem<string>('token');
  }

  getUser(): any {
    return this.getItem<any>('user');
  }

  setToken(token: string): void {
    this.setItem('token', token);
  }

  setUser(user: any): void {
    this.setItem('user', user);
  }

  clearAuth(): void {
    this.removeItem('token');
    this.removeItem('user');
  }
}