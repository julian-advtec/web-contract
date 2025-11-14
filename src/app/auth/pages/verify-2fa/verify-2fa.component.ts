// verify-2fa.component.ts - CORREGIDO
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-verify-2fa',
  templateUrl: './verify-2fa.component.html',
  styleUrls: ['./verify-2fa.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule]
})
export class Verify2faComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  codeControls: FormControl[] = [];
  timeLeft: number = 600;
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  failedAttempts: number = 0;
  maxFailedAttempts: number = 3;
  
  private timerSubscription!: Subscription;
  private authData: any;

  constructor() {
    for (let i = 0; i < 6; i++) {
      this.codeControls.push(this.fb.control('', [Validators.required, Validators.pattern('[0-9]')]));
    }
  }

  ngOnInit(): void {
    this.authData = history.state.authData;
    
    if (!this.authData || !this.authData.userId) {
      console.error('❌ No authData found, redirecting to login');
      this.router.navigate(['/auth/login']);
      return;
    }

    console.log('🔐 Verify2FA initialized for userId:', this.authData.userId);
    this.startVisualTimer();
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  startVisualTimer(): void {
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.handleVisualTimerExpired();
      }
    });
  }

  handleVisualTimerExpired(): void {
    this.timerSubscription.unsubscribe();
    this.errorMessage = 'El tiempo para ingresar el código ha expirado.';
  }

  isFormInvalid(): boolean {
    return this.codeControls.some(control => control.invalid);
  }

  isAllCodesFilled(): boolean {
    return this.codeControls.every(control => control.valid);
  }

  onCodeInput(event: any, index: number): void {
    const input = event.target;
    const value = input.value;
    
    if (!/^\d*$/.test(value)) {
      input.value = value.replace(/\D/g, '');
      return;
    }
    
    if (value && index < 5) {
      const nextInput = document.querySelectorAll('.code-input')[index + 1] as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
    
    if (this.isAllCodesFilled()) {
      this.onSubmit();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const input = event.target as HTMLInputElement;
      if (!input.value && index > 0) {
        const prevInput = document.querySelectorAll('.code-input')[index - 1] as HTMLInputElement;
        if (prevInput) prevInput.focus();
      }
    }
  }

  onPaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');
    
    if (pastedData && /^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      digits.forEach((digit, i) => {
        if (this.codeControls[i]) {
          this.codeControls[i].setValue(digit);
        }
      });
      
      const lastInput = document.querySelectorAll('.code-input')[5] as HTMLInputElement;
      if (lastInput) lastInput.focus();
      
      setTimeout(() => this.onSubmit(), 100);
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // ✅ VERIFICACIÓN PRINCIPAL CORREGIDA - Buscar token y user en data
  onSubmit(): void {
    if (!this.isAllCodesFilled() || this.loading) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const code = this.codeControls.map(control => control.value).join('');
    const userId = this.authData.userId;

    console.log('🔐 Submitting 2FA code:', code, 'for userId:', userId);

    this.auth.verify2FA(userId, code).subscribe({
      next: (response: any) => {
        this.loading = false;
        console.log('🔐 2FA verification response:', response);
        console.log('🔐 Response data:', response.data);
        
        // ✅ CORRECCIÓN: Buscar token y user dentro de data
        const token = response.token || response.data?.token;
        const user = response.user || response.data?.user;

        console.log('🔐 Token found:', !!token);
        console.log('🔐 User found:', !!user);

        if (response.ok && token) {
          this.successMessage = 'Verificación exitosa. Redirigiendo...';
          console.log('🔐 ✅ 2FA successful, setting token and user');
          
          // ✅ PRIMERO limpiar el estado pendiente
          this.auth.clearPendingAuth();
          
          // ✅ LUEGO guardar el token y usuario
          this.auth.setToken(token);
          this.auth.setUser(user);
          
          setTimeout(() => {
            console.log('🔐 Navigating to dashboard');
            this.router.navigate(['/dashboard']);
          }, 1000);
        } else {
          console.error('🔐 ❌ Unexpected 2FA response structure:', response);
          this.errorMessage = response.message || 'Error en la verificación';
          this.clearCodeInputs();
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('🔐 2FA verification error:', error);
        
        const errorMessage = error.error?.message || error.message || 'Error en la verificación';
        
        if (errorMessage.includes('expirado')) {
          this.handleBackendExpired();
        } else if (errorMessage.includes('Máximo de intentos')) {
          this.handleBackendMaxAttempts();
        } else if (errorMessage.includes('inválido')) {
          this.handleBackendInvalidCode();
        } else {
          this.errorMessage = errorMessage;
          this.clearCodeInputs();
        }
      }
    });
  }

  private handleBackendExpired(): void {
    this.errorMessage = 'El código ha expirado. Se ha enviado uno nuevo a tu correo.';
    this.resendCode();
  }

  private handleBackendMaxAttempts(): void {
    this.errorMessage = 'Máximo de intentos alcanzado. Por favor inicia sesión nuevamente.';
    this.auth.clearPendingAuth(); // ✅ LIMPIAR ESTADO
    setTimeout(() => {
      this.router.navigate(['/auth/login']);
    }, 3000);
  }

  private handleBackendInvalidCode(): void {
    this.failedAttempts++;
    this.errorMessage = `Código inválido. ${3 - this.failedAttempts} intentos restantes.`;
    this.clearCodeInputs();
    
    setTimeout(() => {
      const firstInput = document.querySelector('.code-input') as HTMLInputElement;
      if (firstInput) firstInput.focus();
    }, 100);
  }

  clearCodeInputs(): void {
    this.codeControls.forEach(control => {
      control.setValue('');
      control.markAsUntouched();
    });
  }

  resendCode(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.auth.resend2FACode(this.authData.userId).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.successMessage = 'Nuevo código enviado a tu correo.';
        this.timeLeft = 600;
        this.clearCodeInputs();
        this.failedAttempts = 0;
        
        setTimeout(() => {
          this.successMessage = '';
          const firstInput = document.querySelector('.code-input') as HTMLInputElement;
          if (firstInput) firstInput.focus();
        }, 3000);
      },
      error: (error: any) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Error al reenviar el código.';
      }
    });
  }

  cancel(): void {
    this.auth.clearPendingAuth(); // ✅ LIMPIAR ESTADO AL CANCELAR
    this.router.navigate(['/auth/login']);
  }
}