import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JuridicaComponent } from './juridica.component';

// Importar componentes standalone
import { JuridicaListComponent } from './components/juridica-list/juridica-list.component';
import { JuridicaCreacionComponent } from './components/juridica-creacion/juridica-creacion.component';
import { JuridicaStatsComponent } from './components/juridica-stats/juridica-stats.component';

const routes: Routes = [
  {
    path: '',
    component: JuridicaComponent,
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: JuridicaListComponent  // ✅ Usar component directamente
      },
      {
        path: 'crear',
        component: JuridicaCreacionComponent  // ✅ Usar component directamente
      },
      {
        path: 'editar/:id',
        component: JuridicaCreacionComponent  // ✅ Usar component directamente
      },
      {
        path: 'stats',
        component: JuridicaStatsComponent  // ✅ Usar component directamente
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class JuridicaRoutingModule { }