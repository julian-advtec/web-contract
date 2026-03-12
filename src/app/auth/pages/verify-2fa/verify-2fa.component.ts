// verify-2fa.component.ts - VERSIÓN DEFINITIVA Y MEJORADA
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription, interval, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

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
  private location = inject(Location); // 🆕 Inyectado para navegación directa

  codeControls: FormControl[] = [];
  timeLeft: number = 600; // 10 minutos en segundos
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  failedAttempts: number = 0;
  maxFailedAttempts: number = 3;
  
  private timerSubscription!: Subscription;
  private authData: any;
  private navigationInProgress = false;
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;

  constructor() {
    for (let i = 0; i < 6; i++) {
      this.codeControls.push(this.fb.control('', [Validators.required, Validators.pattern('[0-9]')]));
    }
  }

  ngOnInit(): void {
    console.log('🔐 Verify2FA Component initialized');
    this.getAuthData();
    
    if (!this.authData || !this.authData.userId) {
      console.error('❌ No authData found, redirecting to login');
      this.router.navigate(['/auth/login']);
      return;
    }

    console.log('🔐 Verify2FA initialized for userId:', this.authData.userId);
    this.startVisualTimer();
    
    // 🆕 Enfocar el primer input automáticamente
    setTimeout(() => {
      const firstInput = document.querySelector('.code-input') as HTMLInputElement;
      if (firstInput) firstInput.focus();
    }, 200);
  }

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
      this.route.queryParams.pipe(take(1)).subscribe(params => {
        if (params['userId']) {
          this.authData = { userId: params['userId'] };
          console.log('🔐 Using userId from query params:', params['userId']);
        }
      });
    }

    // 4. Último recurso: intentar desde localStorage
    if (!this.authData || !this.authData.userId) {
      try {
        const pendingData = localStorage.getItem('pending_2fa');
        if (pendingData) {
          const parsed = JSON.parse(pendingData);
          if (parsed.userId) {
            this.authData = parsed;
            console.log('🔐 Using userId from localStorage:', parsed.userId);
          }
        }
      } catch (e) {
        console.error('Error reading from localStorage:', e);
      }
    }

    console.log('🔐 Final authData:', this.authData);
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
    
    // Solo permitir números
    if (!/^\d*$/.test(value)) {
      input.value = value.replace(/\D/g, '');
      return;
    }
    
    // Auto-avanzar al siguiente input
    if (value && index < 5) {
      const nextInput = document.querySelectorAll('.code-input')[index + 1] as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
    
    // Auto-enviar cuando todos los dígitos están completos
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

  // 🚀 MÉTODO PRINCIPAL ULTRA MEJORADO
  async onSubmit(): Promise<void> {
    // Prevenir múltiples envíos
    if (!this.isAllCodesFilled() || this.loading || this.navigationInProgress) {
      console.log('🔐 Envío bloqueado:', { 
        filled: this.isAllCodesFilled(), 
        loading: this.loading, 
        navigationInProgress: this.navigationInProgress 
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const code = this.codeControls.map(control => control.value).join('');
    const userId = this.authData.userId;

    console.log('🔐 Enviando código 2FA:', code, 'para userId:', userId);

    try {
      // Usar firstValueFrom para mejor control
      const response = await firstValueFrom(this.auth.verify2FA(userId, code));
      
      console.log('🔐 Respuesta completa de 2FA:', response);
      
      // Extraer token y usuario de la respuesta
      const { token, user } = this.extractTokenAndUser(response);
      
      if (token && user) {
        this.successMessage = '✅ Verificación exitosa. Redirigiendo...';
        console.log('🔐 ✅ 2FA exitoso, completando login...');
        
        // 🟢 PASO 1: Guardar autenticación (múltiples métodos)
        this.saveAuthentication(token, user);
        
        // 🟢 PASO 2: Verificar que se guardó correctamente
        const verificationResult = this.verifyAuthenticationSaved();
        if (!verificationResult) {
          console.warn('⚠️ Verificación de almacenamiento falló, reintentando...');
          await new Promise(resolve => setTimeout(resolve, 200));
          this.saveAuthentication(token, user);
        }
        
        // 🟢 PASO 3: Limpiar estado pendiente
        this.auth.clearPendingAuth();
        localStorage.removeItem('pending_2fa');
        
        // 🟢 PASO 4: Pequeña pausa para asegurar que el estado se propague
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 🟢 PASO 5: Verificar estado de autenticación
        const isAuth = this.auth.isAuthenticated();
        console.log('🔐 Estado de autenticación después de guardar:', isAuth);
        
        // 🟢 PASO 6: Navegar al dashboard (CON FALLBACK MÚLTIPLE)
        await this.navigateToDashboardWithFallback();
        
      } else {
        throw new Error('Token o usuario no encontrados en la respuesta');
      }
      
    } catch (error: any) {
      console.error('🔐 Error en verificación 2FA:', error);
      this.handleVerificationError(error);
    } finally {
      this.loading = false;
    }
  }

  // 🆕 Método para guardar autenticación de forma redundante
  private saveAuthentication(token: string, user: any): void {
    try {
      // Método 1: Usar el servicio
      this.auth.setToken(token);
      this.auth.setUser(user);
      
      // Método 2: Guardar directamente en localStorage (redundancia)
      localStorage.setItem('auth_token_backup', token);
      localStorage.setItem('auth_user_backup', JSON.stringify(user));
      
      // Método 3: Guardar en sessionStorage como respaldo
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('auth_user', JSON.stringify(user));
      
      console.log('🔐 Autenticación guardada en múltiples almacenamientos');
    } catch (e) {
      console.error('Error guardando autenticación:', e);
    }
  }

  // 🆕 Verificar que la autenticación se guardó
  private verifyAuthenticationSaved(): boolean {
    try {
      const mainToken = localStorage.getItem('token');
      const mainUser = localStorage.getItem('user');
      const backupToken = localStorage.getItem('auth_token_backup');
      
      return !!(mainToken && mainUser && backupToken);
    } catch {
      return false;
    }
  }

  // 🆕 Método para extraer token y usuario de diferentes estructuras
  private extractTokenAndUser(response: any): { token: string | null; user: any | null } {
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

    console.log('🔐 Token extraído:', token ? 'SÍ' : 'NO');
    console.log('🔐 Usuario extraído:', user ? 'SÍ' : 'NO');

    return { token, user };
  }

  // 🆕 Método de navegación con múltiples estrategias de fallback
  private async navigateToDashboardWithFallback(): Promise<void> {
    this.navigationInProgress = true;
    
    // Lista de estrategias de navegación en orden de preferencia
    const navigationStrategies = [
      // Estrategia 1: Angular Router con navigateByUrl (la mejor)
      async () => {
        console.log('🔵 Estrategia 1: Angular Router con navigateByUrl');
        return await this.router.navigateByUrl('/dashboard');
      },
      
      // Estrategia 2: Angular Router con navigate (array)
      async () => {
        console.log('🔵 Estrategia 2: Angular Router con navigate');
        return await this.router.navigate(['/dashboard']);
      },
      
      // Estrategia 3: Location.go + recarga manual
      async () => {
        console.log('🔵 Estrategia 3: Location.go');
        this.location.go('/dashboard');
        return true;
      },
      
      // Estrategia 4: window.location.href (recarga completa)
      async () => {
        console.log('🔵 Estrategia 4: window.location.href');
        window.location.href = '/dashboard';
        return true; // No esperamos retorno
      },
      
      // Estrategia 5: window.location.replace (sin historial)
      async () => {
        console.log('🔵 Estrategia 5: window.location.replace');
        window.location.replace('/dashboard');
        return true;
      }
    ];
    
    for (let i = 0; i < navigationStrategies.length; i++) {
      try {
        console.log(`🔐 Intentando estrategia ${i + 1}...`);
        const result = await navigationStrategies[i]();
        
        // Si la estrategia fue exitosa (o es una recarga completa), terminamos
        if (result || i >= 2) { // A partir de estrategia 3, consideramos éxito
          console.log(`✅ Estrategia ${i + 1} ejecutada con éxito`);
          
          // Si usamos Location.go, forzamos recarga después de 100ms
          if (i === 2) {
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
          
          break;
        }
      } catch (error) {
        console.error(`❌ Estrategia ${i + 1} falló:`, error);
      }
      
      // Esperar entre estrategias
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    this.navigationInProgress = false;
  }

  // 🆕 Manejo de errores mejorado
  private handleVerificationError(error: any): void {
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

  private handleBackendExpired(): void {
    this.errorMessage = 'El código ha expirado. Se ha enviado uno nuevo a tu correo.';
    this.resendCode();
  }

  private handleBackendMaxAttempts(): void {
    this.errorMessage = 'Máximo de intentos alcanzado. Por favor inicia sesión nuevamente.';
    this.auth.clearPendingAuth();
    localStorage.removeItem('pending_2fa');
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
        this.timeLeft = 600; // Reset timer to 10 minutes
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
    console.log('🔐 Verificación 2FA cancelada');
    this.auth.clearPendingAuth();
    localStorage.removeItem('pending_2fa');
    this.router.navigate(['/auth/login']);
  }
}