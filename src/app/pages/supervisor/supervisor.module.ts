// src/app/pages/supervisor/supervisor.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupervisorRoutingModule } from './supervisor-routing.module';

// Componentes
import { SupervisorComponent } from './supervisor.component';
import { SupervisorPendingListComponent } from './components/supervisor-pending-list/supervisor-pending-list.component';
import { SupervisorListComponent } from './components/supervisor-list/supervisor-list.component';
import { SupervisorFormComponent } from './components/supervisor-form/supervisor-form.component';
import { SupervisorHistoryComponent } from './components/supervisor-history/supervisor-history.component';
import { SupervisorRejectedListComponent } from './components/supervisor-rejected-list/supervisor-rejected-list.component';
import { EstadisticasSupervisorComponent } from './components/estadisticas-supervisor/estadisticas-supervisor.component';

// Servicios
import { SupervisorService } from '../../core/services/supervisor/supervisor.service';
import { SupervisorDocumentosService } from '../../core/services/supervisor/supervisor-documentos.service';
import { SupervisorRevisionService } from '../../core/services/supervisor/supervisor-revision.service';
import { SupervisorArchivosService } from '../../core/services/supervisor/supervisor-archivos.service';
import { SupervisorEstadisticasService } from '../../core/services/supervisor/supervisor-estadisticas.service';
import { SupervisorOperacionesService } from '../../core/services/supervisor/supervisor-operaciones.service';

@NgModule({
  declarations: [
    SupervisorComponent,
    SupervisorPendingListComponent,
    SupervisorListComponent,
    SupervisorFormComponent,
    SupervisorHistoryComponent,
    SupervisorRejectedListComponent,
    EstadisticasSupervisorComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    SupervisorRoutingModule
  ],
  providers: [
    SupervisorService,
    SupervisorDocumentosService,
    SupervisorRevisionService,
    SupervisorArchivosService,
    SupervisorEstadisticasService,
    SupervisorOperacionesService
  ],
  exports: [
    SupervisorComponent
  ]
})
export class SupervisorModule { }