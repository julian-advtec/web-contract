// src/app/modules/radicacion/components/contratos-list/contratos-list.component.ts
import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JuridicaService } from '../../../../core/services/juridica.service';
import { Subscription } from 'rxjs';

export interface ContratoSeleccionado {
  id: string;
  numeroContrato: string;
  proveedor: {
    id: string;
    nombreRazonSocial: string;
    numeroIdentificacion: string;
    tipoIdentificacion: string;
    direccion: string;
    telefono: string;  // ✅ Ya existe
    email: string;      // ✅ Ya existe
  };
  fechaInicio: Date;
  fechaTerminacion: Date;
  fechaFirma: Date;
  objeto: string;
  valor: number;
  valorTotal: number;
  estado: string;
  vigencia: string;
  tipoContrato: string;
  supervisor: string;
  cdp: string;
  rp: string;
  adiciones: number;
}

@Component({
  selector: 'app-contratos-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contratos-list.component.html',
  styleUrls: ['./contratos-list.component.scss']
})
export class ContratosListComponent implements OnInit, OnDestroy {
  @Output() volver = new EventEmitter<void>();

  contratos: ContratoSeleccionado[] = [];
  contratosFiltrados: ContratoSeleccionado[] = [];
  isLoading = true;
  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'warning' = 'success';

  filtros = {
    vigencia: '',
    numeroContrato: '',
    proveedorNombre: '',
    proveedorDocumento: '',
    estado: ''
  };

  estadosDisponibles = [
    'BORRADOR',
    'EN_APROBACION',
    'FIRMADO',
    'EN_EJECUCION',
    'TERMINADO',
    'LIQUIDADO',
    'SUSPENDIDO'
  ];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private juridicaService: JuridicaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarContratos();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  cargarContratos(): void {
    this.isLoading = true;
    this.mensaje = 'Cargando contratos...';

    this.subscriptions.add(
      this.juridicaService.obtenerContratos().subscribe({
        next: (contratos) => {
          console.log('📋 Contratos recibidos:', contratos);
          
          if (contratos && contratos.length > 0) {
            this.contratos = contratos.map(contrato => {
              const fechaInicio = typeof contrato.fechaInicio === 'string' 
                ? new Date(contrato.fechaInicio) 
                : contrato.fechaInicio;
              const fechaTerminacion = typeof contrato.fechaTerminacion === 'string' 
                ? new Date(contrato.fechaTerminacion) 
                : contrato.fechaTerminacion;
              const fechaFirma = typeof contrato.fechaFirma === 'string' 
                ? new Date(contrato.fechaFirma) 
                : contrato.fechaFirma;
              
              return {
                id: contrato.id,
                numeroContrato: contrato.numeroContrato,
                proveedor: {
                  id: (contrato.proveedor as any)?.id || '',
                  nombreRazonSocial: contrato.proveedor?.nombreRazonSocial || '',
                  numeroIdentificacion: contrato.proveedor?.numeroIdentificacion || '',
                  tipoIdentificacion: contrato.proveedor?.tipoIdentificacion || '',
                  direccion: contrato.proveedor?.direccion || '',
                  telefono: contrato.proveedor?.telefono || '',
                  email: contrato.proveedor?.email || ''
                },
                fechaInicio: fechaInicio,
                fechaTerminacion: fechaTerminacion,
                fechaFirma: fechaFirma,
                objeto: contrato.objeto,
                valor: contrato.valor,
                valorTotal: contrato.valorTotal,
                estado: contrato.estado,
                vigencia: contrato.vigencia,
                tipoContrato: contrato.tipoContrato,
                supervisor: contrato.supervisor || '',
                cdp: contrato.cdp || '',
                rp: contrato.rp || '',
                adiciones: contrato.adiciones || 0
              };
            });
            
            this.contratosFiltrados = [...this.contratos];
            this.mensaje = `✅ ${this.contratos.length} contratos cargados`;
            this.tipoMensaje = 'success';
          } else {
            this.mensaje = 'No hay contratos disponibles';
            this.tipoMensaje = 'warning';
          }
          
          this.isLoading = false;
          
          setTimeout(() => {
            if (this.mensaje.includes('contratos cargados')) {
              this.mensaje = '';
            }
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Error cargando contratos:', error);
          this.mensaje = 'Error al cargar los contratos: ' + (error.message || 'Error desconocido');
          this.tipoMensaje = 'error';
          this.isLoading = false;
        }
      })
    );
  }

  aplicarFiltros(): void {
    this.contratosFiltrados = this.contratos.filter(contrato => {
      let cumple = true;

      if (this.filtros.vigencia && contrato.vigencia !== this.filtros.vigencia) {
        cumple = false;
      }

      if (this.filtros.numeroContrato && 
          !contrato.numeroContrato.toLowerCase().includes(this.filtros.numeroContrato.toLowerCase())) {
        cumple = false;
      }

      if (this.filtros.proveedorNombre && 
          !contrato.proveedor.nombreRazonSocial.toLowerCase().includes(this.filtros.proveedorNombre.toLowerCase())) {
        cumple = false;
      }

      if (this.filtros.proveedorDocumento && 
          !contrato.proveedor.numeroIdentificacion.includes(this.filtros.proveedorDocumento)) {
        cumple = false;
      }

      if (this.filtros.estado && contrato.estado !== this.filtros.estado) {
        cumple = false;
      }

      return cumple;
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      vigencia: '',
      numeroContrato: '',
      proveedorNombre: '',
      proveedorDocumento: '',
      estado: ''
    };
    this.contratosFiltrados = [...this.contratos];
  }

seleccionarContrato(contrato: ContratoSeleccionado): void {
  console.log('📝 Contrato seleccionado:', contrato);
  console.log('📧 Email del proveedor:', contrato.proveedor.email);
  console.log('📞 Teléfono del proveedor:', contrato.proveedor.telefono);
  
  // Guardar el contrato en localStorage
  localStorage.setItem('contratoPrecargado', JSON.stringify(contrato));
  
  // Redirigir a la página de nuevo radicado
  this.router.navigate(['/radicacion/nuevo']);
}

  formatearFecha(fecha: Date | string): string {
    if (!fecha) return 'No definida';
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return fechaObj.toLocaleDateString('es-CO');
  }

  formatearValor(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      'BORRADOR': 'badge-secondary',
      'EN_APROBACION': 'badge-warning',
      'FIRMADO': 'badge-info',
      'EN_EJECUCION': 'badge-success',
      'TERMINADO': 'badge-primary',
      'LIQUIDADO': 'badge-dark',
      'SUSPENDIDO': 'badge-danger'
    };
    return clases[estado] || 'badge-secondary';
  }

  volverAtras(): void {
    this.volver.emit();
  }
}