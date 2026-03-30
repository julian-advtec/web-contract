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
  label: string;
  value: string;
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
  
  // Tipos de documento para el dropdown
  tiposDocumentoDisponibles = [
    { value: 'CEDULA', label: 'Cédula de Ciudadanía' },
    { value: 'RUT', label: 'RUT' },
    { value: 'CERTIFICADO_BANCARIO', label: 'Certificado Bancario' },
    { value: 'CERTIFICADO_EXPERIENCIA', label: 'Certificado de Experiencia' },
    { value: 'CERTIFICADO_NO_PLANTA', label: 'Certificado No Planta' },
    { value: 'CERTIFICADO_ANTECEDENTES', label: 'Certificado de Antecedentes' },
    { value: 'CERTIFICADO_IDONEIDAD', label: 'Certificado de Idoneidad' },
    { value: 'DECLARACION_BIENES', label: 'Declaración de Bienes' },
    { value: 'DECLARACION_INHABILIDADES', label: 'Declaración de Inhabilidades' },
    { value: 'EXAMEN_INGRESO', label: 'Examen de Ingreso' },
    { value: 'GARANTIA', label: 'Garantía' },
    { value: 'HOJA_VIDA_SIGEP', label: 'Hoja de Vida SIGEP' },
    { value: 'LIBRETA_MILITAR', label: 'Libreta Militar' },
    { value: 'PANTALLAZO_SECOP', label: 'Pantallazo SECOP' },
    { value: 'PROPUESTA', label: 'Propuesta' },
    { value: 'PUBLICACION_GT', label: 'Publicación GT' },
    { value: 'REDAM', label: 'REDAM' },
    { value: 'SARLAFT', label: 'SARLAFT' },
    { value: 'SEGURIDAD_SOCIAL', label: 'Seguridad Social' },
    { value: 'TARJETA_PROFESIONAL', label: 'Tarjeta Profesional' }
  ];

  // Tipos de documento requeridos (excluyendo libreta militar)
  tiposDocumentoRequeridos = this.tiposDocumentoDisponibles.filter(
    doc => doc.value !== 'LIBRETA_MILITAR'
  );

  // Todos los tipos de documento
  get todosTiposDocumento() {
    return this.tiposDocumentoDisponibles;
  }

  // Tipos pendientes (no subidos aún)
  get tiposPendientes() {
    return this.tiposDocumentoDisponibles.filter(doc => !this.documentosPorTipo.has(doc.value));
  }

  // Documentos subidos (para mostrar en la lista)
  get documentosSubidosList() {
    const list: any[] = [];
    this.documentosPorTipo.forEach((value, key) => {
      const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === key);
      list.push({
        value: key,
        label: tipoInfo?.label || key,
        nombre: value.nombre,
        tamano: value.tamano
      });
    });
    return list;
  }

  get documentosSubidosCount(): number {
    return this.documentosPorTipo.size;
  }

  get documentoLibretaSubido(): boolean {
    return this.documentosPorTipo.has('LIBRETA_MILITAR');
  }

  tipoSeleccionado = '';
  isDragging = false;

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

  get totalDocumentosRequeridos(): number {
    return this.tiposDocumentoRequeridos.length;
  }

  get documentosCompletadosRequeridos(): number {
    return this.tiposDocumentoRequeridos.filter(doc => 
      this.documentosPorTipo.has(doc.value)
    ).length;
  }

  get porcentajeDocumentos(): number {
    if (this.totalDocumentosRequeridos === 0) return 0;
    return Math.round((this.documentosCompletadosRequeridos / this.totalDocumentosRequeridos) * 100);
  }

  get todosDocumentosRequeridosCompletados(): boolean {
    return this.documentosCompletadosRequeridos === this.totalDocumentosRequeridos;
  }

  private initializeForm(): void {
    this.contratistaForm = this.fb.group({
      tipoDocumento: ['CC', Validators.required],
      documentoIdentidad: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
      representanteLegal: ['', Validators.maxLength(200)],
      documentoRepresentante: ['', Validators.maxLength(20)],
      telefono: ['', [Validators.maxLength(15)]],
      email: ['', [Validators.email]],
      direccion: [''],
      departamento: ['', Validators.maxLength(50)],
      ciudad: ['', Validators.maxLength(50)],
      tipoContratista: [''],
      estado: ['ACTIVO', Validators.required],
      numeroContrato: ['', Validators.maxLength(50)],
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
            estado: data.estado || 'ACTIVO',
            numeroContrato: data.numeroContrato,
            observaciones: data.observaciones
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

  // 🆕 Métodos para Drag & Drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.procesarArchivo(files[0]);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.procesarArchivo(file);
    }
  }

  private procesarArchivo(file: File): void {
    // Validar tipo de documento seleccionado
    if (!this.tipoSeleccionado) {
      this.documentoError = 'Por favor seleccione primero el tipo de documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    // Validar que no se haya subido ya este tipo
    if (this.documentosPorTipo.has(this.tipoSeleccionado)) {
      this.documentoError = `Ya se ha subido un documento tipo ${this.getTipoDocumentoLabel(this.tipoSeleccionado)}`;
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    // Validar formato PDF
    if (file.type !== 'application/pdf') {
      this.documentoError = 'Solo se permiten archivos PDF';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.documentoError = 'El archivo no puede exceder 5MB';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === this.tipoSeleccionado);
    
    // Guardar documento
    this.documentosPorTipo.set(this.tipoSeleccionado, {
      tipo: this.tipoSeleccionado,
      archivo: file,
      nombre: file.name,
      tamano: file.size,
      label: tipoInfo?.label || this.tipoSeleccionado,
      value: this.tipoSeleccionado
    });

    // Limpiar selección para que desaparezca el área de drag & drop
    this.tipoSeleccionado = '';
    
    // Limpiar input file
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
    this.documentoError = '';
  }

  agregarDocumentoManual(): void {
    if (!this.tipoSeleccionado) {
      this.documentoError = 'Por favor seleccione primero el tipo de documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  eliminarDocumentoPorTipo(tipo: string): void {
    this.documentosPorTipo.delete(tipo);
  }

  getDocumentoInfo(tipo: string): DocumentoInfo | undefined {
    return this.documentosPorTipo.get(tipo);
  }

  documentoCompletado(tipo: string): boolean {
    return this.documentosPorTipo.has(tipo);
  }

  getTipoDocumentoLabel(tipo: string): string {
    const encontrado = this.tiposDocumentoDisponibles.find(d => d.value === tipo);
    return encontrado?.label || tipo;
  }

  formatearTamano(bytes: number): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getRemainingChars(fieldName: string): number {
    const control = this.contratistaForm.get(fieldName);
    if (!control) return 500;
    const currentValue = control.value || '';
    const maxLength = 500;
    return maxLength - currentValue.length;
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
      if (this.contratistaForm.get('razonSocial')?.invalid) isValid = false;
    }

    if (!isValid) {
      this.contratistaForm.markAllAsTouched();
    }

    return isValid;
  }

  guardarContratista(): void {
    console.log('🚀 INICIANDO GUARDADO DE CONTRATISTA');
    
    this.submitted = true;

    // Validar formulario
    if (this.contratistaForm.invalid) {
      console.log('❌ Formulario inválido');
      this.errorMessage = 'Por favor complete todos los campos requeridos';
      return;
    }

    // Validar documentos requeridos
    if (!this.todosDocumentosRequeridosCompletados) {
      console.log('❌ Documentos requeridos incompletos');
      this.errorMessage = 'Debe subir todos los documentos requeridos';
      return;
    }

    console.log('✅ Formulario válido y documentos requeridos completos');

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.contratistaForm.getRawValue();
    console.log('📝 Datos del formulario:', formValue);

    // Crear FormData con todos los documentos
    const formData = new FormData();
    
    // Agregar todos los campos del formulario
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value !== null && value !== undefined && value !== '') {
        console.log(`📎 Agregando campo: ${key} = ${value}`);
        formData.append(key, value);
      }
    });
    
    // Agregar todos los documentos
    let index = 0;
    this.documentosPorTipo.forEach((doc, tipo) => {
      console.log(`📎 Agregando documento ${index}: tipo=${tipo}, archivo=${doc.nombre}`);
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