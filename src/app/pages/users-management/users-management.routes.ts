import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth-guard';
import { UsersManagementComponent } from './users-management.component';
import { UserFormComponent } from './components/user-form/user-form.component';

export const usersManagementRoutes: Routes = [
  {
    path: '', // Esto corresponde a /gestion-usuarios
    component: UsersManagementComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'nuevo', // Esto corresponde a /gestion-usuarios/nuevo
    component: UserFormComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'editar/:id', // Esto corresponde a /gestion-usuarios/editar/:id
    component: UserFormComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }
  }
];