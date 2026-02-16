import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorFormComponent } from '../../../auditor/components/auditor-form/auditor-form.component';
import { SupervisorFormComponent } from '../../../supervisor/components/supervisor-form/supervisor-form.component';
import { Input } from '@angular/core';

@Component({
  selector: 'app-contabilidad-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AuditorFormComponent,
    SupervisorFormComponent
  ],
  templateUrl: './contabilidad-form.component.html',
  styleUrls: ['./contabilidad-form.component.scss']
})
export class ContabilidadFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isProcessing = false;
  isLoading = true;
  documento: any = null;

  // Flags de estado
  estaEnRevision = false;           // Documentos que contabilidad puede editar
  estaProcesado = false;            // Documentos ya procesados por contabilidad
  esDocumentoDeOtroRol = false;     // Documentos de otras áreas (tesorería, etc.)
  esSoloLectura = false;            // Forzado por URL

  @Input() forceReadOnly: boolean = false;
  // Archivos
  archivos: Record<string, File | null> = {
    glosa: null,
    causacion: null,
    extracto: null,
    comprobanteEgreso: null
  };
  archivosPrevios: { tipo: string; nombre: string; path?: string }[] = [];

  // Mensajes
  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'warning' | 'info' = 'info';
@Input() documentoId: string | null = null;
  // Control de botones
  puedeGuardar = false;
  puedeLiberar = false;

  private destroy$ = new Subject<void>();

  // Estados que CONTABILIDAD puede editar
  private estadosEdicionContabilidad = [
    'EN_REVISION_CONTABILIDAD',
    'EN_REVISION'
  ];

  // Estados que son de OTROS ROLES (solo consulta)
  private estadosOtrosRoles = [
    'EN_REVISION_TESORERIA',
    'OBSERVADO_TESORERIA',
    'RECHAZADO_TESORERIA',
    'PROCESADO_TESORERIA',
    'EN_REVISION_SUPERVISOR',
    'APROBADO_SUPERVISOR',
    'EN_REVISION_AUDITOR',
    'RECHAZADO_AUDITOR',
    'OBSERVADO_AUDITOR',
    'APROBADO_AUDITOR'
  ];

  // Estados finales de contabilidad (procesados)
  private estadosFinalesContabilidad = [
    'COMPLETADO_CONTABILIDAD',
    'PROCESADO_CONTABILIDAD',
    'OBSERVADO_CONTABILIDAD',
    'RECHAZADO_CONTABILIDAD',
    'GLOSADO_CONTABILIDAD'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private contabilidadService: ContabilidadService,
    private notification: NotificationService
  ) {
    this.form = this.fb.group({
      observaciones: [''],
      tipoProceso: ['', Validators.required],
      estadoFinal: ['', Validators.required]
    });

    // Suscripciones para validaciones
    this.form.get('tipoProceso')?.valueChanges.subscribe(valor => {
      this.limpiarArchivosSegunTipo(valor);
      this.actualizarEstadoBotones();
    });

    this.form.valueChanges.subscribe(() => this.actualizarEstadoBotones());
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    // Suscripción a query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const forzadoPorParams = params['soloLectura'] === 'true' ||
        params['modo'] === 'consulta' ||
        params['view'] === 'readonly';

      // Estado actual (puede ser undefined hasta que cargue el documento)
      const estadoUpper = (this.documento?.estado || '').toUpperCase();

      // Lógica de decisión de modo
      if (this.estadosEdicionContabilidad.some(e => estadoUpper.includes(e))) {
        // Está en revisión contable → FORZAR EDICIÓN (ignora URL)
        this.esSoloLectura = false;
        console.log('[Modo decidido] → EDICIÓN (estado editable)');
      }
      else if (
        this.estaProcesado ||
        estadoUpper.includes('CONTABILIDAD') ||
        estadoUpper.includes('TESORERIA') ||
        estadoUpper.includes('SUPERVISOR') ||
        estadoUpper.includes('AUDITOR') ||
        estadoUpper.includes('COMPLETADO') ||
        estadoUpper.includes('PROCESADO') ||
        estadoUpper.includes('GLOSADO') ||
        estadoUpper.includes('RECHAZADO')
      ) {
        // Ya fue procesado o pasó a otro rol → FORZAR SOLO LECTURA
        this.esSoloLectura = true;
        console.log('[Modo decidido] → SOLO LECTURA (procesado o en área posterior)');
      }
      else if (forzadoPorParams) {
        // Solo si no hay estado claro, respetar URL
        this.esSoloLectura = true;
        console.log('[Modo decidido] → SOLO LECTURA (forzado por URL)');
      }
      else {
        this.esSoloLectura = false;
        console.log('[Modo decidido] → EDICIÓN por defecto (sin forzado)');
      }

      console.log('[ngOnInit] Decisión final:', {
        estado: estadoUpper || 'Aún no cargado',
        esSoloLectura: this.esSoloLectura,
        forzadoPorParams,
        estaProcesado: this.estaProcesado
      });
    });

    if (id) {
      this.cargarDocumento(id);
    } else {
      this.mostrarMensaje('No se recibió ID del documento', 'error');
      this.isLoading = false;
    }

    if (this.forceReadOnly) {
  this.esSoloLectura = true;
  this.form.disable();
 
}
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDocumento(id: string): void {
    this.isLoading = true;

    this.contabilidadService.obtenerDetalleDocumento(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const data = response?.data || response;
          this.documento = data?.documento || data || null;

          if (!this.documento) {
            this.mostrarMensaje('Documento no encontrado', 'error');
            this.isLoading = false;
            return;
          }

          const estadoUpper = (this.documento.estado || '').toUpperCase();

          this.estaEnRevision = this.estadosEdicionContabilidad.some(e => estadoUpper.includes(e));
          this.esDocumentoDeOtroRol = this.estadosOtrosRoles.some(e => estadoUpper.includes(e));
          this.estaProcesado = this.estadosFinalesContabilidad.some(e => estadoUpper.includes(e)) ||
            estadoUpper.includes('TESORERIA') ||
            estadoUpper.includes('COMPLETADO') ||
            estadoUpper.includes('PROCESADO');

          // Solo deshabilitamos el FORM, NO bloqueamos el render de la vista
          const deshabilitarFormulario = this.esSoloLectura ||
            this.esDocumentoDeOtroRol ||
            this.estaProcesado;

          console.log('=================================');
          console.log('Carga completada - Estado:', estadoUpper);
          console.log('estaEnRevision:', this.estaEnRevision);
          console.log('esDocumentoDeOtroRol:', this.esDocumentoDeOtroRol);
          console.log('estaProcesado:', this.estaProcesado);
          console.log('esSoloLectura:', this.esSoloLectura);
          console.log('Formulario deshabilitado:', deshabilitarFormulario);
          console.log('=================================');

          this.cargarDatosPrevios();
          this.inicializarFormulario(estadoUpper);

          if (deshabilitarFormulario) {
            this.form.disable();
          } else {
            this.form.enable();
          }

          this.actualizarEstadoBotones();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error cargando documento:', err);
          let msg = 'Error al cargar el documento';
          if (err.status === 403) {
            msg = 'No tienes permiso para acceder a este documento en su estado actual.';
          } else if (err.status === 404) {
            msg = 'Documento no encontrado.';
          }
          this.mostrarMensaje(msg, 'error');
          this.isLoading = false;
        }
      });
  }

  private inicializarFormulario(estadoUpper: string): void {
    let tipoProceso = 'nada';
    if (this.documento.tieneGlosa === true || this.documento.glosaPath) {
      tipoProceso = 'glosa';
    } else if (this.documento.causacionPath || this.documento.extractoPath || this.documento.comprobanteEgresoPath) {
      tipoProceso = 'causacion';
    }

    let estadoFinal = '';
    if (estadoUpper.includes('COMPLETADO') || estadoUpper.includes('PROCESADO') || estadoUpper.includes('APROBADO')) {
      estadoFinal = 'APROBADO';
    } else if (estadoUpper.includes('OBSERVADO')) {
      estadoFinal = 'OBSERVADO';
    } else if (estadoUpper.includes('RECHAZADO') || estadoUpper.includes('GLOSADO')) {
      estadoFinal = 'RECHAZADO';
    }

    this.form.patchValue({
      tipoProceso,
      estadoFinal,
      observaciones: this.documento.observacionesContabilidad || this.documento.observaciones || ''
    });
  }

  private cargarDatosPrevios(): void {
    this.archivosPrevios = [];

    // Buscar en el objeto documento directamente
    const mapping = [
      { tipo: 'comprobanteEgreso', path: this.documento.comprobanteEgresoPath, label: 'Comprobante de Egreso' },
      { tipo: 'glosa', path: this.documento.glosaPath, label: 'Glosa' },
      { tipo: 'causacion', path: this.documento.causacionPath, label: 'Causación' },
      { tipo: 'extracto', path: this.documento.extractoPath, label: 'Extracto Bancario' }
    ];

    mapping.forEach(item => {
      if (item.path) {
        const fileName = item.path.split(/[\\/]/).pop() || 'archivo';
        this.archivosPrevios.push({
          tipo: item.tipo,
          nombre: `${item.label} (${fileName})`,
          path: item.path
        });
      }
    });

    // También buscar en archivosContabilidad si existe (estructura anidada)
    if (this.documento.archivosContabilidad && Array.isArray(this.documento.archivosContabilidad)) {
      this.documento.archivosContabilidad.forEach((arch: any) => {
        if (arch.subido && arch.nombreArchivo && !this.archivosPrevios.some(a => a.tipo === arch.tipo)) {
          const fileName = arch.nombreArchivo.split(/[\\/]/).pop() || 'archivo';
          this.archivosPrevios.push({
            tipo: arch.tipo,
            nombre: `${arch.descripcion || arch.tipo} (${fileName})`,
            path: arch.nombreArchivo
          });
        }
      });
    }
  }

  onFileSelected(event: any, tipo: keyof typeof this.archivos): void {
    if (!this.estaEnRevision || this.esSoloLectura) {
      this.mostrarMensaje('No puedes subir archivos en modo consulta', 'warning');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño (15MB)
    if (file.size > 15 * 1024 * 1024) {
      this.mostrarMensaje('El archivo no puede superar los 15MB', 'error');
      event.target.value = '';
      return;
    }

    // Validar tipo
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      this.mostrarMensaje('Solo se permiten archivos PDF, DOC o DOCX', 'error');
      event.target.value = '';
      return;
    }

    this.archivos[tipo] = file;
    this.actualizarEstadoBotones();
    this.mostrarMensaje(`Archivo ${file.name} seleccionado`, 'info');
  }

  onSubmit(): void {
    if (!this.estaEnRevision || this.esSoloLectura) {
      this.mostrarMensaje('No puedes guardar en modo consulta', 'warning');
      return;
    }

    if (this.form.invalid) {
      this.mostrarMensaje('Complete todos los campos requeridos', 'warning');
      return;
    }

    if (this.isProcessing) return;

    const estado = this.form.get('estadoFinal')?.value;
    const tipoProceso = this.form.get('tipoProceso')?.value;

    // Validar comprobante de egreso para aprobación
    if (estado === 'APROBADO' && !this.archivos['comprobanteEgreso']) {
      this.mostrarMensaje('Debe adjuntar el Comprobante de Egreso para aprobar', 'error');
      return;
    }

    // Validar archivos según tipo de proceso
    if (tipoProceso === 'glosa') {
      if (!this.archivos['glosa']) {
        this.mostrarMensaje('Debe adjuntar el documento de Glosa', 'error');
        return;
      }
      if (!this.archivos['extracto']) {
        this.mostrarMensaje('Debe adjuntar el Extracto Bancario', 'error');
        return;
      }
    } else if (tipoProceso === 'causacion') {
      if (!this.archivos['causacion']) {
        this.mostrarMensaje('Debe adjuntar el documento de Causación', 'error');
        return;
      }
      if (!this.archivos['extracto']) {
        this.mostrarMensaje('Debe adjuntar el Extracto Bancario', 'error');
        return;
      }
    }

    this.isProcessing = true;
    this.mostrarMensaje('Guardando documento...', 'info');

    const formData = new FormData();

    // Agregar archivos
    Object.entries(this.archivos).forEach(([key, file]) => {
      if (file) {
        formData.append(key, file);
      }
    });

    // Agregar datos del formulario
    formData.append('observaciones', this.form.value.observaciones || '');
    formData.append('tipoProceso', tipoProceso);
    formData.append('estadoFinal', estado);

    console.log('Enviando formulario:', {
      documentoId: this.documento.id,
      tipoProceso,
      estado,
      archivos: Object.keys(this.archivos).filter(k => this.archivos[k])
    });

    this.contabilidadService.subirDocumentosContabilidad(this.documento.id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.mostrarMensaje('Documento guardado correctamente', 'success');
          this.isProcessing = false;

          // Recargar datos para mostrar el estado actualizado
          setTimeout(() => {
            this.cargarDocumento(this.documento.id);
          }, 1500);
        },
        error: (err) => {
          console.error('Error al guardar:', err);
          this.mostrarMensaje(err.error?.message || 'Error al guardar el documento', 'error');
          this.isProcessing = false;
        }
      });
  }

  liberarDocumento(): void {
    if (!this.estaEnRevision || this.esSoloLectura) {
      this.mostrarMensaje('No puedes liberar en modo consulta', 'warning');
      return;
    }

    if (!confirm('¿Está seguro de liberar este documento? Volverá a estar disponible para otros contadores.')) {
      return;
    }

    this.isProcessing = true;

    this.contabilidadService.liberarDocumento(this.documento.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.mostrarMensaje('Documento liberado correctamente', 'success');
          this.isProcessing = false;
          setTimeout(() => this.volverALista(), 1500);
        },
        error: (err) => {
          this.mostrarMensaje(err.error?.message || 'Error al liberar', 'error');
          this.isProcessing = false;
        }
      });
  }

  volverALista(): void {
    this.router.navigate(['/contabilidad/pendientes']);
  }



  private actualizarEstadoBotones(): void {
    if (!this.estaEnRevision || this.esSoloLectura) {
      this.puedeGuardar = false;
      this.puedeLiberar = false;
      return;
    }

    const tipo = this.form.get('tipoProceso')?.value;
    const estadoFinal = this.form.get('estadoFinal')?.value;

    // Validar campos requeridos
    if (!tipo || !estadoFinal) {
      this.puedeGuardar = false;
      this.puedeLiberar = true;
      return;
    }

    // Validar archivos según tipo
    let archivosRequeridos = ['comprobanteEgreso'];

    if (tipo === 'glosa') {
      archivosRequeridos.push('glosa', 'extracto');
    } else if (tipo === 'causacion') {
      archivosRequeridos.push('causacion', 'extracto');
    }

    const todosArchivosCargados = archivosRequeridos.every(
      req => !!this.archivos[req as keyof typeof this.archivos]
    );

    this.puedeGuardar = this.form.valid && todosArchivosCargados;
    this.puedeLiberar = true;
  }

  private limpiarArchivosSegunTipo(tipo: string): void {
    // Limpiar archivos no relevantes
    this.archivos['glosa'] = null;
    this.archivos['causacion'] = null;
    this.archivos['extracto'] = null;
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | 'info'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => this.mensaje = '', 5000);
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'bg-secondary';
    const e = estado.toUpperCase();
    if (e.includes('COMPLETADO') || e.includes('PROCESADO') || e.includes('APROBADO')) return 'bg-success';
    if (e.includes('EN_REVISION')) return 'bg-info';
    if (e.includes('GLOSADO') || e.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (e.includes('RECHAZADO')) return 'bg-danger';
    return 'bg-secondary';
  }

  // ───────────────────────────────────────────────────────────────
  // Métodos para visualización y descarga en modo solo lectura
  // ───────────────────────────────────────────────────────────────

  /**
   * Devuelve el título legible para cada tipo de archivo contable
   */
  getTituloPorTipo(tipo: string): string {
    const titulos: Record<string, string> = {
      comprobanteEgreso: 'Comprobante de Egreso',
      extracto: 'Extracto Bancario',
      glosa: 'Documento de Glosa',
      causacion: 'Documento de Causación'
    };
    return titulos[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);
  }

  /**
   * Devuelve el icono FontAwesome adecuado para cada tipo de archivo
   */
  getIconoPorTipo(tipo: string): string {
    const iconos: Record<string, string> = {
      comprobanteEgreso: 'fa-file-invoice',
      extracto: 'fa-university',
      glosa: 'fa-file-signature',
      causacion: 'fa-file-invoice-dollar'
    };
    return iconos[tipo] || 'fa-file';
  }

  /**
   * Clase CSS para el header de cada tarjeta según el tipo
   */
  getCardHeaderClass(tipo: string): string {
    const clases: Record<string, string> = {
      comprobanteEgreso: 'bg-primary text-white',
      extracto: 'bg-info text-white',
      glosa: 'bg-danger text-white',
      causacion: 'bg-success text-white'
    };
    return clases[tipo] || 'bg-secondary text-white';
  }

  /**
   * Descarga individual de un archivo contable ya subido (modo lectura)
   * @param tipo Tipo del archivo: 'comprobanteEgreso', 'extracto', 'glosa', 'causacion'
   * @param nombreFallback Nombre sugerido si el backend no lo devuelve
   */
  descargarArchivoContabilidad(tipo: string, nombreFallback: string = ''): void {
    if (!this.documento?.id) {
      this.mostrarMensaje('No hay documento cargado para descargar', 'error');
      return;
    }

    this.isProcessing = true;

    // Nombre por defecto si no se pasa uno
    const nombreDefault = nombreFallback ||
      `${this.getTituloPorTipo(tipo).replace(/\s+/g, '_')}_${this.documento.numeroRadicado || 'documento'}.pdf`;

    this.contabilidadService.descargarArchivoContabilidad(this.documento.id, tipo)
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreDefault;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.mostrarMensaje(`Archivo descargado: ${this.getTituloPorTipo(tipo)}`, 'success');
          this.isProcessing = false;
        },
        error: (err) => {
          console.error(`Error descargando ${tipo}:`, err);
          this.mostrarMensaje(
            `No se pudo descargar el archivo ${this.getTituloPorTipo(tipo)}. Puede que no exista o no tenga acceso.`,
            'error'
          );
          this.isProcessing = false;
        }
      });
  }

  /**
   * Previsualiza (abre en pestaña nueva) un archivo contable ya subido
   * Reutiliza el método que ya tenías
   */
  previsualizarArchivo(tipo: string): void {
    const archivo = this.archivosPrevios.find(a => a.tipo === tipo);

    if (!archivo?.path) {
      this.mostrarMensaje(`No hay archivo disponible para ${this.getTituloPorTipo(tipo)}`, 'warning');
      return;
    }

    this.isProcessing = true;

    this.contabilidadService.previsualizarArchivoContabilidad(this.documento.id, tipo)
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');

          // Limpieza automática después de 2 minutos
          setTimeout(() => window.URL.revokeObjectURL(url), 120000);

          this.isProcessing = false;
        },
        error: (err) => {
          console.error(`Error previsualizando ${tipo}:`, err);
          this.mostrarMensaje(
            `No se pudo abrir el archivo ${this.getTituloPorTipo(tipo)}. Intenta descargarlo directamente.`,
            'error'
          );
          this.isProcessing = false;
        }
      });
  }
}