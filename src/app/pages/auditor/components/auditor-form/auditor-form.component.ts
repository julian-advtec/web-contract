import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuditorService } from '../../../../core/services/auditor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Documento } from '../../../../core/models/documento.model';

@Component({
  selector: 'app-auditor-form',
  templateUrl: './auditor-form.component.html',
  styleUrls: ['./auditor-form.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule]
})
export class AuditorFormComponent implements OnInit, OnDestroy {
  // Documento actual
  documento: Documento | null = null;
  documentoId: string = '';

  // Estados de carga
  isLoading = false;
  isProcessing = false;
  isSubmitting = false;

  // Formularios
  revisarForm!: FormGroup;
  documentosForm!: FormGroup;

  // Mensajes
  errorMessage = '';
  successMessage = '';
  infoMessage = '';

  // Archivos
  archivosSeleccionados: { [key: string]: File } = {};
  archivosCargados: { [key: string]: boolean } = {
    rp: false,
    cdp: false,
    poliza: false,
    certificadoBancario: false,
    minuta: false,
    actaInicio: false
  };

  // Estados de decisión
  estadosAuditor = [
    { value: 'APROBADO', label: 'Aprobar', icon: 'check_circle', color: 'success', description: 'Documento cumple con todos los requisitos' },
    { value: 'OBSERVADO', label: 'Observar', icon: 'warning', color: 'warning', description: 'Documento requiere correcciones menores' },
    { value: 'RECHAZADO', label: 'Rechazar', icon: 'cancel', color: 'danger', description: 'Documento no cumple con los requisitos' },
    { value: 'COMPLETADO', label: 'Completar', icon: 'done_all', color: 'primary', description: 'Documento procesado completamente' }
  ];

  // Archivos del radicador
  archivosRadicador = [
    { numero: 1, nombre: 'Cuenta de Cobro', tipo: 'cuentaCobro', icon: 'receipt' },
    { numero: 2, nombre: 'Seguridad Social', tipo: 'seguridadSocial', icon: 'health_and_safety' },
    { numero: 3, nombre: 'Informe de Actividades', tipo: 'informeActividades', icon: 'description' }
  ];

  // Archivos requeridos para auditoría (solo si es primer radicado)
  archivosAuditoria = [
    { tipo: 'rp', nombre: 'Resolución de Pago', descripcion: 'Documento que autoriza el pago', icon: 'description', required: true },
    { tipo: 'cdp', nombre: 'CDP', descripcion: 'Certificado de Disponibilidad Presupuestal', icon: 'account_balance', required: true },
    { tipo: 'poliza', nombre: 'Póliza', descripcion: 'Póliza de cumplimiento', icon: 'verified', required: true },
    { tipo: 'certificadoBancario', nombre: 'Certificado Bancario', descripcion: 'Certificado de cuenta bancaria', icon: 'account_balance_wallet', required: true },
    { tipo: 'minuta', nombre: 'Minuta', descripcion: 'Minuta de contrato', icon: 'gavel', required: true },
    { tipo: 'actaInicio', nombre: 'Acta de Inicio', descripcion: 'Acta de inicio de actividades', icon: 'event_note', required: true }
  ];

  // Historial
  historial: any[] = [];

  // Usuario actual
  usuarioActual = '';

  // Control de sidebar
  sidebarCollapsed = false;

  // Tabs
  activeTab: string = 'informacion';

  private destroy$ = new Subject<void>();

  constructor(
    private auditorService: AuditorService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    console.log('🚀 Auditor: Inicializando formulario de revisión...');
    this.cargarUsuarioActual();
    this.initForms();
    this.cargarDocumento();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarUsuarioActual(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.usuarioActual = user.fullName || user.username || 'Auditor';
        console.log('👤 Auditor actual:', this.usuarioActual);
      } catch (error) {
        console.error('Error parseando usuario:', error);
        this.usuarioActual = 'Auditor';
      }
    }
  }

  initForms(): void {
    // Formulario para revisión
    this.revisarForm = this.fb.group({
      estado: ['', Validators.required],
      observaciones: ['', [Validators.required, Validators.minLength(10)]],
      correcciones: ['']
    });

    // Formulario para documentos (solo para primer radicado)
    this.documentosForm = this.fb.group({
      observacionesDocumentos: ['']
    });
  }

  cargarDocumento(): void {
    this.documentoId = this.route.snapshot.paramMap.get('id') || '';
    
    if (!this.documentoId) {
      this.errorMessage = 'No se especificó un documento para revisar';
      return;
    }

    console.log(`📋 Cargando documento: ${this.documentoId}`);
    this.isLoading = true;

    this.auditorService.getDetalleDocumento(this.documentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Detalle del documento:', response);
          
          if (response.documento) {
            this.documento = response.documento;
            this.historial = response.documento.historialEstados || [];
            
            // Verificar si es primer radicado
            if (this.documento.primerRadicadoDelAno) {
              this.cargarArchivosAuditoria();
            }
            
            // Cargar historial de auditoría si existe
            if (response.auditor) {
              this.cargarDatosAuditor(response.auditor);
            }
            
            this.successMessage = `Documento ${this.documento.numeroRadicado} cargado correctamente`;
            setTimeout(() => this.successMessage = '', 3000);
          } else {
            this.errorMessage = 'No se pudo cargar el documento';
          }
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error cargando documento:', error);
          this.errorMessage = 'Error al cargar el documento: ' + (error.message || 'Error desconocido');
          this.isLoading = false;
          this.notificationService.error('Error', this.errorMessage);
        }
      });
  }

  cargarArchivosAuditoria(): void {
    if (!this.documentoId) return;

    this.auditorService.verificarArchivosAuditoria(this.documentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (archivos: any) => {
          console.log('✅ Archivos de auditoría cargados:', archivos);
          
          // Actualizar estado de archivos cargados
          if (archivos) {
            this.archivosCargados = {
              rp: !!archivos.rp,
              cdp: !!archivos.cdp,
              poliza: !!archivos.poliza,
              certificadoBancario: !!archivos.certificadoBancario,
              minuta: !!archivos.minuta,
              actaInicio: !!archivos.actaInicio
            };
          }
        },
        error: (error) => {
          console.error('❌ Error cargando archivos de auditoría:', error);
        }
      });
  }

  cargarDatosAuditor(datosAuditor: any): void {
    // Si ya hay una revisión anterior, cargar los datos
    if (datosAuditor.estado) {
      this.revisarForm.patchValue({
        estado: datosAuditor.estado,
        observaciones: datosAuditor.observaciones || '',
        correcciones: datosAuditor.correcciones || ''
      });
    }
  }

  // Métodos para archivos del radicador
  descargarArchivoRadicador(numeroArchivo: number): void {
    if (!this.documento) return;

    console.log(`📥 Descargando archivo ${numeroArchivo} del radicador...`);
    this.isProcessing = true;

    this.auditorService.descargarArchivoRadicado(this.documentoId, numeroArchivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          let nombreArchivo = '';
          
          switch (numeroArchivo) {
            case 1:
              nombreArchivo = this.documento?.cuentaCobro || 'cuenta_cobro.pdf';
              break;
            case 2:
              nombreArchivo = this.documento?.seguridadSocial || 'seguridad_social.pdf';
              break;
            case 3:
              nombreArchivo = this.documento?.informeActividades || 'informe_actividades.pdf';
              break;
          }

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreArchivo;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.isProcessing = false;
          this.notificationService.success('Descarga completada', `Archivo descargado correctamente`);
        },
        error: (error) => {
          console.error('❌ Error descargando archivo:', error);
          this.notificationService.error('Error', 'No se pudo descargar el archivo');
          this.isProcessing = false;
        }
      });
  }

  verArchivoRadicador(numeroArchivo: number): void {
    if (!this.documento) return;

    this.auditorService.previsualizarArchivoRadicado(this.documentoId, numeroArchivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          this.notificationService.info('Previsualización', 'Documento abierto en nueva pestaña');
        },
        error: (error) => {
          console.error('❌ Error previsualizando archivo:', error);
          this.notificationService.error('Error', 'No se pudo previsualizar el archivo');
        }
      });
  }

  // Métodos para archivos de auditoría
  onFileSelected(event: Event, tipo: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivosSeleccionados[tipo] = input.files[0];
      this.cdr.detectChanges(); // Forzar detección de cambios
    }
  }

  eliminarArchivo(tipo: string): void {
    delete this.archivosSeleccionados[tipo];
    this.cdr.detectChanges();
  }

  subirArchivosAuditoria(): void {
    if (!this.documento || !this.documento.primerRadicadoDelAno) {
      this.notificationService.warning('Advertencia', 'Solo se pueden subir archivos para el primer radicado del año');
      return;
    }

    // Verificar que todos los archivos requeridos están presentes
    const archivosRequeridos = ['rp', 'cdp', 'poliza', 'certificadoBancario', 'minuta', 'actaInicio'];
    const archivosFaltantes = archivosRequeridos.filter(tipo => !this.archivosSeleccionados[tipo]);

    if (archivosFaltantes.length > 0) {
      this.notificationService.warning('Archivos faltantes', 
        `Faltan los siguientes archivos: ${archivosFaltantes.join(', ')}`);
      return;
    }

    this.isSubmitting = true;

    const formData = new FormData();
    archivosRequeridos.forEach(tipo => {
      formData.append(tipo, this.archivosSeleccionados[tipo]);
    });

    if (this.documentosForm.value.observacionesDocumentos) {
      formData.append('observaciones', this.documentosForm.value.observacionesDocumentos);
    }

    this.auditorService.subirDocumentosAuditoria(this.documentoId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Archivos subidos correctamente:', response);
          
          // Actualizar estado de archivos cargados
          archivosRequeridos.forEach(tipo => {
            this.archivosCargados[tipo] = true;
          });
          
          // Limpiar archivos seleccionados
          this.archivosSeleccionados = {};
          this.documentosForm.reset();
          
          this.notificationService.success('Éxito', 'Archivos de auditoría subidos correctamente');
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('❌ Error subiendo archivos:', error);
          this.notificationService.error('Error', 'No se pudieron subir los archivos');
          this.isSubmitting = false;
        }
      });
  }

  descargarArchivoAuditoria(tipo: string): void {
    if (!this.documentoId) return;

    this.isProcessing = true;

    this.auditorService.descargarArchivoAuditoria(this.documentoId, tipo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const nombreArchivo = `${tipo}_${this.documento?.numeroRadicado || 'documento'}.pdf`;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreArchivo;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          this.isProcessing = false;
          this.notificationService.success('Descarga completada', 'Archivo descargado correctamente');
        },
        error: (error) => {
          console.error('❌ Error descargando archivo de auditoría:', error);
          this.notificationService.error('Error', 'No se pudo descargar el archivo');
          this.isProcessing = false;
        }
      });
  }

  // Métodos para revisión
  onSubmitRevisar(): void {
    if (this.revisarForm.invalid) {
      this.notificationService.warning('Formulario incompleto', 'Por favor complete todos los campos requeridos');
      return;
    }

    // Validar que si es primer radicado, tenga todos los archivos
    if (this.documento?.primerRadicadoDelAno) {
      const archivosFaltantes = Object.entries(this.archivosCargados)
        .filter(([_, cargado]) => !cargado)
        .map(([tipo, _]) => tipo);

      if (archivosFaltantes.length > 0) {
        this.notificationService.warning('Archivos faltantes', 
          `Debe subir todos los archivos requeridos antes de revisar. Faltan: ${archivosFaltantes.join(', ')}`);
        return;
      }
    }

    this.isProcessing = true;

    const confirmar = confirm(`¿Está seguro de ${this.getEstadoLabel(this.revisarForm.value.estado).toLowerCase()} este documento?\n\nEsta acción no se puede deshacer.`);

    if (!confirmar) {
      this.isProcessing = false;
      return;
    }

    this.auditorService.revisarDocumento(this.documentoId, this.revisarForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Documento revisado:', response);
          
          // Actualizar documento local
          if (this.documento) {
            this.documento.estado = response.documento.estado;
            this.documento.comentarios = response.documento.comentarios;
            this.documento.fechaActualizacion = new Date();
            this.documento.ultimoUsuario = `Auditor: ${this.usuarioActual}`;
          }

          // Agregar al historial local
          this.historial.unshift({
            fecha: new Date(),
            estado: response.documento.estado,
            usuarioNombre: this.usuarioActual,
            observacion: this.revisarForm.value.observaciones
          });

          this.notificationService.success('Revisión completada', 
            `Documento ${this.getEstadoLabel(this.revisarForm.value.estado).toLowerCase()} correctamente`);
          
          this.isProcessing = false;
          
          // Redirigir después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/auditor/mis-documentos']);
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Error revisando documento:', error);
          this.notificationService.error('Error', 'No se pudo completar la revisión');
          this.isProcessing = false;
        }
      });
  }

  liberarDocumento(): void {
    if (!this.documentoId) return;

    const confirmar = confirm(`¿Está seguro de liberar este documento?\n\nEl documento volverá a estar disponible para otros auditores.`);

    if (!confirmar) return;

    this.isProcessing = true;

    this.auditorService.liberarDocumento(this.documentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Documento liberado:', response);
          this.notificationService.success('Documento liberado', 'El documento ahora está disponible para otros auditores');
          this.isProcessing = false;
          
          // Redirigir a pendientes
          setTimeout(() => {
            this.router.navigate(['/auditor/pendientes']);
          }, 1000);
        },
        error: (error) => {
          console.error('❌ Error liberando documento:', error);
          this.notificationService.error('Error', 'No se pudo liberar el documento');
          this.isProcessing = false;
        }
      });
  }

  // Métodos auxiliares
  getEstadoLabel(estado: string): string {
    const estadoObj = this.estadosAuditor.find(e => e.value === estado);
    return estadoObj ? estadoObj.label : estado;
  }

  getEstadoIcon(estado: string): string {
    const estadoObj = this.estadosAuditor.find(e => e.value === estado);
    return estadoObj ? estadoObj.icon : 'help';
  }

  getEstadoColor(estado: string): string {
    const estadoObj = this.estadosAuditor.find(e => e.value === estado);
    return estadoObj ? estadoObj.color : 'secondary';
  }

  formatDate(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatDateShort(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getArchivoNombre(archivo: string | null | undefined): string {
    if (!archivo) return 'No disponible';
    return archivo.split('/').pop() || archivo;
  }

  isArchivoDisponible(archivo: string | null | undefined): boolean {
    return !!archivo;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  dismissInfo(): void {
    this.infoMessage = '';
  }

  // Verificar si puede subir archivos (solo primer radicado)
  puedeSubirArchivos(): boolean {
    return this.documento?.primerRadicadoDelAno === true;
  }

  // Verificar si puede revisar
  puedeRevisar(): boolean {
    if (!this.documento) return false;
    
    // Debe tener el documento asignado
    if (this.documento.estado !== 'EN_REVISION_AUDITOR') {
      return false;
    }
    
    // Si es primer radicado, debe tener todos los archivos cargados
    if (this.documento.primerRadicadoDelAno) {
      return Object.values(this.archivosCargados).every(cargado => cargado);
    }
    
    return true;
  }

  // Verificar si puede liberar
  puedeLiberar(): boolean {
    return this.documento?.estado === 'EN_REVISION_AUDITOR';
  }

  // Verificar si está en revisión
  estaEnRevision(): boolean {
    return this.documento?.estado === 'EN_REVISION_AUDITOR';
  }

  
}