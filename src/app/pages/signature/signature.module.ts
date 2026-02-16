import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignaturePadComponent } from './components/signature-pad/signature-pad.component';
import { SignaturePositionComponent } from './components/signature-position/signature-position.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    SignaturePadComponent,
    SignaturePositionComponent
  ],
  exports: [
    SignaturePadComponent,
    SignaturePositionComponent
  ]
})
export class SignatureModule { }