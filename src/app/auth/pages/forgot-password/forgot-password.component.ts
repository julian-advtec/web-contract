// forgot-password.component.ts - CORREGIDO
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule]
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  forgotPasswordForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const email = this.forgotPasswordForm.get('email')?.value;

      this.auth.forgotPassword(email).subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response.ok) {
            this.successMessage = 'Si el email existe, se ha enviado un enlace de recuperación a tu correo electrónico.';
          } else {
            this.errorMessage = response.message || 'Error al procesar la solicitud';
          }
        },
        error: (error: any) => {
          this.loading = false;
          this.errorMessage = error.error?.message || 'Error al procesar la solicitud';
        }
      });
    } else {
      this.forgotPasswordForm.markAllAsTouched();
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}