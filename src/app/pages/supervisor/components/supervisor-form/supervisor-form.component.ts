import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { SupervisorService } from '../../../../core/services/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

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
  
  // Modo de trabajo
  modoEdicion = false;
  desdeHistorial = false;
  soloLectura = false;

  revisionForm!: FormGroup;

  maxFileSize = 10 * 1024 * 1024;
  mostrarCampoArchivo = false;
  mostrarInfoUltimoRadicado = false; // ✅ Controla visibilidad de la sección
  archivoAprobacion: File | null = null;
  
  // ✅ Campos para paz y salvo
  requierePazSalvo = false;
  archivoPazSalvo: File | null = null;
  nombrePazSalvoExistente: string = '';
  fechaPazSalvoExistente: Date | null = null;

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
    
    this.route.queryParams.subscribe(params => {
      this.modoEdicion = params['modo'] === 'edicion';
      this.desdeHistorial = params['desdeHistorial'] === 'true';
      this.soloLectura = params['soloLectura'] === 'true' || params['modo'] === 'consulta';
      
      console.log('🔍 Parámetros de ruta:', {
        modoEdicion: this.modoEdicion,
        desdeHistorial: this.desdeHistorial,
        soloLectura: this.soloLectura
      });
    });
    
    this.verificarDatosPrellenados();
    
    this.route.params.subscribe(params => {
      this.documentoId = params['id'];
      this.cargarDocumento(this.documentoId);
    });

    // ✅ Suscribirse a cambios en el estado para mostrar/ocultar la sección
    this.revisionForm.get('estadoRevision')?.valueChanges.subscribe(estado => {
      this.onEstadoChange(estado);
    });

    // ✅ Suscribirse a cambios en el checkbox de último radicado
    this.revisionForm.get('esUltimoRadicado')?.valueChanges.subscribe(esUltimo => {
      this.onUltimoRadicadoChange(esUltimo);
    });

    // ✅ Suscribirse a cambios en el checkbox de requiere paz y salvo
    this.revisionForm.get('requierePazSalvo')?.valueChanges.subscribe(requiere => {
      this.requierePazSalvo = requiere;
    });
  }

  initializeForm(): void {
    this.revisionForm = this.fb.group({
      // Información básica
      numeroRadicado: [{ value: '', disabled: true }, Validators.required],
      numeroContrato: [{ value: '', disabled: true }, Validators.required],
      nombreContratista: [{ value: '', disabled: true }, Validators.required],
      documentoContratista: [{ value: '', disabled: true }, Validators.required],
      fechaInicio: [{ value: '', disabled: true }, Validators.required],
      fechaFin: [{ value: '', disabled: true }, Validators.required],
      observacionOriginal: [{ value: '', disabled: true }],

      // Información de radicador
      radicadorNombre: [{ value: '', disabled: true }],
      radicadorUsuario: [{ value: '', disabled: true }],
      fechaRadicacion: [{ value: '', disabled: true }],
      
      // Información de supervisor asignado
      supervisorAsignado: [{ value: '', disabled: true }],
      fechaAsignacion: [{ value: '', disabled: true }],
      
      // ✅ Campos para último radicado (confirmación) y paz y salvo
      esUltimoRadicado: [{ value: false, disabled: false }],
      requierePazSalvo: [{ value: false, disabled: false }],

      // Información de revisión
      estadoRevision: [{ value: '', disabled: false }, Validators.required],
      observacionSupervisor: [{ value: '', disabled: false }, [Validators.required, Validators.minLength(10)]],
      correcciones: [{ value: '', disabled: false }],
      fechaRevision: [{ value: this.getCurrentDate(), disabled: true }],
      supervisorRevisor: [{ value: this.getCurrentUser(), disabled: true }]
    });

    // ✅ Inicialmente ocultamos la sección de último radicado
    this.mostrarInfoUltimoRadicado = false;
  }

  verificarDatosPrellenados(): void {
    const datosHistorialStr = localStorage.getItem('datosHistorialParaRevision');
    if (datosHistorialStr) {
      try {
        const datosHistorial = JSON.parse(datosHistorialStr);
        console.log('📝 Datos del historial encontrados:', datosHistorial);
        
        // Prellenar formulario con datos del historial
        this.revisionForm.patchValue({
          numeroRadicado: datosHistorial.numeroRadicado || '',
          numeroContrato: datosHistorial.numeroContrato || '',
          nombreContratista: datosHistorial.nombreContratista || '',
          documentoContratista: datosHistorial.documentoContratista || '',
          fechaInicio: this.formatDateForInput(datosHistorial.fechaInicio),
          fechaFin: this.formatDateForInput(datosHistorial.fechaFin),
          fechaRadicacion: this.formatDateForInput(datosHistorial.fechaRadicacion),
          
          estadoRevision: datosHistorial.estadoRevision || '',
          observacionSupervisor: datosHistorial.observacionSupervisor || '',
          correcciones: datosHistorial.correcciones || '',
          requierePazSalvo: datosHistorial.requierePazSalvo || false,
          esUltimoRadicado: datosHistorial.esUltimoRadicado || false,
          fechaRevision: this.formatDateForInput(datosHistorial.fechaRevision) || this.getCurrentDate(),
          supervisorRevisor: datosHistorial.supervisorRevisor || this.getCurrentUser()
        });
        
        // Cargar información de paz y salvo si existe
        if (datosHistorial.pazSalvo) {
          this.nombrePazSalvoExistente = datosHistorial.pazSalvo;
        }
        
        if (datosHistorial.fechaPazSalvo) {
          this.fechaPazSalvoExistente = new Date(datosHistorial.fechaPazSalvo);
        }
        
        if (datosHistorial.requierePazSalvo) {
          this.requierePazSalvo = true;
        }
        
        // Si viene del historial, activar modo solo lectura
        if (datosHistorial.modoSoloLectura || datosHistorial.desdeHistorial) {
          this.soloLectura = true;
          this.desdeHistorial = true;
          this.configurarModoSoloLectura();
        }
        
        // Limpiar localStorage después de usar
        localStorage.removeItem('datosHistorialParaRevision');
        
      } catch (error) {
        console.error('❌ Error parseando datos del historial:', error);
        localStorage.removeItem('datosHistorialParaRevision');
      }
    }
  }

  configurarModoSoloLectura(): void {
    console.log('🔒 Activando modo solo lectura en formulario');
    
    // Deshabilitar todos los campos editables
    this.revisionForm.get('estadoRevision')?.disable();
    this.revisionForm.get('observacionSupervisor')?.disable();
    this.revisionForm.get('correcciones')?.disable();
    this.revisionForm.get('requierePazSalvo')?.disable();
    this.revisionForm.get('esUltimoRadicado')?.disable();
    
    // Ocultar campo de archivo
    this.mostrarCampoArchivo = false;
    this.mostrarInfoUltimoRadicado = false;
    
    // Mostrar mensaje informativo
    this.notificationService.info('Modo consulta', 
      'Estás viendo una supervisión del historial. Los datos son de solo lectura.');
  }

  cargarDocumento(id: string): void {
    this.isLoading = true;

    this.supervisorService.obtenerDocumentoPorId(id)
      .pipe(
        switchMap((response: any) => {
          console.log('📊 Respuesta completa del backend:', response);

          const documentoData = response?.data?.documento || response?.documento || response?.data || response;

          console.log('📝 Datos del documento extraídos:', documentoData);
          this.radicadoData = documentoData;
          this.poblarFormulario(documentoData);
          this.cargarDocumentosExistentes(documentoData);
          this.cargarInformacionSupervisor(documentoData);
          
          return of(documentoData);
        })
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          
          if (this.soloLectura) {
            this.configurarModoSoloLectura();
          }
        },
        error: (error: any) => {
          console.error('❌ Error cargando documento desde supervisor:', error);
          this.cargarDocumentoDesdeRadicacion(id);
        }
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

  cargarDocumentoDesdeRadicacion(id: string): void {
    this.radicacionService.obtenerDocumentoPorId(id)
      .subscribe({
        next: (response: any) => {
          console.log('📊 Documento cargado desde radicacion service:', response);
          const documentoData = response?.data || response;
          this.radicadoData = documentoData;
          this.poblarFormulario(documentoData);
          this.cargarDocumentosExistentes(documentoData);
          this.cargarInformacionSupervisor(documentoData);
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

      fechaRevision: this.getCurrentDate(),
      supervisorRevisor: this.getCurrentUser()
    });
  }

  cargarInformacionSupervisor(documento: any): void {
    const docData = documento.documento || documento;
    
    // Información de asignación
    if (docData.supervisor) {
      this.revisionForm.patchValue({
        supervisorAsignado: docData.supervisor.fullName || docData.supervisor.username || 'N/A',
        fechaAsignacion: this.formatDateForInput(docData.fechaAsignacion || docData.fechaInicioRevision)
      });
    } else {
      // Intentar obtener de asignaciones existentes
      this.revisionForm.patchValue({
        supervisorAsignado: docData.usuarioAsignadoNombre || 
                          docData.supervisorAsignado || 
                          'No asignado',
        fechaAsignacion: this.formatDateForInput(docData.fechaAsignacion || docData.updatedAt)
      });
    }
    
    // Verificar si ya existe paz y salvo
    if (docData.pazSalvo) {
      this.nombrePazSalvoExistente = docData.pazSalvo;
    }
    
    if (docData.fechaPazSalvo) {
      this.fechaPazSalvoExistente = new Date(docData.fechaPazSalvo);
    }
    
    // ✅ Solo cargamos si ya existía en modo lectura
    if (docData.requierePazSalvo && this.soloLectura) {
      this.requierePazSalvo = true;
      this.revisionForm.patchValue({
        requierePazSalvo: true
      });
    }
    
    // ✅ Solo cargamos si ya existía en modo lectura
    if (docData.esUltimoRadicado && this.soloLectura) {
      this.revisionForm.patchValue({
        esUltimoRadicado: true
      });
    }
    
    // Cargar correcciones existentes si las hay
    if (docData.correcciones) {
      this.revisionForm.patchValue({
        correcciones: docData.correcciones
      });
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

  onPazSalvoChange(): void {
    this.requierePazSalvo = this.revisionForm.get('requierePazSalvo')?.value;
  }

  onUltimoRadicadoChange(esUltimo: boolean): void {
    console.log('🔄 Cambio en checkbox esUltimoRadicado:', esUltimo);
    
    // ✅ Cuando se marca como último radicado, sugerir paz y salvo
    if (esUltimo && !this.soloLectura) {
      const estado = this.revisionForm.get('estadoRevision')?.value;
      if (estado === 'APROBADO') {
        setTimeout(() => {
          const confirmar = confirm('¿Este último radicado requiere paz y salvo?\n\nSi es el último documento del contratista, normalmente se requiere paz y salvo.');
          if (confirmar) {
            this.revisionForm.patchValue({
              requierePazSalvo: true
            });
            this.requierePazSalvo = true;
          }
        }, 300);
      }
    } else if (!esUltimo) {
      // Si NO es último radicado, desmarcar paz y salvo
      this.revisionForm.patchValue({
        requierePazSalvo: false
      });
      this.requierePazSalvo = false;
    }
  }

  onArchivoPazSalvoSelected(event: any): void {
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

    this.archivoPazSalvo = file;
    this.notificationService.success('Archivo cargado', 'Archivo de paz y salvo cargado correctamente');
  }

  previsualizarPazSalvo(nombreArchivo: string): void {
    this.supervisorService.previsualizarPazSalvo(nombreArchivo);
  }

  descargarPazSalvo(nombreArchivo: string): void {
    this.isProcessing = true;
    
    this.supervisorService.descargarPazSalvo(nombreArchivo)
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreArchivo;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          this.isProcessing = false;
          this.notificationService.success('Descarga completada', 
            `Paz y salvo "${nombreArchivo}" descargado correctamente`);
        },
        error: (error: any) => {
          console.error('❌ Error descargando paz y salvo:', error);
          this.notificationService.error('Error', 
            `No se pudo descargar el paz y salvo: ${error.message || 'Error desconocido'}`);
          this.isProcessing = false;
        }
      });
  }

  // ✅ MODIFICADO: Control de visibilidad de la sección de último radicado
  onEstadoChange(estado: string): void {
    console.log('🔄 Cambio de estado:', estado);
    
    this.mostrarCampoArchivo = estado === 'APROBADO';
    
    // ✅ SOLUCIÓN PRINCIPAL: Mostrar sección solo cuando el estado sea APROBADO
    this.mostrarInfoUltimoRadicado = estado === 'APROBADO';
    
    if (estado !== 'APROBADO') {
      this.archivoAprobacion = null;
      this.archivoPazSalvo = null;
      
      // Si cambia a un estado no APROBADO, ocultar la sección
      this.mostrarInfoUltimoRadicado = false;
      
      // También resetear los checkboxes si no es APROBADO
      if (estado !== 'APROBADO') {
        this.revisionForm.patchValue({
          esUltimoRadicado: false,
          requierePazSalvo: false
        });
        this.requierePazSalvo = false;
      }
    } else {
      // Si es APROBADO, mostrar notificación informativa
      setTimeout(() => {
        this.notificationService.info('Confirmación requerida', 
          'Por favor verifique si este es el último radicado del contratista.');
      }, 500);
    }
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
    if (this.desdeHistorial) {
      // Volver al historial si venimos de ahí
      this.router.navigate(['/supervisor/historial']);
    } else {
      // Volver a pendientes si es una revisión normal
      this.router.navigate(['/supervisor/pendientes']);
    }
  }

  cancelarRevision(): void {
    const mensaje = this.desdeHistorial 
      ? '¿Cancelar la edición? Los cambios no guardados se perderán.'
      : '¿Cancelar la revisión? Los cambios no guardados se perderán.';
    
    if (confirm(mensaje)) {
      this.volverALista();
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
    const esUltimoRadicado = this.revisionForm.get('esUltimoRadicado')?.value;
    const requierePazSalvo = this.revisionForm.get('requierePazSalvo')?.value;

    console.log('📋 Validación:', {
      estado,
      esUltimoRadicado,
      requierePazSalvo,
      archivoAprobacion: !!this.archivoAprobacion,
      archivoPazSalvo: !!this.archivoPazSalvo,
      nombrePazSalvoExistente: this.nombrePazSalvoExistente
    });

    // Validaciones para estado APROBADO
    if (estado === 'APROBADO') {
      if (!this.archivoAprobacion) {
        this.notificationService.error('Error',
          'Debe adjuntar un archivo de aprobación cuando el estado es APROBADO');
        return;
      }
      
      // ✅ Validación para paz y salvo solo si es el último radicado y requiere paz y salvo
      if (esUltimoRadicado && requierePazSalvo && !this.archivoPazSalvo && !this.nombrePazSalvoExistente) {
        this.notificationService.error('Error',
          'Debe adjuntar un archivo de paz y salvo ya que marcó que este documento lo requiere (es el último radicado)');
        return;
      }
    }

    const mensajeConfirmacion = this.desdeHistorial
      ? '¿Estás seguro de guardar los cambios? Esta acción actualizará la supervisión anterior.'
      : '¿Estás seguro de guardar la revisión? Esta acción cambiará el estado del documento.';

    const confirmar = confirm(mensajeConfirmacion);
    if (!confirmar) return;

    this.isProcessing = true;
    const formData = this.revisionForm.getRawValue();

    // Preparar datos para enviar
    const datosRevision = {
      estado: estado,
      observacion: formData.observacionSupervisor,
      correcciones: formData.correcciones || '',
      requierePazSalvo: esUltimoRadicado ? requierePazSalvo : false, // Solo si es último radicado
      esUltimoRadicado: esUltimoRadicado, // ✅ Confirmación del supervisor
      modoEdicion: this.modoEdicion
    };

    console.log('📤 Enviando revisión del supervisor:', datosRevision);

    // Determinar qué método usar según los archivos
    let requestObservable: Observable<any>;
    
    if (estado === 'APROBADO' && (this.archivoAprobacion || this.archivoPazSalvo)) {
      // Usar método con archivos
      requestObservable = this.supervisorService.guardarRevisionConArchivo(
        this.documentoId, 
        datosRevision, 
        this.archivoAprobacion, 
        esUltimoRadicado && requierePazSalvo ? this.archivoPazSalvo : null
      );
    } else {
      // Usar método sin archivos
      requestObservable = this.supervisorService.guardarRevision(
        this.documentoId, 
        datosRevision
      );
    }

    requestObservable.subscribe({
      next: (resultado: any) => {
        console.log('✅ Revisión guardada exitosamente:', resultado);
        
        const mensajeExito = this.desdeHistorial
          ? 'Supervisión actualizada correctamente'
          : 'Revisión guardada correctamente';
        
        this.notificationService.success('Éxito', mensajeExito);
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