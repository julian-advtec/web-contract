// notification.service.ts
import { Injectable, TemplateRef } from '@angular/core';
import { Subject } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';
export type ModalType = 'confirm' | 'info' | 'form';

export interface Notification {
    type: NotificationType;
    title?: string;
    message: string;
    duration?: number;
    action?: () => void;
}

export interface ModalOptions {
  type: ModalType;
  title: string;
  message?: string;
  content?: TemplateRef<any>;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  customClass?: string; // NUEVA: Para clases CSS personalizadas
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationSubject = new Subject<Notification>();
    private modalSubject = new Subject<ModalOptions | null>();

    notifications$ = this.notificationSubject.asObservable();
    modal$ = this.modalSubject.asObservable();

    // Métodos para mostrar notificaciones
    success(message: string, title?: string, duration: number = 3000): void {
        this.showNotification('success', message, title, duration);
    }

    error(message: string, title?: string, duration: number = 5000): void {
        this.showNotification('error', message, title, duration);
    }

    info(message: string, title?: string, duration: number = 3000): void {
        this.showNotification('info', message, title, duration);
    }

    warning(message: string, title?: string, duration: number = 4000): void {
        this.showNotification('warning', message, title, duration);
    }

    private showNotification(type: NotificationType, message: string, title?: string, duration?: number): void {
        this.notificationSubject.next({
            type,
            title,
            message,
            duration
        });
    }

    // Métodos para mostrar modales
    showModal(options: ModalOptions): void {
        this.modalSubject.next(options);
    }

    hideModal(): void {
        this.modalSubject.next(null);
    }

    // Métodos rápidos para modales comunes
    confirm(
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
        confirmText: string = 'Confirmar',
        cancelText: string = 'Cancelar'
    ): void {
        this.showModal({
            type: 'confirm',
            title,
            message,
            confirmText,
            cancelText,
            onConfirm,
            onCancel,
            showCloseButton: true
        });
    }

    alert(title: string, message: string): void {
        this.showModal({
            type: 'info',
            title,
            message,
            confirmText: 'Aceptar',
            onConfirm: () => this.hideModal(),
            showCloseButton: true
        });
    }

    customModal(title: string, content: TemplateRef<any>, size: 'sm' | 'md' | 'lg' | 'xl' = 'lg'): void {
        if (!content) {
            console.error('No se proporcionó contenido para el modal');
            return;
        }

        this.showModal({
            type: 'form',
            title,
            content,
            size,
            showCloseButton: true
        });
    }

    logoutConfirm(
        onConfirm: () => void,
        onCancel?: () => void,
        title: string = 'Confirmar Cierre de Sesión',
        message: string = '¿Estás seguro de que deseas cerrar sesión?'
    ): void {
        this.showModal({
            type: 'confirm',
            title,
            message,
            confirmText: 'Sí, Cerrar Sesión',
            cancelText: 'Cancelar',
            onConfirm,
            onCancel,
            showCloseButton: true,
            customClass: 'logout-modal' // Nueva propiedad para clases personalizadas
        });
    }
}