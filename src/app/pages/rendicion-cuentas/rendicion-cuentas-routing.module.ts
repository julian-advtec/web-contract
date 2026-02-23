// src/app/modules/rendicion-cuentas/rendicion-cuentas-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RendicionCuentasComponent } from './rendicion-cuentas.component';
import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/user.types';
import { RendicionPendingListComponent } from './components/rendicion-pending-list/rendicion-pending-list.component';
import { RendicionHistoryComponent } from './components/rendicion-history/rendicion-history.component';
import { RendicionFormComponent } from './components/rendicion-form/rendicion-form.component';
import { RendicionListComponent } from './components/rendicion-list/rendicion-list.component';
import { RendicionRechazadosComponent } from './components/rendicion-rechazados/rendicion-rechazados.component';
import { RendicionStatsComponent } from './components/rendicion-stats/rendicion-stats.component';

const routes: Routes = [
  {
    path: '',
    component: RendicionCuentasComponent,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.RENDICION_CUENTAS, UserRole.ADMIN] },
    children: [
      {
        path: '',
        redirectTo: 'lista',
        pathMatch: 'full'
      },
      {
        path: 'lista',
        component: RendicionListComponent,
        data: { title: 'Lista Completa' }
      },
      {
        path: 'pendientes',
        component: RendicionPendingListComponent,
        data: { title: 'Pendientes' }
      },
      {
        path: 'historial',
        component: RendicionHistoryComponent,
        data: { title: 'Historial' }
      },
      {
        path: 'procesar/:id',
        component: RendicionFormComponent
      },
      // Ruta alternativa para consultar documentos
      {
        path: 'documento/:id',
        component: RendicionFormComponent,
        data: { modo: 'consulta' }
      },
      // Redirección para compatibilidad
      {
        path: 'revisar/:id',
        component: RendicionFormComponent
      },
      {
        path: 'rechazados',
        component: RendicionRechazadosComponent,
        data: { title: 'Documentos Rechazados' }
      },
      {
        path: 'estadisticas',
        component: RendicionStatsComponent,
        data: { title: 'Mis Estadísticas' }
      } 
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RendicionCuentasRoutingModule { }

// Exportar las rutas para usarlas en app.routes.ts o donde las necesites
export const RendicionCuentasComponentRoutes = routes;