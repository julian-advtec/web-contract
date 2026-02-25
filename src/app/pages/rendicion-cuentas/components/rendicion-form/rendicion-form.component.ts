// src/app/pages/rendicion-cuentas/components/rendicion-form/rendicion-form.component.ts

import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ContabilidadService } from '../../../../core/services/contabilidad.service'; // 👈 CORREGIDO: Importar la clase, no una instancia
import { RendicionCuentasProceso, RendicionCuentasEstado } from '../../../../core/models/rendicion-cuentas.model';

// 👈 IMPORTAR EL COMPONENTE DE ASESOR GERENCIA
import { AsesorGerenciaFormComponent } from '../../../asesor-gerencia/components/asesor-gerencia-form/asesor-gerencia-form.component';

@Component({
  selector: 'app-rendicion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AsesorGerenciaFormComponent  // 👈 AGREGAR A IMPORTS
  ],
  templateUrl: './rendicion-form.component.html',
  styleUrls: ['./rendicion-form.component.scss']
})
export class RendicionFormComponent implements OnInit {
  form: FormGroup;
  documentoNoEncontrado: boolean = false;
  isProcessing = false;
  isDescargando = false;
  isLoading = true;
  documento: any = null;

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
    private authService: AuthService,
    private contabilidadService: ContabilidadService // 👈 CORREGIDO: Usar el tipo correcto
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
    console.log('📥 ID recibido para cargar (rendicionId):', id);

    this.isLoading = true;
    this.documentoNoEncontrado = false;

    this.rendicionService.obtenerDetalleRendicion(id).subscribe({
      next: (data) => {
        console.log('✅ Rendición encontrada:', data);

        this.documento = {
          ...data,
          // ────────────────────────────────────────────────
          // NO USAR rendicionId → el modelo usa 'id'
          // ────────────────────────────────────────────────
          id: data.id || '',                           // ID de la rendición (para decisiones, liberar, etc.)
          documentoId: data.documentoId ||             // ID del documento original (para contabilidad, gerencia, etc.)
            data.documento?.id ||
            data.id || '',

          // Opcional: copiar algunos campos útiles para UI
          numeroRadicado: data.numeroRadicado || data.documento?.numeroRadicado,
          nombreContratista: data.nombreContratista || data.documento?.nombreContratista,
          // ... puedes agregar más si los necesitas
        };

        console.log('→ ID de rendición (this.documento.id):', this.documento.id);
        console.log('→ ID de documento (para hijos):', this.documento.documentoId);

        this.procesarDocumentoCargado(data);
        this.mostrarMensaje('Documento cargado correctamente', 'success');

        // Cargar contabilidad usando el ID correcto
        if (this.documento.documentoId) {
          this.cargarDatosContabilidad(this.documento.documentoId);
        }
      },
      error: (err: any) => {
        console.error('❌ Error cargando rendición:', err);
        const msg = err.error?.message || err.message || 'Error al cargar la rendición';
        this.mostrarMensaje(msg, 'error');
        this.isLoading = false;
      }
    });
  }
  private cargarDatosContabilidad(documentoId: string): void {
    if (!documentoId) {
      console.warn('No hay documentoId válido para cargar contabilidad');
      return;
    }

    console.log('[RendicionForm] Solicitando datos contabilidad con ID:', documentoId);

    this.contabilidadService.obtenerDetalleDocumento(documentoId).subscribe({
      next: (detalle: any) => {
        console.log('✅ Datos contabilidad cargados:', detalle);
        // Aquí puedes guardar o procesar lo que necesites
      },
      error: (err: any) => {
        console.warn('[RendicionForm] Contabilidad no disponible o ya procesada:', err);
        // No mostramos error fuerte porque es común que ya esté finalizado
      }
    });
  }



  descargarCarpeta(): void {
    if (!this.documento?.documentoId) {
      this.mostrarMensaje('No hay documento válido para descargar', 'error');
      return;
    }

    this.isDescargando = true;
    this.mostrarMensaje('Preparando descarga de carpeta...', 'info');

    this.rendicionService.descargarCarpeta(this.documento.documentoId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.documento?.numeroRadicado || 'contrato'}_completo.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.isDescargando = false;
        this.mostrarMensaje('Descarga completada', 'success');
      },
      error: (err: any) => {
        const msg = err.error?.message || 'Error al descargar la carpeta completa';
        this.mostrarMensaje(msg, 'error');
        this.isDescargando = false;
      }
    });
  }

  // Envío de decisión
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

    this.rendicionService.tomarDecision(this.documento.rendicionId || this.documento.id, payload).subscribe({
      next: () => {
        this.mostrarMensaje(`Documento marcado como ${estadoFinal} correctamente`, 'success');
        this.isProcessing = false;
        setTimeout(() => this.volverALista(), 1800);
      },
      error: (err: any) => {
        const msg = err.error?.message || 'Error al procesar la decisión';
        this.mostrarMensaje(msg, 'error');
        this.isProcessing = false;
      }
    });
  }

  // Liberar documento
  liberarDocumento(): void {
    if (this.esModoLectura || this.estaProcesado || !this.documento) return;

    this.notificationService.showModal({
      title: 'Liberar documento',
      message: '¿Deseas liberar este documento?\nVolverá a estar disponible para otros usuarios.',
      type: 'confirm',
      confirmText: 'Sí, liberar',
      onConfirm: () => {
        this.rendicionService.liberarDocumento(this.documento.rendicionId || this.documento.id).subscribe({
          next: () => {
            this.mostrarMensaje('Documento liberado correctamente', 'success');
            setTimeout(() => this.volverALista(), 1500);
          },
          error: (err: any) => {
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

  muestraSeccionGerencia(): boolean {
    if (!this.documento?.estado) return false;

    const estado = (this.documento.estado || '').toUpperCase();

    // Mostrar solo si el documento NO ha pasado completamente por gerencia
    // Ajusta según tus estados reales
    return !(
      estado.includes('RENDICION') ||
      estado.includes('APROBADO_RENDICION') ||
      estado.includes('COMPLETADO') ||
      estado.includes('FINALIZADO') ||
      estado.includes('CERRADO') ||
      this.estaProcesado
    );
  }

  // Agrega estos métodos a la clase RendicionFormComponent

  /**
   * Verifica si el estado actual es APROBADO o RECHAZADO
   * (para mostrar la vista de decisión en modo lectura)
   */
  esEstadoAprobadoORechazado(): boolean {
    if (!this.documento?.estado) return false;

    const estado = this.documento.estado.toString().toUpperCase();
    return estado === 'APROBADO' ||
      estado === 'RECHAZADO' ||
      estado === 'APROBADO_RENDICION' ||
      estado === 'RECHAZADO_RENDICION' ||
      estado === 'COMPLETADO';
  }

  /**
   * Verifica si el estado actual es EN_REVISION o similar
   * (para mostrar el formulario de edición)
   */
  esEstadoEnRevision(): boolean {
    if (!this.documento?.estado) return false;

    const estado = this.documento.estado.toString().toUpperCase();
    return estado.includes('EN_REVISION') ||
      estado === 'PENDIENTE' ||
      estado === 'ASIGNADO';
  }

  /**
   * Actualiza el método procesarDocumentoCargado para manejar mejor los estados
   */
  private procesarDocumentoCargado(data: any): void {
    // Determinar si está procesado (estados finales)
    this.estaProcesado = this.estadosProcesados.includes(
      (data.estado || '').toString().toUpperCase()
    );

    // Si el estado es APROBADO o RECHAZADO, forzar modo lectura
    if (this.esEstadoAprobadoORechazado()) {
      this.esModoLectura = true;
    }

    if (this.esModoLectura || this.estaProcesado) {
      this.form.disable();
    }

    let estadoFinal = '';
    const estadoDoc = (data.estado || '').toString().toUpperCase();

    if (estadoDoc === 'APROBADO' || estadoDoc === 'COMPLETADO' || estadoDoc === 'APROBADO_RENDICION')
      estadoFinal = 'APROBADO';
    else if (estadoDoc === 'OBSERVADO' || estadoDoc === 'OBSERVADO_RENDICION')
      estadoFinal = 'OBSERVADO';
    else if (estadoDoc === 'RECHAZADO' || estadoDoc === 'RECHAZADO_RENDICION')
      estadoFinal = 'RECHAZADO';

    this.form.patchValue({
      estadoFinal,
      observaciones: data.observaciones || data.observacionesRendicion || ''
    });

    this.actualizarEstadoBotones();
    this.isLoading = false;
  }
}