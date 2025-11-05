import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
];

@NgModule({
  // ❌ elimina 'declarations'
  imports: [CommonModule, RouterModule.forChild(routes), DashboardComponent], // ✅ IMPORTA en vez de declarar
})
export class PagesModule {}
