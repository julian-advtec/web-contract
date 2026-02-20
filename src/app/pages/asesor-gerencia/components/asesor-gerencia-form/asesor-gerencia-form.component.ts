import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Servicios
import { AsesorGerenciaService } from '../../../../core/services/asesor-gerencia.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SignatureService, Signature } from '../../../../core/services/signature.service';

// Componentes
import { ContabilidadFormComponent } from '../../../contabilidad/components/contabilidad-form/contabilidad-form.component';
import { SignaturePositionComponent, SignaturePosition } from '../../../signature/components/signature-position/signature-position.component';

@Component({
  selector: 'app-asesor-gerencia-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ContabilidadFormComponent,
    SignaturePositionComponent
  ],
  templateUrl: './asesor-gerencia-form.component.html',
  styleUrls: ['./asesor-gerencia-form.component.scss']
})
export class AsesorGerenciaFormComponent implements OnInit {
  form: FormGroup;

  isProcessing = false;
  isLoading = true;
  documento: any = null;

  esModoLectura = false;
  estaProcesado = false;

  @Input() documentoId: string | null = null;
  @Input() forceReadOnly: boolean = false;

  comprobanteBlob: Blob | null = null;
  comprobanteFile: File | null = null;

  private estadosProcesados = [
    'COMPLETADO_ASESOR_GERENCIA',
    'OBSERVADO_ASESOR_GERENCIA',
    'RECHAZADO_ASESOR_GERENCIA'
  ];

  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'warning' | 'info' = 'info';

  puedeGuardar = false;
  puedeLiberar = false;

  // Datos de firma
  currentUserRole: string = '';
  userSignature: Signature | null = null;
  firmaPosicion: SignaturePosition | null = null;
  tieneFirma = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private asesorGerenciaService: AsesorGerenciaService,
    private notificationService: NotificationService,
    private authService: AuthService,
    public signatureService: SignatureService
  ) {
    this.form = this.fb.group({
      observaciones: ['', [Validators.minLength(10)]],
      estadoFinal: ['', Validators.required]
    });

    // Suscripciones para actualizar estado de botones en tiempo real
    this.form.valueChanges.subscribe(() => this.actualizarEstadoBotones());
    this.form.get('estadoFinal')?.valueChanges.subscribe(() => this.onEstadoFinalChange());
  }

  ngOnInit(): void {
    this.cargarFirmaUsuario();

    const id = this.documentoId || this.route.snapshot.paramMap.get('id');
    const modo = this.route.snapshot.queryParamMap.get('modo') || 'edicion';
    const soloLecturaParam = this.route.snapshot.queryParamMap.get('soloLectura') === 'true';

    this.esModoLectura = soloLecturaParam || modo === 'consulta' || modo === 'lectura' || this.forceReadOnly;

    if (id) {
      this.cargarDocumento(id);
    } else {
      this.mostrarMensaje('No se recibió ID del documento', 'error');
      this.isLoading = false;
    }
  }

  /**
   * Carga la firma registrada del usuario actual
   */
  cargarFirmaUsuario(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.tieneFirma = false;
      this.actualizarEstadoBotones();
      return;
    }

    this.currentUserRole = currentUser.role;

    if (!this.signatureService.canRoleHaveSignature(currentUser.role)) {
      this.tieneFirma = false;
      this.actualizarEstadoBotones();
      return;
    }

    this.signatureService.getMySignature().subscribe({
      next: (signature) => {
        this.userSignature = signature;
        this.tieneFirma = !!signature && !!signature.id && !!signature.name;
        this.actualizarEstadoBotones();
      },
      error: () => {
        this.tieneFirma = false;
        this.actualizarEstadoBotones();
      }
    });
  }

  /**
   * Carga los datos del documento y decide si está en modo lectura/procesado
   */
  async cargarDocumento(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const respuesta = await this.asesorGerenciaService.obtenerDetalleRevision(id).toPromise();
      this.documento = respuesta?.data || respuesta?.documento || respuesta || null;

      if (!this.documento) {
        throw new Error('Documento no encontrado o sin acceso');
      }

      this.estaProcesado = this.estadosProcesados.includes(
        this.documento.estado?.toUpperCase() || ''
      );

      if (this.esModoLectura || this.estaProcesado) {
        this.form.disable();
      }

      // Preseleccionar estado si ya fue procesado
      let estadoFinal = '';
      const estadoDoc = this.documento.estado?.toUpperCase() || '';
      if (estadoDoc === 'COMPLETADO_ASESOR_GERENCIA') estadoFinal = 'APROBADO';
      else if (estadoDoc === 'OBSERVADO_ASESOR_GERENCIA') estadoFinal = 'OBSERVADO';
      else if (estadoDoc === 'RECHAZADO_ASESOR_GERENCIA') estadoFinal = 'RECHAZADO';

      this.form.patchValue({
        estadoFinal,
        observaciones: this.documento.observacionesGerencia ||
                       this.documento.observaciones ||
                       this.documento.observacion || ''
      });

      // Cargar comprobante para mostrar selector de firma
      this.cargarComprobantePago();

      this.actualizarEstadoBotones();

    } catch (err: any) {
      const msg = err.error?.message || err.message || 'No se pudo cargar el documento';
      this.mostrarMensaje(msg, 'error');
      if (msg.toLowerCase().includes('no encontrado') || msg.toLowerCase().includes('acceso')) {
        setTimeout(() => this.volverALista(), 3000);
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Carga el blob del comprobante de pago y lo convierte en File para el selector de firma
   */
  cargarComprobantePago(): void {
    if (!this.documento?.id) return;

    this.asesorGerenciaService.verArchivo(this.documento.id, 'pagoRealizado').subscribe({
      next: (blob: Blob) => {
        this.comprobanteBlob = blob;
        this.comprobanteFile = new File([blob], 'comprobante_pago.pdf', { type: 'application/pdf' });
        console.log('Comprobante cargado correctamente - selector de firma activo');
      },
      error: (err) => {
        console.error('Error al cargar comprobante de pago:', err);
        this.mostrarMensaje('No se pudo cargar el comprobante de pago de tesorería', 'warning');
      }
    });
  }

  onEstadoFinalChange(): void {
    this.actualizarEstadoBotones();
  }

  onPositionSelected(position: SignaturePosition): void {
    this.firmaPosicion = position;
    this.actualizarEstadoBotones();
  }

  /**
   * Envía la decisión final al backend
   */
  onSubmit(): void {
    if (this.form.invalid || this.esModoLectura || this.estaProcesado) return;

    const estadoFinal = this.form.get('estadoFinal')?.value;
    if (!estadoFinal) {
      this.mostrarMensaje('Selecciona una decisión final', 'error');
      return;
    }

    // Validación estricta para APROBADO
    if (estadoFinal === 'APROBADO') {
      if (!this.firmaPosicion) {
        this.mostrarMensaje('Debes seleccionar la posición de la firma para aprobar', 'error');
        return;
      }
      if (!this.tieneFirma || !this.userSignature?.id) {
        this.mostrarMensaje('No tienes una firma registrada en el sistema', 'error');
        return;
      }
      if (!this.comprobanteFile) {
        this.mostrarMensaje('No hay comprobante de pago disponible para firmar', 'error');
        return;
      }
    }

    // Validación para OBSERVADO o RECHAZADO
    if ((estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') &&
        (!this.form.value.observaciones?.trim() || this.form.value.observaciones.trim().length < 10)) {
      this.mostrarMensaje('La justificación debe tener al menos 10 caracteres', 'error');
      return;
    }

    this.isProcessing = true;

    const formData = new FormData();
    formData.append('observaciones', this.form.value.observaciones?.trim() || '');
    formData.append('estadoFinal', estadoFinal);

    // Solo enviamos firma si es APROBADO
    if (estadoFinal === 'APROBADO' && this.firmaPosicion && this.userSignature?.id) {
      formData.append('signatureId', this.userSignature.id);
      formData.append('signaturePosition', JSON.stringify(this.firmaPosicion));
    }

    this.asesorGerenciaService.finalizarRevision(this.documento.id, formData).subscribe({
      next: (response) => {
        this.mostrarMensaje(`Documento marcado como ${estadoFinal} correctamente`, 'success');
        this.isProcessing = false;
        setTimeout(() => this.volverALista(), 1800);
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.message || 'Error al procesar la decisión';
        this.mostrarMensaje(errorMsg, 'error');
        this.isProcessing = false;
      }
    });
  }

  liberarDocumento(): void {
    this.notificationService.showModal({
      title: 'Liberar documento',
      message: '¿Deseas liberar este documento?\nVolverá a estar disponible para otros asesores.',
      type: 'confirm',
      confirmText: 'Sí, liberar',
      onConfirm: () => {
        this.asesorGerenciaService.liberarDocumento(this.documento.id).subscribe({
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
    this.router.navigate(['/asesor-gerencia/pendientes']);
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | 'info'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => this.mensaje = '', 5000);
  }

  /**
   * Actualiza el estado de los botones Guardar y Liberar según validaciones
   */
  actualizarEstadoBotones(): void {
    if (this.esModoLectura || this.estaProcesado || this.isProcessing) {
      this.puedeGuardar = false;
      this.puedeLiberar = false;
      return;
    }

    const estadoFinal = this.form.get('estadoFinal')?.value;
    const obs = this.form.value.observaciones?.trim() || '';

    let valido = !!estadoFinal;

    // Regla estricta para APROBADO
    if (estadoFinal === 'APROBADO') {
      valido = valido && !!this.firmaPosicion && !!this.userSignature?.id && !!this.comprobanteFile;
    }

    // Regla para OBSERVADO / RECHAZADO
    if (estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') {
      valido = valido && obs.length >= 10;
    }

    this.puedeGuardar = valido;
    this.puedeLiberar = !!this.documento && !this.estaProcesado;
  }

  getEstadoBadgeClass(estado: string): string {
    const u = (estado || '').toUpperCase();
    if (u.includes('COMPLETADO')) return 'bg-success';
    if (u.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (u.includes('RECHAZADO')) return 'bg-danger';
    return 'bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    const u = (estado || '').toUpperCase();
    if (u.includes('COMPLETADO_ASESOR_GERENCIA')) return 'APROBADO';
    if (u.includes('OBSERVADO_ASESOR_GERENCIA')) return 'OBSERVADO';
    if (u.includes('RECHAZADO_ASESOR_GERENCIA')) return 'RECHAZADO';
    return 'PENDIENTE';
  }
}