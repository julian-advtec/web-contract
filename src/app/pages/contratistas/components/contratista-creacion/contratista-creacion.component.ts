// src/app/pages/contratistas/components/contratista-creacion/contratista-creacion.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContratistasService } from '../../../../core/services/contratistas.service';

interface DocumentoInfo {
  tipo: string;
  archivo: File | null;
  nombre: string;
  tamano: number;
  label: string;
  value: string;
  id?: string;
  esExistente?: boolean;
  subidoPor?: string;  // 🔥 AGREGAR ESTE CAMPO
  fechaSubida?: Date | string;  // 🔥 AGREGAR ESTE CAMPO
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

  documentosPorTipo: Map<string, DocumentoInfo> = new Map();
  documentoError = '';

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

  tiposDocumentoRequeridos = this.tiposDocumentoDisponibles.filter(
    doc => doc.value !== 'LIBRETA_MILITAR'
  );

  get tiposPendientes() {
    return this.tiposDocumentoDisponibles.filter(doc => !this.documentosPorTipo.has(doc.value));
  }

  get documentosSubidosList() {
    const list: any[] = [];
    this.documentosPorTipo.forEach((value, key) => {
      const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === key);
      list.push({
        value: key,
        label: tipoInfo?.label || key,
        nombre: value.nombre,
        tamano: value.tamano,
        esExistente: value.esExistente || false,
        id: value.id,
        subidoPor: value.subidoPor || 'Sistema',  // 🔥 AGREGAR
        fechaSubida: value.fechaSubida
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
    if (this.isEditMode) return true;
    return this.documentosCompletadosRequeridos === this.totalDocumentosRequeridos;
  }

  tipoSeleccionado = '';
  isDragging = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private contratistaService: ContratistasService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

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
      telefono: ['', [Validators.maxLength(15)]],
      email: ['', [Validators.email]],
      direccion: [''],
      departamento: ['', Validators.maxLength(50)],
      ciudad: ['', Validators.maxLength(50)],
      tipoContratista: [''],
      estado: ['ACTIVO', Validators.required],
      numeroContrato: ['', Validators.maxLength(50)],
      cargo: ['', Validators.maxLength(100)],
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
          this.documentosPorTipo.clear();

          this.contratistaForm.patchValue({
            tipoDocumento: data.tipoDocumento || 'CC',
            documentoIdentidad: data.documentoIdentidad,
            razonSocial: data.razonSocial,
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
            cargo: data.cargo,
            observaciones: data.observaciones
          });

          if (data.documentos && Array.isArray(data.documentos)) {
            data.documentos.forEach((doc: any) => {
              const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === doc.tipo);
              if (tipoInfo && !this.documentosPorTipo.has(doc.tipo)) {
                this.documentosPorTipo.set(doc.tipo, {
                  tipo: doc.tipo,
                  archivo: null,
                  nombre: doc.nombreArchivo,
                  tamano: doc.tamanoBytes || 0,
                  label: tipoInfo.label,
                  value: doc.tipo,
                  id: doc.id,
                  esExistente: true,
                  subidoPor: doc.subidoPor || 'Sistema',  // 🔥 MOSTRAR QUIÉN SUBIÓ
                  fechaSubida: doc.fechaSubida
                });
              }
            });
          }
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.errorMessage = error.message || 'Error al cargar el contratista';
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }


  verificarDocumento(): void {
    const documento = this.contratistaForm.get('documentoIdentidad')?.value;
    if (documento && documento.length >= 3 && !this.isEditMode) {
      this.contratistaService.verificarDocumento(documento).subscribe({
        next: (result: any) => {
          if (result.existe) {
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

  descargarDocumento(doc: any): void {
    if (!this.contratistaId || !doc.id) {
      this.documentoError = 'No se puede descargar el documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    console.log(`📥 Descargando documento: ${doc.label}`);
    this.contratistaService.descargarDocumento(this.contratistaId, doc.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.nombre;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('❌ Error descargando documento:', error);
        this.documentoError = 'Error al descargar el documento';
        setTimeout(() => this.documentoError = '', 3000);
      }
    });
  }

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
    if (!this.tipoSeleccionado) {
      this.documentoError = 'Por favor seleccione primero el tipo de documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    if (this.documentosPorTipo.has(this.tipoSeleccionado)) {
      this.documentoError = `Ya se ha subido un documento tipo ${this.getTipoDocumentoLabel(this.tipoSeleccionado)}`;
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    if (file.type !== 'application/pdf') {
      this.documentoError = 'Solo se permiten archivos PDF';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.documentoError = 'El archivo no puede exceder 5MB';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === this.tipoSeleccionado);

    this.documentosPorTipo.set(this.tipoSeleccionado, {
      tipo: this.tipoSeleccionado,
      archivo: file,
      nombre: file.name,
      tamano: file.size,
      label: tipoInfo?.label || this.tipoSeleccionado,
      value: this.tipoSeleccionado,
      esExistente: false
    });

    this.tipoSeleccionado = '';

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
    const documento = this.documentosPorTipo.get(tipo);
    if (documento?.esExistente && this.contratistaId && documento.id) {
      if (confirm(`¿Eliminar permanentemente el documento "${documento.nombre}"?`)) {
        this.contratistaService.eliminarDocumento(this.contratistaId, documento.id).subscribe({
          next: () => {
            this.documentosPorTipo.delete(tipo);
          },
          error: (error) => {
            console.error('❌ Error eliminando documento:', error);
            this.documentoError = 'Error al eliminar el documento';
          }
        });
      }
    } else {
      this.documentosPorTipo.delete(tipo);
    }
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
    this.submitted = true;

    if (this.contratistaForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos requeridos';
      return;
    }

    if (!this.isEditMode && !this.todosDocumentosRequeridosCompletados) {
      this.errorMessage = 'Debe subir todos los documentos requeridos';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.contratistaForm.getRawValue();
    const formData = new FormData();

    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    let documentosNuevos = 0;
    this.documentosPorTipo.forEach((doc, tipo) => {
      if (doc.archivo) {
        formData.append(`tipo_documento_${documentosNuevos}`, doc.tipo);
        formData.append('documentos', doc.archivo);
        documentosNuevos++;
      }
    });

    let request;
    if (this.isEditMode && this.contratistaId) {
      request = this.contratistaService.actualizarConDocumentos(this.contratistaId, formData);
    } else {
      request = this.contratistaService.crearConDocumentos(formData);
    }

    const sub = request.subscribe({
      next: () => {
        this.successMessage = this.isEditMode ? 'Contratista actualizado exitosamente' : 'Contratista creado exitosamente';
        this.isSubmitting = false;
        setTimeout(() => this.router.navigate(['/contratistas/list']), 1500);
      },
      error: (error: any) => {
        console.error('❌ Error:', error);
        this.errorMessage = error.error?.message || error.message || 'Error al guardar el contratista';
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

  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}