import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorFormComponent } from '../../../auditor/components/auditor-form/auditor-form.component';

@Component({
  selector: 'app-contabilidad-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AuditorFormComponent
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
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.esSoloLectura = params['soloLectura'] === 'true' || params['modo'] === 'consulta';
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarDocumento(id);
    } else {
      this.mostrarMensaje('No se recibió ID del documento', 'error');
      this.isLoading = false;
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
          // Extraer datos según estructura de respuesta
          const data = response?.data || response;
          this.documento = data?.documento || data || null;

          if (!this.documento) {
            throw new Error('Documento no encontrado');
          }

          const estadoUpper = (this.documento.estado || '').toUpperCase();
          
          // Determinar qué tipo de documento es
          this.estaEnRevision = this.estadosEdicionContabilidad.some(e => estadoUpper.includes(e));
          this.esDocumentoDeOtroRol = this.estadosOtrosRoles.some(e => estadoUpper.includes(e));
          this.estaProcesado = this.estadosFinalesContabilidad.some(e => estadoUpper.includes(e));

          // SIEMPRE deshabilitar si es solo lectura por URL o es de otro rol o ya está procesado
          const deshabilitarFormulario = this.esSoloLectura || this.esDocumentoDeOtroRol || this.estaProcesado;

          // Logs para depuración
          console.log('=================================');
          console.log('ID:', id);
          console.log('Estado documento:', estadoUpper);
          console.log('estaEnRevision (puede editar):', this.estaEnRevision);
          console.log('esDocumentoDeOtroRol (solo consulta):', this.esDocumentoDeOtroRol);
          console.log('estaProcesado:', this.estaProcesado);
          console.log('deshabilitarFormulario:', deshabilitarFormulario);
          console.log('=================================');

          // Cargar datos previos si existen
          this.cargarDatosPrevios();

          // Establecer valores iniciales
          this.inicializarFormulario(estadoUpper);

          // Habilitar/deshabilitar según corresponda
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
          this.mostrarMensaje(err.error?.message || 'Error al cargar el documento', 'error');
          this.isLoading = false;
        }
      });
  }

  private inicializarFormulario(estadoUpper: string): void {
    // Tipo de proceso basado en los archivos existentes
    let tipoProceso = 'nada';
    if (this.documento.tieneGlosa === true || this.documento.glosaPath) {
      tipoProceso = 'glosa';
    } else if (this.documento.causacionPath || this.documento.extractoPath || this.documento.comprobanteEgresoPath) {
      tipoProceso = 'causacion';
    }
    
    // Estado final basado en el estado del documento
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
      observaciones: this.documento.observacionesContabilidad || 
                     this.documento.observaciones || ''
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

  previsualizarArchivo(tipo: string): void {
    if (!this.archivosPrevios.find(a => a.tipo === tipo)?.path) {
      this.mostrarMensaje('Archivo no disponible', 'warning');
      return;
    }

    this.contabilidadService.previsualizarArchivoContabilidad(this.documento.id, tipo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        },
        error: () => {
          this.mostrarMensaje('Error al previsualizar el archivo', 'error');
        }
      });
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
}