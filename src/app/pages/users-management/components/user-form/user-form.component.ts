// features/users/pages/user-form/user-form.component.ts
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../../../../layout/navbar/navbar.component';
import { SidebarComponent } from '../../../../layout/sidebar/sidebar.component';
import { AuthService } from '../../../../core/services/auth.service';
import { User, UserRole } from '../../../../core/models/user.types';
import { ModulesService, AppModule } from '../../../../core/services/modules.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SignatureService, Signature } from '../../../../core/services/signature.service';
import { UsersService, ApiResponse, CreateUserData, UserWithSignature, UserResponseData } from '../../../../core/services/users.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';
declare var bootstrap: any;

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NavbarComponent,
    SidebarComponent
  ]
})
export class UserFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private modulesService = inject(ModulesService);
  private notificationService = inject(NotificationService);
  private signatureService = inject(SignatureService);
  private destroy$ = new Subject<void>();
  signatureUrl: SafeResourceUrl | null = null;
  isPdf = false;
  
  // Layout properties
  currentUser: User | null = null;
  sidebarCollapsed = false;
  availableModules: AppModule[] = [];
  getUserRoleName = this.getUserRoleDisplayName.bind(this);

  // Form properties
  userForm: FormGroup;
  roles = Object.values(UserRole);
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  isEditMode = false;
  userId: string | null = null;
  formErrors: string[] = [];

  passwordStrength = {
    score: 0,
    text: '',
    color: '',
    requirements: {
      length: false,
      lowercase: false,
      uppercase: false,
      number: false
    }
  };

  // Signature properties
  currentSignature: Signature | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isUploadingSignature = false;
  canHaveSignature = false;
  hasSignatureChanges = false;

  // Modal properties
  signatureToView: Signature | null = null;
  signatureImageUrl: string | null = null;
  signatureModal: any = null;

  private readonly PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {
    this.userForm = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9_]+$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100)
      ]],
      fullName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]],
      role: ['', Validators.required],
      password: [''],
      confirmPassword: [''],
      isActive: [true],
      signatureName: ['']
    }, { validators: [this.passwordMatchValidator] });

    // Detectar cambios en el formulario para habilitar botón
    this.userForm.valueChanges.subscribe(() => {
      if (this.isEditMode) {
        this.checkFormChanges();
      }
    });
  }

  ngOnInit() {
    this.initializeComponent();
    this.initializeForm();
    this.setupPasswordValidation();
    this.setupRealTimeValidation();
    this.checkSignaturePermission();
    
    // Inicializar modal
    setTimeout(() => {
      const modalElement = document.getElementById('signatureModal');
      if (modalElement) {
        this.signatureModal = new bootstrap.Modal(modalElement);
      }
    }, 500);
  }

  ngOnDestroy() {
    if (this.signatureImageUrl) {
      URL.revokeObjectURL(this.signatureImageUrl);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    this.currentUser = this.auth.getCurrentUser();
    this.loadAvailableModules();
    this.sidebarCollapsed = window.innerWidth <= 770;
    this.setNavbarTitle();
  }

  private setNavbarTitle(): void {
    const title = this.isEditMode ? 'Editar Usuario' : 'Crear Usuario';
    sessionStorage.setItem('currentPageTitle', title);
    sessionStorage.setItem('currentPageSubtitle', this.isEditMode ? 'Modificar datos del usuario' : 'Registrar nuevo usuario en el sistema');
  }

  private loadAvailableModules(): void {
    if (this.currentUser?.role) {
      this.availableModules = this.modulesService.getModulesForUser(this.currentUser.role);
    } else {
      this.availableModules = this.modulesService.getDefaultModules();
    }
  }

  private checkSignaturePermission(): void {
    if (this.currentUser?.role) {
      this.canHaveSignature = this.signatureService.canRoleHaveSignature(this.currentUser.role);
    }
  }

  private initializeForm(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode = true;
      this.userId = id;
      this.loadUserData(id);
    } else {
      this.setupCreateMode();
    }
    this.setNavbarTitle();
  }

  private loadUserData(id: string): void {
    this.isLoading = true;

    this.usersService.getUserById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<UserResponseData>) => {
          console.log('Datos del usuario cargados:', response);

          const userData = response.data?.data;

          if (userData) {
            console.log('UserData extraído:', userData);
            this.populateForm(userData);

            if (userData.signature) {
              console.log('Firma encontrada:', userData.signature);
              this.currentSignature = userData.signature;
              this.userForm.patchValue({
                signatureName: userData.signature.name
              });
            }

            setTimeout(() => {
              this.userForm.markAsPristine();
              this.hasSignatureChanges = false;
              console.log('Form marcado como pristine');
            });
          } else {
            console.error('No se encontraron datos de usuario en la respuesta');
            this.notificationService.error('Error al cargar datos del usuario');
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando usuario:', error);
          this.handleBackendError(error, 'Error al cargar datos del usuario');
          this.router.navigate(['/gestion-usuarios']);
          this.isLoading = false;
        }
      });
  }

  private populateForm(userData: UserWithSignature): void {
    console.log('Rellenando formulario con datos:', userData);

    const formValues = {
      username: userData.username || '',
      email: userData.email || '',
      fullName: userData.fullName || '',
      role: userData.role || '',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      password: '',
      confirmPassword: ''
    };

    console.log('Valores a asignar al formulario:', formValues);
    this.userForm.patchValue(formValues);

    if (this.isEditMode) {
      console.log('Modo edición - Contraseña opcional');
      const passwordControl = this.userForm.get('password');
      const confirmControl = this.userForm.get('confirmPassword');

      if (passwordControl && confirmControl) {
        passwordControl.setValidators([
          Validators.minLength(6),
          Validators.pattern(this.PASSWORD_REGEX)
        ]);
        confirmControl.setValidators([]);
        passwordControl.updateValueAndValidity();
        confirmControl.updateValueAndValidity();
      }
    }
  }

  private checkFormChanges(): void {
    const hasFormChanges = this.userForm.dirty;
    const hasFileSelected = this.selectedFile !== null;
    this.hasSignatureChanges = hasFileSelected;
    console.log('Form dirty:', hasFormChanges, 'File selected:', hasFileSelected);
  }

  private setupCreateMode(): void {
    console.log('Configurando modo creación - Contraseña requerida');
    const passwordControl = this.userForm.get('password');
    const confirmControl = this.userForm.get('confirmPassword');

    if (passwordControl && confirmControl) {
      passwordControl.setValidators([
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(this.PASSWORD_REGEX)
      ]);
      confirmControl.setValidators([Validators.required]);
      passwordControl.updateValueAndValidity();
      confirmControl.updateValueAndValidity();
    }
  }

  private setupPasswordValidation(): void {
    const passwordControl = this.userForm.get('password');
    if (passwordControl) {
      passwordControl.valueChanges.subscribe(password => {
        this.checkPasswordStrength(password || '');
      });
    }
  }

  private setupRealTimeValidation(): void {
    const emailControl = this.userForm.get('email');
    if (emailControl) {
      emailControl.valueChanges.subscribe(email => {
        if (email && emailControl.errors?.['email']) {
          emailControl.markAsTouched();
        }
      });
    }

    const passwordControl = this.userForm.get('password');
    const confirmControl = this.userForm.get('confirmPassword');

    if (passwordControl && confirmControl) {
      passwordControl.valueChanges.subscribe(() => {
        if (confirmControl.value) {
          confirmControl.updateValueAndValidity();
        }
      });
    }
  }

  // =============================
  // SIGNATURE METHODS
  // =============================
  onSignatureFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];

    if (this.selectedFile) {
      if (this.selectedFile.size > 2 * 1024 * 1024) {
        this.notificationService.error('El archivo no puede ser mayor a 2MB');
        this.selectedFile = null;
        event.target.value = '';
        return;
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(this.selectedFile.type)) {
        this.notificationService.error('Tipo de archivo no permitido. Usa PNG, JPG, GIF o PDF');
        this.selectedFile = null;
        event.target.value = '';
        return;
      }

      if (this.selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.previewUrl = e.target?.result as string;
        };
        reader.readAsDataURL(this.selectedFile);
      } else {
        this.previewUrl = 'pdf-icon';
      }

      this.hasSignatureChanges = true;
      this.userForm.markAsDirty();
    }
  }

  deleteSignature(): void {
    this.notificationService.confirm(
      'Eliminar Firma',
      '¿Estás seguro de eliminar tu firma? Esta acción no se puede deshacer.',
      () => {
        this.signatureService.deleteSignature().subscribe({
          next: () => {
            this.currentSignature = null;
            this.selectedFile = null;
            this.previewUrl = null;
            this.userForm.patchValue({ signatureName: '' });
            
            const fileInput = document.getElementById('signatureFile') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            this.hasSignatureChanges = true;
            this.userForm.markAsDirty();
            this.notificationService.success('Firma eliminada correctamente');
          },
          error: (error) => {
            console.error('Error deleting signature:', error);
            this.notificationService.error('Error al eliminar la firma');
          }
        });
      }
    );
  }

getFileIcon(type: string | undefined): string {
  if (!type) return 'fa-file';
  return type === 'pdf' ? 'fa-file-pdf' : 'fa-file-image';
}

getFileColor(type: string | undefined): string {
  if (!type) return 'text-secondary';
  return type === 'pdf' ? 'text-danger' : 'text-primary';
}

formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
  // =============================
  // LAYOUT METHODS
  // =============================
  onToggleSidebar(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  onLogout(): void {
    this.notificationService.confirm(
      'Confirmar Cierre de Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      () => {
        this.auth.logout();
        this.notificationService.success('Sesión cerrada correctamente');
      }
    );
  }

  closeSidebarOnOverlay(event: MouseEvent): void {
    if (window.innerWidth <= 770 && !this.sidebarCollapsed) {
      const sidebarElement = (event.target as HTMLElement).closest('app-sidebar');
      if (!sidebarElement) {
        this.sidebarCollapsed = true;
      }
    }
  }

  isMobile(): boolean {
    return window.innerWidth <= 770;
  }

  // =============================
  // FORM VALIDATION METHODS
  // =============================
  passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  checkPasswordStrength(password: string): void {
    if (!password) {
      this.resetPasswordStrength();
      return;
    }

    this.passwordStrength.requirements = {
      length: password.length >= 6,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password)
    };

    const requirements = Object.values(this.passwordStrength.requirements);
    const metRequirements = requirements.filter(Boolean).length;
    const totalRequirements = requirements.length;

    this.passwordStrength.score = Math.round((metRequirements / totalRequirements) * 6);

    if (this.passwordStrength.score <= 2) {
      this.passwordStrength.text = 'Débil';
      this.passwordStrength.color = '#dc3545';
    } else if (this.passwordStrength.score <= 4) {
      this.passwordStrength.text = 'Media';
      this.passwordStrength.color = '#ffc107';
    } else {
      this.passwordStrength.text = 'Fuerte';
      this.passwordStrength.color = '#28a745';
    }
  }

  private resetPasswordStrength(): void {
    this.passwordStrength = {
      score: 0,
      text: '',
      color: '',
      requirements: {
        length: false,
        lowercase: false,
        uppercase: false,
        number: false
      }
    };
  }

  // =============================
  // ROLE METHODS
  // =============================
  getUserRoleDisplayName(role: UserRole | undefined | null): string {
    if (!role) return 'Sin rol';

    const roleNames: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.CONTRATISTA]: 'Contratista',
      [UserRole.RADICADOR]: 'Radicador',
      [UserRole.SUPERVISOR]: 'Supervisor',
      [UserRole.AUDITOR_CUENTAS]: 'Auditor de Cuentas',
      [UserRole.CONTABILIDAD]: 'Contabilidad',
      [UserRole.TESORERIA]: 'Tesorería',
      [UserRole.ASESOR_GERENCIA]: 'Asesor de Gerencia',
      [UserRole.RENDICION_CUENTAS]: 'Rendición de Cuentas',
      [UserRole.JURIDICA]: 'Jurídica'
    };

    return roleNames[role] || role;
  }

  // =============================
  // FORM SUBMISSION
  // =============================
  onSubmit(): void {
    console.log('Formulario enviado. Válido:', this.userForm.valid);
    console.log('Form dirty:', this.userForm.dirty);
    console.log('Has signature changes:', this.hasSignatureChanges);
    console.log('Selected file:', this.selectedFile);

    const hasChanges = this.userForm.dirty || this.hasSignatureChanges;

    if (!hasChanges && this.isEditMode) {
      this.notificationService.info('No hay cambios para guardar');
      return;
    }

    if (this.userForm.valid) {
      if (this.selectedFile && this.canHaveSignature) {
        const signatureName = this.userForm.get('signatureName')?.value;
        if (!signatureName) {
          this.notificationService.error('Por favor, ingresa un nombre para la firma');
          return;
        }
        this.uploadSignatureAndSubmit();
      } else {
        this.confirmBeforeSubmit();
      }
    } else {
      console.log('Formulario inválido. Errores:', this.getFormErrors());
      this.markFormGroupTouched(this.userForm);
      this.notificationService.error('Por favor, corrija los errores del formulario');
    }
  }

  private uploadSignatureAndSubmit(): void {
    const signatureName = this.userForm.get('signatureName')?.value;

    if (!signatureName && this.selectedFile) {
      this.notificationService.error('Por favor, ingresa un nombre para la firma');
      return;
    }

    if (!this.selectedFile) return;

    this.isUploadingSignature = true;
    this.isLoading = true;

    this.signatureService.uploadSignature(this.selectedFile, signatureName).subscribe({
      next: (signature) => {
        this.isUploadingSignature = false;
        this.currentSignature = signature;
        this.selectedFile = null;
        this.previewUrl = null;
        this.hasSignatureChanges = false;

        const fileInput = document.getElementById('signatureFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        this.confirmBeforeSubmit();
      },
      error: (error) => {
        this.isUploadingSignature = false;
        this.isLoading = false;
        if (error.status === 403) {
          this.notificationService.error('Tu rol no tiene permitido tener firma');
        } else {
          this.notificationService.error('Error al guardar la firma');
        }
      }
    });
  }

  private confirmBeforeSubmit(): void {
    const title = this.isEditMode ? 'Confirmar Actualización' : 'Confirmar Creación';
    const message = this.isEditMode
      ? '¿Está seguro de que desea actualizar los datos del usuario?'
      : '¿Está seguro de que desea crear el nuevo usuario?';

    this.notificationService.confirm(
      title,
      message,
      () => {
        this.isEditMode ? this.updateUser() : this.createUser();
      }
    );
  }

  private createUser(): void {
    console.log('Iniciando creación de usuario...');
    this.isLoading = true;
    this.clearFormErrors();

    const formData = this.prepareFormData();

    if (!formData) {
      this.isLoading = false;
      return;
    }

    console.log('Datos a enviar (creación):', formData);

    this.usersService.createUser(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Usuario creado exitosamente:', response);
          this.handleCreateSuccess(response);
        },
        error: (error) => {
          console.error('Error al crear usuario:', error);
          this.handleCreateError(error);
        }
      });
  }

  private updateUser(): void {
    if (!this.userId) return;

    console.log('Iniciando actualización de usuario:', this.userId);
    this.isLoading = true;
    this.clearFormErrors();

    const formData = this.prepareFormData();

    if (!formData) {
      this.isLoading = false;
      return;
    }

    console.log('Datos a enviar (actualización):', formData);

    this.usersService.updateUser(this.userId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Usuario actualizado exitosamente:', response);
          this.handleUpdateSuccess(response);
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          this.handleUpdateError(error);
        }
      });
  }

  private prepareFormData(): CreateUserData | null {
    const formValue = this.userForm.value;
    console.log('Valores del formulario:', formValue);

    if (!this.isEditMode) {
      if (!formValue.password || formValue.password.trim() === '') {
        this.addFormError('La contraseña es requerida para crear un nuevo usuario');
        this.notificationService.error('La contraseña es requerida para crear un nuevo usuario');
        return null;
      }

      if (formValue.password.length < 6) {
        this.addFormError('La contraseña debe tener al menos 6 caracteres');
        this.notificationService.error('La contraseña debe tener al menos 6 caracteres');
        return null;
      }

      if (!this.PASSWORD_REGEX.test(formValue.password)) {
        this.addFormError('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
        this.notificationService.error('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
        return null;
      }
    }

    if (formValue.password && formValue.password !== formValue.confirmPassword) {
      this.addFormError('Las contraseñas no coinciden');
      this.notificationService.error('Las contraseñas no coinciden');
      return null;
    }

    const formData: CreateUserData = {
      username: formValue.username,
      email: formValue.email,
      fullName: formValue.fullName,
      role: formValue.role
    };

    if (formValue.password && formValue.password.trim() !== '') {
      formData.password = formValue.password;
    }

    formData.isActive = this.isEditMode ? formValue.isActive : true;

    console.log('Datos preparados para enviar:', formData);
    return formData;
  }

  private handleCreateSuccess(response: ApiResponse<any>): void {
    this.isLoading = false;
    console.log('Usuario creado exitosamente');
    setTimeout(() => {
      this.router.navigate(['/gestion-usuarios']);
    }, 1000);
  }

  private handleCreateError(error: any): void {
    this.isLoading = false;

    if (error.status === 409) {
      this.notificationService.confirm(
        'Usuario/Email ya existe',
        'El nombre de usuario o email ya está registrado. ¿Desea intentar con otros datos?',
        () => {
          const control = error.field === 'email'
            ? this.userForm.get('email')
            : this.userForm.get('username');
          control?.markAsTouched();
          control?.setErrors({ 'duplicate': true });
        }
      );
    } else {
      this.handleBackendError(error, 'Error al crear usuario');
    }
  }

  private handleUpdateSuccess(response: ApiResponse<any>): void {
    this.isLoading = false;
    console.log('Usuario actualizado exitosamente');
    setTimeout(() => {
      this.router.navigate(['/gestion-usuarios']);
    }, 1000);
  }

  private handleUpdateError(error: any): void {
    this.isLoading = false;

    if (error.status === 409) {
      this.notificationService.confirm(
        'Usuario/Email ya existe',
        'El nombre de usuario o email ya está registrado por otro usuario. ¿Desea intentar con otros datos?',
        () => {
          const control = error.field === 'email'
            ? this.userForm.get('email')
            : this.userForm.get('username');
          control?.markAsTouched();
          control?.setErrors({ 'duplicate': true });
        }
      );
    } else {
      this.handleBackendError(error, 'Error al actualizar usuario');
    }
  }

  // =============================
  // ERROR HANDLING
  // =============================
  private handleBackendError(error: any, defaultMessage: string): void {
    this.clearFormErrors();
    console.error('Error del backend completo:', error);

    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err: any) => {
        this.addFormError(err);
        this.notificationService.error(err);
      });
    } else if (error.message) {
      this.addFormError(error.message);
      this.notificationService.error(error.message);
    } else if (error.status === 409) {
      const errorMessage = 'El nombre de usuario o email ya está registrado';
      this.addFormError(errorMessage);
      this.notificationService.error(errorMessage);
    } else if (error.status === 404) {
      const errorMessage = 'Usuario no encontrado';
      this.addFormError(errorMessage);
      this.notificationService.error(errorMessage);
    } else if (error.status === 400) {
      const errorMessage = 'Datos inválidos. Verifique la información ingresada';
      this.addFormError(errorMessage);
      this.notificationService.error(errorMessage);
    } else if (error.status === 403) {
      const errorMessage = 'No tiene permisos para realizar esta acción';
      this.addFormError(errorMessage);
      this.notificationService.error(errorMessage);
    } else if (error.status === 401) {
      const errorMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente';
      this.addFormError(errorMessage);
      this.notificationService.error(errorMessage);
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 1500);
    } else if (error.status === 500) {
      const errorMessage = 'Error interno del servidor. Intente nuevamente más tarde';
      this.addFormError(errorMessage);
      this.notificationService.error(errorMessage);
    } else {
      this.addFormError(defaultMessage);
      this.notificationService.error(defaultMessage);
    }
  }

  // =============================
  // UI METHODS
  // =============================
  onCancel(): void {
    if (this.userForm.dirty || this.hasSignatureChanges) {
      this.notificationService.confirm(
        '¿Descartar cambios?',
        'Tiene cambios sin guardar. ¿Está seguro de que desea salir?',
        () => {
          this.router.navigate(['/gestion-usuarios']);
        }
      );
    } else {
      this.router.navigate(['/gestion-usuarios']);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      if (control?.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  private clearFormErrors(): void {
    this.formErrors = [];
  }

  private addFormError(error: string): void {
    this.formErrors.push(error);
  }

  // =============================
  // FORM HELPERS
  // =============================
  getFormControl(name: string): AbstractControl | null {
    return this.userForm.get(name);
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.getFormControl(controlName);
    return control ? control.hasError(errorName) && (control.touched || control.dirty) : false;
  }

  getErrorMessage(controlName: string): string {
    const control = this.getFormControl(controlName);
    if (!control || !control.errors) return '';

    const errors = control.errors;

    if (errors['required']) return 'Este campo es requerido';
    if (errors['email']) return 'Ingrese un email válido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['pattern']) {
      if (controlName === 'username') return 'Solo letras, números y guiones bajos';
      if (controlName === 'fullName') return 'Solo letras y espacios';
      if (controlName === 'password') return 'Debe contener al menos una mayúscula, una minúscula y un número';
    }
    if (errors['mismatch']) return 'Las contraseñas no coinciden';
    if (errors['duplicate']) return 'Este valor ya está registrado en el sistema';

    return 'Campo inválido';
  }

  get passwordRequirements(): any[] {
    return [
      { key: 'length', text: 'Mínimo 6 caracteres', met: this.passwordStrength.requirements.length },
      { key: 'lowercase', text: 'Una letra minúscula', met: this.passwordStrength.requirements.lowercase },
      { key: 'uppercase', text: 'Una letra mayúscula', met: this.passwordStrength.requirements.uppercase },
      { key: 'number', text: 'Un número', met: this.passwordStrength.requirements.number }
    ];
  }

  get canSubmit(): boolean {
    if (this.isEditMode) {
      return (this.userForm.dirty || this.hasSignatureChanges) && this.userForm.valid && !this.isLoading;
    }
    return this.userForm.valid && !this.isLoading;
  }

  viewSignature(): void {
    if (!this.currentSignature) return;
    
    this.signatureToView = this.currentSignature;
    this.isPdf = this.currentSignature.type === 'pdf';
    
    console.log('🔍 Iniciando carga de firma...');
    
    this.signatureService.getSignatureBlob().subscribe({
      next: (blob) => {
        console.log('✅ Firma cargada, tamaño:', blob.size);
        console.log('✅ Tipo MIME:', blob.type);
        
        if (this.signatureUrl) {
          URL.revokeObjectURL(this.signatureUrl as string);
        }
        
        const url = URL.createObjectURL(blob);
        console.log('🔗 URL creada:', url);
        
        this.signatureUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.cdr.detectChanges();
        
        setTimeout(() => {
          const modalElement = document.getElementById('signatureModal');
          if (modalElement) {
            if (!this.signatureModal) {
              this.signatureModal = new bootstrap.Modal(modalElement);
            }
            this.signatureModal.show();
            console.log('✅ Modal mostrado');
          } else {
            console.error('❌ Elemento modal no encontrado en el DOM');
          }
        }, 100);
      },
      error: (error) => {
        console.error('❌ Error al cargar la firma:', error);
        this.notificationService.error('Error al cargar la firma');
      }
    });
  }

  closeModal(): void {
    if (this.signatureModal) {
      this.signatureModal.hide();
    }
    this.signatureUrl = null;
  }
}