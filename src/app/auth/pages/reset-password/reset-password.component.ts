import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service'; // ← Ruta CORRECTA
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})

export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  token: string = '';
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetForm = this.createForm();
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    
    if (!this.token) {
      this.errorMessage = 'Token de restablecimiento no válido';
      return;
    }

    this.validateToken();
  }

  createForm(): FormGroup {
    return this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword) return null;

    return newPassword.value === confirmPassword.value ? null : { mismatch: true };
  }

  validateToken(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.validateResetToken(this.token).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log('🔐 Token validation result:', response);
        
        if (response.valid === false || response.data?.valid === false) {
          this.errorMessage = 'El enlace de restablecimiento ha expirado o no es válido';
        } else if (!response.valid && !response.data?.valid) {
          this.errorMessage = 'Token inválido o expirado';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('❌ Token validation error:', error);
        this.errorMessage = error.error?.message || 'Error al validar el enlace. Por favor, solicita un nuevo enlace.';
      }
    });
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { newPassword } = this.resetForm.value;

    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log('✅ Password reset successful:', response);
        this.successMessage = '¡Contraseña restablecida exitosamente! Ahora puedes iniciar sesión con tu nueva contraseña.';
        this.resetForm.reset();
        
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('❌ Password reset error:', error);
        this.errorMessage = error.error?.message || 'Error al restablecer la contraseña. Por favor, intenta nuevamente.';
      }
    });
  }

  togglePasswordVisibility(field: string): void {
    if (field === 'newPassword') {
      this.showNewPassword = !this.showNewPassword;
    } else if (field === 'confirmPassword') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.resetForm.controls).forEach(key => {
      const control = this.resetForm.get(key);
      control?.markAsTouched();
    });
  }

  requestNewLink(): void {
    this.router.navigate(['/auth/forgot-password']);
  }
}