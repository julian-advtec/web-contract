import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JuridicaService } from '../../../../core/services/juridica.service';
import { Contrato } from '../../../../core/models/juridica.model';
import { FilterCriticosPipe } from './filter-criticos.pipe'; // ✅ Importar pipe

@Component({
  selector: 'app-juridica-stats',
  standalone: true,
  imports: [CommonModule, RouterModule, FilterCriticosPipe], // ✅ Agregar a imports
  templateUrl: './juridica-stats.component.html',
  styleUrls: ['./juridica-stats.component.scss']
})
export class JuridicaStatsComponent implements OnInit {
  loading = true;
  errorMessage = '';
  
  contratos: Contrato[] = [];
  stats: any = {
    total: 0,
    porEstado: {},
    valorTotal: 0,
    contratosCriticos: 0,
    proximosAVencer: 0,
    conAnticipo: 0
  };

  constructor(private juridicaService: JuridicaService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.juridicaService.obtenerContratos().subscribe({
      next: (contratos) => {
        this.contratos = contratos || [];
        this.calcularEstadisticas();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar las estadísticas';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  private calcularEstadisticas(): void {
    this.stats.total = this.contratos.length;
    this.stats.valorTotal = this.contratos.reduce((sum, c) => sum + c.valorTotal, 0);
    this.stats.valorPromedio = this.stats.total > 0 ? this.stats.valorTotal / this.stats.total : 0;
    
    // Contar por estado
    this.stats.porEstado = this.contratos.reduce((acc: any, c) => {
      acc[c.estado] = (acc[c.estado] || 0) + 1;
      return acc;
    }, {});

    // Contratos con anticipo
    this.stats.conAnticipo = this.contratos.filter(c => c.seDesembolsaAnticipo).length;

    // Contratos críticos (menos de 30 días)
    this.stats.contratosCriticos = this.contratos.filter(c => 
      this.getDiasRestantes(c.fechaTerminacion) !== null && 
      this.getDiasRestantes(c.fechaTerminacion)! < 30
    ).length;

    // Próximos a vencer (30-60 días)
    this.stats.proximosAVencer = this.contratos.filter(c => {
      const dias = this.getDiasRestantes(c.fechaTerminacion);
      return dias !== null && dias >= 30 && dias <= 60;
    }).length;

    // Distribución por vigencia
    this.stats.porVigencia = this.contratos.reduce((acc: any, c) => {
      acc[c.vigencia] = (acc[c.vigencia] || 0) + 1;
      return acc;
    }, {});
  }

  getDiasRestantes(fechaTerminacion: Date | string): number | null {
    if (!fechaTerminacion) return null;
    const hoy = new Date();
    const fin = new Date(fechaTerminacion);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  getEstadoColor(estado: string): string {
    const colores: Record<string, string> = {
      'BORRADOR': '#6c757d',
      'EN_APROBACION': '#17a2b8',
      'FIRMADO': '#007bff',
      'EN_EJECUCION': '#28a745',
      'TERMINADO': '#ffc107',
      'LIQUIDADO': '#343a40',
      'SUSPENDIDO': '#dc3545'
    };
    return colores[estado] || '#6c757d';
  }

  getEstadoTexto(estado: string): string {
    const textos: Record<string, string> = {
      'BORRADOR': 'Borrador',
      'EN_APROBACION': 'En Aprobación',
      'FIRMADO': 'Firmado',
      'EN_EJECUCION': 'En Ejecución',
      'TERMINADO': 'Terminado',
      'LIQUIDADO': 'Liquidado',
      'SUSPENDIDO': 'Suspendido'
    };
    return textos[estado] || estado;
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CO').format(valor);
  }

  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  refresh(): void {
    this.cargarDatos();
  }
}