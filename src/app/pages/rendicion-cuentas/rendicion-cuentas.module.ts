// src/app/pages/rendicion-cuentas/rendicion-cuentas.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RendicionCuentasRoutingModule } from './rendicion-cuentas-routing.module';
/*                                             ./rendicion-cuentas.routes.module */
// ... imports de componentes

@NgModule({
  declarations: [ /* ... */ ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RendicionCuentasRoutingModule
  ]
})
export class RendicionCuentasModule {
  constructor() {
    console.log('🔥🔥🔥 RENDICION-CUENTAS MODULE CARGADO CORRECTAMENTE 🔥🔥🔥');
    console.log('📦 HttpClientModule disponible:', !!HttpClientModule);
  }
}