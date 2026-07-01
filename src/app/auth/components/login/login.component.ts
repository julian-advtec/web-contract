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

    const isAdmin = username === 'sistemas2';
    const loginObservable = isAdmin 
      ? this.auth.loginDirect(username!, password!)
      : this.auth.login(username!, password!);

    loginObservable.subscribe({
      next: (result: any) => {
        this.loading = false;

        if (isAdmin) {
          this.handleAdminLogin(result);
        } else {
          this.handleNormalLogin(result, username!);
        }
      },
      error: (error: any) => {
        this.loading = false;
        this.handleLoginError(error);
      }
    });
  }

  private handleAdminLogin(result: any): void {
    const token = result.access_token || result.token || result.data?.access_token || result.data?.token;
    const user = result.user || result.data?.user;

    if (token && user) {
      this.auth.setToken(token);
      this.auth.setUser(user);
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage = result.message || 'Error en el login de administrador';
    }
  }

  private handleNormalLogin(result: any, username: string): void {
    const requires2FA = result.requiresTwoFactor === true || result.data?.requiresTwoFactor === true;
    const userId = result.userId || result.data?.userId;

    if (requires2FA && userId) {
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
      const token = result.access_token || result.data?.access_token;
      const user = result.user || result.data?.user;
      this.auth.setToken(token);
      this.auth.setUser(user);
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage = result.message || 'Usuario ingresado no encontrado.';
    }
  }

  private handleLoginError(error: any): void {
    if (error.error && error.error.message) {
      this.errorMessage = error.error.message;
    } else if (error.message) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'Error en el servidor';
    }
    
    if (error.status === 0) {
      this.errorMessage = 'No se puede conectar al servidor';
    }
  }

  goToForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }
}