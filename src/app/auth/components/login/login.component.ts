import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; // ← Agregar RouterLink
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // ← Agregar RouterLink aquí
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMessage = '';

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    try {
      const { username, password } = this.form.value;
      const response: any = await this.auth.login(username!, password!);

      if (response.requiresTwoFactor && response.userId) {
        sessionStorage.setItem('2faUserId', response.userId);
        this.router.navigate(['/auth/verify-2fa']);
        return;
      }

      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage = err?.message || 'Usuario o contraseña incorrectos';
    } finally {
      this.loading = false;
    }
  }
}