// src/app/core/models/user.types.ts

// ENUM de roles
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

// Función para obtener el valor string del enum
export function getUserRoleValue(role: UserRole): string {
  return role.toString();
}

// Función auxiliar para obtener el nombre del rol
export function getUserRoleName(role: UserRole | string): string {
  // Convertir a string primero
  let roleStr: string;
  if (typeof role === 'string') {
    roleStr = role;
  } else {
    // Para un enum, usar el valor directamente
    roleStr = getUserRoleValue(role);
  }
  
  const roleNames: Record<string, string> = {
    'admin': 'Administrador',
    'radicador': 'Radicador',
    'supervisor': 'Supervisor',
    'auditor_cuentas': 'Auditor de Cuentas',
    'contabilidad': 'Contabilidad',
    'tesoreria': 'Tesorería',
    'tesorería': 'Tesorería',
    'asesor_gerencia': 'Asesor de Gerencia',
    'rendicion_cuentas': 'Rendición de Cuentas',
    'rendición_cuentas': 'Rendición de Cuentas'
  };
  
  return roleNames[roleStr.toLowerCase()] || 'Usuario';
}

// Función para normalizar el rol a mayúsculas (para comparaciones)
export function normalizeRole(role: UserRole | string): string {
  let roleStr: string;
  if (typeof role === 'string') {
    roleStr = role;
  } else {
    roleStr = getUserRoleValue(role);
  }
  return roleStr.toUpperCase();
}

// Función para convertir string a UserRole
export function stringToUserRole(roleStr: string): UserRole {
  const lowerRole = roleStr.toLowerCase();
  
  switch (lowerRole) {
    case 'admin':
      return UserRole.ADMIN;
    case 'radicador':
      return UserRole.RADICADOR;
    case 'supervisor':
      return UserRole.SUPERVISOR;
    case 'auditor_cuentas':
    case 'auditor_cuenta':
      return UserRole.AUDITOR_CUENTAS;
    case 'contabilidad':
      return UserRole.CONTABILIDAD;
    case 'tesoreria':
    case 'tesorería':
      return UserRole.TESORERIA;
    case 'asesor_gerencia':
      return UserRole.ASESOR_GERENCIA;
    case 'rendicion_cuentas':
    case 'rendición_cuentas':
      return UserRole.RENDICION_CUENTAS;
    default:
      // Verificar si es un valor válido del enum
      const validValues = Object.values(UserRole) as string[];
      if (validValues.includes(lowerRole)) {
        return lowerRole as UserRole;
      }
      return UserRole.RADICADOR; // Valor por defecto
  }
}

// INTERFAZ User
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

// INTERFAZ CreateUserRequest
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role: UserRole;
  isActive?: boolean;
}

// INTERFAZ UpdateUserRequest
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

// INTERFAZ UsersStats
export interface UsersStats {
  total: number;
  active: number;
  inactive: number;
  byRole: { [key: string]: number };
}

// INTERFAZ PaginatedUsersResponse
export interface PaginatedUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// INTERFAZ LoginRequest
export interface LoginRequest {
  username: string;
  password: string;
}

// INTERFAZ LoginResponse
export interface LoginResponse {
  token?: string;
  access_token?: string;
  user?: User;
  userId?: string;
  requiresTwoFactor?: boolean;
  message?: string;
}

// INTERFAZ TwoFactorRequest
export interface TwoFactorRequest {
  userId: string;
  code: string;
}

// INTERFAZ TwoFactorResponse
export interface TwoFactorResponse {
  token?: string;
  access_token?: string;
  user?: User;
  message?: string;
}

// Alias para compatibilidad
export type UsersResponse = PaginatedUsersResponse;