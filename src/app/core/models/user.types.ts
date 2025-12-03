// src/app/core/models/user.types.ts
export enum UserRole {
  ADMIN = 'admin',
  RADICADOR = 'radicador',
  SUPERVISOR = 'supervisor',
  AUDITOR_CUENTAS = 'auditor_cuentas',
  CONTABILIDAD = 'contabilidad',
  TESORERIA = 'tesoreria',
  ASESOR_GERENCIA = 'asesor_gerencia',
  RENDICION_CUENTAS = 'rendicion_cuentas'
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastLogin?: Date | string;
  profileImage?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UsersStats {
  total: number;
  active: number;
  inactive: number;
  byRole: { [key: string]: number };
}

export interface PaginatedUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  access_token?: string;
  user?: User;
  userId?: string;
  requiresTwoFactor?: boolean;
  message?: string;
}

export interface TwoFactorRequest {
  userId: string;
  code: string;
}

export interface TwoFactorResponse {
  token?: string;
  access_token?: string;
  user?: User;
  message?: string;
}

// Alias para compatibilidad
export type UsersResponse = PaginatedUsersResponse;