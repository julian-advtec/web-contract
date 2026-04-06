// src/app/pages/juridica/components/juridica-documentos/juridica-documentos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JuridicaService } from '../../../../core/services/juridica.service';
import { Contrato } from '../../../../core/models/juridica.model';

@Component({
  selector: 'app-juridica-documentos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './juridica-documentos.component.html',
  styleUrls: ['./juridica-documentos.component.scss']
})
export class JuridicaDocumentosComponent implements OnInit {
  contrato: Contrato | null = null;
  isLoading = false;
  errorMessage = '';
  contratoId: string = '';

  documentosList = [
    { tipo: 'CONTRATO_FIRMADO', label: 'Contrato Firmado', icon: 'fa-file-signature', required: true },
    { tipo: 'CDP', label: 'CDP - Certificado Disponibilidad', icon: 'fa-file-invoice', required: false },
    { tipo: 'RP', label: 'RP - Registro Presupuestal', icon: 'fa-file-invoice-dollar', required: false },
    { tipo: 'POLIZA_CUMPLIMIENTO', label: 'Póliza de Cumplimiento', icon: 'fa-shield-alt', required: true },
    { tipo: 'POLIZA_CALIDAD', label: 'Póliza de Calidad', icon: 'fa-check-circle', required: false },
    { tipo: 'POLIZA_RC', label: 'Póliza RC', icon: 'fa-gavel', required: false },
    { tipo: 'GARANTIA', label: 'Garantía', icon: 'fa-handshake', required: false },
    { tipo: 'OTRO', label: 'Otros Documentos', icon: 'fa-file-alt', required: false }
  ];

  constructor(
    private juridicaService: JuridicaService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.contratoId = this.route.snapshot.paramMap.get('id') || '';
    if (this.contratoId) {
      this.cargarContrato();
    }
  }

  cargarContrato(): void {
    this.isLoading = true;
    this.juridicaService.obtenerContratoPorId(this.contratoId).subscribe({
      next: (contrato) => {
        this.contrato = contrato;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando contrato:', error);
        this.errorMessage = 'Error al cargar el contrato';
        this.isLoading = false;
      }
    });
  }

  descargarDocumento(tipo: string): void {
    // Implementar descarga cuando el backend esté listo
    console.log('Descargar documento:', tipo);
    // TODO: Conectar con el endpoint de descarga
  }

  verDocumento(tipo: string): void {
    // Implementar visualización cuando el backend esté listo
    console.log('Ver documento:', tipo);
    // TODO: Abrir modal o nueva pestaña con el PDF
  }

  volver(): void {
    this.router.navigate(['/juridica/list']);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }
}