import { ContabilidadComponent } from './contabilidad.component';
import { NgModule, Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/user.types';
import { ContabilidadPendingListComponent } from './components/contabilidad-pending-list/contabilidad-pending-list.component';
import { ContabilidadHistoryComponent } from './components/contabilidad-history/contabilidad-history.component';
import { ContabilidadFormComponent } from './components/contabilidad-form/contabilidad-form.component';

const routes: Routes = [
    {

        path: '',
        component: ContabilidadComponent,
        canActivate: [RoleGuard],
        data: { roles: [UserRole.CONTABILIDAD, UserRole.ADMIN] },
        children: [
            {
                path: '',
                redirectTo: 'pendientes',
                pathMatch: 'full'
            },
            {
                path: 'pendientes',
                component: ContabilidadPendingListComponent
            },
            {
                path: 'historial',
                component: ContabilidadHistoryComponent
            },
            {
                path: 'procesar/:id',
                component: ContabilidadFormComponent   // ← aquí estaba el error
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