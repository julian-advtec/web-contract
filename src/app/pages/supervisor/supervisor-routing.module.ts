// src/app/pages/supervisor/supervisor-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupervisorComponent } from './supervisor.component';
import { SupervisorPendingListComponent } from './components/supervisor-pending-list/supervisor-pending-list.component';
import { SupervisorListComponent } from './components/supervisor-list/supervisor-list.component'; // MIS SUPERVISIONES
import { SupervisorFormComponent } from './components/supervisor-form/supervisor-form.component';
import { SupervisorHistoryComponent } from './components/supervisor-history/supervisor-history.component';
import { SupervisorRejectedListComponent } from './components/supervisor-rejected-list/supervisor-rejected-list.component'; // RECHAZADOS
import { EstadisticasSupervisorComponent } from './components/estadisticas-supervisor/estadisticas-supervisor.component';
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
        component: SupervisorPendingListComponent,
        data: { title: 'Documentos Pendientes' }
      },
      {
        path: 'mis-documentos',
        component: SupervisorListComponent,
        data: { title: 'Mis Supervisiones' }
      },
      {
        path: 'rechazados',
        component: SupervisorRejectedListComponent,
        data: { title: 'Documentos Rechazados' }
      },
      {
        path: 'historial',
        component: SupervisorHistoryComponent,
        data: { title: 'Historial de Supervisiones' }
      },
      {
        path: 'estadisticas',
        component: EstadisticasSupervisorComponent,
        data: { title: 'Estadísticas' }
      },
      {
        path: 'revisar/:id',
        component: SupervisorFormComponent,
        data: { title: 'Revisar Documento' }
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