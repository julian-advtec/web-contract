// src/app/pages/contratistas/components/contratista-detalle/contratista-detalle.component.ts

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
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contratistaService: ContratistasService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarContratista(id);
    } else {
      this.router.navigate(['/contratistas/list']);
    }
  }

  cargarContratista(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.contratistaService.obtenerCompleto(id).subscribe({
      next: (data: any) => {
        if (data) {
          this.contratista = data;
          this.documentos = data.documentos || [];
        } else {
          this.errorMessage = 'Contratista no encontrado';
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error cargando contratista:', error);
        this.errorMessage = error.message || 'Error al cargar el contratista';
        this.isLoading = false;
      }
    });
  }

  editar(): void {
    if (this.contratista) {
      this.router.navigate(['/contratistas/editar', this.contratista.id]);
    }
  }

  volver(): void {
    this.router.navigate(['/contratistas/list']);
  }

  // ✅ DESCARGAR TODOS LOS DOCUMENTOS
  descargarTodosDocumentos(): void {
    if (!this.contratista || !this.contratista.id) {
      this.errorMessage = 'No se puede descargar los documentos';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    if (this.documentos.length === 0) {
      this.errorMessage = 'Este contratista no tiene documentos asociados';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.isLoading = true;
    this.successMessage = 'Preparando descarga...';

    console.log(`📦 Solicitando descarga de todos los documentos para: ${this.contratista.razonSocial}`);

    this.contratistaService.descargarTodosDocumentos(this.contratista.id).subscribe({
      next: (blob: Blob) => {
        console.log(`✅ ZIP recibido, tamaño: ${blob.size} bytes, tipo: ${blob.type}`);
        
        // Verificar que el blob no esté vacío
        if (blob.size === 0) {
          this.errorMessage = 'El archivo ZIP está vacío';
          this.isLoading = false;
          setTimeout(() => this.errorMessage = '', 3000);
          return;
        }
        
        // Crear URL del blob
        const url = window.URL.createObjectURL(blob);
        
        // Nombre del archivo
        const nombreContratista = (this.contratista!.razonSocial || 'contratista')
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase()
          .substring(0, 50);
        const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fileName = `documentos_${nombreContratista}_${fecha}.zip`;
        
        // Forzar descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        this.successMessage = `Se han descargado ${this.documentos.length} documentos (${(blob.size / 1024 / 1024).toFixed(2)} MB)`;
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error: any) => {
        console.error('Error descargando documentos:', error);
        this.errorMessage = error.error?.message || 'Error al descargar los documentos';
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  // ✅ DESCARGAR DOCUMENTO INDIVIDUAL
  descargarDocumento(documento: DocumentoContratista): void {
    if (!this.contratista) {
      this.errorMessage = 'No se puede descargar el documento';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.contratistaService.descargarDocumento(this.contratista.id, documento.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = documento.nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.successMessage = 'Documento descargado exitosamente';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('Error descargando documento:', error);
        this.errorMessage = error.message || 'Error al descargar el documento';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  // Métodos auxiliares
  getEstadoClass(estado: string | undefined): string {
    const clases: Record<string, string> = {
      'ACTIVO': 'bg-success',
      'INACTIVO': 'bg-secondary',
      'SUSPENDIDO': 'bg-warning'
    };
    return clases[estado || ''] || 'bg-secondary';
  }

  getEstadoTexto(estado: string | undefined): string {
    const textos: Record<string, string> = {
      'ACTIVO': 'Activo',
      'INACTIVO': 'Inactivo',
      'SUSPENDIDO': 'Suspendido'
    };
    return textos[estado || ''] || estado || 'N/A';
  }

  getTipoTexto(tipo: string | undefined): string {
    const textos: Record<string, string> = {
      'PERSONA_NATURAL': 'Persona Natural',
      'PERSONA_JURIDICA': 'Persona Jurídica',
      'CONSORCIO': 'Consorcio',
      'UNION_TEMPORAL': 'Unión Temporal'
    };
    return textos[tipo || ''] || tipo || 'N/A';
  }

  getTipoDocumentoLabel(tipo: string): string {
    const tipos: Record<string, string> = {
      'CEDULA': 'Cédula de Ciudadanía',
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

  formatearTamano(bytes: number): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}