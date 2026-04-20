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
  currentUserId: string = '';
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
      observaciones: [''],  // Sin validadores iniciales
      estadoFinal: ['', Validators.required]
    });
    
    // ✅ Agregar validador condicional para observaciones
    this.form.get('estadoFinal')?.valueChanges.subscribe(value => {
      const observacionesControl = this.form.get('observaciones');
      if (value === 'OBSERVADO' || value === 'RECHAZADO') {
        observacionesControl?.setValidators([Validators.required, Validators.minLength(10)]);
      } else {
        observacionesControl?.clearValidators();
      }
      observacionesControl?.updateValueAndValidity();
    });
    
    this.form.valueChanges.subscribe(() => this.actualizarEstadoBotones());
  }

  ngOnInit(): void {
    this.cargarUsuarioActual();
    
    const documentoId = this.documentoId || this.route.snapshot.paramMap.get('id');
    
    if (!documentoId) {
      this.mostrarMensaje('No se recibió ID del documento', 'error');
      this.isLoading = false;
      return;
    }
    
    this.cargarDocumentoCompleto(documentoId);
  }

  cargarUsuarioActual(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUserId = currentUser.id;
      this.currentUserRole = currentUser.role || '';
      console.log('👤 Usuario ID:', this.currentUserId);
      console.log('👤 Usuario rol:', this.currentUserRole);
    }
  }

 // src/app/pages/rendicion-cuentas/components/rendicion-form/rendicion-form.component.ts

cargarDocumentoCompleto(documentoId: string): void {
  this.isLoading = true;
  console.log('🔍 Cargando documento completo con ID:', documentoId);
  
  this.rendicionService.obtenerDetalleCompleto(documentoId).subscribe({
    next: (data) => {
      console.log('✅ Datos completos cargados:', data);
      
      const dataPrincipal = data.data || data;
      
      this.documento = {
        id: dataPrincipal.id,
        documentoId: dataPrincipal.id,
        numeroRadicado: dataPrincipal.numeroRadicado,
        nombreContratista: dataPrincipal.nombreContratista,
        numeroContrato: dataPrincipal.numeroContrato,
        documentoContratista: dataPrincipal.documentoContratista,
        fechaRadicacion: dataPrincipal.fechaRadicacion,
        fechaInicio: dataPrincipal.fechaInicio,
        fechaFin: dataPrincipal.fechaFin,
        estado: dataPrincipal.estado,
        observacion: dataPrincipal.observacion,
        historialEstados: dataPrincipal.historialEstados,
        radicador: dataPrincipal.radicador,
        rutaCarpetaRadicado: dataPrincipal.rutaCarpetaRadicado,
        rendicionId: dataPrincipal.rendicionId,
        rendicionEstado: dataPrincipal.rendicionEstado,
        responsableId: dataPrincipal.responsableId,
        responsable: dataPrincipal.responsable,
        fechaAsignacion: dataPrincipal.fechaAsignacion,
        fechaInicioRevisionRendicion: dataPrincipal.fechaInicioRevisionRendicion,
        fechaDecisionRendicion: dataPrincipal.fechaDecisionRendicion,
        observacionesRendicion: dataPrincipal.observacionesRendicion,
        tesoreria: dataPrincipal.tesoreria,
        asesorGerencia: dataPrincipal.asesorGerencia,
        disponible: dataPrincipal.disponible === true
      };
      
      // ✅ Verificar si el documento ya está procesado
      const yaProcesado = this.estadosProcesados.includes(
        (this.documento.estado || '').toString().toUpperCase()
      );
      
      // ✅ DETERMINAR MODO DE EDICIÓN
      const estaEnRevision = this.documento.rendicionEstado === 'EN_REVISION';
      const esResponsable = this.documento.responsableId === this.currentUserId;
      const esAdmin = this.currentUserRole === 'admin';
      
      const desdeTomar = this.route.snapshot.queryParamMap.get('tomar') === 'true';
      const modoEdicionUrl = this.route.snapshot.queryParamMap.get('modo') === 'edicion';
      
      console.log('🔍 Debug:', {
        estaEnRevision,
        esResponsable,
        esAdmin,
        yaProcesado,
        desdeTomar,
        modoEdicionUrl,
        estado: this.documento.estado,
        rendicionEstado: this.documento.rendicionEstado
      });
      
      // ✅ SI YA ESTÁ PROCESADO -> MODO SOLO LECTURA
      if (yaProcesado) {
        this.esModoLectura = true;
        this.form.disable();
        console.log('🔒 Documento ya procesado - Modo SOLO LECTURA');
      } 
      // ✅ SI NO ESTÁ PROCESADO Y está en revisión y (es responsable o admin)
      else if ((estaEnRevision && (esResponsable || esAdmin)) || desdeTomar || modoEdicionUrl) {
        this.esModoLectura = false;
        console.log('✏️ Modo EDICIÓN activado');
        
        // HABILITAR EL FORMULARIO
        this.form.enable();
        
        // ESTABLECER VALOR POR DEFECTO
        if (!this.form.get('estadoFinal')?.value) {
          this.form.patchValue({ estadoFinal: 'APROBADO' });
        }
        
        // LIMPIAR VALIDACIONES
        this.form.get('estadoFinal')?.updateValueAndValidity();
        this.form.get('observaciones')?.updateValueAndValidity();
        
        console.log('Formulario habilitado, estadoFinal:', this.form.get('estadoFinal')?.value);
      } 
      // ✅ CUALQUIER OTRO CASO -> MODO SOLO LECTURA
      else {
        this.esModoLectura = true;
        this.form.disable();
        console.log('🔒 Modo SOLO LECTURA (no cumple condiciones para edición)');
      }
      
      this.estaProcesado = yaProcesado;
      
      // Cargar observaciones existentes
      if (this.documento.observacionesRendicion) {
        this.form.patchValue({
          observaciones: this.documento.observacionesRendicion
        });
      }
      
      // ✅ FORZAR VALIDACIÓN
      this.form.updateValueAndValidity();
      
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

// src/app/pages/rendicion-cuentas/components/rendicion-form/rendicion-form.component.ts

descargarCarpeta(): void {
  // ✅ Usar documentoId (ID del documento radicado)
  const idParaDescargar = this.documento?.documentoId || this.documento?.id;
  
  console.log('📥 Descargando carpeta para documentoId:', idParaDescargar);
  
  if (!idParaDescargar) {
    this.mostrarMensaje('No hay documento válido para descargar', 'error');
    return;
  }
  
  this.isDescargando = true;
  this.mostrarMensaje('Preparando descarga...', 'info');
  
  this.rendicionService.descargarCarpeta(idParaDescargar).subscribe({
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
      console.error('❌ Error en descarga:', err);
      this.mostrarMensaje(err.error?.message || 'Error al descargar', 'error');
      this.isDescargando = false;
    }
  });
}

  onSubmit(): void {
    console.log('🔍 onSubmit llamado');
    console.log('form.invalid:', this.form.invalid);
    console.log('form.errors:', this.form.errors);
    console.log('form.get("estadoFinal")?.errors:', this.form.get('estadoFinal')?.errors);
    console.log('form.get("observaciones")?.errors:', this.form.get('observaciones')?.errors);
    console.log('form.value:', this.form.value);
    console.log('esModoLectura:', this.esModoLectura);
    console.log('estaProcesado:', this.estaProcesado);
    console.log('isProcessing:', this.isProcessing);
    console.log('documento:', this.documento);
    console.log('estadoFinal value:', this.form.get('estadoFinal')?.value);
    
    // ✅ Mostrar qué campos están inválidos
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control?.invalid) {
        console.log(`Campo inválido: ${key}, errors:`, control.errors);
      }
    });
    
    if (this.form.invalid || this.esModoLectura || this.estaProcesado || this.isProcessing || !this.documento) {
      console.log('❌ Validación fallida');
      return;
    }
    
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
    
    console.log('📤 Enviando decisión:', payload);
    console.log('📤 rendicionId:', this.documento.rendicionId);
    
    this.rendicionService.tomarDecision(this.documento.rendicionId, payload).subscribe({
      next: (response) => {
        console.log('✅ Decisión guardada:', response);
        this.mostrarMensaje(`Documento marcado como ${estadoFinal}`, 'success');
        this.isProcessing = false;
        setTimeout(() => this.volverALista(), 1800);
      },
      error: (err) => {
        console.error('❌ Error al guardar decisión:', err);
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
        console.log('📤 Liberando documento, rendicionId:', this.documento.rendicionId);
        
        this.rendicionService.liberarDocumento(this.documento.rendicionId).subscribe({
          next: (response) => {
            console.log('✅ Documento liberado:', response);
            this.mostrarMensaje('Documento liberado correctamente', 'success');
            setTimeout(() => this.volverALista(), 1500);
          },
          error: (err) => {
            console.error('❌ Error al liberar:', err);
            this.mostrarMensaje(err.error?.message || 'Error al liberar', 'error');
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
    console.log('🔍 actualizarEstadoBotones - esModoLectura:', this.esModoLectura);
    console.log('🔍 actualizarEstadoBotones - estaProcesado:', this.estaProcesado);
    console.log('🔍 actualizarEstadoBotones - form.valid:', this.form.valid);
    console.log('🔍 actualizarEstadoBotones - estadoFinal:', this.form.get('estadoFinal')?.value);
    
    if (this.esModoLectura || this.estaProcesado || this.isProcessing || !this.documento) {
      this.puedeGuardar = false;
      this.puedeLiberar = false;
      return;
    }
    
    const estadoFinal = this.form.get('estadoFinal')?.value;
    const obs = this.form.value.observaciones?.trim() || '';
    
    let valido = !!estadoFinal && estadoFinal !== '';
    if (estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') {
      valido = valido && obs.length >= 10;
    }
    
    console.log('🔍 valido:', valido);
    
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