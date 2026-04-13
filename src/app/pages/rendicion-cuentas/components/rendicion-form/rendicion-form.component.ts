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

    let idParaCargar = this.documentoId;
    if (!idParaCargar) {
      idParaCargar = this.route.snapshot.paramMap.get('id');
    }

    const id = idParaCargar;
    const modo = this.route.snapshot.queryParamMap.get('modo') || 'edicion';
    const soloLecturaParam = this.route.snapshot.queryParamMap.get('soloLectura') === 'true';
    const desdeHistorial = this.route.snapshot.queryParamMap.get('desdeHistorial') === 'true';
    const forceEdit = this.route.snapshot.queryParamMap.get('forceEdit') === 'true';

    // ✅ TEMPORAL: Forzar edición para debug (después lo ajustas)
    // this.esModoLectura = false;  // ← DESCOMENTAR PARA FORZAR EDICIÓN

    this.esModoLectura = forceEdit ? false : (
      soloLecturaParam ||
      (modo === 'consulta') ||
      (modo === 'lectura') ||
      (modo === 'vista') ||
      (desdeHistorial && !forceEdit) ||
      this.forceReadOnly
    );

    console.log('🔍 Modo calculado:', {
      modo,
      soloLecturaParam,
      desdeHistorial,
      forceEdit,
      esModoLectura: this.esModoLectura
    });

    if (id) {
      this.cargarDocumento(id);
    } else {
      this.mostrarMensaje('No se recibió ID del documento', 'error');
      this.isLoading = false;
    }
  }

  cargarUsuarioActual(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentUserRole = currentUser?.role || '';
  }

  // rendicion-form.component.ts

  cargarDocumento(id: string): void {
    console.log('📥 ID recibido para cargar:', id);
    this.isLoading = true;

    // ✅ PRIMERO intentar como rendiciónId (que es lo que recibes del historial)
    this.rendicionService.obtenerDetalleRendicion(id).subscribe({
      next: (data) => {
        console.log('✅ Es rendiciónId, cargando rendición:', data);
        this.procesarRendicion(data);
        this.isLoading = false;
      },
      error: (err) => {
        // Si falla, intentar como documentoId
        console.log('⚠️ No es rendiciónId, intentando como documentoId...');
        this.contabilidadService.obtenerDetalleDocumento(id).subscribe({
          next: (data) => {
            console.log('✅ Es documentoId, cargando documento:', data);
            this.procesarDocumentoOriginal(data);
            this.isLoading = false;
          },
          error: (err2) => {
            console.error('❌ Error cargando:', err2);
            this.mostrarMensaje('No se pudo cargar el documento', 'error');
            this.isLoading = false;
          }
        });
      }
    });
  }

private procesarRendicion(data: any): void {
  const rendicionData = data.data || data;
  
  this.documento = {
    ...rendicionData,
    id: rendicionData.id,
    rendicionId: rendicionData.id,  // ← Este es el ID de la rendición
    documentoId: rendicionData.documento?.id || rendicionData.documentoId,
    numeroRadicado: rendicionData.numeroRadicado || rendicionData.documento?.numeroRadicado,
    nombreContratista: rendicionData.nombreContratista || rendicionData.documento?.nombreContratista,
    numeroContrato: rendicionData.numeroContrato || rendicionData.documento?.numeroContrato,
    documentoContratista: rendicionData.documentoContratista || rendicionData.documento?.documentoContratista,
    estado: rendicionData.estado || rendicionData.documento?.estado,
    observacionesRendicion: rendicionData.observaciones || rendicionData.observacionesRendicion,
    fechaCreacion: rendicionData.fechaCreacion,
    fechaActualizacion: rendicionData.fechaActualizacion,
    // ✅ Guardar ambos IDs para referencia
    rendicionIdOriginal: rendicionData.id,
    documentoIdOriginal: rendicionData.documento?.id
  };
  
  console.log('📋 Documento procesado:', {
    id: this.documento.id,
    rendicionId: this.documento.rendicionId,
    documentoId: this.documento.documentoId,
    estado: this.documento.estado
  });
  
  this.procesarDocumentoCargado(rendicionData);
}

  private procesarDocumentoOriginal(data: any): void {
    this.documento = {
      ...data,
      id: data.id,
      documentoId: data.id,
      numeroRadicado: data.numeroRadicado,
      nombreContratista: data.nombreContratista,
    };
    this.procesarDocumentoCargado(data);
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

    // ✅ Agregar todos los estados de revisión posibles
    return estado === 'EN_REVISION' ||
      estado === 'PENDIENTE' ||
      estado === 'ASIGNADO' ||
      estado === 'EN_REVISION_RENDICION' ||
      estado === 'EN_REVISION_RENDICION_CUENTAS' || // ← AGREGAR ESTE
      (!this.estaProcesado && !this.esModoLectura);
  }

  // También en procesarDocumentoCargado, asegurar que no se marque como procesado si está EN_REVISION
private procesarDocumentoCargado(data: any): void {
  const estado = (data.estado || '').toString().toUpperCase();
  
  console.log('🔍 procesarDocumentoCargado - Estado:', estado);
  console.log('🔍 esModoLectura actual:', this.esModoLectura);
  console.log('🔍 estaProcesado actual:', this.estaProcesado);
  
  // ✅ Solo marcar como procesado si es estado final
  this.estaProcesado = ['APROBADO', 'OBSERVADO', 'RECHAZADO', 'COMPLETADO', 'APROBADO_RENDICION', 'RECHAZADO_RENDICION']
    .includes(estado);
  
  // ✅ Determinar modo lectura basado en el estado y los parámetros
  const esEstadoRevision = this.esEstadoEnRevision();
  
  if (esEstadoRevision && !this.estaProcesado) {
    // Si está en revisión y no está procesado, permitir edición SOLO si no viene de consulta
    const vieneDeConsulta = this.route.snapshot.queryParamMap.get('modo') === 'consulta';
    if (!vieneDeConsulta) {
      this.esModoLectura = false;
      this.form.enable();
      console.log('✅ Modo EDICIÓN activado - Documento en revisión');
    } else {
      this.esModoLectura = true;
      this.form.disable();
      console.log('🔒 Modo LECTURA - Viene de consulta');
    }
  } else {
    this.esModoLectura = true;
    this.form.disable();
    console.log('🔒 Modo LECTURA - Documento procesado o no en revisión');
  }
  
  // Actualizar el formulario con los valores existentes
  let estadoFinal = '';
  if (estado === 'APROBADO' || estado === 'COMPLETADO' || estado === 'APROBADO_RENDICION')
    estadoFinal = 'APROBADO';
  else if (estado === 'OBSERVADO' || estado === 'OBSERVADO_RENDICION')
    estadoFinal = 'OBSERVADO';
  else if (estado === 'RECHAZADO' || estado === 'RECHAZADO_RENDICION')
    estadoFinal = 'RECHAZADO';
  
  this.form.patchValue({
    estadoFinal,
    observaciones: data.observaciones || data.observacionesRendicion || ''
  });
  
  this.actualizarEstadoBotones();
  this.isLoading = false;
  
  console.log('📊 Estado final después de procesar:', {
    esModoLectura: this.esModoLectura,
    estaProcesado: this.estaProcesado,
    formularioHabilitado: this.form.enabled,
    estadoDocumento: estado
  });

  }
}