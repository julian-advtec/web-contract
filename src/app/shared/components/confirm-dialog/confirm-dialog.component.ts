// src/app/shared/components/confirm-dialog/confirm-dialog.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  animations: [
    trigger('dialogAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(-20px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(-20px)' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() title = 'Confirmar';
  @Input() message = '¿Está seguro de realizar esta acción?';
  @Input() details = '';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';
  @Input() type: 'primary' | 'danger' | 'warning' = 'primary';
  @Input() confirmIcon = '';

  @Output() confirmEvent = new EventEmitter<void>();
  @Output() cancelEvent = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();

  ngOnChanges(): void {
    if (!this.confirmIcon) {
      if (this.type === 'danger') this.confirmIcon = 'fa-exclamation-triangle';
      else if (this.type === 'warning') this.confirmIcon = 'fa-exclamation-circle';
      else this.confirmIcon = 'fa-check-circle';
    }
  }

  confirm(): void {
    this.confirmEvent.emit();
    this.close();
  }

  cancel(): void {
    this.cancelEvent.emit();
    this.close();
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancel();
    }
  }

  getIcon(): string {
    switch (this.type) {
      case 'danger': return 'fa-exclamation-triangle';
      case 'warning': return 'fa-exclamation-circle';
      default: return 'fa-question-circle';
    }
  }

  getColor(): string {
    switch (this.type) {
      case 'danger': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#10B981';
    }
  }

  getButtonClass(): string {
    switch (this.type) {
      case 'danger': return 'btn-danger';
      case 'warning': return 'btn-warning';
      default: return 'btn-primary';
    }
  }
}