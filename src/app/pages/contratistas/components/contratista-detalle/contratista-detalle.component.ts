import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
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