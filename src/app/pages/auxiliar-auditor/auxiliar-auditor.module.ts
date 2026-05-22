// src/app/pages/auxiliar-auditor/auxiliar-auditor.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AuxiliarAuditorRoutingModule } from './auxiliar-auditor-routing.module';
import { AuxiliarAuditorComponent } from './auxiliar-auditor.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';

import { AuxiliarAuditorService } from '../../core/services/auxiliar-auditor.service';

@NgModule({
  declarations: [
    AuxiliarAuditorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    AuxiliarAuditorRoutingModule,
    
    SidebarComponent,
    NavbarComponent
  ],
  providers: [
    AuxiliarAuditorService
  ],
  exports: [
    AuxiliarAuditorComponent
  ]
})
export class AuxiliarAuditorModule { }