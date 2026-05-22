import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
  nombreArchivo?: string;
  tamano: number;
  tamanoBytes?: number;
  label: string;
  value: string;
  id?: string;
  esExistente?: boolean;
  subidoPor?: string;
  fechaSubida?: Date | string;
  // ✅ NUEVO: flag para marcar como eliminado
  marcadoEliminar?: boolean;
}

@Component({
  selector: 'app-contratista-creacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './contratista-creacion.component.html',
  styleUrls: ['./contratista-creacion.component.scss']
})
export class ContratistaCreacionComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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
  isDragging = false;
  uploading = false;
  uploadProgress = 0;

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
    return this.tiposDocumentoDisponibles.filter(doc => {
      const documento = this.documentosPorTipo.get(doc.value);
      // ✅ No mostrar si existe y NO está marcado para eliminar
      return !documento || documento.marcadoEliminar === true;
    });
  }

  get documentosSubidosList() {
    const list: any[] = [];
    this.documentosPorTipo.forEach((value, key) => {
      const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === key);
      list.push({
        value: key,
        label: tipoInfo?.label || key,
        nombre: value.nombre,
        nombreArchivo: value.nombreArchivo,
        tamano: value.tamano,
        tamanoBytes: value.tamanoBytes,
        esExistente: value.esExistente || false,
        id: value.id,
        subidoPor: value.subidoPor || 'Sistema',
        fechaSubida: value.fechaSubida,
        marcadoEliminar: value.marcadoEliminar || false  // ✅ Mostrar estado
      });
    });
    return list;
  }

  get documentosSubidosCount(): number {
    return this.documentosPorTipo.size;
  }

  get totalDocumentosRequeridos(): number {
    return this.tiposDocumentoRequeridos.length;
  }

  get documentosCompletadosRequeridos(): number {
    // ✅ Contar solo documentos que existen y NO están marcados para eliminar
    return this.tiposDocumentoRequeridos.filter(doc => {
      const documento = this.documentosPorTipo.get(doc.value);
      return documento && documento.marcadoEliminar !== true;
    }).length;
  }

  get documentosFaltantesList(): string[] {
    return this.tiposDocumentoRequeridos
      .filter(doc => {
        const documento = this.documentosPorTipo.get(doc.value);
        return !documento || documento.marcadoEliminar === true;
      })
      .map(doc => doc.label);
  }

  get porcentajeDocumentos(): number {
    if (this.totalDocumentosRequeridos === 0) return 0;
    return Math.round((this.documentosCompletadosRequeridos / this.totalDocumentosRequeridos) * 100);
  }

  get todosDocumentosRequeridosCompletados(): boolean {
    return this.documentosCompletadosRequeridos === this.totalDocumentosRequeridos;
  }

  tipoSeleccionado = '';
  // ✅ Lista de IDs de documentos a eliminar (para enviar al backend al guardar)
  documentosAEliminar: string[] = [];

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
      telefono: ['', Validators.maxLength(15)],
      email: ['', [Validators.email]],
      direccion: [''],
      departamento: ['', Validators.maxLength(50)],
      ciudad: ['', Validators.maxLength(50)],
      tipoContratista: [''],
      estado: ['ACTIVO', Validators.required],
      numeroContrato: ['', Validators.maxLength(50)],
      cargo: ['', Validators.maxLength(100)],
      objetivoContrato: [''],
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
          this.documentosAEliminar = [];

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
            numeroContrato: '',
            cargo: data.cargo,
            objetivoContrato: data.objetivoContrato
          });

          if (data.documentos && Array.isArray(data.documentos)) {
            data.documentos.forEach((doc: any) => {
              const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === doc.tipo);
              if (tipoInfo && !this.documentosPorTipo.has(doc.tipo)) {
                this.documentosPorTipo.set(doc.tipo, {
                  tipo: doc.tipo,
                  archivo: null,
                  nombre: doc.nombreArchivo,
                  nombreArchivo: doc.nombreArchivo,
                  tamano: doc.tamanoBytes || 0,
                  tamanoBytes: doc.tamanoBytes,
                  label: tipoInfo.label,
                  value: doc.tipo,
                  id: doc.id,
                  esExistente: true,
                  subidoPor: doc.subidoPor || 'Sistema',
                  fechaSubida: doc.fechaSubida,
                  marcadoEliminar: false  // ✅ Inicialmente no marcado para eliminar
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

    this.contratistaService.descargarDocumento(this.contratistaId, doc.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.nombre || doc.nombreArchivo || `${doc.label}.pdf`;
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

  // ✅ NUEVO: Marcar documento para eliminar (NO eliminar inmediatamente)
  confirmarEliminarDocumento(doc: any): void {
    const confirmMsg = `¿Marcar el documento "${doc.label}" para eliminar?\n\nSe eliminará cuando guarde los cambios.`;
    if (confirm(confirmMsg)) {
      this.marcarDocumentoParaEliminar(doc.value);
    }
  }

  // ✅ Marcar documento como eliminado (solo visualmente)
  marcarDocumentoParaEliminar(tipo: string): void {
    const documento = this.documentosPorTipo.get(tipo);
    if (documento) {
      if (documento.esExistente && documento.id) {
        // ✅ Guardar ID para eliminar en el backend al guardar
        this.documentosAEliminar.push(documento.id);
      }
      // ✅ Marcar como eliminado (no se mostrará más)
      documento.marcadoEliminar = true;
      this.documentosPorTipo.set(tipo, documento);
      
      this.successMessage = `✅ Documento "${documento.label}" marcado para eliminar. Se eliminará al guardar.`;
      setTimeout(() => this.successMessage = '', 3000);
    }
  }

  // ✅ Restaurar un documento marcado para eliminar
  restaurarDocumento(tipo: string): void {
    const documento = this.documentosPorTipo.get(tipo);
    if (documento && documento.marcadoEliminar) {
      documento.marcadoEliminar = false;
      // ✅ Quitar de la lista de eliminación
      if (documento.id) {
        const index = this.documentosAEliminar.indexOf(documento.id);
        if (index > -1) {
          this.documentosAEliminar.splice(index, 1);
        }
      }
      this.documentosPorTipo.set(tipo, documento);
      this.successMessage = `✅ Documento "${documento.label}" restaurado`;
      setTimeout(() => this.successMessage = '', 2000);
    }
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
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  agregarDocumentoManual(): void {
    if (!this.tipoSeleccionado) {
      this.documentoError = '⚠️ Por favor seleccione primero el tipo de documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }
    this.fileInput?.nativeElement.click();
  }

  private procesarArchivo(file: File): void {
    if (!this.tipoSeleccionado) {
      this.documentoError = '⚠️ Por favor seleccione primero el tipo de documento';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    const documentoExistente = this.documentosPorTipo.get(this.tipoSeleccionado);
    // ✅ Si existe y NO está marcado para eliminar, no permitir reemplazar
    if (documentoExistente && !documentoExistente.marcadoEliminar) {
      this.documentoError = `❌ Ya existe un documento tipo "${this.getTipoDocumentoLabel(this.tipoSeleccionado)}". Elimínelo primero si desea reemplazarlo.`;
      setTimeout(() => this.documentoError = '', 4000);
      return;
    }

    if (file.type !== 'application/pdf') {
      this.documentoError = '❌ Solo se permiten archivos PDF';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.documentoError = '❌ El archivo no puede exceder 5MB';
      setTimeout(() => this.documentoError = '', 3000);
      return;
    }

    const tipoInfo = this.tiposDocumentoDisponibles.find(d => d.value === this.tipoSeleccionado);

    // ✅ En modo edición, subir inmediatamente (pero no afecta a los marcados)
    if (this.isEditMode && this.contratistaId) {
      this.uploading = true;
      this.uploadProgress = 0;
      
      const interval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
        }
      }, 200);

    this.contratistaService.subirDocumento(this.contratistaId, this.tipoSeleccionado as any, file).subscribe({
        next: (doc: any) => {
          clearInterval(interval);
          this.uploadProgress = 100;
          this.documentosPorTipo.set(this.tipoSeleccionado, {
            tipo: this.tipoSeleccionado,
            archivo: null,
            nombre: doc.nombreArchivo,
            nombreArchivo: doc.nombreArchivo,
            tamano: doc.tamanoBytes,
            tamanoBytes: doc.tamanoBytes,
            label: tipoInfo?.label || this.tipoSeleccionado,
            value: this.tipoSeleccionado,
            id: doc.id,
            esExistente: true,
            subidoPor: 'Usuario',
            fechaSubida: new Date(),
            marcadoEliminar: false
          });
          this.tipoSeleccionado = '';
          setTimeout(() => this.uploading = false, 500);
        },
        error: (error: any) => {
          clearInterval(interval);
          this.uploading = false;
          this.documentoError = error.error?.message || 'Error al subir el documento';
          setTimeout(() => this.documentoError = '', 4000);
        }
      });
    } else {
      // ✅ Modo creación: almacenar temporalmente
      this.documentosPorTipo.set(this.tipoSeleccionado, {
        tipo: this.tipoSeleccionado,
        archivo: file,
        nombre: file.name,
        tamano: file.size,
        label: tipoInfo?.label || this.tipoSeleccionado,
        value: this.tipoSeleccionado,
        esExistente: false,
        marcadoEliminar: false
      });
      this.tipoSeleccionado = '';
      this.documentoError = '';
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
    return 500 - currentValue.length;
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
      const documentoControl = this.contratistaForm.get('documentoIdentidad');
      const razonSocialControl = this.contratistaForm.get('razonSocial');
      
      if (documentoControl?.invalid) {
        documentoControl.markAsTouched();
        isValid = false;
      }
      if (razonSocialControl?.invalid) {
        razonSocialControl.markAsTouched();
        isValid = false;
      }
    }

    if (!isValid) {
      this.errorMessage = '⚠️ Por favor complete los campos requeridos en este paso';
      setTimeout(() => this.errorMessage = '', 3000);
    }

    return isValid;
  }

  guardarContratista(): void {
    this.submitted = true;

    if (this.contratistaForm.invalid) {
      this.errorMessage = '⚠️ Por favor complete todos los campos requeridos';
      return;
    }

    if (this.isEditMode) {
      const numeroContrato = this.contratistaForm.get('numeroContrato')?.value;
      if (!numeroContrato || numeroContrato.trim() === '') {
        this.errorMessage = '⚠️ Debe ingresar un número de contrato para crear una nueva versión';
        this.pasoActual = 2;
        return;
      }
    }

    if (!this.todosDocumentosRequeridosCompletados) {
      const faltantes = this.documentosFaltantesList;
      this.errorMessage = `⚠️ Debe subir todos los documentos obligatorios.\n📌 Faltan: ${faltantes.join(', ')}`;
      this.pasoActual = 3;
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

    // ✅ Agregar documentos a eliminar (IDs)
    if (this.documentosAEliminar.length > 0) {
      formData.append('documentos_eliminar', JSON.stringify(this.documentosAEliminar));
    }

    // ✅ Agregar documentos nuevos
    let documentosNuevos = 0;
    this.documentosPorTipo.forEach((doc) => {
      if (doc.archivo && !doc.esExistente && !doc.marcadoEliminar) {
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
        this.successMessage = this.isEditMode ? '✅ Contratista actualizado exitosamente' : '✅ Contratista creado exitosamente';
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
    if (confirm('¿Cancelar la operación?\nLos datos no guardados se perderán.')) {
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