// src/app/pages/supervisor/supervisor.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { SupervisorRoutingModule } from './supervisor-routing.module';
import { SupervisorComponent } from './supervisor.component';
import { SupervisorPendingListComponent } from './components/supervisor-pending-list/supervisor-pending-list.component';
import { SupervisorFormComponent } from './components/supervisor-form/supervisor-form.component';
import { SupervisorHistoryComponent } from './components/supervisor-history/supervisor-history.component';
import { SupervisorStatsComponent } from './components/supervisor-stats/supervisor-stats.component';

@NgModule({
  declarations: [
    SupervisorComponent,
    SupervisorPendingListComponent,
    SupervisorFormComponent,
    SupervisorHistoryComponent,
    SupervisorStatsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SupervisorRoutingModule
  ],
  exports: [
    SupervisorComponent
  ]
})
export class SupervisorModule { }