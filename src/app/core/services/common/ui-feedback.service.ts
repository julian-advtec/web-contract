// src/app/core/services/ui-feedback.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  callback: () => void;
  type?: 'primary' | 'secondary' | 'danger';
}

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'danger' | 'warning';
  details?: string;
  resolve?: (value: boolean) => void;
}

export interface LoadingState {
  loading: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UiFeedbackService {
  private notificationSubject = new Subject<Notification>();
  notification$ = this.notificationSubject.asObservable();

  private confirmSubject = new Subject<ConfirmDialogData>();
  confirm$ = this.confirmSubject.asObservable();

  private loadingSubject = new Subject<LoadingState>();
  loading$ = this.loadingSubject.asObservable();

  success(message: string, duration: number = 5000): void {
    this.showNotification(message, 'success', duration);
  }

  error(message: string, duration: number = 7000): void {
    this.showNotification(message, 'error', duration);
  }

  warning(message: string, duration: number = 5000): void {
    this.showNotification(message, 'warning', duration);
  }

  info(message: string, duration: number = 4000): void {
    this.showNotification(message, 'info', duration);
  }

  showNotification(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration: number = 5000,
    actions: NotificationAction[] = []
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      message,
      type,
      duration: duration > 0 ? duration : undefined,
      actions
    };
    this.notificationSubject.next(notification);
  }

  confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmSubject.next({
        ...data,
        resolve
      });
    });
  }

  setLoading(loading: boolean, message?: string): void {
    this.loadingSubject.next({ loading, message });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}