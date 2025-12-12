// notification-modal.component.ts - VERSIÓN ACTUALIZADA
import { Component, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ModalOptions } from '../../core/services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-modal',
  templateUrl: './notification-modal.component.html',
  styleUrls: ['./notification-modal.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class NotificationModalComponent implements OnInit, OnDestroy {
  showModal = false;
  currentModal: ModalOptions | null = null;
  private modalSubscription!: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.modalSubscription = this.notificationService.modal$.subscribe(
      (modalOptions) => {
        this.currentModal = modalOptions;
        this.showModal = !!modalOptions;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.modalSubscription) {
      this.modalSubscription.unsubscribe();
    }
  }

  onConfirm(): void {
    if (this.currentModal?.onConfirm) {
      this.currentModal.onConfirm();
    }
    this.closeModal();
  }

  onCancel(): void {
    if (this.currentModal?.onCancel) {
      this.currentModal.onCancel();
    }
    this.closeModal();
  }

  closeModal(): void {
    this.notificationService.hideModal();
  }

  getModalSizeClass(): string {
    const size = this.currentModal?.size || 'md';
    return `modal-${size}`;
  }

  // Helper para verificar si el modal tiene contenido
  hasContent(): boolean {
    return this.currentModal?.type === 'form' && !!this.currentModal?.content;
  }

  // Helper para verificar si es modal de confirmación
  isConfirmModal(): boolean {
    return this.currentModal?.type === 'confirm';
  }

  // Helper para verificar si es modal de información
  isInfoModal(): boolean {
    return this.currentModal?.type === 'info';
  }

  // NUEVO: Obtener clases personalizadas
  getCustomClasses(): string {
    const classes = [];
    
    // Clase de tamaño
    classes.push(this.getModalSizeClass());
    
    // Clase personalizada si existe
    if (this.currentModal?.customClass) {
      classes.push(this.currentModal.customClass);
    }
    
    return classes.join(' ');
  }
}