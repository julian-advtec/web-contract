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
                this.errorMessage = error.message || 'Error al cargar el contratista';
                this.isLoading = false;
            }
        });
    }

    descargarDocumento(documento: DocumentoContratista): void {
        if (!this.contratista) return;

        this.contratistaService.descargarDocumento(this.contratista.id, documento.id).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = documento.nombreArchivo;
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: (error: any) => {
                console.error('Error descargando documento:', error);
            }
        });
    }

    eliminarDocumento(documento: DocumentoContratista): void {
        if (!this.contratista) return;

        if (confirm(`¿Eliminar el documento "${documento.nombreArchivo}"?`)) {
            this.contratistaService.eliminarDocumento(this.contratista.id, documento.id).subscribe({
                next: () => {
                    this.documentos = this.documentos.filter(d => d.id !== documento.id);
                },
                error: (error: any) => {
                    this.errorMessage = error.message || 'Error al eliminar el documento';
                }
            });
        }
    }

    getEstadoClass(estado: string | undefined): string {
        const clases: Record<string, string> = {
            'ACTIVO': 'active',
            'INACTIVO': 'inactive',
            'SUSPENDIDO': 'warning'
        };
        return clases[estado || ''] || 'pending';
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

    formatearTamaño(bytes: number): string {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    formatearFecha(fecha: Date | string | undefined): string {
        if (!fecha) return 'N/A';
        return new Date(fecha).toLocaleDateString('es-CO');
    }

    getTipoDocumentoLabel(tipo: string): string {
        const tipos: Record<string, string> = {
            'CEDULA': 'Cédula',
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
            'RUT': 'RUT',
            'SARLAFT': 'SARLAFT',
            'SEGURIDAD_SOCIAL': 'Seguridad Social',
            'TARJETA_PROFESIONAL': 'Tarjeta Profesional'
        };
        return tipos[tipo] || tipo;
    }

    volver(): void {
        this.router.navigate(['/contratistas/list']);
    }

    editar(): void {
        if (this.contratista) {
            this.router.navigate(['/contratistas/editar', this.contratista.id]);
        }
    }

    formatearTamano(bytes: number): string {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}