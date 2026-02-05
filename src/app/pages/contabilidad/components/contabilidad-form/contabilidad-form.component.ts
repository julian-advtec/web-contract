import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
export class ContabilidadFormComponent implements OnInit {
  form: FormGroup;
  isProcessing = false;
  isLoading = true;
  documento: any = null;
  tieneGlosaDefinida = false;

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
      tieneGlosa: [null]
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
        if (this.documento.tieneGlosa !== undefined) {
          this.tieneGlosaDefinida = true;
          this.form.patchValue({ tieneGlosa: this.documento.tieneGlosa });
        }
      }

      this.actualizarEstadoBotones();
    } catch (err: any) {
      this.mostrarMensaje(err.message || 'Error al cargar el documento', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  definirGlosa(): void {
    const tieneGlosaValue = this.form.get('tieneGlosa')?.value;

    if (tieneGlosaValue === null || tieneGlosaValue === undefined) {
      this.notification.warning('Selecciona una opción', 'Debes indicar si hay glosa o no');
      return;
    }

    this.isProcessing = true;
    this.contabilidadService.definirGlosa(this.documento.id, tieneGlosaValue)
      .subscribe({
        next: () => {
          this.tieneGlosaDefinida = true;
          this.mostrarMensaje('Decisión de glosa registrada correctamente', 'success');
          this.isProcessing = false;
          this.actualizarEstadoBotones();
        },
        error: (err) => {
          this.mostrarMensaje(err.message || 'Error al registrar glosa', 'error');
          this.isProcessing = false;
        }
      });
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

    this.isProcessing = true;

    const formData = new FormData();
    Object.entries(this.archivos).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });
    formData.append('observaciones', this.form.value.observaciones || '');
    formData.append('tieneGlosa', String(this.form.value.tieneGlosa));

    this.contabilidadService.subirDocumentosContabilidad(this.documento.id, formData)
      .subscribe({
        next: () => {
          this.mostrarMensaje('Documentos subidos correctamente', 'success');
          this.isProcessing = false;
          setTimeout(() => this.volverALista(), 1800);
        },
        error: (err) => {
          this.mostrarMensaje(err.message || 'Error al subir documentos', 'error');
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
    const tieneGlosa = this.form.get('tieneGlosa')?.value;
    
    let archivosRequeridos = ['causacion'];
    
    if (tieneGlosa === true) {
      archivosRequeridos.push('glosa', 'extracto');
    } else if (tieneGlosa === false) {
      archivosRequeridos.push('comprobanteEgreso');
    }
    
    const todosArchivosCargados = archivosRequeridos.every(key => 
      this.archivos[key] !== null && this.archivos[key] !== undefined
    );
    
    this.puedeGuardar = this.form.valid && 
                       this.tieneGlosaDefinida && 
                       todosArchivosCargados;
    
    this.puedeLiberar = !!this.documento && !this.isProcessing;
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado) return 'badge bg-secondary';
    const upper = estado.toUpperCase();
    if (upper.includes('APROBADO')) return 'badge bg-success';
    if (upper.includes('EN_REVISION')) return 'badge bg-warning';
    if (upper.includes('GLOSADO') || upper.includes('OBSERVADO')) return 'badge bg-danger';
    return 'badge bg-info';
  }
}