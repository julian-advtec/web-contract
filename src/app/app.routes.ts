import { Routes } from '@angular/router';
import { LoginComponent } from './auth/components/login/login.component';
import { Verify2faComponent } from './auth/pages/verify-2fa/verify-2fa.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AuthGuard } from './core/guards/auth-guard';
import { TwoFactorGuard } from './core/guards/two-factor.guard';

export const routes: Routes = [
  { 
    path: 'auth', 
    children: [
      { path: 'login', component: LoginComponent },
      { 
        path: 'verify-2fa', 
        component: Verify2faComponent,
        canActivate: [TwoFactorGuard]
      }
    ]
  },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/auth/login' }
];