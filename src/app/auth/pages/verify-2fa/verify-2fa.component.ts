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
    console.log('🔐 Verify2FA Component initialized');
    
    // ✅ CORRECCIÓN MEJORADA: Obtener authData de múltiples fuentes
    this.getAuthData();
    
    if (!this.authData || !this.authData.userId) {
      console.error('❌ No authData found, redirecting to login');
      this.router.navigate(['/auth/login']);
      return;
    }

    console.log('🔐 Verify2FA initialized for userId:', this.authData.userId);
    this.startVisualTimer();
  }

  // ✅ NUEVO MÉTODO: Obtener authData de múltiples fuentes
  private getAuthData(): void {
    // 1. Intentar desde history.state
    this.authData = history.state.authData;
    console.log('🔐 AuthData from history.state:', this.authData);
    
    // 2. Si no hay en history.state, verificar en el servicio
    if (!this.authData || !this.authData.userId) {
      const pendingUserId = this.auth.getPendingUserId();
      console.log('🔐 Pending userId from service:', pendingUserId);
      
      if (pendingUserId) {
        this.authData = { userId: pendingUserId };
        console.log('🔐 Using pending user ID from service:', pendingUserId);
      }
    }

    // 3. Si aún no hay, intentar desde query params (backup)
    if (!this.authData || !this.authData.userId) {
      this.route.queryParams.subscribe(params => {
        if (params['userId']) {
          this.authData = { userId: params['userId'] };
          console.log('🔐 Using userId from query params:', params['userId']);
        }
      });
    }

    console.log('🔐 Final authData:', this.authData);
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  // ... (el resto de los métodos se mantienen igual)
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
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    this.errorMessage = 'El tiempo para ingresar el código ha expirado.';
  }

  isFormInvalid(): boolean {
    return this.codeControls.some(control => control.invalid);
  }

  isAllCodesFilled(): boolean {
    return this.codeControls.every(control => control.valid && control.value !== '');
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
        console.log('🔐 2FA verification FULL response:', response);
        
        // ✅ CORRECCIÓN MEJORADA: Buscar token y user en múltiples ubicaciones
        let token: string | null = null;
        let user: any = null;

        // Buscar en diferentes estructuras de respuesta
        if (response.access_token) {
          token = response.access_token;
          user = response.user;
        } else if (response.token) {
          token = response.token;
          user = response.user;
        } else if (response.data?.access_token) {
          token = response.data.access_token;
          user = response.data.user;
        } else if (response.data?.token) {
          token = response.data.token;
          user = response.data.user;
        }

        console.log('🔐 Token extracted:', token ? 'YES' : 'NO');
        console.log('🔐 User extracted:', user ? 'YES' : 'NO');

        if (token && user) {
          this.successMessage = 'Verificación exitosa. Redirigiendo...';
          console.log('🔐 ✅ 2FA successful, completing login...');
          
          // ✅ USAR EL MÉTODO completeLogin
          this.auth.completeLogin(token, user).subscribe({
            next: (success) => {
              if (success) {
                console.log('🔐 ✅ Login completed, navigating to dashboard...');
                
                // Navegar al dashboard con manejo de errores
                setTimeout(() => {
                  this.router.navigate(['/dashboard']).then(navSuccess => {
                    if (navSuccess) {
                      console.log('🔐 ✅ Navigation to dashboard successful');
                    } else {
                      console.error('🔐 ❌ Navigation to dashboard failed, trying root...');
                      this.router.navigate(['/']);
                    }
                  });
                }, 1000);
              } else {
                this.errorMessage = 'Error al completar el inicio de sesión';
                this.clearCodeInputs();
              }
            },
            error: (error) => {
              console.error('🔐 ❌ Error in completeLogin:', error);
              this.errorMessage = 'Error al completar el inicio de sesión';
              this.clearCodeInputs();
            }
          });
        } else {
          console.error('🔐 ❌ Token or user missing in response:', response);
          this.errorMessage = response.message || 'Error en la verificación: Datos incompletos';
          this.clearCodeInputs();
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('🔐 2FA verification error:', error);
        
        const errorMessage = error.error?.message || error.message || 'Error en la verificación';
        
        if (errorMessage.includes('expirado') || errorMessage.includes('expired')) {
          this.handleBackendExpired();
        } else if (errorMessage.includes('Máximo de intentos') || errorMessage.includes('max attempts')) {
          this.handleBackendMaxAttempts();
        } else if (errorMessage.includes('inválido') || errorMessage.includes('invalid')) {
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
    this.auth.clearPendingAuth();
    setTimeout(() => {
      this.router.navigate(['/auth/login']);
    }, 3000);
  }

  private handleBackendInvalidCode(): void {
    this.failedAttempts++;
    const attemptsLeft = this.maxFailedAttempts - this.failedAttempts;
    this.errorMessage = `Código inválido. ${attemptsLeft} intentos restantes.`;
    this.clearCodeInputs();
    
    if (this.failedAttempts >= this.maxFailedAttempts) {
      this.handleBackendMaxAttempts();
      return;
    }
    
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
    console.log('🔐 2FA verification cancelled');
    this.auth.clearPendingAuth();
    this.router.navigate(['/auth/login']);
  }
}