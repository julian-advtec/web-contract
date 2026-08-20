// src/app/core/services/error-handler.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ErrorEvent {
  message: string;
  context: string;
  timestamp: Date;
  error?: any;
  severity: 'error' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private errorSubject = new Subject<ErrorEvent>();
  error$ = this.errorSubject.asObservable();

  private errorHistory: ErrorEvent[] = [];
  private maxHistory = 50;

  handleError(error: any, context: string, severity: 'error' | 'warning' | 'info' = 'error'): string {
    const message = this.extractErrorMessage(error);
    const errorEvent: ErrorEvent = {
      message,
      context,
      timestamp: new Date(),
      error,
      severity
    };

    console.error(`[${context}]`, error);

    this.errorHistory.unshift(errorEvent);
    if (this.errorHistory.length > this.maxHistory) {
      this.errorHistory.pop();
    }

    this.errorSubject.next(errorEvent);
    return message;
  }

  private extractErrorMessage(error: any): string {
    if (!error) return 'Error desconocido';
    if (typeof error === 'string') return error;
    if (error?.error?.message) return error.error.message;
    if (error?.message) return error.message;
    if (error?.statusText) return `${error.status}: ${error.statusText}`;
    return 'Ocurrió un error inesperado';
  }

  getErrorHistory(): ErrorEvent[] {
    return [...this.errorHistory];
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
  }
}