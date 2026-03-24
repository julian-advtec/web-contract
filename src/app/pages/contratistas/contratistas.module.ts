// src/app/pages/contratistas/contratistas.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ContratistasRoutingModule } from './contratistas-routing.module';
import { ContratistasComponent } from './contratistas.component';

// ✅ IMPORTAR componentes standalone
import { ContratistaListComponent } from './components/contratista-list/contratista-list.component';
import { ContratistaCreacionComponent } from './components/contratista-creacion/contratista-creacion.component';
import { ContratistaDetalleComponent } from './components/contratista-detalle/contratista-detalle.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ContratistasRoutingModule,
    // ✅ IMPORTAR los componentes standalone (no declararlos)
    ContratistasComponent,
    ContratistaListComponent,
    ContratistaCreacionComponent,
    ContratistaDetalleComponent
  ],
  declarations: [] // ✅ Vacío - los componentes son standalone
})
export class ContratistasModule {}