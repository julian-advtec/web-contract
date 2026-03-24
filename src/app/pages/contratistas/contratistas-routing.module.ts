// src/app/pages/contratistas/contratistas-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContratistasComponent } from './contratistas.component';
import { ContratistaListComponent } from './components/contratista-list/contratista-list.component';
import { ContratistaCreacionComponent } from './components/contratista-creacion/contratista-creacion.component';
import { ContratistaDetalleComponent } from './components/contratista-detalle/contratista-detalle.component';


const routes: Routes = [
  {
    path: '',
    component: ContratistasComponent,
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ContratistaListComponent, data: { title: 'Lista de Contratistas' } },
      { path: 'crear', component: ContratistaCreacionComponent, data: { title: 'Nuevo Contratista' } },
      { path: 'editar/:id', component: ContratistaCreacionComponent, data: { title: 'Editar Contratista' } },
      { path: 'ver/:id', component: ContratistaDetalleComponent, data: { title: 'Detalle del Contratista' } },
     
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ContratistasRoutingModule {}