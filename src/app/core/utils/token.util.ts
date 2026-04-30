// src/app/core/utils/token.utils.ts
import { jwtDecode } from 'jwt-decode';

export interface JwtPayload {
  sub: string;
  userId?: string;
  id?: string;
  username: string;
  role: string;
  email?: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

export class TokenUtils {
  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;
    
    if (isExpired) {
      console.log(`Token expirado: exp=${new Date(payload.exp * 1000).toISOString()}, now=${new Date().toISOString()}`);
    }
    
    return isExpired;
  }

  static getTokenExpiration(token: string): Date | null {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return null;
    
    return new Date(payload.exp * 1000);
  }

  static getTimeToExpiration(token: string): number {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return 0;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLeft = Math.max(0, payload.exp - currentTime);
    
    return timeLeft;
  }

  static getUserIdFromToken(token: string): string | null {
    const payload = this.decodeToken(token);
    return payload?.userId || payload?.id || payload?.sub || null;
  }

  static getUserRoleFromToken(token: string): string | null {
    const payload = this.decodeToken(token);
    return payload?.role || null;
  }

  static getUsernameFromToken(token: string): string | null {
    const payload = this.decodeToken(token);
    return payload?.username || null;
  }

  static isValidToken(token: string): boolean {
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  static getTokenData(token: string): {
    userId: string | null;
    role: string | null;
    username: string | null;
    email: string | null;
    expiresAt: Date | null;
  } {
    const payload = this.decodeToken(token);
    
    return {
      userId: payload?.userId || payload?.id || payload?.sub || null,
      role: payload?.role || null,
      username: payload?.username || null,
      email: payload?.email || null,
      expiresAt: payload?.exp ? new Date(payload.exp * 1000) : null
    };
  }
}