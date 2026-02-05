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
  tieneTipoDefinido = false;

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
      tipoProceso: ['', Validators.required],  // nada | glosa | causacion
      estadoFinal: ['', Validators.required]
    });

    // Escuchar cambios en el dropdown para limpiar automáticamente lo que no corresponda
    this.form.get('tipoProceso')?.valueChanges.subscribe((nuevoValor: string) => {
      this.limpiarArchivosSegunTipo(nuevoValor);
      this.actualizarEstadoBotones();
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
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

      if (this.documento) {
        if (this.documento.tipoProceso) {
          this.form.patchValue({ tipoProceso: this.documento.tipoProceso });
          this.tieneTipoDefinido = true;
        }
      }

      this.actualizarEstadoBotones();
    } catch (err: any) {
      this.mostrarMensaje(err.message || 'Error al cargar el documento', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  private limpiarArchivosSegunTipo(tipo: string): void {
    // Siempre limpiamos lo que no corresponda
    if (tipo === 'glosa') {
      this.archivos['causacion'] = null;
    } else if (tipo === 'causacion') {
      this.archivos['glosa'] = null;
    } else { // nada
      this.archivos['glosa'] = null;
      this.archivos['causacion'] = null;
      this.archivos['extracto'] = null; // extracto no aplica si no hay ninguno
    }
  }

  onFileSelected(event: any, tipo: string): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      this.notification.error('Archivo muy grande', 'Máximo 15 MB');
      return;
    }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      this.notification.error('Tipo no permitido', 'Solo PDF, DOC o DOCX');
      return;
    }

    this.archivos[tipo] = file;
    this.actualizarEstadoBotones();
  }

  removeFile(tipo: string): void {
    this.archivos[tipo] = null;
    this.actualizarEstadoBotones();
  }

onSubmit(): void {
  if (this.form.invalid) {
    this.notification.warning('Formulario inválido', 'Revisa los campos requeridos');
    return;
  }

  const estado = this.form.get('estadoFinal')?.value;

  // Validación estricta para APROBADO
  if (estado === 'APROBADO' && !this.archivos['comprobanteEgreso']) {
    this.notification.error('Para APROBAR es obligatorio subir el Comprobante de Egreso');
    return;
  }

  // Validación extra: si es APROBADO, comprobanteEgreso DEBE existir
  if (estado === 'APROBADO' && (!this.archivos['comprobanteEgreso'] || !this.archivos['comprobanteEgreso']?.size)) {
    this.notification.error('El archivo Comprobante de Egreso no se cargó correctamente');
    return;
  }

  this.isProcessing = true;

  const formData = new FormData();

  // Adjuntamos SOLO los archivos que existen
  if (this.archivos['glosa']) formData.append('glosa', this.archivos['glosa']);
  if (this.archivos['causacion']) formData.append('causacion', this.archivos['causacion']);
  if (this.archivos['extracto']) formData.append('extracto', this.archivos['extracto']);
  if (this.archivos['comprobanteEgreso']) formData.append('comprobanteEgreso', this.archivos['comprobanteEgreso']);

  formData.append('observaciones', this.form.value.observaciones || '');
  formData.append('tipoProceso', this.form.value.tipoProceso || 'nada');
  formData.append('estadoFinal', estado);

  // ← Opcional: log para depurar qué se está enviando
  console.log('Archivos enviados:', {
    glosa: !!this.archivos['glosa'],
    causacion: !!this.archivos['causacion'],
    extracto: !!this.archivos['extracto'],
    comprobanteEgreso: !!this.archivos['comprobanteEgreso']
  });

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

  liberarDocumento(): void {
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

  volverALista(): void {
    this.router.navigate(['/contabilidad/pendientes']);
  }

  onCancel(): void {
    this.volverALista();
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | 'info'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
  }

actualizarEstadoBotones(): void {
  const tipoProceso = this.form.get('tipoProceso')?.value;
  const estadoFinal = this.form.get('estadoFinal')?.value;

  let archivosRequeridos: string[] = ['comprobanteEgreso']; // siempre para aprobar

  // Si NO es "nada", agregar extracto + glosa/causación según corresponda
  if (tipoProceso && tipoProceso !== 'nada') {
    archivosRequeridos.push('extracto');

    if (tipoProceso === 'glosa') {
      archivosRequeridos.push('glosa');
    } else if (tipoProceso === 'causacion') {
      archivosRequeridos.push('causacion');
    }
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