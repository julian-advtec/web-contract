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
        path: 'mis-radicaciones',
        loadComponent: () => import('./components/mis-radicaciones/mis-radicaciones.component')
          .then(m => m.MisRadicacionesComponent)
      },
      {
        path: 'nuevo',
        loadComponent: () => import('./components/radicacion-form/radicacion-form.component')
          .then(m => m.RadicacionFormComponent)
      },
      {
        path: 'lista',
        loadComponent: () => import('./components/radicacion-list/radicacion-list.component')
          .then(m => m.RadicacionListComponent)
      },

      {
        path: 'rechazados',
        loadComponent: () => import('./components/lista-rechazados/lista-rechazados.component')
          .then(m => m.ListaRechazadosComponent)
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RadicacionRoutingModule { }