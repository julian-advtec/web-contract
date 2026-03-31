import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { Contratista, DocumentoContratista } from '../../../../core/models/contratista.model';

@Component({
  selector: 'app-contratista-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './contratista-detalle.component.html',
  styleUrls: ['./contratista-detalle.component.scss']
})
export class ContratistaDetalleComponent implements OnInit {
  contratista: Contratista | null = null;
  documentos: DocumentoContratista[] = [];
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contratistasService: ContratistasService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarContratista(id);
    }
  }

  cargarContratista(id: string): void {
    this.contratistasService.obtenerPorId(id).subscribe({
      next: (contratista) => {
        if (contratista) {
          this.contratista = contratista;
          this.cargarDocumentos(id);
        }
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  cargarDocumentos(id: string): void {
    this.contratistasService.obtenerDocumentos(id).subscribe({
      next: (docs) => {
        this.documentos = docs;
      },
      error: () => {}
    });
  }

  editarContratista(): void {
    if (this.contratista) {
      this.router.navigate(['/contratistas/editar', this.contratista.id]);
    }
  }

  volver(): void {
    this.router.navigate(['/contratistas']);
  }

  getTipoDocumentoLabel(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'CC': 'Cédula de Ciudadanía',
      'NIT': 'NIT',
      'CE': 'Cédula de Extranjería',
      'PAS': 'Pasaporte',
      'TI': 'Tarjeta de Identidad',
      'OTRO': 'Otro'
    };
    return tipos[tipo] || tipo;
  }

  getTipoContratistaLabel(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'PERSONA_NATURAL': 'Persona Natural',
      'PERSONA_JURIDICA': 'Persona Jurídica',
      'CONSORCIO': 'Consorcio',
      'UNION_TEMPORAL': 'Unión Temporal'
    };
    return tipos[tipo] || tipo;
  }

  descargarDocumento(documentoId: string): void {
    if (!this.contratista) {
      console.error('No hay contratista seleccionado');
      return;
    }
    
    this.contratistasService.descargarDocumento(this.contratista.id, documentoId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const doc = this.documentos.find(d => d.id === documentoId);
        a.download = doc?.nombreArchivo || 'documento';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error descargando documento:', error);
        // Opcional: mostrar mensaje de error al usuario
      }
    });
  }

  eliminarDocumento(documentoId: string): void {
    if (!this.contratista) {
      console.error('No hay contratista seleccionado');
      return;
    }
    
    if (confirm('¿Está seguro de eliminar este documento? Esta acción no se puede deshacer.')) {
      this.contratistasService.eliminarDocumento(this.contratista.id, documentoId).subscribe({
        next: () => {
          this.documentos = this.documentos.filter(doc => doc.id !== documentoId);
          console.log('Documento eliminado exitosamente');
          // Opcional: mostrar mensaje de éxito al usuario
        },
        error: (error) => {
          console.error('Error eliminando documento:', error);
          // Opcional: mostrar mensaje de error al usuario
        }
      });
    }
  }

  formatearTamano(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatearFecha(fecha: Date | string): string {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}