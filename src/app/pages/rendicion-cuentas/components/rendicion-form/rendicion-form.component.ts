// src/app/pages/rendicion-cuentas/rendicion-form/rendicion-form.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RendicionCuentasProceso, RendicionCuentasEstado } from '../../../../core/models/rendicion-cuentas.model';
import { AsesorGerenciaFormComponent } from '../../../asesor-gerencia/components/asesor-gerencia-form/asesor-gerencia-form.component';

@Component({
  selector: 'app-rendicion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AsesorGerenciaFormComponent],
  templateUrl: './rendicion-form.component.html',
  styleUrls: ['./rendicion-form.component.scss']
})
export class RendicionFormComponent implements OnInit {
  form: FormGroup;

  isProcessing = false;
  isDescargando = false;
  isLoading = true;
  documento: RendicionCuentasProceso | null = null;

  esModoLectura = false;
  estaProcesado = false;

  @Input() documentoId: string | null = null;
  @Input() forceReadOnly: boolean = false;

  private estadosProcesados = [
    'APROBADO',
    'OBSERVADO',
    'RECHAZADO',
    'COMPLETADO'
  ];

  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'warning' | 'info' = 'info';

  puedeGuardar = false;
  puedeLiberar = false;
  currentUserRole: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rendicionService: RendicionCuentasService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      observaciones: ['', [Validators.minLength(10)]],
      estadoFinal: ['', Validators.required]
    });

    this.form.valueChanges.subscribe(() => this.actualizarEstadoBotones());
  }

  ngOnInit(): void {
    this.cargarUsuarioActual();

    const id = this.documentoId || this.route.snapshot.paramMap.get('id');
    console.log('📌 ID recibido en ngOnInit:', id);
    console.log('📌 documentoId input:', this.documentoId);
    
    const modo = this.route.snapshot.queryParamMap.get('modo') || 'edicion';
    const soloLecturaParam = this.route.snapshot.queryParamMap.get('soloLectura') === 'true';
    const desdeHistorial = this.route.snapshot.queryParamMap.get('desdeHistorial') === 'true';
    const forceEdit = this.route.snapshot.queryParamMap.get('forceEdit') === 'true';

    this.esModoLectura = forceEdit ? false : (
      soloLecturaParam ||
      modo === 'consulta' ||
      modo === 'lectura' ||
      modo === 'vista' ||
      (desdeHistorial && !forceEdit) ||
      this.forceReadOnly
    );

    if (id) {
      this.cargarDocumento(id);
    } else {
      this.mostrarMensaje('No se recibió ID del documento', 'error');
      this.isLoading = false;
    }

    if (this.esModoLectura || this.estaProcesado) {
      this.form.disable();
    }
  }

  cargarUsuarioActual(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentUserRole = currentUser?.role || '';
  }

  cargarDocumento(id: string): void {
    console.log('📥 ===== INICIANDO CARGA DE DOCUMENTO =====');
    console.log('📥 ID recibido para cargar:', id);
    
    this.isLoading = true;
    
    this.rendicionService.obtenerDetalleRevision(id).subscribe({
      next: (data) => {
        console.log('✅ ===== DOCUMENTO CARGADO EXITOSAMENTE =====');
        console.log('✅ ID de rendición (para decisiones):', data?.id);
        console.log('✅ ID de documento original (para descargas):', data?.documentoId);
        
        this.documento = data;
        
        this.estaProcesado = this.estadosProcesados.includes(
          (data.estado || '').toString().toUpperCase()
        );

        if (this.esModoLectura || this.estaProcesado) {
          this.form.disable();
        }

        let estadoFinal = '';
        const estadoDoc = (data.estado || '').toString().toUpperCase();
        if (estadoDoc === 'APROBADO' || estadoDoc === 'COMPLETADO') estadoFinal = 'APROBADO';
        else if (estadoDoc === 'OBSERVADO') estadoFinal = 'OBSERVADO';
        else if (estadoDoc === 'RECHAZADO') estadoFinal = 'RECHAZADO';

        this.form.patchValue({
          estadoFinal,
          observaciones: data.observaciones || data.observacionesRendicion || ''
        });

        this.actualizarEstadoBotones();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando documento:', err);
        const msg = err.error?.message || err.message || 'No se pudo cargar el documento';
        this.mostrarMensaje(msg, 'error');
        this.isLoading = false;
      }
    });
  }

  descargarCarpeta(): void {
    console.log('📦 Intentando descargar carpeta');
    console.log('📦 ID de documento original (para descargar):', this.documento?.documentoId);
    
    if (!this.documento?.documentoId) {
      this.mostrarMensaje('No hay documento para descargar', 'error');
      return;
    }

    this.isDescargando = true;
    this.mostrarMensaje('Preparando descarga...', 'info');

    // Usar documentoId para descargar (ID del documento original)
    this.rendicionService.descargarCarpeta(this.documento.documentoId).subscribe({
      next: (blob: Blob) => {
        console.log('✅ Archivo recibido, tamaño:', blob.size);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.documento?.numeroRadicado || 'documento'}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.isDescargando = false;
        this.mostrarMensaje('Descarga completada', 'success');
      },
      error: (err) => {
        console.error('❌ Error en descarga:', err);
        const msg = err.error?.message || err.message || 'Error al descargar la carpeta';
        this.mostrarMensaje(msg, 'error');
        this.isDescargando = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.esModoLectura || this.estaProcesado || this.isProcessing || !this.documento) return;

    const estadoFinal = this.form.get('estadoFinal')?.value;
    if (!estadoFinal) {
      this.mostrarMensaje('Selecciona una decisión final', 'error');
      return;
    }

    if ((estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') &&
      (!this.form.value.observaciones?.trim() || this.form.value.observaciones.trim().length < 10)) {
      this.mostrarMensaje('La justificación debe tener al menos 10 caracteres', 'error');
      return;
    }

    this.isProcessing = true;

    const payload = {
      decision: estadoFinal,
      observacion: this.form.value.observaciones?.trim() || ''
    };

    console.log('📤 Enviando decisión:', payload);
    console.log('📤 ID de rendición (para decisión):', this.documento.id);

    // Usar id para la decisión (ID de la rendición)
    this.rendicionService.tomarDecision(this.documento.id, payload).subscribe({
      next: () => {
        this.mostrarMensaje(`Documento marcado como ${estadoFinal} correctamente`, 'success');
        this.isProcessing = false;
        setTimeout(() => this.volverALista(), 1800);
      },
      error: (err) => {
        console.error('❌ Error en decisión:', err);
        const errorMsg = err.error?.message || err.message || 'Error al procesar la decisión';
        this.mostrarMensaje(errorMsg, 'error');
        this.isProcessing = false;
      }
    });
  }

  liberarDocumento(): void {
    if (this.esModoLectura || this.estaProcesado || !this.documento) return;

    this.notificationService.showModal({
      title: 'Liberar documento',
      message: '¿Deseas liberar este documento?\nVolverá a estar disponible para otros usuarios.',
      type: 'confirm',
      confirmText: 'Sí, liberar',
      onConfirm: () => {
        // Usar id para liberar (ID de la rendición)
        this.rendicionService.liberarDocumento(this.documento!.id).subscribe({
          next: () => {
            this.mostrarMensaje('Documento liberado correctamente', 'success');
            setTimeout(() => this.volverALista(), 1500);
          },
          error: (err) => {
            this.mostrarMensaje(err.error?.message || 'Error al liberar el documento', 'error');
          }
        });
      }
    });
  }

  volverALista(): void {
    this.router.navigate(['/rendicion-cuentas/historial']);
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | 'info'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => this.mensaje = '', 5000);
  }

  actualizarEstadoBotones(): void {
    if (this.esModoLectura || this.estaProcesado || this.isProcessing || !this.documento) {
      this.puedeGuardar = false;
      this.puedeLiberar = false;
      return;
    }

    const estadoFinal = this.form.get('estadoFinal')?.value;
    const obs = this.form.value.observaciones?.trim() || '';

    let valido = !!estadoFinal;

    if (estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') {
      valido = valido && obs.length >= 10;
    }

    this.puedeGuardar = valido;
    this.puedeLiberar = true;
  }

  getEstadoBadgeClass(estado: string | undefined): string {
    return this.rendicionService.getEstadoClass(estado || '');
  }

  getEstadoTexto(estado: string | undefined): string {
    return this.rendicionService.getEstadoTexto(estado || '');
  }
}