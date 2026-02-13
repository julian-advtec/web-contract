import { TesoreriaComponent } from './tesoreria.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/user.types';
import { TesoreriaPendingListComponent } from './components/tesoreria-pending-list/tesoreria-pending-list.component';
import { TesoreriaHistoryComponent } from './components/tesoreria-history/tesoreria-history.component';
import { TesoreriaFormComponent } from './components/tesoreria-form/tesoreria-form.component';
import { TesoreriaListComponent } from './components/tesoreria-list/tesoreria-list.component';
import { TesoreriaRechazadosComponent } from './components/tesoreria-rechazados/tesoreria-rechazados.component';
import { TesoreriaStatsComponent } from './components/tesoreria-stats/tesoreria-stats.component';

const routes: Routes = [
    {
        path: '',
        component: TesoreriaComponent,
        canActivate: [RoleGuard],
        data: { roles: [UserRole.TESORERIA, UserRole.ADMIN] },
        children: [
            {
                path: '',
                redirectTo: 'lista',
                pathMatch: 'full'
            },
            {
                path: 'lista',
                component: TesoreriaListComponent,
                data: { title: 'Lista Completa' }
            },
            {
                path: 'pendientes',
                component: TesoreriaPendingListComponent,
                data: { title: 'Pendientes' }
            },
            {
                path: 'historial',
                component: TesoreriaHistoryComponent,
                data: { title: 'Historial' }
            },
            {
                path: 'procesar/:id',
                component: TesoreriaFormComponent
            },
            // Ruta alternativa para consultar documentos
            {
                path: 'documento/:id',
                component: TesoreriaFormComponent,
                data: { modo: 'consulta' }
            },
            // Redirección para compatibilidad
            {
                path: 'revisar/:id',
                component: TesoreriaFormComponent
            },
            {
                path: 'rechazados',
                component: TesoreriaRechazadosComponent,
                data: { title: 'Documentos Rechazados' }
            },
            {
                path: 'estadisticas',
                component: TesoreriaStatsComponent,
                data: { title: 'Mis Estadísticas' }
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class TesoreriaRoutingModule { }

// Exportar las rutas para usarlas en app.routes.ts
export const TesoreriaComponentRoutes = routes;