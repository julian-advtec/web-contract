// src/app/modules/asesor-gerencia/asesor-gerencia.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsesorGerenciaRoutingModule } from './asesor-gerencia-routing.module';



@NgModule({
  declarations: [
    // Aquí irán los componentes que declares más adelante
    // AsesorGerenciaPendingListComponent,
    // AsesorGerenciaListComponent,
    // etc.
  ],
  imports: [
    CommonModule,
    FormsModule,
    AsesorGerenciaRoutingModule,

  ]
})
export class AsesorGerenciaModule { }