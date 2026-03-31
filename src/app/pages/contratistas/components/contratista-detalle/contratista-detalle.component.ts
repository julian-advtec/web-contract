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
  contratistaId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contratistaService: ContratistasService
  ) {}

  ngOnInit(): void {
    this.contratistaId = this.route.snapshot.paramMap.get('id');
    if (this.contratistaId) {
      this.cargarContratista();
      this.cargarDocumentos();
    } else {
      this.isLoading = false;
    }
  }

  cargarContratista(): void {
    if (!this.contratistaId) return;
    
    this.contratistaService.obtenerCompleto(this.contratistaId).subscribe({
      next: (data) => {
        this.contratista = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando contratista:', error);
        this.isLoading = false;
      }
    });
  }

  cargarDocumentos(): void {
    if (!this.contratistaId) return;
    
    this.contratistaService.obtenerDocumentos(this.contratistaId).subscribe({
      next: (docs) => {
        this.documentos = docs;
      },
      error: (error) => {
        console.error('Error cargando documentos:', error);
      }
    });
  }

  getTipoDocumentoLabel(tipo: string): string {
    const tipos: Record<string, string> = {
      'CC': 'Cédula de Ciudadanía',
      'NIT': 'NIT',
      'CE': 'Cédula de Extranjería',
      'PAS': 'Pasaporte'
    };
    return tipos[tipo] || tipo;
  }

  getTipoContratistaLabel(tipo: string): string {
    const tipos: Record<string, string> = {
      'PERSONA_NATURAL': 'Persona Natural',
      'PERSONA_JURIDICA': 'Persona Jurídica',
      'CONSORCIO': 'Consorcio',
      'UNION_TEMPORAL': 'Unión Temporal'
    };
    return tipos[tipo] || tipo;
  }

  getTipoDocumentoLabelDoc(tipo: string): string {
    const tipos: Record<string, string> = {
      'CEDULA': 'Cédula',
      'RUT': 'RUT',
      'CERTIFICADO_BANCARIO': 'Certificado Bancario',
      'CERTIFICADO_EXPERIENCIA': 'Certificado de Experiencia',
      'CERTIFICADO_NO_PLANTA': 'Certificado No Planta',
      'CERTIFICADO_ANTECEDENTES': 'Certificado de Antecedentes',
      'CERTIFICADO_IDONEIDAD': 'Certificado de Idoneidad',
      'DECLARACION_BIENES': 'Declaración de Bienes',
      'DECLARACION_INHABILIDADES': 'Declaración de Inhabilidades',
      'EXAMEN_INGRESO': 'Examen de Ingreso',
      'GARANTIA': 'Garantía',
      'HOJA_VIDA_SIGEP': 'Hoja de Vida SIGEP',
      'LIBRETA_MILITAR': 'Libreta Militar',
      'PANTALLAZO_SECOP': 'Pantallazo SECOP',
      'PROPUESTA': 'Propuesta',
      'PUBLICACION_GT': 'Publicación GT',
      'REDAM': 'REDAM',
      'SARLAFT': 'SARLAFT',
      'SEGURIDAD_SOCIAL': 'Seguridad Social',
      'TARJETA_PROFESIONAL': 'Tarjeta Profesional'
    };
    return tipos[tipo] || tipo;
  }

  formatearFecha(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO');
  }

  formatearTamano(bytes: number): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  editarContratista(): void {
    if (this.contratistaId) {
      this.router.navigate(['/contratistas/edit', this.contratistaId]);
    }
  }

  descargarDocumento(documentoId: string): void {
    if (!this.contratistaId) return;
    
    this.contratistaService.descargarDocumento(this.contratistaId, documentoId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'documento.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error descargando documento:', error);
      }
    });
  }

  eliminarDocumento(documentoId: string): void {
    if (!this.contratistaId) return;
    if (confirm('¿Está seguro de eliminar este documento?')) {
      this.contratistaService.eliminarDocumento(this.contratistaId, documentoId).subscribe({
        next: () => {
          this.cargarDocumentos();
        },
        error: (error) => {
          console.error('Error eliminando documento:', error);
        }
      });
    }
  }

  volver(): void {
    this.router.navigate(['/contratistas/list']);
  }
}