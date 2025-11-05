import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { TutelasComponent } from '../pages/tutelas/tutelas';
import { FallosComponent } from '../pages/fallos/fallos';
import { ImpugnacionesComponent } from '../pages/impugnaciones/impugnaciones';
import { DesacatosComponent } from '../pages/desacatos/desacatos';
import { PendientesComponent } from '../pages/pendientes/pendientes';
import { DerechosPeticionComponent } from '../pages/derechos-peticion/derechos-peticion';

export const ADMIN_LAYOUT_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: 'tutelas', component: TutelasComponent },
      { path: 'fallos', component: FallosComponent },
      { path: 'impugnaciones', component: ImpugnacionesComponent },
      { path: 'desacatos', component: DesacatosComponent },
      { path: 'pendientes', component: PendientesComponent },
      { path: 'derechos-de-peticion', component: DerechosPeticionComponent },
      { path: '', redirectTo: 'tutelas', pathMatch: 'full' },
    ],
  },
];
