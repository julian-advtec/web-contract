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
        title: '📋 Contratos Jurídicos - Listado General'
      },
      {
        path: 'crear',
        component: JuridicaCreacionComponent,
        title: '✏️ Contratos Jurídicos - Nuevo Registro'
      },
      {
        path: 'editar/:id',
        component: JuridicaCreacionComponent,
        title: '✏️ Contratos Jurídicos - Editar'
      },
      {
        path: 'ver/:id',
        component: JuridicaCreacionComponent,
        title: '👁️ Contratos Jurídicos - Visualizar'
      },
      {
        path: 'stats',
        component: JuridicaStatsComponent,
        title: '📊 Contratos Jurídicos - Estadísticas'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class JuridicaRoutingModule { }