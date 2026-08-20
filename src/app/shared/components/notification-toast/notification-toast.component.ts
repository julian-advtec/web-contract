// src/app/shared/components/notification-toast/notification-toast.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { UiFeedbackService, Notification } from '../../../core/services/common/ui-feedback.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.scss'],
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(40px)' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription?: Subscription;
  private timeouts: Map<string, any> = new Map();

  constructor(private uiFeedback: UiFeedbackService) {}

  ngOnInit(): void {
    this.subscription = this.uiFeedback.notification$.subscribe((notification) => {
      this.notifications.push(notification);

      if (notification.duration) {
        const timeout = setTimeout(() => {
          this.removeNotification(notification);
        }, notification.duration);
        this.timeouts.set(notification.id, timeout);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.timeouts.forEach(timeout => clearTimeout(timeout));
  }

  removeNotification(notification: Notification): void {
    const index = this.notifications.indexOf(notification);
    if (index > -1) {
      this.notifications.splice(index, 1);
      const timeout = this.timeouts.get(notification.id);
      if (timeout) {
        clearTimeout(timeout);
        this.timeouts.delete(notification.id);
      }
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'fa-check-circle';
      case 'error': return 'fa-exclamation-circle';
      case 'warning': return 'fa-exclamation-triangle';
      default: return 'fa-info-circle';
    }
  }
}