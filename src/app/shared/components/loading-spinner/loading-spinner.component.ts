// src/app/shared/components/loading-spinner/loading-spinner.component.ts
import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { UiFeedbackService, LoadingState } from '../../../core/services/common/ui-feedback.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSpinnerComponent implements OnInit, OnDestroy {
  @Input() manualLoading = false;
  @Input() message = 'Cargando...';
  @Input() progress?: number;

  loading = false;
  private subscription?: Subscription;

  constructor(private uiFeedback: UiFeedbackService) {}

  ngOnInit(): void {
    this.subscription = this.uiFeedback.loading$.subscribe((state: LoadingState) => {
      if (!this.manualLoading) {
        this.loading = state.loading;
        if (state.message) {
          this.message = state.message;
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  show(message?: string): void {
    this.loading = true;
    if (message) this.message = message;
  }

  hide(): void {
    this.loading = false;
  }
}