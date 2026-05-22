import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ContratistasRoutingModule } from './contratistas-routing.module';
import { ContratistasComponent } from './contratistas.component';

// ✅ IMPORTAR componentes standalone (no declararlos)
import { ContratistaListComponent } from './components/contratista-list/contratista-list.component';
import { ContratistaCreacionComponent } from './components/contratista-creacion/contratista-creacion.component';
import { ContratistaDetalleComponent } from './components/contratista-detalle/contratista-detalle.component';

@NgModule({
  declarations: [
    // ❌ NO declarar componentes standalone
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ContratistasRoutingModule,
    // ✅ IMPORTAR componentes standalone aquí
    ContratistasComponent,
    ContratistaListComponent,
    ContratistaCreacionComponent,
    ContratistaDetalleComponent
  ]
})
export class ContratistasModule {}