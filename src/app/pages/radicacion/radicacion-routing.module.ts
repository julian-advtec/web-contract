// src/app/pages/radicacion/radicacion-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RadicacionComponent } from './radicacion.component';

const routes: Routes = [
  {
    path: '',
    component: RadicacionComponent,
    children: [
      {
        path: '',
        redirectTo: 'lista',
        pathMatch: 'full'
      },
      {
        path: 'nuevo',
        loadComponent: () => import('./components/radicacion-form/radicacion-form.component')
          .then(m => m.RadicacionFormComponent)
      },
      {
        path: 'lista',
        loadComponent: () => import('./components/contratos-list/contratos-list.component')
          .then(m => m.ContratosListComponent)
      },
      {
        path: 'mis-radicaciones',
        loadComponent: () => import('./components/mis-radicaciones/mis-radicaciones.component')
          .then(m => m.MisRadicacionesComponent)
      },
      {
        path: 'rechazados',
        loadComponent: () => import('./components/lista-rechazados/lista-rechazados.component')
          .then(m => m.ListaRechazadosComponent)
      },
      {
        path: 'mis-estadisticas',
        loadComponent: () => import('./components/estadisticas-radicacion/estadisticas-radicacion.component')
          .then(m => m.EstadisticasRadicadorComponent)
      },
      {
        path: 'ver/:id',
        loadComponent: () => import('./components/radicacion-form/radicacion-form.component')
          .then(m => m.RadicacionFormComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RadicacionRoutingModule { }