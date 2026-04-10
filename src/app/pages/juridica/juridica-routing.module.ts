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
        component: JuridicaListComponent,
        title: 'Gestión Jurídica - Lista de Contratos'
      },
      {
        path: 'crear',
        component: JuridicaCreacionComponent,
        title: 'Gestión Jurídica - Crear Contrato'
      },
      {
        path: 'editar/:id',
        component: JuridicaCreacionComponent,
        title: 'Gestión Jurídica - Editar Contrato'
      },
      {
        path: 'ver/:id',
        component: JuridicaCreacionComponent,
        title: 'Gestión Jurídica - Ver Contrato'
      },
      {
        path: 'stats',
        component: JuridicaStatsComponent,
        title: 'Gestión Jurídica - Estadísticas'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class JuridicaRoutingModule { }