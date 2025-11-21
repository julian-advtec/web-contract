// Enums y tipos compartidos entre frontend y backend
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
  role: UserRole;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  ok: boolean;
  success?: boolean;
  access_token?: string;
  token?: string;
  user?: User;
  message: string;
  requiresTwoFactor?: boolean;
  userId?: string;
  expiresIn?: string;
  data?: any;
  path?: string;
  timestamp?: string;
}