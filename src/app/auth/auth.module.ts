import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // ← ESTO ES CRÍTICO
import { RouterModule } from '@angular/router';

import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    ReactiveFormsModule, // ← AGREGAR ESTO
    RouterModule
  ]
})
export class AuthModule { }