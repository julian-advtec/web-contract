import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

// Componentes de flujo
import { SupervisorFormComponent } from '../../../supervisor/components/supervisor-form/supervisor-form.component';
import { AuditorFormComponent } from '../../../auditor/components/auditor-form/auditor-form.component';
import { ContabilidadFormComponent } from '../../../contabilidad/components/contabilidad-form/contabilidad-form.component';

// Servicios
import { TesoreriaService } from '../../../../core/services/tesoreria.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SignatureService, Signature } from '../../../../core/services/signature.service';

// Componentes de firma
import { SignaturePadComponent } from '../../../signature/components/signature-pad/signature-pad.component';
import { SignaturePositionComponent, SignaturePosition } from '../../../signature/components/signature-position/signature-position.component';

// Modal PDF
import { PdfViewerModalComponent } from '../pdf-viewer-modal/pdf-viewer-modal.component';

@Component({
  selector: 'app-tesoreria-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SupervisorFormComponent,
    AuditorFormComponent,
    ContabilidadFormComponent,
    SignaturePadComponent,
    SignaturePositionComponent,
    PdfViewerModalComponent
  ],
  templateUrl: './tesoreria-form.component.html',
  styleUrls: ['./tesoreria-form.component.scss']
})
export class TesoreriaFormComponent implements OnInit {
  form: FormGroup = this.fb.group({
    observaciones: ['', [Validators.minLength(10)]],
    estadoFinal: ['', Validators.required]
  });

  isProcessing = false;
  isLoading = true;
  documento: any = null;

  esModoLectura = false;
  estaProcesado = false;

  archivoSeleccionado: File | null = null;
  urlPrevisualizacion: SafeUrl | null = null;

  // Modal PDF
  showPdfModal = false;
  pdfBlob: Blob | null = null;
  pdfModalTitle = '';

  private estadosProcesados = [
    'COMPLETADO_TESORERIA',
    'OBSERVADO_TESORERIA',
    'RECHAZADO_TESORERIA'
  ];

  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'warning' | 'info' = 'info';

  puedeGuardar = false;
  puedeLiberar = false;

  // Propiedades para firma digital
  currentUserRole: string = '';
  userSignature: Signature | null = null;
  mostrarSelectorPosicion = false;
  firmaPosicion: SignaturePosition | null = null;
  tieneFirma = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private tesoreriaService: TesoreriaService,
    private notificationService: NotificationService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    public signatureService: SignatureService
  ) {
    this.form.valueChanges.subscribe(() => this.actualizarEstadoBotones());
    this.form.get('estadoFinal')?.valueChanges.subscribe(() => {
      console.log('🎯 valueChanges detectado');
      this.onEstadoFinalChange();
    });
  }

  ngOnInit(): void {
    this.cargarFirmaUsuario();
    
    const id = this.route.snapshot.paramMap.get('id');
    const modo = this.route.snapshot.queryParamMap.get('modo') || 'edicion';
    const soloLecturaParam = this.route.snapshot.queryParamMap.get('soloLectura') === 'true';
    const desdeHistorial = this.route.snapshot.queryParamMap.get('desdeHistorial') === 'true';

    console.log('[TESORERIA FORM] Inicializando con params:', { id, modo, soloLecturaParam, desdeHistorial });

    // Forzar modo lectura si viene del historial o está procesado
    this.esModoLectura = soloLecturaParam || 
                         this.estaProcesado || 
                         modo === 'consulta' || 
                         modo === 'lectura' || 
                         modo === 'vista';

    if (id) {
      this.cargarDocumento(id);
    } else {
      this.mostrarMensaje('No se recibió ID del documento', 'error');
      this.isLoading = false;
    }

    // Si viene desde historial y modo lectura → deshabilitar todo
    if (desdeHistorial && this.esModoLectura) {
      this.form.disable();
      this.esModoLectura = true;
      console.log('[TESORERIA FORM] Modo SOLO LECTURA forzado desde historial');
    }

    // Escuchar cambios en estadoFinal
    this.form.get('estadoFinal')?.valueChanges.subscribe(() => {
      this.onEstadoFinalChange();
    });
  }

  /**
   * Cargar firma del usuario
   */
  cargarFirmaUsuario(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.warn('[Firma] No hay usuario autenticado');
      this.tieneFirma = false;
      this.userSignature = null;
      return;
    }

    this.currentUserRole = currentUser.role;

    if (!this.signatureService.canRoleHaveSignature(currentUser.role)) {
      console.log(`[Firma] Rol ${currentUser.role} no puede tener firma`);
      this.tieneFirma = false;
      this.userSignature = null;
      return;
    }

    this.signatureService.getMySignature().subscribe({
      next: (signature) => {
        console.log('[Firma] Respuesta directa del servicio:', signature);

        this.userSignature = signature;
        
        // Validación estricta
        this.tieneFirma = !!signature && 
                          !!signature.id && 
                          !!signature.name && 
                          (signature.type === 'pdf' || signature.type === 'image');

        console.log('[Firma] Cargada correctamente:', {
          id: signature?.id,
          name: signature?.name,
          type: signature?.type,
          mimeType: signature?.mimeType,
          fileSize: signature?.fileSize,
          tieneIdValido: !!signature?.id,
          tieneFirmaFinal: this.tieneFirma
        });

        this.actualizarEstadoBotones();
      },
      error: (err) => {
        console.error('[Firma] Error al cargar firma:', err);
        this.tieneFirma = false;
        this.userSignature = null;
        this.mostrarMensaje('No se pudo cargar tu firma registrada', 'warning');
        this.actualizarEstadoBotones();
      }
    });
  }

  /**
   * Cuando cambia el estado final
   */
  onEstadoFinalChange(): void {
    const estado = this.form.get('estadoFinal')?.value;
    console.log('[Estado] Cambio a:', estado);

    if (estado === 'PAGADO') {
      console.log('[Firma Debug] Estado PAGADO - chequeo actual:', {
        tieneFirma: this.tieneFirma,
        userSignature: this.userSignature,
        tieneId: !!this.userSignature?.id,
        archivo: !!this.archivoSeleccionado
      });

      if (!this.archivoSeleccionado) {
        console.log('[Firma] PAGADO seleccionado pero sin archivo → ocultando selector');
        this.mostrarSelectorPosicion = false;
        this.firmaPosicion = null;
      } else if (!this.tieneFirma || !this.userSignature?.id) {
        console.warn('[Firma] PAGADO seleccionado pero NO hay firma válida');
        this.mostrarSelectorPosicion = false;
        this.firmaPosicion = null;
        this.mostrarMensaje('Debes tener una firma registrada y con ID válido para marcar como PAGADO con firma', 'warning');
      } else {
        console.log('[Firma] Mostrando selector de posición para firma');
        this.mostrarSelectorPosicion = true;
      }
    } else {
      this.mostrarSelectorPosicion = false;
      this.firmaPosicion = null;
    }

    this.actualizarEstadoBotones();
  }

  async cargarDocumento(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const respuesta = await this.tesoreriaService.obtenerDetallePago(id).toPromise();

      this.documento = respuesta?.documento || respuesta?.data?.documento || respuesta || null;

      if (!this.documento) {
        throw new Error('Documento no encontrado o no tienes acceso');
      }

      this.estaProcesado = this.estadosProcesados.includes(
        this.documento.estado?.toUpperCase() || ''
      );

      if (this.esModoLectura || this.estaProcesado) {
        this.form.disable();
      }

      let estadoFinal = '';
      const estadoDoc = this.documento.estado?.toUpperCase() || '';
      if (estadoDoc === 'COMPLETADO_TESORERIA') estadoFinal = 'PAGADO';
      else if (estadoDoc === 'OBSERVADO_TESORERIA') estadoFinal = 'OBSERVADO';
      else if (estadoDoc === 'RECHAZADO_TESORERIA') estadoFinal = 'RECHAZADO';

      this.form.patchValue({
        estadoFinal,
        observaciones: this.documento.observacionesTesoreria ||
          this.documento.observaciones ||
          this.documento.observacion || ''
      });

      this.actualizarEstadoBotones();

    } catch (err: any) {
      console.error('❌ Error cargando documento:', err);
      const msg = err.error?.message || err.message || 'No se pudo cargar el documento';
      this.mostrarMensaje(msg, 'error');

      if (msg.toLowerCase().includes('no encontrado') || msg.toLowerCase().includes('acceso')) {
        setTimeout(() => this.volverALista(), 3000);
      }
    } finally {
      this.isLoading = false;
    }
  }

  onFileSelected(event: any): void {
    if (this.esModoLectura || this.estaProcesado) return;
    const file = event.target.files?.[0];
    if (file) {
      this.procesarArchivo(file);
      this.onEstadoFinalChange();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.esModoLectura || this.estaProcesado) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.procesarArchivo(file);
      this.onEstadoFinalChange();
    }
  }

  procesarArchivo(file: File): void {
    console.log('📁 Procesando archivo:', file.name, file.type);
    if (file.size > 15 * 1024 * 1024) {
      this.mostrarMensaje('Archivo muy grande (máximo 15MB)', 'error');
      return;
    }

    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowed.includes(file.type)) {
      this.mostrarMensaje('Formato no permitido (PDF, JPG, PNG, DOC, DOCX)', 'error');
      return;
    }

    this.archivoSeleccionado = file;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.urlPrevisualizacion = this.sanitizer.bypassSecurityTrustUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      this.urlPrevisualizacion = null;
    }
    this.onEstadoFinalChange();
    this.actualizarEstadoBotones();
  }

  eliminarArchivo(): void {
    this.archivoSeleccionado = null;
    this.urlPrevisualizacion = null;
    this.firmaPosicion = null;
    this.mostrarSelectorPosicion = false;
    this.actualizarEstadoBotones();
  }

  esImagen(file: File | null): boolean {
    return file?.type.startsWith('image/') ?? false;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Guardar posición seleccionada
   */
  onPositionSelected(position: SignaturePosition): void {
    this.firmaPosicion = position;
    console.log('[Firma] Posición seleccionada por el usuario:', position);
    this.actualizarEstadoBotones();
  }

  /**
   * Cerrar selector de posición
   */
  cerrarSelectorPosicion(): void {
    this.mostrarSelectorPosicion = false;
    this.firmaPosicion = null;
  }

  onSubmit(): void {
    if (this.form.invalid || this.esModoLectura || this.estaProcesado) {
      this.mostrarMensaje('Formulario inválido o modo no permitido', 'error');
      return;
    }

    const estadoFinal = this.form.get('estadoFinal')?.value;
    if (!estadoFinal) {
      this.mostrarMensaje('Selecciona una decisión final', 'error');
      return;
    }

    // Validaciones específicas por estado
    if (estadoFinal === 'PAGADO') {
      if (!this.archivoSeleccionado) {
        this.mostrarMensaje('Obligatorio subir comprobante para PAGADO', 'error');
        return;
      }

      // Validación crítica de firma
      if (this.tieneFirma && !this.userSignature?.id) {
        this.mostrarMensaje('Error interno: Firma marcada como existente pero ID inválido', 'error');
        return;
      }

      if (this.tieneFirma && !this.firmaPosicion) {
        this.mostrarMensaje('Debes seleccionar la posición donde colocar la firma', 'warning');
        return;
      }
    }

    if ((estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') &&
        (!this.form.value.observaciones?.trim() || this.form.value.observaciones.trim().length < 10)) {
      this.mostrarMensaje('Justificación mínima de 10 caracteres requerida', 'error');
      return;
    }

    this.isProcessing = true;

    const formData = new FormData();
    if (this.archivoSeleccionado) {
      formData.append('pagoRealizado', this.archivoSeleccionado);
    }
    formData.append('observaciones', this.form.value.observaciones?.trim() || '');
    formData.append('estadoFinal', estadoFinal);

    // Solo enviamos firma si TODO está correcto
    if (this.userSignature?.id && this.firmaPosicion) {
      console.log('✅ Enviando firma digital:', {
        signatureId: this.userSignature.id,
        position: this.firmaPosicion
      });
      formData.append('signatureId', this.userSignature.id);
      formData.append('signaturePosition', JSON.stringify(this.firmaPosicion));
    } else if (estadoFinal === 'PAGADO' && this.tieneFirma) {
      console.warn('⚠️ PAGADO pero NO se envía firma (falta ID o posición)');
    }

    this.tesoreriaService.procesarPago(this.documento.id, formData).subscribe({
      next: (response) => {
        console.log('✅ Pago procesado:', response);
        this.mostrarMensaje(`Documento marcado como ${estadoFinal} correctamente`, 'success');
        this.isProcessing = false;
        setTimeout(() => this.volverALista(), 1800);
      },
      error: (err) => {
        console.error('❌ Error procesando pago:', err);
        this.mostrarMensaje(err.error?.message || 'Error al procesar el documento', 'error');
        this.isProcessing = false;
      }
    });
  }

  liberarDocumento(): void {
    if (!this.documento?.id) {
      this.mostrarMensaje('No hay documento para liberar', 'error');
      return;
    }

    this.notificationService.showModal({
      title: 'Liberar documento',
      message: '¿Deseas liberar este documento?\nVolverá a estar disponible para otros tesoreros.',
      type: 'confirm',
      confirmText: 'Sí, liberar',
      onConfirm: () => {
        this.tesoreriaService.liberarDocumento(this.documento.id).subscribe({
          next: (response) => {
            console.log('✅ Documento liberado:', response);
            this.mostrarMensaje('Documento liberado correctamente', 'success');
            setTimeout(() => this.volverALista(), 1500);
          },
          error: (err) => {
            console.error('❌ Error al liberar:', err);
            this.mostrarMensaje(err.error?.message || err.message || 'Error al liberar', 'error');
          }
        });
      }
    });
  }

  volverALista(): void {
    this.router.navigate(['/tesoreria/pendientes']);
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | 'info'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => this.mensaje = '', 5000);
  }

  actualizarEstadoBotones(): void {
    if (this.esModoLectura || this.estaProcesado || this.isProcessing) {
      this.puedeGuardar = false;
      this.puedeLiberar = false;
      return;
    }

    const estadoFinal = this.form.get('estadoFinal')?.value;
    const obs = this.form.value.observaciones?.trim() || '';

    let valido = !!estadoFinal;

    if (estadoFinal === 'PAGADO') {
      valido = valido && !!this.archivoSeleccionado;
      // Si el rol requiere firma y dice que la tiene, debe tener posición
      if (this.tieneFirma) {
        valido = valido && !!this.firmaPosicion && !!this.userSignature?.id;
      }
    }

    if (estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') {
      valido = valido && obs.length >= 10;
    }

    this.puedeGuardar = valido;
    this.puedeLiberar = !!this.documento;
  }

  getEstadoPagoBadgeClass(estado: string): string {
    const u = (estado || '').toUpperCase();
    if (u.includes('COMPLETADO') || u.includes('PAGADO')) return 'badge bg-success';
    if (u.includes('OBSERVADO')) return 'badge bg-warning';
    if (u.includes('RECHAZADO')) return 'badge bg-danger';
    return 'badge bg-secondary';
  }

  getEstadoTexto(estado: string): string {
    const u = (estado || '').toUpperCase();
    if (u.includes('COMPLETADO_TESORERIA') || u.includes('PAGADO')) return 'PAGADO';
    if (u.includes('OBSERVADO_TESORERIA')) return 'OBSERVADO';
    if (u.includes('RECHAZADO_TESORERIA')) return 'RECHAZADO';
    return 'PENDIENTE';
  }

  verComprobantePago(): void {
    if (!this.documento?.id) return;

    this.isProcessing = true;
    const path = this.documento.pagoRealizadoPath || this.documento.comprobantePagoPath;

    if (!path) {
      this.notificationService.warning('Sin archivo', 'No hay comprobante de pago registrado');
      this.isProcessing = false;
      return;
    }

    this.tesoreriaService.verArchivoPago(this.documento.id)
      .subscribe({
        next: (blob: Blob) => {
          if (blob.type === 'application/pdf') {
            this.pdfBlob = blob;
            this.pdfModalTitle = `Comprobante - ${this.documento.numeroRadicado}`;
            this.showPdfModal = true;
          } else {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 120000);
          }
          this.isProcessing = false;
        },
        error: (err) => {
          console.error('Error al ver comprobante:', err);
          this.notificationService.error('Error', 'No se pudo abrir el comprobante');
          this.isProcessing = false;
        }
      });
  }

  descargarComprobantePago(): void {
    if (!this.documento?.id) return;

    this.isProcessing = true;
    const path = this.documento.pagoRealizadoPath || this.documento.comprobantePagoPath;
    const nombre = path?.split('/').pop() || 'comprobante_pago.pdf';

    this.tesoreriaService.descargarArchivoPago(this.documento.id)
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombre;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.isProcessing = false;
          this.notificationService.success('Descargado', 'Comprobante descargado');
        },
        error: (err) => {
          console.error('Error al descargar comprobante:', err);
          this.notificationService.error('Error', 'No se pudo descargar el comprobante');
          this.isProcessing = false;
        }
      });
  }

  verArchivoPago(): void {
    if (!this.documento?.id) {
      this.notificationService.warning('Sin documento', 'No hay ID para consultar');
      return;
    }

    this.isProcessing = true;

    this.tesoreriaService.verArchivoPago(this.documento.id)
      .subscribe({
        next: (blob: Blob) => {
          if (blob.type === 'application/pdf') {
            this.pdfBlob = blob;
            this.pdfModalTitle = `Comprobante - ${this.documento.numeroRadicado}`;
            this.showPdfModal = true;
          } else {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 120000);
          }
          this.isProcessing = false;
        },
        error: (err) => {
          console.error('Error al ver pago:', err);
          this.notificationService.error('Error', 'No se pudo abrir el comprobante');
          this.isProcessing = false;
        }
      });
  }

  cerrarModalPdf(): void {
    this.showPdfModal = false;
    this.pdfBlob = null;
  }

  
}