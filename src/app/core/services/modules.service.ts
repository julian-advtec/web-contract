// src/app/core/services/modules.service.ts
import { Injectable } from '@angular/core';
import { UserRole } from '../models/user.types';

export interface AppModule {
  id: string;
  title: string;
  description: string;
  path: string;
  route?: string;
  icon: string;
  requiredRole: UserRole;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModulesService {
  private allModules: AppModule[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Panel principal del sistema',
      path: '/dashboard',
      route: '/dashboard',
      icon: 'dashboard',
      requiredRole: UserRole.RADICADOR,
      isActive: true
    },
    {
      id: 'gestion-usuarios',
      title: 'Gestión de Usuarios',
      description: 'Administrar usuarios del sistema',
      path: '/gestion-usuarios',
      route: '/gestion-usuarios',
      icon: 'gestion-usuarios',
      requiredRole: UserRole.ADMIN,
      isActive: true
    },
    {
      id: 'radicacion',
      title: 'Radicación',
      description: 'Gestión de documentos radicados',
      path: '/radicacion',
      route: '/radicacion',
      icon: 'radicacion',
      requiredRole: UserRole.RADICADOR,
      isActive: true
    },
    {
      id: 'supervisor',
      title: 'Supervisor',
      description: 'Supervisor de procesos',
      path: '/supervisor',
      route: '/supervisor',
      icon: 'supervisor',
      requiredRole: UserRole.SUPERVISOR,
      isActive: true
    },
    {
      id: 'auditoria',
      title: 'Auditoría',
      description: 'Auditoría de cuentas',
      path: '/auditor',
      route: '/auditoria',
      icon: 'auditoria',
      requiredRole: UserRole.AUDITOR_CUENTAS,
      isActive: true
    },
    {
      id: 'contabilidad',
      title: 'Contabilidad',
      description: 'Módulo de contabilidad',
      path: '/contabilidad',
      route: '/contabilidad',
      icon: 'contabilidad',
      requiredRole: UserRole.CONTABILIDAD,
      isActive: true
    },
    {
      id: 'tesoreria',
      title: 'Tesorería',
      description: 'Módulo de tesorería',
      path: '/tesoreria',
      route: '/tesoreria',
      icon: 'tesoreria',
      requiredRole: UserRole.TESORERIA,
      isActive: true
    },
    {
      id: 'asesor-gerencia',
      title: 'Asesor Gerencia',
      description: 'Módulo de asesoría',
      path: '/asesor-gerencia',
      route: '/asesor-gerencia',
      icon: 'asesor-gerencia',
      requiredRole: UserRole.ASESOR_GERENCIA,
      isActive: true
    },
    {
      id: 'rendicion-cuentas',
      title: 'Rendición Cuentas',
      description: 'Rendición de cuentas',
      path: '/rendicion-cuentas',
      route: '/rendicion-cuentas',
      icon: 'rendicion-cuentas',
      requiredRole: UserRole.RENDICION_CUENTAS,
      isActive: true
    },
    {
      id: 'juridica',
      title: 'Jurídica',
      description: 'Gestión de contratos',
      path: '/juridica',
      route: '/juridica',
      icon: 'juridica',
      requiredRole: UserRole.JURIDICA,
      isActive: true
    },
    // ✅ NUEVO MÓDULO DE CONTRATISTAS
    {
      id: 'contratistas',
      title: 'Contratistas',
      description: 'Gestión de contratistas y proveedores',
      path: '/contratistas',
      route: '/contratistas',
      icon: 'contratistas',
      requiredRole: UserRole.RADICADOR,
      isActive: true
    }
  ];

  constructor() { }

  getModulesForUser(userRole: UserRole): AppModule[] {
    return this.allModules.filter(module =>
      module.isActive &&
      this.userHasAccess(userRole, module.requiredRole)
    );
  }

  private userHasAccess(userRole: UserRole, requiredRole: UserRole): boolean {
    // ADMIN tiene acceso a todo
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Mapeo de jerarquías de roles
    const roleHierarchy: Record<UserRole, UserRole[]> = {
      [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.RADICADOR, UserRole.SUPERVISOR, UserRole.AUDITOR_CUENTAS,
        UserRole.CONTABILIDAD, UserRole.TESORERIA, UserRole.ASESOR_GERENCIA,
        UserRole.RENDICION_CUENTAS, UserRole.JURIDICA],
      [UserRole.RADICADOR]: [UserRole.RADICADOR],
      [UserRole.SUPERVISOR]: [UserRole.SUPERVISOR],
      [UserRole.AUDITOR_CUENTAS]: [UserRole.AUDITOR_CUENTAS],
      [UserRole.CONTABILIDAD]: [UserRole.CONTABILIDAD],
      [UserRole.TESORERIA]: [UserRole.TESORERIA],
      [UserRole.ASESOR_GERENCIA]: [UserRole.ASESOR_GERENCIA],
      [UserRole.RENDICION_CUENTAS]: [UserRole.RENDICION_CUENTAS],
      [UserRole.JURIDICA]: [UserRole.JURIDICA]
    };

    return roleHierarchy[userRole]?.includes(requiredRole) || false;
  }

  canAccessRoute(path: string, userRole: UserRole): boolean {
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    const userModules = this.getModulesForUser(userRole);
    const matchingModule = userModules.find(module =>
      path === module.path ||
      path.startsWith(module.path + '/')
    );

    return !!matchingModule;
  }

  getDefaultModules(): AppModule[] {
    return this.allModules.filter(module => module.id === 'dashboard');
  }

  getAllModules(): AppModule[] {
    return [...this.allModules];
  }

  getModuleById(id: string): AppModule | undefined {
    return this.allModules.find(module => module.id === id);
  }
}