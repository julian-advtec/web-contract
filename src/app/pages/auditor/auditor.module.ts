import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuditorRoutingModule } from './auditor-routing.module';
import { AuditorComponent } from './auditor.component';
import { AuditorPendingListComponent } from './components/auditor-pending-list/auditor-pending-list.component';
import { AuditorFormComponent } from './components/auditor-form/auditor-form.component';
import { AuditorHistoryComponent } from './components/auditor-history/auditor-history.component';
import { AuditorStatsComponent } from './components/auditor-stats/auditor-stats.component';

@NgModule({
  declarations: [
    AuditorComponent,
    AuditorPendingListComponent,
    AuditorFormComponent,
    AuditorHistoryComponent,
    AuditorStatsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AuditorRoutingModule
  ],
  exports: [
    AuditorComponent
  ]
})
export class AuditorModule { }