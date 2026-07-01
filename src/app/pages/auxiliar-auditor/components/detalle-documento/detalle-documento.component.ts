// src/app/pages/auxiliar-auditor/components/detalle-documento/detalle-documento.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuxiliarAuditorService } from '../../../../core/services/auxiliar-auditor.service';
import { RadicacionFormComponent } from '../../../radicacion/components/radicacion-form/radicacion-form.component'; // ← IMPORTAR

@Component({
  selector: 'app-detalle-documento',
  standalone: true,
  imports: [CommonModule, FormsModule, RadicacionFormComponent],
  templateUrl: './detalle-documento.component.html',
  styleUrls: ['./detalle-documento.component.scss']
})
export class DetalleDocumentoComponent implements OnInit, OnDestroy {
  documentoId: string = '';
  documento: any = null;
  isLoading = false;
  subiendoActa = false;

  actaFile: File | null = null;
  actaFileName: string = '';

  errorMessage = '';
  showError = false;
  successMessage = '';
  showSuccess = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auxiliarService: AuxiliarAuditorService,

  ) { }

  ngOnInit(): void {
    this.documentoId = this.route.snapshot.paramMap.get('id') || '';
    if (this.documentoId) {
      this.cargarDetalleDocumento();
    } else {
      this.errorMessage = 'ID de documento no válido';
      this.showError = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDetalleDocumento(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.showError = false;

    console.log(`🔍 Cargando detalle del documento ${this.documentoId}...`);

    this.auxiliarService.obtenerDetalleDocumento(this.documentoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Detalle recibido (RAW):', response);

          // ✅ CORRECCIÓN: Navegar por las capas del interceptor
          // response.data contiene { success: true, data: {...}, timestamp }
          const apiResponse = response?.data;

          if (apiResponse && apiResponse.success && apiResponse.data) {
            // apiResponse.data contiene { documento: {...}, archivosRadicados: [...] }
            const data = apiResponse.data;

            if (data && data.documento) {
              this.documento = data;
              console.log('✅ Documento cargado correctamente:', this.documento);
            } else {
              console.error('❌ Estructura de datos inesperada en apiResponse.data:', data);
              this.errorMessage = 'Estructura de datos inválida';
              this.showError = true;
            }
          } else if (apiResponse && apiResponse.documento) {
            // Caso alternativo: la respuesta ya viene directa
            this.documento = apiResponse;
            console.log('✅ Documento cargado (alternativo):', this.documento);
          } else {
            console.error('❌ Estructura de datos inesperada:', apiResponse);
            this.errorMessage = 'Estructura de datos inválida';
            this.showError = true;
          }

          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error cargando detalle:', error);
          this.errorMessage = `Error al cargar el documento: ${error.message || 'Error desconocido'}`;
          this.showError = true;
          this.isLoading = false;
        }
      });
  }

  volverALista(): void {
    this.router.navigate(['/auxiliar-auditor/documentos-disponibles']);
  }


  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'El acta debe ser PDF o Word (doc, docx)';
      this.showError = true;
      event.target.value = '';
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.errorMessage = 'El archivo no puede superar los 10MB';
      this.showError = true;
      event.target.value = '';
      return;
    }

    this.actaFile = file;
    this.actaFileName = file.name;
    this.errorMessage = '';
    this.showError = false;
  }

  removeFile(): void {
    this.actaFile = null;
    this.actaFileName = '';
  }

  subirActa(): void {
    if (!this.actaFile) {
      this.errorMessage = 'Debe seleccionar un archivo de acta de supervisión';
      this.showError = true;
      return;
    }

    this.subiendoActa = true;
    this.errorMessage = '';
    this.showError = false;

    console.log(`📤 Subiendo acta para documento ${this.documentoId}...`);

    this.auxiliarService.subirActaSupervision(this.documentoId, this.actaFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Acta subida exitosamente:', response);

          this.successMessage = 'Acta de supervisión subida exitosamente';
          this.showSuccess = true;
          this.subiendoActa = false;

          // Limpiar el archivo seleccionado
          this.actaFile = null;
          this.actaFileName = '';

          // Recargar el documento para mostrar el estado actualizado
          this.cargarDetalleDocumento();

          // Redirigir a la lista después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/auxiliar-auditor/documentos-disponibles']);
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Error subiendo acta:', error);
          this.errorMessage = `Error al subir el acta: ${error.message || 'Error desconocido'}`;
          this.showError = true;
          this.subiendoActa = false;
        }
      });
  }

  verDocumentoRadicado(index: number): void {
    if (!this.documento?.documento?.id) {
      this.errorMessage = 'ID de documento no disponible';
      this.showError = true;
      return;
    }

    // Usar el servicio de radicación para previsualizar
    // Esto requiere importar RadicacionService
    window.open(`/api/radicacion/${this.documento.documento.id}/archivo/${index}?token=${localStorage.getItem('token')}`, '_blank');
  }

  descargarDocumentoRadicado(index: number): void {
    if (!this.documento?.documento?.id) {
      this.errorMessage = 'ID de documento no disponible';
      this.showError = true;
      return;
    }

    window.open(`/api/radicacion/${this.documento.documento.id}/descargar/${index}`, '_blank');
  }

  volver(): void {
    this.router.navigate(['/auxiliar-auditor/documentos-disponibles']);
  }

  dismissError(): void {
    this.showError = false;
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.showSuccess = false;
    this.successMessage = '';
  }

  formatDate(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  tieneDocumentos(): boolean {
    return !!(this.documento?.archivosRadicados?.some((a: any) => a.existe));
  }

  contarDocumentosDisponibles(): number {
    return this.documento?.archivosRadicados?.filter((a: any) => a.existe).length || 0;
  }
}