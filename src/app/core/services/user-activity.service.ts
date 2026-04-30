// src/app/core/services/user-activity.service.ts
import { Injectable, Inject } from '@angular/core';
import { fromEvent, merge, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DOCUMENT } from '@angular/common';

export interface ActivityEvent {
  type: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class UserActivityService {
  private activitySubject = new Subject<ActivityEvent>();
  public activity$ = this.activitySubject.asObservable();
  
  private inactivityTimer: any;
  private readonly INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos

  constructor(@Inject(DOCUMENT) private document: Document) {}

  startMonitoring(): void {
    console.log('👆 Iniciando monitoreo de actividad del usuario');
    
    const events = [
      fromEvent(this.document, 'click'),
      fromEvent(this.document, 'keydown'),
      fromEvent(this.document, 'mousemove'),
      fromEvent(this.document, 'scroll'),
      fromEvent(this.document, 'touchstart'),
      fromEvent(window, 'focus')
    ];
    
    // Eliminar throttleTime para que cada interacción sea detectada inmediatamente
    merge(...events).pipe(
      tap((event) => {
     
        this.onUserActivity();
      })
    ).subscribe();
    
    this.resetInactivityTimer();
  }

  stopMonitoring(): void {
    console.log('👆 Deteniendo monitoreo de actividad');
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
  }

  private onUserActivity(): void {
    this.activitySubject.next({
      type: 'user-interaction',
      timestamp: new Date()
    });
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    this.inactivityTimer = setTimeout(() => {
      console.log('⚠️ Usuario inactivo por 15 minutos');
      this.activitySubject.next({
        type: 'inactivity-warning',
        timestamp: new Date()
      });
    }, this.INACTIVITY_LIMIT);
  }
}