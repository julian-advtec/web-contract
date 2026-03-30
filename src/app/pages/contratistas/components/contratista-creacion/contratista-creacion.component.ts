import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContratistasService } from '../../../../core/services/contratistas.service';

@Component({
  selector: 'app-contratista-creacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './contratista-creacion.component.html',
  styleUrls: ['./contratista-creacion.component.scss']
})
export class ContratistaCreacionComponent implements OnInit, OnDestroy {
  contratistaForm!: FormGroup;
  isEditMode = false;
  contratistaId: string | null = null;
  isLoading = false;
  isSubmitting = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';
  documentoExistente = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private contratistaService: ContratistasService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get f() {
    return this.contratistaForm.controls;
  }

  private initializeForm(): void {
    this.contratistaForm = this.fb.group({
      tipoDocumento: ['CC', Validators.required],
      documentoIdentidad: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
      representanteLegal: ['', Validators.maxLength(200)],
      documentoRepresentante: ['', Validators.maxLength(20)],
      telefono: ['', Validators.maxLength(15)],
      email: ['', [Validators.email]],
      direccion: [''],
      departamento: ['', Validators.maxLength(50)],
      ciudad: ['', Validators.maxLength(50)],
      tipoContratista: [''],
      estado: ['ACTIVO', Validators.required]
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.contratistaId = id;
      this.cargarContratista(id);
    }
  }

  cargarContratista(id: string): void {
    this.isLoading = true;
    const sub = this.contratistaService.obtenerCompleto(id).subscribe({
      next: (data: any) => {
        if (data) {
          this.contratistaForm.patchValue({
            tipoDocumento: data.tipoDocumento || 'CC',
            documentoIdentidad: data.documentoIdentidad,
            razonSocial: data.razonSocial || data.nombreCompleto,
            representanteLegal: data.representanteLegal,
            documentoRepresentante: data.documentoRepresentante,
            telefono: data.telefono,
            email: data.email,
            direccion: data.direccion,
            departamento: data.departamento,
            ciudad: data.ciudad,
            tipoContratista: data.tipoContratista,
            estado: data.estado || 'ACTIVO'
          });
        } else {
          this.errorMessage = 'Contratista no encontrado';
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error cargando contratista:', error);
        this.errorMessage = error.message || 'Error al cargar el contratista';
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  verificarDocumento(): void {
    const documento = this.contratistaForm.get('documentoIdentidad')?.value;
    if (documento && documento.length >= 3) {
      this.contratistaService.verificarDocumento(documento).subscribe({
        next: (result: any) => {
          if (result.existe && !this.isEditMode) {
            this.documentoExistente = true;
            this.errorMessage = `Ya existe un contratista con el documento ${documento}`;
            this.contratistaForm.get('documentoIdentidad')?.setErrors({ existe: true });
          } else {
            this.documentoExistente = false;
          }
        }
      });
    }
  }

  guardarContratista(): void {
    this.submitted = true;

    if (this.contratistaForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos requeridos';
      this.contratistaForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.contratistaForm.getRawValue();
    
    const contratistaData = {
      tipoDocumento: formValue.tipoDocumento,
      documentoIdentidad: formValue.documentoIdentidad,
      razonSocial: formValue.razonSocial,
      representanteLegal: formValue.representanteLegal,
      documentoRepresentante: formValue.documentoRepresentante,
      telefono: formValue.telefono,
      email: formValue.email,
      direccion: formValue.direccion,
      departamento: formValue.departamento,
      ciudad: formValue.ciudad,
      tipoContratista: formValue.tipoContratista,
      estado: formValue.estado
    };

    let request;
    if (this.isEditMode && this.contratistaId) {
      request = this.contratistaService.actualizarContratista(this.contratistaId, contratistaData);
    } else {
      request = this.contratistaService.crearContratista(contratistaData);
    }

    const sub = request.subscribe({
      next: () => {
        this.successMessage = this.isEditMode ? 'Contratista actualizado exitosamente' : 'Contratista creado exitosamente';
        this.isSubmitting = false;
        setTimeout(() => this.router.navigate(['/contratistas/list']), 1500);
      },
      error: (error: any) => {
        this.errorMessage = error.message || 'Error al guardar el contratista';
        this.isSubmitting = false;
      }
    });
    this.subscriptions.push(sub);
  }

  cancelar(): void {
    if (confirm('¿Cancelar? Los datos no guardados se perderán.')) {
      this.router.navigate(['/contratistas/list']);
    }
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }
}