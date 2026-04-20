// src/app/pages/rendicion-cuentas/components/rendicion-form/rendicion-form.component.ts

import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
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
  isLoading = true;
  isProcessing = false;
  isDescargando = false;
  documento: any = null;
  esModoLectura = true;
  estaProcesado = false;
  
  @Input() documentoId: string | null = null;
  @Input() forceReadOnly: boolean = false;
  
  private estadosProcesados = ['APROBADO', 'OBSERVADO', 'RECHAZADO', 'COMPLETADO'];
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
  
  // Obtener el documentoId de la URL (ID del documento radicado)
  const documentoId = this.documentoId || this.route.snapshot.paramMap.get('id');
  
  if (!documentoId) {
    this.mostrarMensaje('No se recibió ID del documento', 'error');
    this.isLoading = false;
    return;
  }
  
  this.esModoLectura = true;
  this.cargarDocumentoCompleto(documentoId);
}

cargarDocumentoCompleto(documentoId: string): void {
  this.isLoading = true;
  console.log('🔍 Cargando documento completo con ID:', documentoId);
  
  this.rendicionService.obtenerDetalleCompleto(documentoId).subscribe({
    next: (data) => {
      console.log('✅ Datos completos cargados:', data);
      
      this.documento = {
        // Datos del documento radicado
        id: data.id,
        documentoId: data.id,
        numeroRadicado: data.numeroRadicado,
        nombreContratista: data.nombreContratista,
        numeroContrato: data.numeroContrato,
        documentoContratista: data.documentoContratista,
        fechaRadicacion: data.fechaRadicacion,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        estado: data.estado,
        observacion: data.observacion,
        historialEstados: data.historialEstados,
        radicador: data.radicador,
        rutaCarpetaRadicado: data.rutaCarpetaRadicado,
        
        // Datos de rendición
        rendicionId: data.rendicionId,
        rendicionEstado: data.rendicionEstado,
        responsableId: data.responsableId,
        responsable: data.responsable,
        fechaAsignacion: data.fechaAsignacion,
        fechaInicioRevisionRendicion: data.fechaInicioRevisionRendicion,
        fechaDecisionRendicion: data.fechaDecisionRendicion,
        observacionesRendicion: data.observacionesRendicion,
        
        // Datos de tesorería (para el comprobante)
        tesoreria: data.tesoreria,
        
        // Datos de asesor gerencia
        asesorGerencia: data.asesorGerencia
      };
      
      this.estaProcesado = this.estadosProcesados.includes(
        (this.documento.estado || '').toString().toUpperCase()
      );
      
      this.actualizarEstadoBotones();
      this.isLoading = false;
    },
    error: (err) => {
      console.error('❌ Error:', err);
      this.mostrarMensaje(err.message || 'Error al cargar el documento', 'error');
      this.isLoading = false;
    }
  });
}

  /**
   * Cargar documento usando documentoId (EXACTAMENTE como Asesor Gerencia)
   */
  cargarDocumento(documentoId: string): void {
    this.isLoading = true;
    console.log('🔍 Cargando documento con ID:', documentoId);
    
    this.rendicionService.obtenerDetalleDocumento(documentoId).subscribe({
      next: (data) => {
        console.log('✅ Documento cargado:', data);
        
        this.documento = {
          id: data.id,                              // documentoId (igual que Asesor Gerencia)
          rendicionId: data.rendicionId,            // rendicionId interno
          documentoId: data.documentoId || data.id, // documentoId
          numeroRadicado: data.numeroRadicado,
          nombreContratista: data.nombreContratista,
          numeroContrato: data.numeroContrato,
          estado: data.estado,
          observaciones: data.observaciones,
          observacionesRendicion: data.observacionesRendicion,
          fechaDecision: data.fechaDecision,
          fechaActualizacion: data.fechaActualizacion,
          responsableId: data.responsableId,
          responsable: data.responsable
        };
        
        console.log('✅ documentoId para AsesorGerenciaFormComponent:', this.documento.documentoId);
        
        this.estaProcesado = this.estadosProcesados.includes(
          (this.documento.estado || '').toString().toUpperCase()
        );
        
        if (this.estaProcesado) {
          this.form.disable();
        }
        
        let estadoFinal = '';
        const estadoDoc = (this.documento.estado || '').toString().toUpperCase();
        if (['APROBADO', 'COMPLETADO', 'APROBADO_RENDICION'].includes(estadoDoc)) estadoFinal = 'APROBADO';
        else if (['OBSERVADO', 'OBSERVADO_RENDICION'].includes(estadoDoc)) estadoFinal = 'OBSERVADO';
        else if (['RECHAZADO', 'RECHAZADO_RENDICION'].includes(estadoDoc)) estadoFinal = 'RECHAZADO';
        
        this.form.patchValue({
          estadoFinal,
          observaciones: this.documento.observacionesRendicion || ''
        });
        
        this.actualizarEstadoBotones();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.mostrarMensaje(err.message || 'Error al cargar el documento', 'error');
        this.isLoading = false;
      }
    });
  }

  // El resto de métodos igual que antes...
  cargarUsuarioActual(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentUserRole = currentUser?.role || '';
  }

  descargarCarpeta(): void {
    if (!this.documento?.documentoId) {
      this.mostrarMensaje('No hay documento válido para descargar', 'error');
      return;
    }
    
    this.isDescargando = true;
    this.mostrarMensaje('Preparando descarga...', 'info');
    
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
      error: (err) => {
        this.mostrarMensaje(err.error?.message || 'Error al descargar', 'error');
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
        this.form.value.observaciones?.trim().length < 10) {
      this.mostrarMensaje('La justificación debe tener al menos 10 caracteres', 'error');
      return;
    }
    
    this.isProcessing = true;
    
    const payload = { 
      decision: estadoFinal, 
      observacion: this.form.value.observaciones?.trim() || '' 
    };
    
    // Usar rendicionId para la decisión
    this.rendicionService.tomarDecision(this.documento.rendicionId || this.documento.id, payload).subscribe({
      next: () => {
        this.mostrarMensaje(`Documento marcado como ${estadoFinal}`, 'success');
        this.isProcessing = false;
        setTimeout(() => this.volverALista(), 1800);
      },
      error: (err) => {
        this.mostrarMensaje(err.error?.message || 'Error al procesar', 'error');
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
        this.rendicionService.liberarDocumento(this.documento.rendicionId || this.documento.id).subscribe({
          next: () => {
            this.mostrarMensaje('Documento liberado correctamente', 'success');
            setTimeout(() => this.volverALista(), 1500);
          },
          error: (err) => this.mostrarMensaje(err.error?.message || 'Error al liberar', 'error')
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
      this.puedeGuardar = this.puedeLiberar = false;
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

  esEstadoAprobadoORechazado(): boolean {
    if (!this.documento?.estado) return false;
    const e = this.documento.estado.toString().toUpperCase();
    return ['APROBADO','RECHAZADO','APROBADO_RENDICION','RECHAZADO_RENDICION','COMPLETADO'].includes(e);
  }

  esEstadoEnRevision(): boolean {
    if (!this.documento?.estado) return false;
    const e = this.documento.estado.toString().toUpperCase();
    return e.includes('EN_REVISION') || e === 'PENDIENTE' || e === 'ASIGNADO';
  }
}