// src/app/pages/contabilidad/contabilidad.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ← Solo FormsModule, NO ReactiveFormsModule
import { ContabilidadRoutingModule } from './contabilidad-routing.module';

// Importa tu componente
import { ContabilidadStatsComponent } from './components/contabilidad-stats/contabilidad-stats.component';

@NgModule({
  declarations: [
    ContabilidadStatsComponent, // ← ¡DECLARARLO AQUÍ!
    // ... otros componentes
  ],
  imports: [
    CommonModule,
    FormsModule, // ← Esto es suficiente para [(ngModel)]
    ContabilidadRoutingModule
  ]
})
export class ContabilidadModule { }