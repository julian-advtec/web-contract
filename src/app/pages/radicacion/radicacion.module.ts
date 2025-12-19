import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

// Importar el routing module
import { RadicacionRoutingModule } from './radicacion-routing.module';

// Importar componentes principales
import { RadicacionComponent } from './radicacion.component';

// Importar componentes de layout (opcional si están standalone)
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { NavbarComponent } from '../../layout/navbar/navbar.component';

// Importar servicios
import { RadicacionService } from '../../core/services/radicacion.service';
import { AuthService } from '../../core/services/auth.service';
import { ModulesService } from '../../core/services/modules.service';

@NgModule({
  declarations: [
    RadicacionComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    RadicacionRoutingModule,
    
    // Importar componentes standalone si es necesario
    SidebarComponent,
    NavbarComponent
  ],
  providers: [
    RadicacionService,
    AuthService,
    ModulesService
  ],
  exports: [
    RadicacionComponent
  ]
})
export class RadicacionModule { }