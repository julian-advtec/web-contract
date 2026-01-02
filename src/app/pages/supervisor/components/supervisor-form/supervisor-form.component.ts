import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { SupervisorService } from '../../../../core/services/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Observable, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-supervisor-form',
  templateUrl: './supervisor-form.component.html',
  styleUrls: ['./supervisor-form.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class SupervisorFormComponent implements OnInit {
  documentoId: string = '';
  radicadoData: any = null;
  isLoading = false;
  isProcessing = false;

  revisionForm!: FormGroup;

  maxFileSize = 10 * 1024 * 1024;
  mostrarCampoArchivo = false;
  archivoAprobacion: File | null = null;

  documentosExistentes = [
    { nombre: '', disponible: false },
    { nombre: '', disponible: false },
    { nombre: '', disponible: false }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private radicacionService: RadicacionService,
    private supervisorService: SupervisorService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.route.params.subscribe(params => {
      this.documentoId = params['id'];
      this.cargarDocumento(this.documentoId);
    });
  }

  initializeForm(): void {
    this.revisionForm = this.fb.group({
      numeroRadicado: [{ value: '', disabled: true }, Validators.required],
      numeroContrato: [{ value: '', disabled: true }, Validators.required],
      nombreContratista: [{ value: '', disabled: true }, Validators.required],
      documentoContratista: [{ value: '', disabled: true }, Validators.required],
      fechaInicio: [{ value: '', disabled: true }, Validators.required],
      fechaFin: [{ value: '', disabled: true }, Validators.required],
      observacionOriginal: [{ value: '', disabled: true }],

      radicadorNombre: [{ value: '', disabled: true }],
      radicadorUsuario: [{ value: '', disabled: true }],
      fechaRadicacion: [{ value: '', disabled: true }],
      supervisorAsignado: [{ value: '', disabled: true }],
      fechaAsignacion: [{ value: '', disabled: true }],

      estadoRevision: ['PENDIENTE', Validators.required],
      observacionSupervisor: ['', [Validators.required, Validators.minLength(10)]],
      fechaRevision: [{ value: this.getCurrentDate(), disabled: true }],
      supervisorRevisor: [{ value: this.getCurrentUser(), disabled: true }]
    });
  }

  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getCurrentUser(): string {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.fullName || user.username || 'Supervisor';
      } catch (error) {
        console.error('Error parseando usuario:', error);
      }
    }
    return 'Supervisor';
  }

  cargarDocumento(id: string): void {
    this.isLoading = true;

    this.supervisorService.obtenerDocumentoPorId(id)
      .subscribe({
        next: (response: any) => {
          console.log('📊 Respuesta completa del backend:', response);

          const documentoData = response?.data?.documento || response?.documento || response?.data || response;

          console.log('📝 Datos del documento extraídos:', documentoData);
          this.radicadoData = documentoData;
          this.poblarFormulario(documentoData);
          this.cargarDocumentosExistentes(documentoData);
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('❌ Error cargando documento desde supervisor:', error);
          this.cargarDocumentoDesdeRadicacion(id);
        }
      });
  }

  cargarDocumentoDesdeRadicacion(id: string): void {
    this.radicacionService.obtenerDocumentoPorId(id)
      .subscribe({
        next: (response: any) => {
          console.log('📊 Documento cargado desde radicacion service:', response);
          const documentoData = response?.data || response;
          this.radicadoData = documentoData;
          this.poblarFormulario(documentoData);
          this.cargarDocumentosExistentes(documentoData);
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('❌ Error cargando documento desde radicación:', error);
          this.notificationService.error('Error', 'No se pudo cargar el documento para revisión');
          this.isLoading = false;
          this.router.navigate(['/supervisor/pendientes']);
        }
      });
  }

  poblarFormulario(documento: any): void {
    console.log('📝 Poblando formulario con datos:', documento);

    const docData = documento.documento || documento;

    this.revisionForm.patchValue({
      numeroRadicado: docData.numeroRadicado || '',
      numeroContrato: docData.numeroContrato || '',
      nombreContratista: docData.nombreContratista || '',
      documentoContratista: docData.documentoContratista || '',
      fechaInicio: this.formatDateForInput(docData.fechaInicio),
      fechaFin: this.formatDateForInput(docData.fechaFin),
      observacionOriginal: docData.observacion || '',

      radicadorNombre: docData.radicador || docData.nombreRadicador || 'N/A',
      radicadorUsuario: docData.radicadorUsuario || docData.usuarioRadicador || 'N/A',
      fechaRadicacion: this.formatDateForInput(docData.fechaRadicacion || docData.createdAt),
      supervisorAsignado: docData.supervisorAsignado ||
        docData.usuarioAsignadoNombre ||
        docData.supervisor?.fullName ||
        'N/A',
      fechaAsignacion: this.formatDateForInput(docData.fechaAsignacion || docData.updatedAt),

      fechaRevision: this.getCurrentDate(),
      supervisorRevisor: this.getCurrentUser()
    });

    if (docData.historialEstados) {
      console.log('📜 Historial encontrado:', docData.historialEstados);
    }
  }

  cargarDocumentosExistentes(documento: any): void {
    const docData = documento.documento || documento;

    console.log('📁 Datos para cargar documentos:', docData);

    this.documentosExistentes[0] = {
      nombre: docData.cuentaCobro || '',
      disponible: !!docData.cuentaCobro
    };

    this.documentosExistentes[1] = {
      nombre: docData.seguridadSocial || '',
      disponible: !!docData.seguridadSocial
    };

    this.documentosExistentes[2] = {
      nombre: docData.informeActividades || '',
      disponible: !!docData.informeActividades
    };

    console.log('📁 Documentos existentes cargados:', this.documentosExistentes);
  }

  formatDateForInput(date: string | Date): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  tieneDocumentosDisponibles(): boolean {
    return this.documentosExistentes.some(doc => doc.disponible);
  }

  contarDocumentosDisponibles(): number {
    return this.documentosExistentes.filter(doc => doc.disponible).length;
  }

  abrirTodosDocumentos(): void {
    if (!this.tieneDocumentosDisponibles()) {
      this.notificationService.warning('Sin documentos', 'No hay documentos disponibles para visualizar');
      return;
    }

    console.log('📂 Abriendo todos los documentos...');

    let documentosAbiertos = 0;

    for (let i = 0; i < 3; i++) {
      if (this.documentosExistentes[i].disponible) {
        setTimeout(() => {
          this.verDocumento(i);
        }, i * 300);
        documentosAbiertos++;
      }
    }

    this.notificationService.info('Documentos abiertos',
      `Se están abriendo ${documentosAbiertos} documentos en nuevas pestañas`);
  }

  descargarTodosDocumentos(): void {
    if (!this.tieneDocumentosDisponibles()) {
      this.notificationService.warning('Sin documentos', 'No hay documentos disponibles para descargar');
      return;
    }

    console.log('📥 Descargando todos los documentos...');

    const indicesDisponibles = [];

    for (let i = 0; i < 3; i++) {
      if (this.documentosExistentes[i].disponible) {
        indicesDisponibles.push(i);
      }
    }

    if (indicesDisponibles.length === 0) {
      this.notificationService.error('Error', 'No hay documentos para descargar');
      return;
    }

    this.isProcessing = true;
    this.notificationService.info('Descarga iniciada',
      `Descargando ${indicesDisponibles.length} documentos...`);

    const descargas = indicesDisponibles.map(index =>
      this.descargarDocumentoObservable(index)
    );

    forkJoin(descargas).subscribe({
      next: () => {
        this.isProcessing = false;
        this.notificationService.success('Descarga completada',
          `Se descargaron ${indicesDisponibles.length} documentos correctamente`);
      },
      error: (error) => {
        this.isProcessing = false;
        this.notificationService.error('Error',
          `Error al descargar algunos documentos: ${error.message}`);
      }
    });
  }

  descargarDocumentoObservable(index: number): Observable<void> {
    return new Observable<void>(observer => {
      try {
        this.descargarDocumento(index);
        setTimeout(() => {
          observer.next();
          observer.complete();
        }, 500);
      } catch (error) {
        observer.error(error);
      }
    });
  }

  verDocumento(index: number): void {
    if (index < 0 || index > 2 || !this.documentosExistentes[index].disponible) {
      this.notificationService.warning('Documento no disponible',
        'El documento seleccionado no está disponible para visualización');
      return;
    }

    console.log(`👁️ Visualizando documento ${index} usando RadicacionService`);
    this.radicacionService.previsualizarArchivo(this.documentoId, index + 1);
  }

  descargarDocumento(index: number): void {
    if (index < 0 || index > 2 || !this.documentosExistentes[index].disponible) {
      this.notificationService.warning('Documento no disponible',
        'El documento seleccionado no está disponible para descarga');
      return;
    }

    let nombreArchivo = '';
    const docData = this.radicadoData.documento || this.radicadoData;

    switch (index) {
      case 0:
        nombreArchivo = docData.cuentaCobro || 'cuenta_cobro.pdf';
        break;
      case 1:
        nombreArchivo = docData.seguridadSocial || 'seguridad_social.pdf';
        break;
      case 2:
        nombreArchivo = docData.informeActividades || 'informe_actividades.pdf';
        break;
    }

    console.log(`📥 Descargando documento ${index}: ${nombreArchivo}`);
    this.radicacionService.descargarArchivoDirecto(this.documentoId, index + 1, nombreArchivo);
  }

  getNombreArchivo(index: number): string {
    if (index < 0 || index > 2) return '';
    const archivo = this.documentosExistentes[index];
    if (!archivo.disponible) return 'No disponible';

    const path = archivo.nombre;
    if (!path) return 'Sin nombre';
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1] || path;
  }

  volverALista(): void {
    this.router.navigate(['/supervisor/pendientes']);
  }

  cancelarRevision(): void {
    if (confirm('¿Cancelar la revisión? Los cambios no guardados se perderán.')) {
      this.volverALista();
    }
  }

  onEstadoChange(estado: string): void {
    this.mostrarCampoArchivo = estado === 'APROBADO';
    if (estado !== 'APROBADO') {
      this.archivoAprobacion = null;
    }
  }

  onArchivoAprobacionSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > this.maxFileSize) {
      this.notificationService.error('Error', 'El archivo excede el tamaño máximo de 10MB');
      event.target.value = '';
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.notificationService.error('Error', 'Tipo de archivo no permitido');
      event.target.value = '';
      return;
    }

    this.archivoAprobacion = file;
    this.notificationService.success('Archivo cargado', 'Archivo de aprobación cargado correctamente');
  }

  guardarRevision(): void {
    if (this.revisionForm.invalid) {
      this.notificationService.warning('Formulario incompleto',
        'Por favor completa todos los campos requeridos');
      return;
    }

    const estado = this.revisionForm.get('estadoRevision')?.value;

    if (estado === 'APROBADO' && !this.archivoAprobacion) {
      this.notificationService.error('Error',
        'Debe adjuntar un archivo de aprobación cuando el estado es APROBADO');
      return;
    }

    const confirmar = confirm('¿Estás seguro de guardar la revisión? Esta acción cambiará el estado del documento.');
    if (!confirmar) return;

    this.isProcessing = true;
    const formData = this.revisionForm.getRawValue();

    // ✅ CORREGIDO: Solo enviar campos permitidos
    const datosRevision = {
      estado: estado,
      observacion: formData.observacionSupervisor
      
    };

    console.log('📤 Enviando revisión CORREGIDA del supervisor:', datosRevision);

    const requestObservable = estado === 'APROBADO' && this.archivoAprobacion
      ? this.supervisorService.guardarRevisionConArchivo(this.documentoId, datosRevision, this.archivoAprobacion)
      : this.supervisorService.guardarRevision(this.documentoId, datosRevision);

    requestObservable.subscribe({
      next: (resultado: any) => {
        console.log('✅ Revisión guardada exitosamente:', resultado);
        this.notificationService.success('Éxito', 'Revisión guardada correctamente');
        this.isProcessing = false;

        setTimeout(() => {
          this.volverALista();
        }, 2000);
      },
      error: (error: any) => {
        console.error('❌ Error guardando revisión:', error);
        const errorMsg = error.error?.message || error.message || 'Error desconocido';
        this.notificationService.error('Error', `No se pudo guardar la revisión: ${errorMsg}`);
        this.isProcessing = false;
      }
    });
  }
}