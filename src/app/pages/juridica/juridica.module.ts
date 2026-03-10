import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { JuridicaRoutingModule } from './juridica-routing.module';
import { JuridicaComponent } from './juridica.component';

// Importar componentes standalone (NO declararlos, solo importarlos)
import { JuridicaListComponent } from './components/juridica-list/juridica-list.component';
import { JuridicaCreacionComponent } from './components/juridica-creacion/juridica-creacion.component';
import { JuridicaStatsComponent } from './components/juridica-stats/juridica-stats.component';

@NgModule({
  declarations: [
    // ❌ NO declarar JuridicaComponent aquí porque es standalone
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    JuridicaRoutingModule,
    
    // ✅ IMPORTAR todos los componentes standalone
    JuridicaComponent,        // El componente principal también es standalone
    JuridicaListComponent,
    JuridicaCreacionComponent,
    JuridicaStatsComponent
  ],
  exports: [
    JuridicaComponent
  ]
})
export class JuridicaModule { }