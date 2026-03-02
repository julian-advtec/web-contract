// src/app/pages/supervisor/supervisor-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupervisorComponent } from './supervisor.component';
import { SupervisorPendingListComponent } from './components/supervisor-pending-list/supervisor-pending-list.component';
import { SupervisorFormComponent } from './components/supervisor-form/supervisor-form.component';
import { SupervisorHistoryComponent } from './components/supervisor-history/supervisor-history.component';
import { EstadisticasSupervisorComponent } from './components/estadisticas-supervisor/estadisticas-supervisor.component';
import { AuditorListComponent } from '../auditor/components/auditor-list/auditor-list.component';
import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/user.types';

const routes: Routes = [
  {
    path: '',
    component: SupervisorComponent,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.SUPERVISOR, UserRole.ADMIN] },
    children: [
      {
        path: '',
        redirectTo: 'pendientes',
        pathMatch: 'full'
      },
      {
        path: 'pendientes',
        component: SupervisorPendingListComponent
      },
      {
        path: 'revisar/:id',
        component: SupervisorFormComponent
      },
      {
        path: 'historial',
        component: SupervisorHistoryComponent
      },
      {
        path: 'estadisticas',
        component: EstadisticasSupervisorComponent
      },{
        path: 'mis-documentos',
        component: AuditorListComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SupervisorRoutingModule { }

// Exportar las rutas para usarlas en app.routes.ts
export const supervisorRoutes = routes;