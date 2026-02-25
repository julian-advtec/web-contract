import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import { AsesorGerenciaService } from '../../../../core/services/asesor-gerencia.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SignatureService, Signature } from '../../../../core/services/signature.service';

import { ContabilidadFormComponent } from '../../../contabilidad/components/contabilidad-form/contabilidad-form.component';
import { SignaturePositionComponent, SignaturePosition } from '../../../signature/components/signature-position/signature-position.component';
import { PdfViewerModalComponent } from '../pdf-viewer-modal/pdf-viewer-modal.component';

@Component({
  selector: 'app-asesor-gerencia-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ContabilidadFormComponent,
    SignaturePositionComponent,
    PdfViewerModalComponent
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



  showPdfModal = false;
  pdfBlob: Blob | null = null;
  pdfModalTitle = '';

  private estadosProcesados = [
    'COMPLETADO_ASESOR_GERENCIA',
    'OBSERVADO_ASESOR_GERENCIA',
    'RECHAZADO_ASESOR_GERENCIA'
  ];

  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'warning' | 'info' = 'info';

  puedeGuardar = false;
  puedeLiberar = false;

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
    public signatureService: SignatureService,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      observaciones: ['', [Validators.minLength(10)]],
      estadoFinal: ['', Validators.required]
    });

    this.form.valueChanges.subscribe(() => this.actualizarEstadoBotones());
    this.form.get('estadoFinal')?.valueChanges.subscribe(() => this.onEstadoFinalChange());
  }


  getNombreArchivoFirmado(path: string | undefined): string {
    if (!path) {
      return 'comprobante_firmado.pdf';
    }
    // Divide por \ o / y toma el último segmento (el nombre del archivo)
    const partes = path.split(/[\\/]/);
    return partes[partes.length - 1] || 'comprobante_firmado.pdf';
  }


ngOnInit(): void {
  this.cargarFirmaUsuario();

  console.log('📌 [AsesorGerenciaForm] ID recibido como @Input:', this.documentoId);
  console.log('📌 [AsesorGerenciaForm] ID desde ruta (si aplica):', this.route.snapshot.paramMap.get('id'));

  // ───────────────────────────────────────────────────────────────
  // Prioridad absoluta: usar @Input cuando existe (modo embebido)
  // Solo fallback a ruta si NO hay input (modo standalone/directo)
  // ───────────────────────────────────────────────────────────────
  let idParaCargar: string | null = null;

  if (this.documentoId) {
    // Caso más común ahora: viene desde rendición o padre
    idParaCargar = this.documentoId;
    console.log('✅ Usando ID desde @Input (prioridad alta):', idParaCargar);
  } else {
    // Modo standalone (URL directa)
    idParaCargar = this.route.snapshot.paramMap.get('id');
    console.log('⚡ Usando ID desde ruta (fallback):', idParaCargar);
  }

  const modo = this.route.snapshot.queryParamMap.get('modo') || 'edicion';
  const soloLecturaParam = this.route.snapshot.queryParamMap.get('soloLectura') === 'true';
  const desdeHistorial = this.route.snapshot.queryParamMap.get('desdeHistorial') === 'true';
  const forceEdit = this.route.snapshot.queryParamMap.get('forceEdit') === 'true';

  // Prioridad: si viene forceEdit=true (continuar revisión), SIEMPRE edición
  this.esModoLectura = forceEdit ? false : (
    soloLecturaParam ||
    modo === 'consulta' ||
    modo === 'lectura' ||
    modo === 'vista' ||
    (desdeHistorial && !forceEdit) ||
    this.forceReadOnly
  );

  console.log('📊 Modo calculado:', {
    esModoLectura: this.esModoLectura,
    forceReadOnly: this.forceReadOnly,
    forceEdit,
    soloLecturaParam,
    desdeHistorial
  });

  if (idParaCargar) {
    console.log('🚀 Cargando documento con ID:', idParaCargar);
    this.cargarDocumento(idParaCargar);
  } else {
    console.error('❌ No hay ID válido para cargar en asesor-gerencia');
    this.mostrarMensaje('No se recibió ID del documento', 'error');
    this.isLoading = false;
  }

  if (this.esModoLectura || this.estaProcesado) {
    this.form.disable();
  } else {
    this.form.enable();  // Asegurar que se habilite si es edición
  }
}

  cargarFirmaUsuario(): void {
    if (this.esModoLectura || this.estaProcesado) return;

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

      // Cargar siempre el comprobante de pago (para edición) y el firmado (para vista)
      this.cargarComprobantePago();
      if (this.documento?.comprobanteFirmadoPath) {
        this.cargarComprobanteFirmado();
      }

      this.actualizarEstadoBotones();

      if (this.esModoLectura || this.estaProcesado) {
        // Modo solo lectura o ya procesado → prioridad absoluta al firmado
        if (this.documento?.comprobanteFirmadoPath) {
          this.cargarComprobanteFirmado();   // ← esto debe asignar a comprobanteBlob
        } else {
          this.comprobanteBlob = null;
          this.comprobanteFile = null;
          console.warn('No hay comprobanteFirmadoPath → no se muestra tarjeta de firmado');
          // Opcional: mostrar un mensaje o card alternativa aquí
        }
      } else {
        // Modo edición → cargamos el original para firmar
        this.cargarComprobantePago();        // ← asigna a comprobanteBlob
      }

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

  cargarComprobantePago(): void {
    if (!this.documento?.id) {
      console.warn('[cargarComprobantePago] No hay documento.id disponible aún');
      return;
    }

    console.log('[cargarComprobantePago] Intentando cargar pagoRealizado para doc:', this.documento.id);

    this.asesorGerenciaService.verArchivo(this.documento.id, 'pagoRealizado').subscribe({
      next: (blob: Blob) => {
        console.log('[cargarComprobantePago] Blob recibido, tamaño:', blob.size);
        this.comprobanteBlob = blob;
        this.comprobanteFile = new File([blob], 'comprobante_pago.pdf', { type: 'application/pdf' });
        this.actualizarEstadoBotones();
        console.log('Comprobante de pago cargado OK → botón debería habilitarse si todo OK');
      },
      error: (err) => {
        console.error('[cargarComprobantePago] Error al cargar pagoRealizado:', err);
        if (err.status === 404) {
          this.mostrarMensaje('El comprobante de pago no está disponible en tesorería', 'warning');
        } else {
          this.mostrarMensaje('Error al cargar el comprobante de pago', 'error');
        }
      }
    });
  }

  cargarComprobanteFirmado(): void {
    if (!this.documento?.id) return;

    console.log('[cargarComprobanteFirmado] Iniciando carga automática del firmado...');

    // ← COMENTA O ELIMINA ESTA PARTE (esto es lo que causa el 404 al cargar la página)
    // this.asesorGerenciaService.verArchivo(this.documento.id, 'comprobanteFirmado').subscribe({
    //   next: (blob: Blob) => {
    //     console.log('[cargarComprobanteFirmado] Firmado cargado automáticamente OK - tamaño:', blob.size);
    //     this.pdfBlobFirmado = blob;  // o lo que uses
    //   },
    //   error: (err) => {
    //     console.error('[cargarComprobanteFirmado] Error carga automática:', err);
    //     // No mostrar mensaje aquí para no molestar al usuario al cargar la página
    //   }
    // });

    // Si quieres, puedes dejar un log para confirmar que ya no se ejecuta
    console.log('[cargarComprobanteFirmado] Carga automática DESACTIVADA - se carga solo al clic en Ver PDF');
  }

  verComprobanteFirmado(): void {
    if (this.esModoLectura || this.estaProcesado) {
      if (!this.documento?.comprobanteFirmadoPath) {
        this.mostrarMensaje('No hay comprobante firmado registrado para este documento', 'warning');
        return;
      }

      console.log('[VER PDF] Solicitando vía endpoint dedicado /comprobante-firmado');

      this.asesorGerenciaService.obtenerComprobanteFirmado(this.documento.id).subscribe({
        next: (blob: Blob) => {
          console.log('[VER PDF] Comprobante firmado cargado OK - tamaño:', blob.size);
          if (blob.size === 0) {
            this.mostrarMensaje('El archivo firmado está vacío', 'warning');
            return;
          }
          this.pdfBlob = blob;
          this.pdfModalTitle = `Comprobante Firmado por Gerencia - ${this.documento.numeroRadicado || 'N/A'}`;
          this.showPdfModal = true;
        },
        error: (err) => {
          console.error('[VER PDF] Error al cargar comprobante firmado:', err);
          if (err.status === 404) {
            this.mostrarMensaje('El comprobante firmado no se encuentra en el servidor (404)', 'error');
          } else {
            this.mostrarMensaje('Error al cargar el comprobante firmado', 'error');
          }
        }
      });
    } else {
      // Modo edición (sin cambios)
      if (!this.comprobanteBlob) {
        this.mostrarMensaje('No hay comprobante disponible para ver', 'warning');
        return;
      }
      this.pdfBlob = this.comprobanteBlob;
      this.pdfModalTitle = `Comprobante para Firma - ${this.documento.numeroRadicado || 'N/A'}`;
      this.showPdfModal = true;
    }
  }

  cerrarModalPdf(): void {
    this.showPdfModal = false;
    this.pdfBlob = null;
  }

  onEstadoFinalChange(): void {
    this.actualizarEstadoBotones();
  }

  onPositionSelected(position: SignaturePosition): void {
    this.firmaPosicion = position;
    this.actualizarEstadoBotones();
  }

  onSubmit(): void {
    if (this.form.invalid || this.esModoLectura || this.estaProcesado || this.isProcessing) return;

    const estadoFinal = this.form.get('estadoFinal')?.value;
    if (!estadoFinal) {
      this.mostrarMensaje('Selecciona una decisión final', 'error');
      return;
    }

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
        this.mostrarMensaje('Espera a que se cargue el comprobante de pago', 'warning');
        return;
      }
    }

    if ((estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') &&
      (!this.form.value.observaciones?.trim() || this.form.value.observaciones.trim().length < 10)) {
      this.mostrarMensaje('La justificación debe tener al menos 10 caracteres', 'error');
      return;
    }

    this.isProcessing = true;

    const payload: any = {
      estadoFinal: estadoFinal,
      observaciones: this.form.value.observaciones?.trim() || ''
    };

    if (estadoFinal === 'APROBADO') {
      payload.signatureId = this.userSignature!.id;
      payload.signaturePosition = this.firmaPosicion;
    }

    this.asesorGerenciaService.finalizarRevision(this.documento.id, payload).subscribe({
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
    if (this.esModoLectura || this.estaProcesado) return;

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
    this.router.navigate(['/asesor-gerencia/historial']);
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

    if (estadoFinal === 'APROBADO') {
      valido = valido && !!this.firmaPosicion && !!this.userSignature?.id && !!this.comprobanteFile;
    }

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