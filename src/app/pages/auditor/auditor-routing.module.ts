import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuditorComponent } from './auditor.component'; // componente padre/layout
import { AuditorListComponent } from './components/auditor-list/auditor-list.component';
import { AuditorFormComponent } from './components/auditor-form/auditor-form.component';
import { AuditorHistoryComponent } from './components/auditor-history/auditor-history.component';
import { AuditorStatsComponent } from './components/auditor-stats/auditor-stats.component';
import { ListaRechazadosComponent } from './components/lista-rechazados/lista-rechazados.component';
import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/user.types';
import { AuditorPendingListComponent} from './components/auditor-pending-list/auditor-pending-list.component'

const routes: Routes = [
  {
    path: '',
    component: AuditorComponent,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.AUDITOR_CUENTAS, UserRole.ADMIN] },
    children: [
      {
        path: '',
        redirectTo: 'mis-documentos',
        pathMatch: 'full'
      },
      {
        path: 'mis-documentos',
        component: AuditorListComponent,
        title: 'Mis Auditorías - Documentos en Revisión'
      },
      {
        path: 'revisar/:id',
        component: AuditorFormComponent,
        title: 'Revisar Documento'
      },
      {
        path: 'pendientes',
        component: AuditorPendingListComponent, // si existe este componente
        title: 'Documentos Pendientes para Auditoría'
      },
      {
        path: 'historial',
        component: AuditorHistoryComponent,
        title: 'Historial de Auditorías'
      },
      {
        path: 'estadisticas',
        component: AuditorStatsComponent,
        title: 'Estadísticas de Auditor'
      },
      {
        path: 'lista-rechazados',
        component: ListaRechazadosComponent,
        title: 'Lista de Rechazados'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuditorRoutingModule { }