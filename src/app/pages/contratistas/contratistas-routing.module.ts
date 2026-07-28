// src/app/pages/contratistas/contratistas-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContratistasComponent } from './contratistas.component';
import { ContratistaListComponent } from './components/contratista-list/contratista-list.component';
import { ContratistaCreacionComponent } from './components/contratista-creacion/contratista-creacion.component';
import { ContratistaDetalleComponent } from './components/contratista-detalle/contratista-detalle.component';
import { ContratistaEnvioEnlacesComponent } from './components/contratista-envio-enlaces/contratista-envio-enlaces.component';
import { FormularioAprobacionListComponent } from './components/formulario-aprobacion-list/formulario-aprobacion-list.component';

const routes: Routes = [
  {
    path: '',
    component: ContratistasComponent,
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ContratistaListComponent },
      { path: 'crear', component: ContratistaCreacionComponent },
      { path: 'editar/:id', component: ContratistaCreacionComponent },
      { path: 'ver/:id', component: ContratistaDetalleComponent },
      { path: 'documentos/:id', component: ContratistaDetalleComponent },
      { path: 'enviar-enlaces', component: ContratistaEnvioEnlacesComponent },
      { path: 'formularios-aprobacion', component: FormularioAprobacionListComponent },
      { path: 'formularios-aprobacion/:id', component: FormularioAprobacionListComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ContratistasRoutingModule { }