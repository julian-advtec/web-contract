// src/app/modules/asesor-gerencia/asesor-gerencia-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AsesorGerenciaComponent } from './asesor-gerencia.component';
import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/user.types';
import { AsesorGerenciaPendingListComponent } from './components/asesor-gerencia-pending-list/asesor-gerencia-pending-list.component';
import { AsesorGerenciaHistoryComponent } from './components/asesor-gerencia-history/asesor-gerencia-history.component';
import { AsesorGerenciaFormComponent } from './components/asesor-gerencia-form/asesor-gerencia-form.component';
import { AsesorGerenciaListComponent } from './components/asesor-gerencia-list/asesor-gerencia-list.component';
import { AsesorGerenciaRechazadosComponent } from './components/asesor-gerencia-rechazados/asesor-gerencia-rechazados.component';
import { AsesorGerenciaStatsComponent} from './components/asesor-gerencia-stats/asesor-gerencia-stats';

const routes: Routes = [
  {
    path: '',
    component: AsesorGerenciaComponent,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ASESOR_GERENCIA, UserRole.ADMIN] },
    children: [
      {
        path: '',
        redirectTo: 'lista',
        pathMatch: 'full'
      },
      {
        path: 'lista',
        component: AsesorGerenciaListComponent,
        data: { title: 'Lista Completa' }
      },
      {
        path: 'pendientes',
        component: AsesorGerenciaPendingListComponent,
        data: { title: 'Pendientes' }
      },
      {
        path: 'historial',
        component: AsesorGerenciaHistoryComponent,
        data: { title: 'Historial' }
      },
      {
        path: 'procesar/:id',
        component: AsesorGerenciaFormComponent
      },
      // Ruta alternativa para consultar documentos
      {
        path: 'documento/:id',
        component: AsesorGerenciaFormComponent,
        data: { modo: 'consulta' }
      },
      // Redirección para compatibilidad
      {
        path: 'revisar/:id',
        component: AsesorGerenciaFormComponent
      },
      {
        path: 'rechazados',
        component: AsesorGerenciaRechazadosComponent,
        data: { title: 'Documentos Rechazados' }
      },
     
      {
        path: 'estadisticas',
        component: AsesorGerenciaStatsComponent,
        data: { title: 'Mis Estadísticas' }
      } 
       
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AsesorGerenciaRoutingModule { }

// Exportar las rutas para usarlas en app.routes.ts o donde las necesites
export const AsesorGerenciaComponentRoutes = routes;