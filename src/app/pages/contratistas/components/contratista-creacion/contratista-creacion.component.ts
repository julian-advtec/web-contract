// src/app/pages/contratistas/components/contratista-creacion/contratista-creacion.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { TipoDocumento } from '../../../../core/models/contratista.model';

interface DocumentoInfo {
  tipo: string;
  archivo: File;
  nombre: string;
  tamano: number;
}

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

  pasoActual = 1;
  
  // Documentos organizados por tipo
  documentosPorTipo: Map<string, DocumentoInfo> = new Map();
  documentoError = '';
  
  tiposDocumento = [
    { value: 'CEDULA', label: 'Cedula' },
    { value: 'RUT', label: 'RUT' },
    { value: 'CERTIFICADO_BANCARIO', label: 'Certificado Bancario' },
    { value: 'CERTIFICADO_EXPERIENCIA', label: 'Certificado de Experiencia' },
    { value: 'CERTIFICADO_NO_PLANTA', label: 'Certificado No Planta' },
    { value: 'CERTIFICADO_ANTECEDENTES', label: 'Certificado de Antecedentes' },
    { value: 'CERTIFICADO_IDONEIDAD', label: 'Certificado de Idoneidad' },
    { value: 'DECLARACION_BIENES', label: 'Declaracion de Bienes' },
    { value: 'DECLARACION_INHABILIDADES', label: 'Declaracion de Inhabilidades' },
    { value: 'EXAMEN_INGRESO', label: 'Examen de Ingreso' },
    { value: 'GARANTIA', label: 'Garantia' },
    { value: 'HOJA_VIDA_SIGEP', label: 'Hoja de Vida SIGEP' },
    { value: 'LIBRETA_MILITAR', label: 'Libreta Militar' },
    { value: 'PANTALLAZO_SECOP', label: 'Pantallazo SECOP' },
    { value: 'PROPUESTA', label: 'Propuesta' },
    { value: 'PUBLICACION_GT', label: 'Publicacion GT' },
    { value: 'REDAM', label: 'REDAM' },
    { value: 'SARLAFT', label: 'SARLAFT' },
    { value: 'SEGURIDAD_SOCIAL', label: 'Seguridad Social' },
    { value: 'TARJETA_PROFESIONAL', label: 'Tarjeta Profesional' }
  ];

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

  get totalDocumentos(): number {
    return this.tiposDocumento.length;
  }

  get documentosCompletados(): number {
    return Array.from(this.documentosPorTipo.keys()).length;
  }

  get porcentajeDocumentos(): number {
    return Math.round((this.documentosCompletados / this.totalDocumentos) * 100);
  }

  get todosDocumentosCompletados(): boolean {
    return this.documentosCompletados === this.totalDocumentos;
  }

  private initializeForm(): void {
    this.contratistaForm = this.fb.group({
      tipoDocumento: ['CC'],
      documentoIdentidad: ['', [Validators.required, Validators.minLength(3)]],
      nombreCompleto: ['', Validators.required],
      numeroContrato: [''],
      email: ['', [Validators.email]],
      telefono: [''],
      direccion: [''],
      cargo: [''],
      tipoContratista: [''],
      estado: ['ACTIVO'],
      observaciones: ['']
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
            documentoIdentidad: data.documentoIdentidad,
            nombreCompleto: data.nombreCompleto,
            numeroContrato: data.numeroContrato,
            email: data.email,
            telefono: data.telefono,
            direccion: data.direccion,
            cargo: data.cargo,
            tipoContratista: data.tipoContratista,
            estado: data.estado || 'ACTIVO',
            observaciones: data.observaciones
          });
          
          // Cargar documentos existentes si los hay
          if (data.documentos && data.documentos.length > 0) {
            // En modo edición, los documentos ya existen en el servidor
            // No es necesario volver a subirlos
          }
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

  getRemainingChars(fieldName: string): number {
    const control = this.contratistaForm.get(fieldName);
    if (!control) return 500;
    const currentValue = control.value || '';
    const maxLength = 500;
    return maxLength - currentValue.length;
  }

  getTipoDocumentoLabel(tipo: string): string {
    const tipos: Record<string, string> = {
      'CEDULA': 'Cedula',
      'CERTIFICADO_BANCARIO': 'Certificado Bancario',
      'CERTIFICADO_EXPERIENCIA': 'Certificado de Experiencia',
      'CERTIFICADO_NO_PLANTA': 'Certificado No Planta',
      'CERTIFICADO_ANTECEDENTES': 'Certificado de Antecedentes',
      'CERTIFICADO_IDONEIDAD': 'Certificado de Idoneidad',
      'DECLARACION_BIENES': 'Declaracion de Bienes',
      'DECLARACION_INHABILIDADES': 'Declaracion de Inhabilidades',
      'EXAMEN_INGRESO': 'Examen de Ingreso',
      'GARANTIA': 'Garantia',
      'HOJA_VIDA_SIGEP': 'Hoja de Vida SIGEP',
      'LIBRETA_MILITAR': 'Libreta Militar',
      'PANTALLAZO_SECOP': 'Pantallazo SECOP',
      'PROPUESTA': 'Propuesta',
      'PUBLICACION_GT': 'Publicacion GT',
      'REDAM': 'REDAM',
      'RUT': 'RUT',
      'SARLAFT': 'SARLAFT',
      'SEGURIDAD_SOCIAL': 'Seguridad Social',
      'TARJETA_PROFESIONAL': 'Tarjeta Profesional'
    };
    return tipos[tipo] || tipo;
  }

  formatearTamano(bytes: number): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatearFecha(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO');
  }

  documentoCompletado(tipo: string): boolean {
    return this.documentosPorTipo.has(tipo);
  }

  getDocumentoInfo(tipo: string): DocumentoInfo | undefined {
    return this.documentosPorTipo.get(tipo);
  }

  onFileSelectedPorTipo(event: any, tipo: string): void {
    const file: File = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.documentoError = `El documento ${this.getTipoDocumentoLabel(tipo)} solo permite archivos PDF`;
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.documentoError = `El documento ${this.getTipoDocumentoLabel(tipo)} es demasiado grande (max. 5MB)`;
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    this.documentosPorTipo.set(tipo, {
      tipo,
      archivo: file,
      nombre: file.name,
      tamano: file.size
    });
    
    event.target.value = '';
  }

  eliminarDocumentoPorTipo(tipo: string): void {
    this.documentosPorTipo.delete(tipo);
  }

  siguientePaso(): void {
    if (this.validarPasoActual()) {
      this.pasoActual++;
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) {
      this.pasoActual--;
    }
  }

  private validarPasoActual(): boolean {
    this.submitted = true;
    let isValid = true;

    if (this.pasoActual === 1) {
      if (this.contratistaForm.get('documentoIdentidad')?.invalid) isValid = false;
      if (this.contratistaForm.get('nombreCompleto')?.invalid) isValid = false;
    }

    if (!isValid) {
      this.contratistaForm.markAllAsTouched();
    }

    return isValid;
  }

guardarContratista(): void {
  console.log('🚀 INICIANDO GUARDADO DE CONTRATISTA');
  console.log('📋 submitted:', this.submitted);
  console.log('📋 formulario válido:', this.contratistaForm.valid);
  console.log('📋 formulario errors:', this.contratistaForm.errors);
  
  this.submitted = true;

  // Validar formulario
  if (this.contratistaForm.invalid) {
    console.log('❌ Formulario inválido');
    console.log('❌ Errores del formulario:', this.contratistaForm.errors);
    Object.keys(this.contratistaForm.controls).forEach(key => {
      const control = this.contratistaForm.get(key);
      if (control?.invalid) {
        console.log(`❌ Campo ${key} inválido:`, control.errors);
      }
    });
    this.errorMessage = 'Por favor complete todos los campos requeridos';
    return;
  }

  // Validar documentos
  if (!this.todosDocumentosCompletados) {
    console.log('❌ Documentos incompletos');
    console.log(`📄 Documentos completados: ${this.documentosCompletados} de ${this.totalDocumentos}`);
    console.log('📄 Documentos por tipo:', Array.from(this.documentosPorTipo.keys()));
    this.errorMessage = 'Debe subir todos los documentos requeridos';
    return;
  }

  console.log('✅ Formulario válido y documentos completos');

  this.isSubmitting = true;
  this.errorMessage = '';

  const formValue = this.contratistaForm.getRawValue();
  console.log('📝 Datos del formulario:', formValue);

  const contratistaData = {
    documentoIdentidad: formValue.documentoIdentidad,
    nombreCompleto: formValue.nombreCompleto,
    numeroContrato: formValue.numeroContrato,
    email: formValue.email,
    telefono: formValue.telefono,
    direccion: formValue.direccion,
    cargo: formValue.cargo,
    tipoContratista: formValue.tipoContratista,
    estado: formValue.estado,
    observaciones: formValue.observaciones
  };
  console.log('📝 Datos del contratista:', contratistaData);

  // Crear FormData con todos los documentos
  const formData = new FormData();
  
  Object.keys(contratistaData).forEach(key => {
    const value = contratistaData[key as keyof typeof contratistaData];
    if (value) {
      console.log(`📎 Agregando campo: ${key} = ${value}`);
      formData.append(key, value);
    }
  });
  
  // Agregar todos los documentos
  let index = 0;
  this.documentosPorTipo.forEach((doc, tipo) => {
    console.log(`📎 Agregando documento ${index}: tipo=${tipo}, archivo=${doc.nombre}, tamaño=${doc.tamano} bytes`);
    formData.append(`tipo_documento_${index}`, doc.tipo);
    formData.append('documentos', doc.archivo);
    index++;
  });

  console.log(`📤 Enviando petición con ${index} documentos`);

  const sub = this.contratistaService.crearConDocumentos(formData).subscribe({
    next: (response) => {
      console.log('✅ Respuesta exitosa del servidor:', response);
      this.successMessage = 'Contratista creado exitosamente';
      this.isSubmitting = false;
      setTimeout(() => this.router.navigate(['/contratistas/list']), 1500);
    },
    error: (error: any) => {
      console.error('❌ Error en la petición:', error);
      console.error('❌ Detalles del error:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error
      });
      this.errorMessage = error.message || 'Error al guardar el contratista';
      this.isSubmitting = false;
    }
  });
  this.subscriptions.push(sub);
}

  cancelar(): void {
    if (confirm('Cancelar? Los datos no guardados se perderan.')) {
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