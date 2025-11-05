import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <h1>Bienvenido al Panel</h1>
      <p>Aquí podrás gestionar tutelas, usuarios y reportes.</p>
    </div>
  `,
  styles: [`
    .dashboard {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  `]
})
export class DashboardComponent {}
