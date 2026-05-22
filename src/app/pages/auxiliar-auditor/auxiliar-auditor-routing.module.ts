// src/app/pages/auxiliar-auditor/auxiliar-auditor-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuxiliarAuditorComponent } from './auxiliar-auditor.component';

const routes: Routes = [
  {
    path: '',
    component: AuxiliarAuditorComponent,
    children: [
      {
        path: '',
        redirectTo: 'documentos-disponibles',
        pathMatch: 'full'
      },
      {
        path: 'documentos-disponibles',
        loadComponent: () => import('./components/documentos-disponibles/documentos-disponibles.component')
          .then(m => m.DocumentosDisponiblesComponent)
      },
      {
        path: 'detalle/:id',
        loadComponent: () => import('./components/detalle-documento/detalle-documento.component')
          .then(m => m.DetalleDocumentoComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuxiliarAuditorRoutingModule { }