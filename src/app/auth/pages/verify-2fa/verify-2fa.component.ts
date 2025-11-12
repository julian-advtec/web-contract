import { Component, OnInit, OnDestroy, inject, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verify-2fa.component.html',
  styleUrls: ['./verify-2fa.component.scss']
})
export class Verify2faComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  loading = false;
  errorMessage = '';
  successMessage = '';
  timeLeft = 600;
  private countdownInterval: any;
  debugInfo = '';

  // Crear los 6 FormControls individuales
  code1 = new FormControl('', [Validators.required, Validators.pattern(/^[0-9]$/)]);
  code2 = new FormControl('', [Validators.required, Validators.pattern(/^[0-9]$/)]);
  code3 = new FormControl('', [Validators.required, Validators.pattern(/^[0-9]$/)]);
  code4 = new FormControl('', [Validators.required, Validators.pattern(/^[0-9]$/)]);
  code5 = new FormControl('', [Validators.required, Validators.pattern(/^[0-9]$/)]);
  code6 = new FormControl('', [Validators.required, Validators.pattern(/^[0-9]$/)]);

  // Array de controles para facilitar el acceso
  codeControls: FormControl[] = [];

  ngOnInit() {
    // Inicializar el array de controles
    this.codeControls = [this.code1, this.code2, this.code3, this.code4, this.code5, this.code6];

    const pendingUserId = this.auth.getPendingUserId();
    if (!pendingUserId) {
      this.errorMessage = 'No hay verificación pendiente. Redirigiendo al login...';
      setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      return;
    }

    this.debugInfo = `Usuario pendiente: ${pendingUserId}`;
    this.startCountdown();
    
    // Auto-focus en el primer input
    setTimeout(() => {
      this.focusInput(0);
    }, 100);
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  startCountdown() {
    this.countdownInterval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.countdownInterval);
        this.errorMessage = 'El código ha expirado. Por favor solicita uno nuevo.';
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  onCodeInput(event: any, index: number) {
    const input = event.target;
    const value = input.value.replace(/[^0-9]/g, '');
    
    // Actualizar el valor del control
    this.codeControls[index].setValue(value);
    
    // Si se ingresó un dígito, mover al siguiente input
    if (value && index < 5) {
      this.focusInput(index + 1);
    }
    
    // Auto-submit cuando todos los campos están llenos
    if (this.isAllCodesFilled()) {
      this.onSubmit();
    }
  }

  onKeyDown(event: any, index: number) {
    // Manejar tecla Backspace
    if (event.key === 'Backspace') {
      if (!event.target.value && index > 0) {
        // Si el campo está vacío y se presiona backspace, ir al campo anterior
        this.focusInput(index - 1);
      } else if (event.target.value) {
        // Si hay valor, limpiarlo
        this.codeControls[index].setValue('');
      }
    }
    
    // Manejar teclas de flecha
    if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
      event.preventDefault();
    }
    if (event.key === 'ArrowRight' && index < 5) {
      this.focusInput(index + 1);
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent, index: number) {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text').replace(/[^0-9]/g, '');
    
    if (pasteData && pasteData.length === 6) {
      // Pegar el código completo en los 6 campos
      for (let i = 0; i < 6; i++) {
        if (i < pasteData.length) {
          this.codeControls[i].setValue(pasteData[i]);
        }
      }
      
      // Enfocar el último campo y auto-submit
      this.focusInput(5);
      if (this.isAllCodesFilled()) {
        this.onSubmit();
      }
    }
  }

  focusInput(index: number) {
    setTimeout(() => {
      const inputs = this.codeInputs.toArray();
      if (inputs[index]) {
        inputs[index].nativeElement.focus();
      }
    }, 0);
  }

  isAllCodesFilled(): boolean {
    return this.codeControls.every(control => control.valid && control.value);
  }

  getFullCode(): string {
    return this.codeControls.map(control => control.value).join('');
  }

  isFormInvalid(): boolean {
    return this.codeControls.some(control => control.invalid) || !this.isAllCodesFilled();
  }

  async onSubmit() {
    if (!this.isAllCodesFilled()) return;
    
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const fullCode = this.getFullCode();
      const result = await this.auth.verifyTwoFactor(fullCode);
      
      if (result.success) {
        this.successMessage = result.message || '¡Verificación exitosa!';
        
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      } else {
        this.errorMessage = result.message || 'Error en la verificación';
        // Limpiar todos los campos en caso de error
        this.clearAllCodes();
        this.focusInput(0);
      }
    } catch (err: any) {
      this.errorMessage = err.error?.message || 'Código incorrecto o expirado';
      this.clearAllCodes();
      this.focusInput(0);
    } finally {
      this.loading = false;
    }
  }

  clearAllCodes() {
    this.codeControls.forEach(control => control.setValue(''));
  }

  async resendCode() {
    this.errorMessage = '';
    this.successMessage = '';
    this.clearAllCodes();

    try {
      const result = await this.auth.resendTwoFactorCode();
      
      if (result.success) {
        this.successMessage = result.message || 'Código reenviado exitosamente';
        
        this.timeLeft = 600;
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
        this.startCountdown();
        
        // Enfocar el primer campo después de reenviar
        this.focusInput(0);
      } else {
        this.errorMessage = result.message || 'Error al reenviar el código';
      }
    } catch (err: any) {
      this.errorMessage = err.error?.message || 'Error al reenviar el código';
    }
  }

  cancel() {
    this.auth.clearPendingAuth();
    this.router.navigate(['/auth/login']);
  }
}