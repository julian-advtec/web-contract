import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TesoreriaRoutingModule } from './tesoreria-routing.module';

import { TesoreriaStatsComponent } from './components/tesoreria-stats/tesoreria-stats.component';

@NgModule({
  declarations: [
    
  ],
  imports: [
    CommonModule,
    FormsModule,
    TesoreriaRoutingModule,
    TesoreriaStatsComponent
  ]
})
export class TesoreriaModule { }