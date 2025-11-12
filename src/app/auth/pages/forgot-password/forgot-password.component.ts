import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  loading = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit() {
    if (this.form.invalid) return;
    
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const email = this.form.value.email;
      console.log('📧 Enviando recuperación para:', email);

      // Simular envío de email (reemplazar con tu servicio real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular respuesta exitosa
      this.successMessage = 'Se ha enviado un enlace de recuperación a tu correo electrónico.';
      this.form.reset();
      
      console.log('📧 Email de recuperación enviado exitosamente');
      
    } catch (error: any) {
      console.error('📧 ERROR enviando recuperación:', error);
      this.errorMessage = error?.message || 'Error al enviar el email. Intenta nuevamente.';
    } finally {
      this.loading = false;
    }
  }

  // Método para volver al login
  backToLogin() {
    this.router.navigate(['/auth/login']);
  }
}