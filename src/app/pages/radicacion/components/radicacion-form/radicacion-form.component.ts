import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { CreateDocumentoDto } from '../../../../core/models/documento.model';

@Component({
  selector: 'app-radicacion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './radicacion-form.component.html',
  styleUrls: ['./radicacion-form.component.scss']
})
export class RadicacionFormComponent {
  @Output() documentoRadicado = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  radicacionForm: FormGroup;
  documentosSeleccionados: (File | null)[] = [null, null, null];
  isLoading = false;
  mensaje = '';
  tipoMensaje: 'success' | 'error' = 'success';
  maxFileSize = 10 * 1024 * 1024;

  constructor(
    private fb: FormBuilder,
    private radicacionService: RadicacionService
  ) {
    this.radicacionForm = this.createForm();
  }

  createForm(): FormGroup {
    return this.fb.group({
      numeroRadicado: ['', [
        Validators.required,
        Validators.pattern(/^R\d{4}-\d{3}$/),
        Validators.maxLength(10)
      ]],
      numeroContrato: ['', [
        Validators.required,
        Validators.maxLength(50)
      ]],
      nombreContratista: ['', [
        Validators.required,
        Validators.maxLength(200)
      ]],
      documentoContratista: ['', [
        Validators.required,
        Validators.maxLength(50)
      ]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      descripcionDoc1: ['Documento 1', Validators.maxLength(200)],
      descripcionDoc2: ['Documento 2', Validators.maxLength(200)],
      descripcionDoc3: ['Documento 3', Validators.maxLength(200)]
    });
  }

  onFileSelected(event: any, index: number): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > this.maxFileSize) {
      this.mostrarMensaje(`El archivo excede 10MB`, 'error');
      event.target.value = '';
      return;
    }

    const allowedTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'image/jpeg', 'image/png'];
    
    if (!allowedTypes.includes(file.type)) {
      this.mostrarMensaje(`Tipo no permitido`, 'error');
      event.target.value = '';
      return;
    }

    this.documentosSeleccionados[index] = file;
    
    const descripcionControl = `descripcionDoc${index + 1}`;
    const currentValue = this.radicacionForm.get(descripcionControl)?.value;
    
    if (!currentValue || currentValue.startsWith('Documento')) {
      const nombreSinExtension = file.name.replace(/\.[^/.]+$/, "");
      this.radicacionForm.get(descripcionControl)?.setValue(nombreSinExtension);
    }

    this.mostrarMensaje(`Archivo cargado`, 'success');
  }

  onSubmit(): void {
    if (this.radicacionForm.invalid) {
      this.marcarControlesComoSucios();
      this.mostrarMensaje('Complete todos los campos', 'error');
      return;
    }

    const documentosCompletos = this.documentosSeleccionados.filter(doc => doc !== null).length;
    if (documentosCompletos !== 3) {
      this.mostrarMensaje('Debe seleccionar 3 documentos', 'error');
      return;
    }

    const fechaInicio = new Date(this.radicacionForm.value.fechaInicio);
    const fechaFin = new Date(this.radicacionForm.value.fechaFin);
    
    if (fechaInicio > fechaFin) {
      this.mostrarMensaje('Fecha inicio mayor que fin', 'error');
      return;
    }

    this.isLoading = true;

    // Preparar datos para enviar al backend
    const createDocumentoDto: CreateDocumentoDto = {
      numeroRadicado: this.radicacionForm.value.numeroRadicado,
      numeroContrato: this.radicacionForm.value.numeroContrato,
      nombreContratista: this.radicacionForm.value.nombreContratista,
      documentoContratista: this.radicacionForm.value.documentoContratista,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      descripcionDoc1: this.radicacionForm.value.descripcionDoc1 || 'Documento 1',
      descripcionDoc2: this.radicacionForm.value.descripcionDoc2 || 'Documento 2',
      descripcionDoc3: this.radicacionForm.value.descripcionDoc3 || 'Documento 3'
    };

    // Obtener solo los archivos que no sean null
    const archivos = this.documentosSeleccionados.filter(doc => doc !== null) as File[];

    // Enviar al backend
    this.radicacionService.crearDocumento(createDocumentoDto, archivos).subscribe({
      next: (documento) => {
        this.mostrarMensaje('✅ Documento radicado exitosamente', 'success');
        this.documentoRadicado.emit(documento);
        this.resetForm();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al radicar documento:', error);
        this.mostrarMensaje(`❌ Error: ${error.message}`, 'error');
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.cancelar.emit();
    this.resetForm();
  }

  resetForm(): void {
    this.radicacionForm.reset({
      descripcionDoc1: 'Documento 1',
      descripcionDoc2: 'Documento 2',
      descripcionDoc3: 'Documento 3'
    });
    this.documentosSeleccionados = [null, null, null];
  }

  private marcarControlesComoSucios(): void {
    Object.keys(this.radicacionForm.controls).forEach(key => {
      const control = this.radicacionForm.get(key);
      control?.markAsDirty();
      control?.updateValueAndValidity();
    });
  }

  private mostrarMensaje(texto: string, tipo: 'success' | 'error'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    
    setTimeout(() => {
      if (this.mensaje === texto) {
        this.mensaje = '';
      }
    }, 5000);
  }

  getNumeroRadicadoError(): string {
    const control = this.radicacionForm.get('numeroRadicado');
    if (control?.errors?.['required']) return 'Requerido';
    if (control?.errors?.['pattern']) return 'Formato: RAAAA-NNN';
    if (control?.errors?.['maxlength']) return 'Máx 10 caracteres';
    return '';
  }

  getNombreArchivo(index: number): string {
    return this.documentosSeleccionados[index]?.name || 'Sin archivo';
  }

  removeFile(index: number): void {
    this.documentosSeleccionados[index] = null;
    this.mostrarMensaje(`Archivo ${index + 1} removido`, 'success');
  }
}