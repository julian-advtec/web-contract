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

    // ✅ DETECTAR AUTOMÁTICAMENTE SI ES ADMIN PARA USAR LOGIN-DIRECT
    const isAdmin = username === 'sistemas2';
    const loginObservable = isAdmin 
      ? this.auth.loginDirect(username!, password!)
      : this.auth.login(username!, password!);

    console.log('🔐 Login method:', isAdmin ? 'DIRECT (admin)' : 'NORMAL (2FA)');

    loginObservable.subscribe({
      next: (result: any) => {
        this.loading = false;
        console.log('🔐 Login response:', result);

        if (isAdmin) {
          // 🔥 FLUJO DIRECT PARA ADMIN (sin 2FA) - CORREGIDO
          this.handleAdminLogin(result);
        } else {
          // 🔥 FLUJO NORMAL PARA OTROS USUARIOS (con 2FA)
          this.handleNormalLogin(result, username!);
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('🔐 Login error:', error);
        this.handleLoginError(error);
      }
    });
  }

  // 🔥 MANEJO DE LOGIN ADMIN (DIRECT - sin 2FA) - CORREGIDO
  private handleAdminLogin(result: any): void {
    console.log('🔐 Admin login result structure:', result);
    
    // ✅ CORRECCIÓN: Buscar token y user en data y nivel superior
    const token = result.access_token || result.token || result.data?.access_token || result.data?.token;
    const user = result.user || result.data?.user;

    console.log('🔐 Token found:', !!token);
    console.log('🔐 User found:', !!user);

    if (token && user) {
      console.log('🔐 ✅ Admin login successful, setting token');
      this.auth.setToken(token);
      this.auth.setUser(user);
      this.router.navigate(['/dashboard']);
    } else {
      console.log('🔐 ❌ Admin login failed - missing token or user:', result);
      this.errorMessage = result.message || 'Error en el login de administrador: Token o usuario no recibido';
    }
  }

  // 🔥 MANEJO DE LOGIN NORMAL (con 2FA)
  private handleNormalLogin(result: any, username: string): void {
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
    } else if (result.access_token || result.data?.access_token) {
      console.log('🔐 ✅ Login successful without 2FA, setting token');
      const token = result.access_token || result.data?.access_token;
      const user = result.user || result.data?.user;
      this.auth.setToken(token);
      this.auth.setUser(user);
      this.router.navigate(['/dashboard']);
    } else {
      console.log('🔐 ❌ Unexpected response structure:', result);
      this.errorMessage = result.message || 'Error en el login';
    }
  }

  // 🔥 MANEJO DE ERRORES
  private handleLoginError(error: any): void {
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

  goToForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }
}