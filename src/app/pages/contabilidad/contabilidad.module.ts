// src/app/pages/contabilidad/contabilidad.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContabilidadRoutingModule } from './contabilidad-routing.module';
import { ContabilidadPendingListComponent } from './components/contabilidad-pending-list/contabilidad-pending-list.component';
import { ContabilidadHistoryComponent } from './components/contabilidad-history/contabilidad-history.component';



@NgModule({
  declarations: [],           // ← dejar vacío o eliminar esta propiedad
  imports: [
    CommonModule,
    FormsModule,
    ContabilidadRoutingModule
  ]
})
export class ContabilidadModule { }