import { ContabilidadComponent } from './contabilidad.component';
import { NgModule, Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/user.types';
import { ContabilidadPendingListComponent } from './components/contabilidad-pending-list/contabilidad-pending-list.component';
import { ContabilidadHistoryComponent } from './components/contabilidad-history/contabilidad-history.component';
import { ContabilidadFormComponent } from './components/contabilidad-form/contabilidad-form.component';
import { ContabilidadListComponent } from './components/contabilidad-list/contabilidad-list.component';
import { ContabilidadRechazadosComponent } from './components/contabilidad-rechazados/contabilidad-rechazados.component';
import { ContabilidadStatsComponent } from './components/contabilidad-stats/contabilidad-stats.component';

const routes: Routes = [
    {
        path: '',
        component: ContabilidadComponent,
        canActivate: [RoleGuard],
        data: { roles: [UserRole.CONTABILIDAD, UserRole.ADMIN] },
        children: [
            {
                path: '',
                redirectTo: 'lista',
                pathMatch: 'full'
            },
            {
                path: 'lista',
                component: ContabilidadListComponent,
                data: { title: 'Lista Completa' }
            },
            {
                path: 'pendientes',
                component: ContabilidadPendingListComponent,
                data: { title: 'Pendientes' }
            },
            {
                path: 'historial',
                component: ContabilidadHistoryComponent,
                data: { title: 'Historial' }
            },
            {
                path: 'procesar/:id',
                component: ContabilidadFormComponent
            },
            // Ruta alternativa para consultar documentos
            {
                path: 'documento/:id',
                component: ContabilidadFormComponent,
                data: { modo: 'consulta' }
            },
            // Redirección para compatibilidad
            {
                path: 'revisar/:id',
                component: ContabilidadFormComponent
            },
            {
        path: 'rechazados',                        // ← NUEVA RUTA
        component: ContabilidadRechazadosComponent

      },
      {
        path: 'estadisticas',
        component: ContabilidadStatsComponent,
        data: { title: 'Mis Estadísticas' }
      }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ContabilidadRoutingModule { }

// Exportar las rutas para usarlas en app.routes.ts
export const ComponentRoutes = routes;