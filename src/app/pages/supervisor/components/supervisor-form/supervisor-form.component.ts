import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { RadicacionService } from '../../../../core/services/radicacion.service';
import { SupervisorService } from '../../../../core/services/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-supervisor-form',
  templateUrl: './supervisor-form.component.html',
  styleUrls: ['./supervisor-form.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class SupervisorFormComponent implements OnInit {
  // Variables principales
  documentoId: string = '';
  radicadoData: any = null;
  isLoading = false;
  isProcessing = false;
  isDownloadingAll = false;

  // Modos de trabajo
  modoEdicion = false;
  desdeHistorial = false;
  soloLectura = false;

  // Formulario
  revisionForm!: FormGroup;

  // Archivos del supervisor
  maxFileSize = 10 * 1024 * 1024;
  mostrarCampoArchivo = false;
  archivoAprobacion: File | null = null;
  archivoPazSalvo: File | null = null;

  // Archivos existentes
  nombreArchivoAprobacionExistente: string = '';
  fechaArchivoAprobacionExistente: Date | null = null;
  nombrePazSalvoExistente: string = '';
  fechaPazSalvoExistente: Date | null = null;

  cargandoVerAprobacion = false;
  cargandoVerPazSalvo = false;

  // Documentos radicados
  documentosExistentes = [
    { nombre: '', disponible: false },
    { nombre: '', disponible: false },
    { nombre: '', disponible: false }
  ];

  // Información del supervisor
  supervisorInfo: any = {
    supervisorAsignado: 'No asignado',
    fechaAsignacion: '',
    supervisorRevisor: 'No asignado',
    fechaRevision: '',
    esUltimoRadicado: false,
    tieneArchivoAprobacion: false,
    tienePazSalvo: false,
    nombreArchivoAprobacion: null,
    nombrePazSalvo: null,
    supervisorAsignadoNombre: '',
    supervisorRevisorNombre: '',
    observacionSupervisor: ''
  };

  // Historial
  historialEstados: any[] = [];

  cargandoVer: { [key: string]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private radicacionService: RadicacionService, // Mantener si es necesario, pero preferir supervisorService
    private supervisorService: SupervisorService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initializeForm();

    // Obtener parámetros de la ruta
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

    // Obtener ID del documento
    this.route.params.subscribe(params => {
      this.documentoId = params['id'];
      this.cargarDocumentoCompleto(this.documentoId);
    });

    // Suscripciones a cambios en el formulario
    this.revisionForm.get('estadoRevision')?.valueChanges.subscribe(estado => {
      this.onEstadoChange(estado);
    });

    this.revisionForm.get('esUltimoRadicado')?.valueChanges.subscribe(esUltimo => {
      this.onUltimoRadicadoChange(esUltimo);
      setTimeout(() => {
        this.verificarConsistenciaDatos();
      }, 100);
    });
  }

  // ========================
  // MÉTODOS DE INICIALIZACIÓN
  // ========================

  private initializeForm(): void {
    this.revisionForm = this.fb.group({
      // Información básica (solo lectura)
      numeroRadicado: [{ value: '', disabled: true }, Validators.required],
      numeroContrato: [{ value: '', disabled: true }, Validators.required],
      nombreContratista: [{ value: '', disabled: true }, Validators.required],
      documentoContratista: [{ value: '', disabled: true }, Validators.required],
      fechaInicio: [{ value: '', disabled: true }, Validators.required],
      fechaFin: [{ value: '', disabled: true }, Validators.required],
      observacionOriginal: [{ value: '', disabled: true }],

      // Información de radicador (solo lectura)
      radicadorNombre: [{ value: '', disabled: true }],
      radicadorUsuario: [{ value: '', disabled: true }],
      fechaRadicacion: [{ value: '', disabled: true }],

      // Información de supervisor asignado (solo lectura)
      supervisorAsignado: [{ value: '', disabled: true }],
      fechaAsignacion: [{ value: '', disabled: true }],

      // Campos para último radicado
      esUltimoRadicado: [{ value: false, disabled: false }],

      // Información de revisión (editables)
      estadoRevision: [{ value: '', disabled: false }, Validators.required],
      observacionSupervisor: [{ value: '', disabled: false }, [Validators.required, Validators.minLength(10)]],
      correcciones: [{ value: '', disabled: false }],
      fechaRevision: [{ value: this.getCurrentDate(), disabled: true }],
      supervisorRevisor: [{ value: this.getCurrentUser(), disabled: true }]
    });
  }

  // ========================
  // MÉTODOS PARA CARGAR DATOS
  // ========================

  /**
   * ✅ Carga el documento completo con toda la información
   */
  cargarDocumentoCompleto(id: string): void {
    this.isLoading = true;

    this.supervisorService.obtenerDocumentoPorId(id)
      .pipe(
        map((documentoResponse: any) => {
          console.log('📊 Documento principal recibido:', documentoResponse);

          const documentoData = documentoResponse?.data?.documento ||
            documentoResponse?.documento ||
            documentoResponse?.data ||
            documentoResponse;

          return documentoData;
        }),
        catchError(error => {
          console.error('❌ Error cargando documento:', error);
          this.notificationService.error('Error', 'No se pudo cargar la información del documento');
          return of(null);
        })
      )
      .subscribe({
        next: (documentoData: any) => {
          if (!documentoData) {
            this.isLoading = false;
            return;
          }

          this.radicadoData = documentoData;

          // Cargar datos en el formulario
          this.poblarFormulario(documentoData);
          this.cargarDocumentosExistentes(documentoData);

          // ✅ CARGAR ARCHIVOS DEL SUPERVISOR DESDE EL BACKEND
          this.cargarArchivosSupervisorDesdeBackend(id, documentoData);

          this.isLoading = false;

          if (this.soloLectura) {
            this.configurarModoSoloLectura();
          } else {
            // ✅ Tomar el documento para obtener permisos
            this.tomarDocumento();
          }
        }
      });
  }

  /**
   * ✅ Toma el documento para revisión si no es solo lectura
   */
  private tomarDocumento(): void {
    this.supervisorService.tomarDocumentoParaRevision(this.documentoId).subscribe({
      next: (response) => {
        console.log('✅ Documento tomado para revisión:', response);
        this.notificationService.success('Éxito', 'Documento asignado para revisión');
      },
      error: (error) => {
        console.warn('⚠️ El documento ya está asignado o no se pudo tomar:', error);
        if (error.status === 409 || error.message.includes('ya asignado')) {
          this.notificationService.info('Información', 'El documento ya está en revisión');
        } else {
          this.notificationService.error('Error', 'No se pudo asignar el documento para revisión');
        }
      }
    });
  }

  /**
   * ✅ Carga los archivos del supervisor desde el backend
   */
  private cargarArchivosSupervisorDesdeBackend(documentoId: string, documentoData: any): void {
    console.log('🔍 Buscando archivos del supervisor para documento:', documentoId);

    this.supervisorService.getHistorial()
      .pipe(
        map((historialResponse: any) => {
          if (historialResponse.success && Array.isArray(historialResponse.data)) {
            const registroSupervisor = historialResponse.data.find((item: any) => {
              return item.documentoId === documentoId ||
                (item.documento && item.documento.id === documentoId);
            });

            return registroSupervisor;
          }
          return null;
        }),
        catchError(error => {
          console.warn('⚠️ Error obteniendo historial:', error);
          return of(null);
        })
      )
      .subscribe({
        next: (registroSupervisor: any) => {
          if (registroSupervisor) {
            console.log('✅ Archivos del supervisor encontrados en historial:', registroSupervisor);
            this.procesarDatosSupervisor(registroSupervisor);
          } else {
            this.cargarArchivosDesdeDocumento(documentoData);
          }
        }
      });
  }

  private procesarDatosSupervisor(supervisorData: any): void {
    console.log('🔍 Procesando datos del supervisor:', supervisorData);

    const nombreArchivoAprobacion = supervisorData?.nombreArchivoSupervisor || '';
    const nombrePazSalvo = supervisorData?.pazSalvo || '';

    console.log('📁 Archivos encontrados:', {
      aprobacion: nombreArchivoAprobacion,
      pazSalvo: nombrePazSalvo
    });

    this.nombreArchivoAprobacionExistente = nombreArchivoAprobacion;
    this.nombrePazSalvoExistente = nombrePazSalvo;

    if (supervisorData?.fechaAprobacion) {
      this.fechaArchivoAprobacionExistente = new Date(supervisorData.fechaAprobacion);
    }
    if (supervisorData?.fechaActualizacion) {
      this.fechaPazSalvoExistente = new Date(supervisorData.fechaActualizacion);
    }

    this.supervisorInfo = {
      ...this.supervisorInfo,
      tieneArchivoAprobacion: !!nombreArchivoAprobacion,
      tienePazSalvo: !!nombrePazSalvo,
      nombreArchivoAprobacion: nombreArchivoAprobacion,
      nombrePazSalvo: nombrePazSalvo,
      esUltimoRadicado: supervisorData?.esUltimoRadicado || !!nombrePazSalvo,
      supervisorRevisor: supervisorData?.usuarioNombre || this.getCurrentUser(),
      fechaRevision: supervisorData?.fechaAprobacion || supervisorData?.fechaActualizacion,
      observacionSupervisor: supervisorData?.observacion || ''
    };

    this.revisionForm.patchValue({
      estadoRevision: supervisorData?.estado || '',
      observacionSupervisor: supervisorData?.observacion || '',
      esUltimoRadicado: this.supervisorInfo.esUltimoRadicado
    });

    if (nombreArchivoAprobacion || nombrePazSalvo) {
      this.mostrarCampoArchivo = true;
    }

    console.log('✅ Información del supervisor actualizada:', this.supervisorInfo);
    this.cdr.detectChanges();
  }

  private cargarArchivosDesdeDocumento(documento: any): void {
    console.log('🔍 Buscando archivos en datos del documento:', documento);

    const docData = documento.documento || documento;

    const historial = docData.historialEstados || [];
    const estadoAprobado = historial.find((h: any) =>
      h.estado === 'APROBADO' || h.estado === 'APROBADO_SUPERVISOR'
    );

    if (estadoAprobado) {
      console.log('✅ Estado APROBADO encontrado en historial:', estadoAprobado);

      this.revisionForm.patchValue({
        observacionSupervisor: estadoAprobado.observacion || ''
      });
    }

    if (docData.nombreArchivoSupervisor) {
      this.nombreArchivoAprobacionExistente = docData.nombreArchivoSupervisor;
      this.fechaArchivoAprobacionExistente = docData.fechaAprobacion ?
        new Date(docData.fechaAprobacion) : null;
      this.mostrarCampoArchivo = true;
    }

    if (docData.pazSalvo) {
      this.nombrePazSalvoExistente = docData.pazSalvo;
      this.fechaPazSalvoExistente = docData.fechaActualizacion ?
        new Date(docData.fechaActualizacion) : null;
    }

    if (docData.esUltimoRadicado !== undefined) {
      this.revisionForm.patchValue({
        esUltimoRadicado: docData.esUltimoRadicado
      });
    }
  }

  private poblarFormulario(documento: any): void {
    console.log('📝 Poblando formulario con datos:', documento);

    const docData = documento.documento || documento;
    const supervisorActual = this.getCurrentUser();

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
        docData.asignacion?.supervisorActual ||
        supervisorActual,
      fechaAsignacion: this.formatDateForInput(docData.fechaAsignacion || new Date()),

      supervisorRevisor: supervisorActual,
      fechaRevision: this.getCurrentDate()
    });

    if (docData.historialEstados && Array.isArray(docData.historialEstados)) {
      this.historialEstados = docData.historialEstados;

      const revisionSupervisor = this.historialEstados.find((h: any) =>
        h.estado && (h.estado.includes('APROBADO') ||
          h.estado.includes('OBSERVADO') ||
          h.estado.includes('RECHAZADO'))
      );

      if (revisionSupervisor) {
        this.revisionForm.patchValue({
          observacionSupervisor: revisionSupervisor.observacion || ''
        });
      }
    }
  }

  private cargarDocumentosExistentes(documento: any): void {
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

  private configurarModoSoloLectura(): void {
    console.log('🔒 Activando modo solo lectura en formulario');

    this.revisionForm.get('estadoRevision')?.disable();
    this.revisionForm.get('observacionSupervisor')?.disable();
    this.revisionForm.get('correcciones')?.disable();
    this.revisionForm.get('esUltimoRadicado')?.disable();

    if (this.nombreArchivoAprobacionExistente || this.nombrePazSalvoExistente) {
      this.mostrarCampoArchivo = true;
    }
  }

  private verificarConsistenciaDatos(): void {
    const tieneArchivoPazSalvo = this.tienePazSalvoExistente();
    const esUltimoRadicado = this.revisionForm.get('esUltimoRadicado')?.value;

    console.log('🔍 Verificando consistencia de datos:', {
      tieneArchivoPazSalvo,
      esUltimoRadicado,
      nombrePazSalvoExistente: this.nombrePazSalvoExistente,
      supervisorInfoTienePazSalvo: this.supervisorInfo?.tienePazSalvo
    });

    if (tieneArchivoPazSalvo && !esUltimoRadicado) {
      console.warn('⚠️ INCONSISTENCIA: Existe archivo de paz y salvo pero no está marcado como último radicado');

      if (!this.soloLectura) {
        this.revisionForm.patchValue({ esUltimoRadicado: true });
        this.notificationService.info(
          'Corrección automática',
          'Se detectó un archivo de paz y salvo. El documento ha sido automáticamente marcado como último radicado.'
        );
      }
    }

    if (esUltimoRadicado && !tieneArchivoPazSalvo && !this.soloLectura) {
      console.warn('⚠️ ADVERTENCIA: Marcado como último radicado pero sin archivo de paz y salvo');
      this.notificationService.warning(
        'Atención',
        'Al marcar como último radicado, debe adjuntar el archivo de paz y salvo.'
      );
    }
  }

  tienePazSalvoExistente(): boolean {
    return !!this.nombrePazSalvoExistente ||
      !!this.supervisorInfo?.nombrePazSalvo ||
      this.supervisorInfo?.tienePazSalvo === true;
  }

  tieneAprobacionExistente(): boolean {
    return !!this.nombreArchivoAprobacionExistente || !!this.supervisorInfo.nombreArchivoAprobacion;
  }

  getNombreArchivoPazSalvo(): string {
    if (this.nombrePazSalvoExistente) {
      const parts = this.nombrePazSalvoExistente.split(/[\\/]/);
      return parts[parts.length - 1] || this.nombrePazSalvoExistente;
    }

    if (this.supervisorInfo?.nombrePazSalvo) {
      const parts = this.supervisorInfo.nombrePazSalvo.split(/[\\/]/);
      return parts[parts.length - 1] || this.supervisorInfo.nombrePazSalvo;
    }

    return 'paz_y_salvo.pdf';
  }

  onArchivoPazSalvoSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.validarYAsignarArchivoPazSalvo(file);
    }
  }

  validarYAsignarArchivoPazSalvo(file: File): void {
    if (file.size > this.maxFileSize) {
      this.notificationService.error('Error', 'El archivo excede el tamaño máximo de 10MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.notificationService.error('Error',
        'Tipo de archivo no permitido. Use PDF, DOC, DOCX, JPG o PNG');
      return;
    }

    this.archivoPazSalvo = file;
    this.notificationService.success('Archivo cargado',
      `Paz y salvo "${file.name}" cargado correctamente`);
  }

  eliminarArchivoPazSalvo(): void {
    this.archivoPazSalvo = null;
    this.notificationService.info('Archivo eliminado',
      'Archivo de paz y salvo eliminado de la selección');
  }

  getFileSize(size: number): string {
    if (!size || size === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));

    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  tieneDocumentosDisponibles(): boolean {
    return this.documentosExistentes.some(doc => doc.disponible);
  }

  contarDocumentosDisponibles(): number {
    return this.documentosExistentes.filter(doc => doc.disponible).length;
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

  verDocumento(index: number): void {
    if (index < 0 || index > 2 || !this.documentosExistentes[index].disponible) {
      this.notificationService.warning('Documento no disponible',
        'El documento seleccionado no está disponible para visualización');
      return;
    }

    console.log(`👁️ Visualizando documento ${index} usando SupervisorService`);
    this.supervisorService.previsualizarArchivo(this.documentoId, index + 1);
  }

  descargarDocumento(index: number): void {
    if (index < 0 || index > 2 || !this.documentosExistentes[index].disponible) {
      this.notificationService.warning('Documento no disponible',
        'El documento seleccionado no está disponible para descarga');
      return;
    }

    this.isProcessing = true;
    const nombreArchivo = this.getNombreArchivo(index);

    console.log(`📥 Descargando documento individual ${index}: ${nombreArchivo}`);

    this.supervisorService.descargarArchivo(this.documentoId, index + 1).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.notificationService.success('Descarga completada', 'Documento descargado correctamente');
        this.isProcessing = false;
      },
      error: (error: any) => {
        console.error(`❌ Error descargando documento ${index}:`, error);
        const errorMsg = error.error?.message || error.message || 'Error desconocido';
        this.notificationService.error('Error', `No se pudo descargar el documento: ${errorMsg}`);
        this.isProcessing = false;
      }
    });
  }

  descargarTodosDocumentos(): void {
    if (!this.tieneDocumentosDisponibles()) {
      this.notificationService.warning('Sin documentos', 'No hay documentos disponibles para descargar');
      return;
    }

    console.log('📥 Descargando todos los documentos...');
    this.isProcessing = true;
    this.isDownloadingAll = true;

    const documentosDisponibles = this.documentosExistentes
      .map((doc, index) => ({ ...doc, index }))
      .filter(doc => doc.disponible);

    if (documentosDisponibles.length === 0) {
      this.notificationService.warning('Sin documentos', 'No hay documentos disponibles para descargar');
      this.isProcessing = false;
      this.isDownloadingAll = false;
      return;
    }

    this.notificationService.info('Descarga iniciada',
      `Descargando ${documentosDisponibles.length} documentos...`);

    let descargados = 0;
    let errores = 0;

    documentosDisponibles.forEach((doc, i) => {
      setTimeout(() => {
        const nombreArchivo = this.getNombreArchivo(doc.index);

        this.supervisorService.descargarArchivo(this.documentoId, doc.index + 1).subscribe({
          next: (blob: Blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            descargados++;
            this.verificarFinDescargaMultiple(descargados, errores, documentosDisponibles.length);
          },
          error: (error: any) => {
            console.error(`❌ Error descargando documento ${doc.index}:`, error);
            errores++;
            this.verificarFinDescargaMultiple(descargados, errores, documentosDisponibles.length);
          }
        });
      }, i * 1000);
    });
  }

  private verificarFinDescargaMultiple(descargados: number, errores: number, total: number): void {
    if (descargados + errores === total) {
      this.notificationService.success('Descarga completada',
        `Se descargaron ${descargados} documentos correctamente. Errores: ${errores}`);
      this.isProcessing = false;
      this.isDownloadingAll = false;
    }
  }

  previsualizarArchivosSupervisor(tipo: 'aprobacion' | 'pazsalvo'): void {
    let nombreArchivo = '';

    if (tipo === 'aprobacion') {
      nombreArchivo = this.nombreArchivoAprobacionExistente ||
        this.supervisorInfo?.nombreArchivoAprobacion || '';
      if (nombreArchivo) {
        // Llama al método DEL SERVICIO
        this.supervisorService.verArchivoAprobacion(nombreArchivo);
      }
    } else {
      nombreArchivo = this.nombrePazSalvoExistente ||
        this.supervisorInfo?.nombrePazSalvo || '';
      if (nombreArchivo) {
        // Llama al método DEL SERVICIO
        this.supervisorService.previsualizarPazSalvo(nombreArchivo);
      }
    }

    if (!nombreArchivo) {
      this.notificationService.warning('Sin archivo', `No hay archivo de ${tipo} para previsualizar`);
    }
  }

  descargarArchivosSupervisor(tipo: 'aprobacion' | 'pazsalvo'): void {
    console.log(`📥 Descargando archivo de ${tipo}...`);
    this.isProcessing = true;

    const nombreArchivo = tipo === 'aprobacion'
      ? this.nombreArchivoAprobacionExistente || this.supervisorInfo.nombreArchivoAprobacion
      : this.nombrePazSalvoExistente || this.supervisorInfo.nombrePazSalvo;

    if (!nombreArchivo) {
      this.notificationService.warning('Advertencia', 'No hay archivo disponible');
      this.isProcessing = false;
      return;
    }

    const servicioObservable = tipo === 'aprobacion'
      ? this.supervisorService.descargarArchivoAprobacion(nombreArchivo)
      : this.supervisorService.descargarPazSalvo(nombreArchivo);

    servicioObservable.subscribe({
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
        this.notificationService.success('Descarga completada', 'Archivo descargado correctamente');
      },
      error: (error: any) => {
        console.error(`❌ Error descargando archivo de ${tipo}:`, error);

        let errorMsg = 'No se pudo descargar el archivo';
        if (error.status === 404) {
          errorMsg = 'El archivo no existe en el servidor';
        } else if (error.status === 403) {
          errorMsg = 'No tiene permisos para descargar este archivo';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }

        this.notificationService.error('Error', errorMsg);
        this.isProcessing = false;
      }
    });
  }

  guardarRevision(): void {
    if (this.revisionForm.invalid) {
      this.notificationService.warning('Formulario incompleto',
        'Por favor completa todos los campos requeridos');
      return;
    }

    const estado = this.revisionForm.get('estadoRevision')?.value;
    const esUltimoRadicado = this.revisionForm.get('esUltimoRadicado')?.value;

    console.log('📋 Validación para guardar:', {
      estado,
      esUltimoRadicado,
      archivoAprobacion: !!this.archivoAprobacion,
      archivoPazSalvo: !!this.archivoPazSalvo,
      tieneAprobacionExistente: this.tieneAprobacionExistente(),
      tienePazSalvoExistente: this.tienePazSalvoExistente()
    });

    if (estado === 'APROBADO') {
      if (!this.archivoAprobacion && !this.tieneAprobacionExistente()) {
        this.notificationService.error('Error',
          'Debe adjuntar un archivo de aprobación cuando el estado es APROBADO');
        return;
      }

      if (esUltimoRadicado && !this.archivoPazSalvo && !this.tienePazSalvoExistente()) {
        this.notificationService.error('Error',
          'Debe adjuntar un archivo de paz y salvo ya que este es el último radicado del contratista');
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

    const datosRevision = {
      estado: estado,
      observacion: formData.observacionSupervisor,
      correcciones: formData.correcciones || '',
      requierePazSalvo: esUltimoRadicado,
      esUltimoRadicado: Boolean(esUltimoRadicado),
      modoEdicion: this.modoEdicion
    };

    console.log('📤 Enviando revisión del supervisor:', datosRevision);

    let requestObservable: Observable<any>;

    if (estado === 'APROBADO' && (this.archivoAprobacion || this.archivoPazSalvo)) {
      requestObservable = this.supervisorService.guardarRevisionConArchivo(
        this.documentoId,
        datosRevision,
        this.archivoAprobacion,
        esUltimoRadicado ? this.archivoPazSalvo : null
      );
    } else {
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

  volverALista(): void {
    if (this.desdeHistorial) {
      this.router.navigate(['/supervisor/historial']);
    } else {
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

  onEstadoChange(estado: string): void {
    console.log('🔄 Cambio de estado:', estado);

    this.mostrarCampoArchivo = estado === 'APROBADO';

    if (estado !== 'APROBADO') {
      this.archivoAprobacion = null;

      if (!this.nombrePazSalvoExistente) {
        this.archivoPazSalvo = null;
      }
    }
  }

  onUltimoRadicadoChange(esUltimo: boolean): void {
    console.log('🔄 Cambio en checkbox esUltimoRadicado:', esUltimo,
      'Tiene paz salvo existente:', this.tienePazSalvoExistente());

    if (esUltimo &&
      !this.soloLectura &&
      !this.archivoPazSalvo &&
      !this.tienePazSalvoExistente()) {

      console.log('📂 Abriendo selector de archivo de paz y salvo...');

      setTimeout(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
        input.style.display = 'none';

        input.onchange = (event: any) => {
          const file = event.target.files[0];
          if (file) {
            console.log('📄 Archivo seleccionado:', file.name);
            this.validarYAsignarArchivoPazSalvo(file);
          } else {
            console.log('❌ Selección cancelada');
          }
          document.body.removeChild(input);
        };

        document.body.appendChild(input);
        input.click();
      }, 100);
    }
  }

  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getCurrentUser(): string {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.fullName || user.username || user.email || 'Supervisor';
      } catch (error) {
        console.error('Error parseando usuario:', error);
      }
    }
    return 'Supervisor';
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

  // Método para manejar selección de archivo de aprobación (si existe en tu código original)
  onArchivoAprobacionSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar y asignar similar a paz salvo
      if (file.size > this.maxFileSize) {
        this.notificationService.error('Error', 'El archivo excede el tamaño máximo de 10MB');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.notificationService.error('Error',
          'Tipo de archivo no permitido. Use PDF, DOC, DOCX, JPG o PNG');
        return;
      }

      this.archivoAprobacion = file;
      this.notificationService.success('Archivo cargado',
        `Archivo de aprobación "${file.name}" cargado correctamente`);
    }
  }

  // Método para eliminar archivo de aprobación (si existe)
  eliminarArchivoAprobacion(): void {
    this.archivoAprobacion = null;
    this.notificationService.info('Archivo eliminado',
      'Archivo de aprobación eliminado de la selección');
  }
}