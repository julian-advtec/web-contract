import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorFormComponent } from '../../../auditor/components/auditor-form/auditor-form.component';
import { SupervisorFormComponent } from '../../../supervisor/components/supervisor-form/supervisor-form.component';

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
export class ContabilidadFormComponent implements OnInit {
  form: FormGroup;
  isProcessing = false;
  isLoading = true;
  documento: any = null;

  esModoLectura = false;
  estaProcesado = false;
  archivosPrevios: { tipo: string; nombre: string; path?: string }[] = [];

  private estadosProcesados = [
    'COMPLETADO_CONTABILIDAD',
    'OBSERVADO_CONTABILIDAD',
    'RECHAZADO_CONTABILIDAD',
    'GLOSADO_CONTABILIDAD',
    'PROCESADO_CONTABILIDAD'
  ];

  archivos: Record<string, File | null> = {
    glosa: null,
    causacion: null,
    extracto: null,
    comprobanteEgreso: null
  };

  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'warning' | 'info' = 'info';

  puedeGuardar = false;
  puedeLiberar = false;

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

    this.form.get('tipoProceso')?.valueChanges.subscribe(valor => {
      this.limpiarArchivosSegunTipo(valor);
      this.actualizarEstadoBotones();
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const modo = this.route.snapshot.queryParamMap.get('modo') ||
      this.route.snapshot.data?.['modo'] || 'edicion';

    this.esModoLectura = ['vista', 'lectura', 'consulta'].includes(modo.toLowerCase());

    if (id) {
      this.cargarDocumento(id);
    } else {
      this.mostrarMensaje('No se recibió ID del documento', 'error');
      this.isLoading = false;
    }
  }

  async cargarDocumento(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const res: any = await this.contabilidadService.obtenerDetalleDocumento(id).toPromise();
      this.documento = res?.data?.documento || res?.documento || null;

      if (!this.documento) throw new Error('Documento no encontrado');

      console.log('[DEBUG] Datos completos del backend:', JSON.stringify(this.documento, null, 2));

      // Determinar si está procesado
      this.estaProcesado = this.estadosProcesados.includes(this.documento.estado?.toUpperCase() || '');

      // Cargar archivos previos si aplica
      if (this.estaProcesado || this.esModoLectura) {
        this.cargarDatosPrevios();
      }

      // Deshabilitar formulario si es modo lectura o ya procesado
      if (this.esModoLectura || this.estaProcesado) {
        this.form.disable();
      }

      // ────────────────────────────────────────────────────────────────
      // TIPO DE PROCESO - Lógica FINAL y robusta
      // Prioriza la presencia real de archivos sobre los campos booleanos/null
      // ────────────────────────────────────────────────────────────────
      let tipoProceso = 'nada';

      // Caso 1: Glosa explícita o archivo de glosa presente
      if (this.documento.tieneGlosa === true || this.documento.glosaPath) {
        tipoProceso = 'glosa';
      }
      // Caso 2: Cualquier indicio de causación (archivo o tipo)
      else if (
        this.documento.causacionPath ||
        this.documento.extractoPath ||
        this.documento.comprobanteEgresoPath ||
        this.documento.tipoCausacion
      ) {
        tipoProceso = 'causacion';
      }
      // Caso 3: fallback a nada

      this.form.patchValue({ tipoProceso });

      // Debug para confirmar la detección
      console.log('[DEBUG] Tipo de proceso detectado:', tipoProceso);
      console.log('[DEBUG] Razón de detección:', {
        tieneGlosa: this.documento.tieneGlosa,
        glosaPathExiste: !!this.documento.glosaPath,
        causacionPathExiste: !!this.documento.causacionPath,
        extractoPathExiste: !!this.documento.extractoPath,
        comprobanteEgresoPathExiste: !!this.documento.comprobanteEgresoPath,
        tipoCausacion: this.documento.tipoCausacion
      });

      // Decisión final
      let estadoFinal = '';
      const estadoUpper = this.documento.estado?.toUpperCase() || '';
      if (estadoUpper === 'COMPLETADO_CONTABILIDAD') {
        estadoFinal = 'APROBADO';
      } else if (estadoUpper === 'OBSERVADO_CONTABILIDAD') {
        estadoFinal = 'OBSERVADO';
      } else if (estadoUpper === 'RECHAZADO_CONTABILIDAD' || estadoUpper === 'GLOSADO_CONTABILIDAD') {
        estadoFinal = 'RECHAZADO';
      }
      if (estadoFinal) {
        this.form.patchValue({ estadoFinal });
      }

      // Observaciones contables (ya llega como observacionesContabilidad)
      if (this.documento.observacionesContabilidad) {
        this.form.patchValue({ observaciones: this.documento.observacionesContabilidad });
      } else if (this.documento.observaciones) {
        this.form.patchValue({ observaciones: this.documento.observaciones });
      }

      this.actualizarEstadoBotones();
    } catch (err: any) {
      console.error('Error cargando documento:', err);
      this.mostrarMensaje(err.message || 'Error al cargar el documento', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  private cargarDatosPrevios() {
    this.archivosPrevios = [];

    // Normalización ultra robusta de paths
    const normalize = (p?: any) => {
      if (!p) return '';
      return String(p).replace(/\\/g, '/').trim();
    };

    const mapping = [
      { tipo: 'glosa', path: normalize(this.documento.glosaPath), label: 'Glosa' },
      { tipo: 'causacion', path: normalize(this.documento.causacionPath), label: 'Causación / Comprobante' },
      { tipo: 'extracto', path: normalize(this.documento.extractoPath), label: 'Extracto Bancario' },
      { tipo: 'comprobanteEgreso', path: normalize(this.documento.comprobanteEgresoPath), label: 'Comprobante de Egreso' }
    ];

    mapping.forEach(item => {
      if (item.path && item.path.length > 0) {
        const fileName = item.path.split('/').pop() || 'archivo';
        this.archivosPrevios.push({
          tipo: item.tipo,
          nombre: `${item.label} (${fileName})`,
          path: item.path
        });
      }
    });

    console.log('[DEBUG] Archivos previos generados:', this.archivosPrevios);
    console.log('[DEBUG] Paths originales:', {
      glosa: this.documento.glosaPath,
      causacion: this.documento.causacionPath,
      extracto: this.documento.extractoPath,
      comprobanteEgreso: this.documento.comprobanteEgresoPath
    });
  }

  private extraerNombreArchivo(ruta: string): string {
    if (!ruta) return 'Archivo';
    const nombre = ruta.replace(/\\/g, '/').split('/').pop() || 'Archivo';
    return decodeURIComponent(nombre);
  }

  descargarArchivo(tipo: string) {
    this.contabilidadService.descargarArchivoContabilidad(this.documento.id, tipo)
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${tipo}_${this.documento.numeroRadicado || 'documento'}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => this.mostrarMensaje('Error al descargar el archivo', 'error')
      });
  }

  previsualizarArchivo(tipo: string) {
    this.contabilidadService.descargarArchivoContabilidad(this.documento.id, tipo)
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: () => this.mostrarMensaje('Error al previsualizar el archivo', 'error')
      });
  }

  limpiarArchivosSegunTipo(tipo: string) {
    if (tipo === 'nada') {
      this.archivos['glosa'] = null;
      this.archivos['causacion'] = null;
      this.archivos['extracto'] = null;
    } else if (tipo === 'glosa') {
      this.archivos['causacion'] = null;
    } else if (tipo === 'causacion') {
      this.archivos['glosa'] = null;
    }
  }

  onFileSelected(event: any, tipo: string) {
    if (this.esModoLectura || this.estaProcesado) return;

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      this.mostrarMensaje('Archivo muy grande (máx 15MB)', 'error');
      return;
    }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      this.mostrarMensaje('Tipo no permitido (solo PDF, DOC, DOCX)', 'error');
      return;
    }

    this.archivos[tipo] = file;
    this.actualizarEstadoBotones();
  }

  onSubmit() {
    if (this.esModoLectura || this.estaProcesado || this.form.invalid) return;

    const estado = this.form.get('estadoFinal')?.value;

    if (estado === 'APROBADO' && !this.archivos['comprobanteEgreso']) {
      this.mostrarMensaje('Para APROBAR es obligatorio subir el Comprobante de Egreso', 'error');
      return;
    }

    this.isProcessing = true;

    const formData = new FormData();

    if (this.archivos['glosa']) formData.append('glosa', this.archivos['glosa']);
    if (this.archivos['causacion']) formData.append('causacion', this.archivos['causacion']);
    if (this.archivos['extracto']) formData.append('extracto', this.archivos['extracto']);
    if (this.archivos['comprobanteEgreso']) formData.append('comprobanteEgreso', this.archivos['comprobanteEgreso']);

    formData.append('observaciones', this.form.value.observaciones || '');
    formData.append('tipoProceso', this.form.value.tipoProceso || 'nada');
    formData.append('estadoFinal', estado);

    this.contabilidadService.subirDocumentosContabilidad(this.documento.id, formData)
      .subscribe({
        next: () => {
          this.mostrarMensaje(`Documento ${estado.toLowerCase()} correctamente`, 'success');
          this.isProcessing = false;
          setTimeout(() => this.volverALista(), 1800);
        },
        error: (err) => {
          console.error('Error completo del backend:', err);
          this.mostrarMensaje(err.error?.message || 'Error al subir documentos', 'error');
          this.isProcessing = false;
        }
      });
  }

  liberarDocumento() {
    this.notification.showModal({
      title: 'Liberar documento',
      message: '¿Realmente deseas liberar este documento?\nVolverá a estar disponible para otros contadores.',
      type: 'confirm',
      confirmText: 'Sí, liberar',
      onConfirm: () => {
        this.contabilidadService.liberarDocumento(this.documento.id).subscribe({
          next: () => {
            this.mostrarMensaje('Documento liberado correctamente', 'success');
            setTimeout(() => this.volverALista(), 1500);
          },
          error: (err) => this.mostrarMensaje(err.message || 'Error al liberar', 'error')
        });
      }
    });
  }

  volverALista() {
    this.router.navigate(['/contabilidad/pendientes']);
  }

  onCancel() {
    this.volverALista();
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | 'info') {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => this.mensaje = '', 5000);
  }

  actualizarEstadoBotones() {
    if (this.esModoLectura || this.estaProcesado) {
      this.puedeGuardar = false;
      this.puedeLiberar = false;
      return;
    }

    const tipoProceso = this.form.get('tipoProceso')?.value;
    const estadoFinal = this.form.get('estadoFinal')?.value;

    let archivosRequeridos: string[] = ['comprobanteEgreso'];

    if (tipoProceso && tipoProceso !== 'nada') {
      archivosRequeridos.push('extracto');
      if (tipoProceso === 'glosa') archivosRequeridos.push('glosa');
      if (tipoProceso === 'causacion') archivosRequeridos.push('causacion');
    }

    const todosArchivosCargados = archivosRequeridos.every(key =>
      this.archivos[key] !== null && this.archivos[key] !== undefined
    );

    this.puedeGuardar = this.form.valid &&
      !!tipoProceso &&
      todosArchivosCargados &&
      !!estadoFinal;

    this.puedeLiberar = !!this.documento && !this.isProcessing;
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'badge bg-secondary';
    const upper = estado.toUpperCase();
    if (upper.includes('APROBADO')) return 'badge bg-success';
    if (upper.includes('EN_REVISION')) return 'badge bg-warning';
    if (upper.includes('GLOSADO') || upper.includes('OBSERVADO')) return 'badge bg-danger';
    if (upper.includes('RECHAZADO')) return 'badge bg-dark';
    return 'badge bg-info';
  }
}