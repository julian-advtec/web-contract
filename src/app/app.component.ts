import 'tslib'; // ✅ AGREGAR ESTA LÍNEA
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationModalComponent } from './layout/notification-modal/notification-modal.component';
import { NotificationToastComponent } from './layout/notification-toast/notification-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [    RouterOutlet,
    NotificationModalComponent,
    NotificationToastComponent],
  template: `<router-outlet></router-outlet> <app-notification-modal></app-notification-modal>
    <app-notification-toast></app-notification-toast>`
})
export class AppComponent { }