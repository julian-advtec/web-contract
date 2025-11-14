// login.component.ts - CORREGIDO
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  loading = false;
  errorMessage = '';

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { username, password } = this.form.value;

    console.log('🔐 Attempting login with:', username);

    this.auth.login(username!, password!).subscribe({
      next: (result: any) => {
        this.loading = false;
        console.log('🔐 Login response:', result);
        
        // ✅ CORRECCIÓN - Verificar en ambos niveles (data y nivel superior)
        const requires2FA = result.requiresTwoFactor === true || 
                           result.data?.requiresTwoFactor === true;
        
        const userId = result.userId || result.data?.userId;

        console.log('🔐 requires2FA:', requires2FA);
        console.log('🔐 userId:', userId);
        console.log('🔐 access_token:', result.access_token);

        if (requires2FA && userId) {
          console.log('🔐 ✅ Redirecting to 2FA with userId:', userId);
          // Establecer userId pendiente en el servicio
          this.auth.setPendingUserId(userId);
          this.router.navigate(['/auth/verify-2fa'], {
            state: { 
              authData: { 
                userId: userId,
                username: username 
              } 
            }
          });
        } else if (result.access_token) {
          console.log('🔐 ✅ Login successful, setting token');
          this.auth.setToken(result.access_token);
          this.auth.setUser(result.user);
          this.router.navigate(['/dashboard']);
        } else {
          console.log('🔐 ❌ Unexpected response structure:', result);
          this.errorMessage = result.message || 'Error en el login';
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('🔐 Login error:', error);
        
        if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else if (error.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Error en el servidor';
        }
        
        if (error.status === 0) {
          this.errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté ejecutándose.';
        }
      }
    });
  }

  goToForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }
}