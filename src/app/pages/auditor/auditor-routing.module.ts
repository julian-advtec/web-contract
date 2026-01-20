import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuditorComponent } from './auditor.component';
import { AuditorPendingListComponent } from './components/auditor-pending-list/auditor-pending-list.component';
import { AuditorFormComponent } from './components/auditor-form/auditor-form.component';
import { AuditorHistoryComponent } from './components/auditor-history/auditor-history.component';
import { AuditorStatsComponent } from './components/auditor-stats/auditor-stats.component';
import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/user.types';

const routes: Routes = [
  {
    path: '',
    component: AuditorComponent,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.AUDITOR_CUENTAS, UserRole.ADMIN] },
    children: [
      {
        path: '',
        redirectTo: 'pendientes',
        pathMatch: 'full'
      },
      {
        path: 'pendientes',
        component: AuditorPendingListComponent
      },
      {
        path: 'mis-documentos',
        component: AuditorFormComponent
      },
      {
        path: 'revisar/:id',
        component: AuditorFormComponent
      },
      {
        path: 'historial',
        component: AuditorHistoryComponent
      },
      {
        path: 'estadisticas',
        component: AuditorStatsComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuditorRoutingModule { }

// Exportar las rutas para usarlas en app.routes.ts
export const auditorRoutes = routes;