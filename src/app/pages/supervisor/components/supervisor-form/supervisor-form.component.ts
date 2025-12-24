import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupervisorService } from '../../../../core/services/supervisor.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-supervisor-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervisor-form.component.html',
  styleUrls: ['./supervisor-form.component.scss']
})
export class SupervisorFormComponent implements OnInit {
  @Input() sidebarCollapsed = false;
  
  documentId: string = '';
  supervisionId: string = '';
  document: any = null;
  decision: string = '';
  observaciones: string = '';
  selectedFile: File | null = null;
  loading = false;
  error = '';
  
  // Para manejar la desuscripción
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supervisorService: SupervisorService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loading = true;

    // Obtener ID del documento de la ruta
    this.documentId = this.route.snapshot.paramMap.get('id') || '';

    // Obtener supervisión del estado de navegación
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.supervisionId = navigation.extras.state['supervisionId'];
    }

    if (this.documentId) {
      this.loadDocument();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocument(): void {
    this.loading = true;
    this.error = '';

    this.supervisorService.obtenerDocumentoPorId(this.documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (document: any) => {
          this.document = document;
          this.loading = false;
          console.log('✅ Documento cargado:', document);
        },
        error: (error: any) => {
          console.error('❌ Error al cargar documento:', error);
          this.error = 'Error al cargar documento. Por favor, intente nuevamente.';
          this.loading = false;
          this.notificationService.error('Error', this.error);
        }
      });
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    
    try {
      const fecha = new Date(date);
      return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getEstadoClass(estado: string): string {
    if (!estado) return 'default';
    
    switch(estado.toUpperCase()) {
      case 'RADICADO':
        return 'radicado';
      case 'PENDIENTE':
        return 'pendiente';
      case 'APROBADO':
        return 'aprobado';
      case 'RECHAZADO':
        return 'rechazado';
      case 'EN_REVISION':
        return 'en-revision';
      case 'OBSERVADO':
        return 'observado';
      default:
        return 'default';
    }
  }

  descargarArchivo(fileNumber: number): void {
    if (this.documentId) {
      this.loading = true;
      
      this.supervisorService.descargarArchivo(this.documentId, fileNumber)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (blob: Blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Definir nombres de archivo según el tipo
            let filename = '';
            switch(fileNumber) {
              case 1: 
                filename = this.document?.cuentaCobro || 'cuenta_cobro.pdf'; 
                break;
              case 2: 
                filename = this.document?.seguridadSocial || 'seguridad_social.pdf'; 
                break;
              case 3: 
                filename = this.document?.informeActividades || 'informe_actividades.pdf'; 
                break;
              default: 
                filename = `documento_${fileNumber}.pdf`;
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.loading = false;
            this.notificationService.success('Descarga Exitosa', 'Archivo descargado correctamente');
          },
          error: (err: any) => {
            console.error('Error descargando archivo:', err);
            this.error = 'Error al descargar el archivo';
            this.loading = false;
            this.notificationService.error('Error', this.error);
          }
        });
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (!allowedTypes.includes(file.type)) {
        this.notificationService.warning('Formato inválido', 'Solo se permiten archivos PDF, imágenes o documentos Word');
        event.target.value = '';
        return;
      }
      
      // Validar tamaño (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB en bytes
      if (file.size > maxSize) {
        this.notificationService.warning('Archivo muy grande', 'El archivo no debe superar los 10MB');
        event.target.value = '';
        return;
      }
      
      this.selectedFile = file;
      this.notificationService.info('Archivo seleccionado', `${file.name} listo para adjuntar`);
    }
  }

  submitDecision(): void {
    // Validaciones
    if (!this.documentId) {
      this.error = 'No se encontró el documento';
      this.notificationService.error('Error', this.error);
      return;
    }

    if (!this.decision) {
      this.error = 'Debe seleccionar una decisión';
      this.notificationService.warning('Validación', this.error);
      return;
    }

    if (this.decision !== 'APROBADO' && !this.observaciones.trim()) {
      this.error = 'Debe ingresar observaciones para esta decisión';
      this.notificationService.warning('Validación', this.error);
      return;
    }

    // Confirmar acción
    let confirmMessage = '';
    switch(this.decision) {
      case 'APROBADO':
        confirmMessage = `¿Está seguro de APROBAR el documento ${this.document?.numeroRadicado || ''}?`;
        break;
      case 'OBSERVADO':
        confirmMessage = `¿Está seguro de OBSERVAR el documento ${this.document?.numeroRadicado || ''}?`;
        break;
      case 'RECHAZADO':
        confirmMessage = `¿Está seguro de RECHAZAR el documento ${this.document?.numeroRadicado || ''}?`;
        break;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    this.loading = true;
    this.error = '';

    // Preparar datos según lo que necesite el servicio
    // Opción 1: Si el servicio espera un string con las observaciones
    const observacionesTexto = this.observaciones.trim();
    
    // Opción 2: Si el servicio espera un objeto (comentar la línea anterior y usar esta)
    // const dto = {
    //   estado: this.decision,
    //   observacion: this.observaciones.trim(),
    //   documentoId: this.documentId,
    //   supervisionId: this.supervisionId
    // };

    // Llamar al servicio correctamente
    // IMPORTANTE: Necesito ver la firma exacta del método revisarDocumento en el servicio
    // Por ahora, usaré un método genérico

    if (this.decision === 'APROBADO') {
      this.supervisorService.aprobarDocumento(this.documentId, observacionesTexto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.procesarExito();
          },
          error: (error: any) => {
            this.procesarError(error);
          }
        });
    } else if (this.decision === 'OBSERVADO') {
      this.supervisorService.observarDocumento(this.documentId, observacionesTexto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.procesarExito();
          },
          error: (error: any) => {
            this.procesarError(error);
          }
        });
    } else if (this.decision === 'RECHAZADO') {
      this.supervisorService.rechazarDocumento(this.documentId, observacionesTexto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.procesarExito();
          },
          error: (error: any) => {
            this.procesarError(error);
          }
        });
    }
  }

  private procesarExito(): void {
    const mensaje = this.getMensajeExito();
    this.notificationService.success('Éxito', mensaje);
    
    // Redirigir después de 2 segundos
    setTimeout(() => {
      this.router.navigate(['/supervisor/pendientes']);
    }, 2000);
    
    this.loading = false;
  }

  private procesarError(error: any): void {
    console.error('Error procesando decisión:', error);
    this.error = 'Error al procesar la decisión. Por favor, intente nuevamente.';
    this.notificationService.error('Error', this.error);
    this.loading = false;
  }

  private getMensajeExito(): string {
    switch(this.decision) {
      case 'APROBADO':
        return `Documento ${this.document?.numeroRadicado || ''} aprobado exitosamente`;
      case 'OBSERVADO':
        return `Documento ${this.document?.numeroRadicado || ''} observado exitosamente`;
      case 'RECHAZADO':
        return `Documento ${this.document?.numeroRadicado || ''} rechazado exitosamente`;
      default:
        return 'Operación completada exitosamente';
    }
  }

  cancelar(): void {
    if (confirm('¿Está seguro de cancelar? Los cambios no guardados se perderán.')) {
      this.router.navigate(['/supervisor/pendientes']);
    }
  }
}