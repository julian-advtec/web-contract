import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { Contratista } from '../../../../core/models/contratista.model';

@Component({
  selector: 'app-contratista-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contratista-list.component.html',
  styleUrls: ['./contratista-list.component.scss']
})
export class ContratistaListComponent implements OnInit {
  contratistas: Contratista[] = [];
  contratistasFiltrados: Contratista[] = [];
  isLoading = true;
  terminoBusqueda = '';
  errorMessage = '';
  successMessage = '';

  constructor(
    private router: Router,
    private contratistaService: ContratistasService
  ) {}

  ngOnInit(): void {
    this.cargarContratistas();
  }

  cargarContratistas(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.contratistaService.obtenerTodos().subscribe({
      next: (contratistas) => {
        this.contratistas = contratistas;
        this.contratistasFiltrados = [...contratistas];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando contratistas:', error);
        this.errorMessage = 'Error al cargar la lista de contratistas';
        this.isLoading = false;
      }
    });
  }

  buscar(): void {
    const term = this.terminoBusqueda.toLowerCase().trim();
    if (!term) {
      this.contratistasFiltrados = [...this.contratistas];
      return;
    }

    this.contratistasFiltrados = this.contratistas.filter(c => 
      c.documentoIdentidad?.toLowerCase().includes(term) ||
      (c.razonSocial || '').toLowerCase().includes(term) ||
      (c.representanteLegal || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.telefono || '').toLowerCase().includes(term)
    );
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.buscar();
  }

  recargar(): void {
    this.cargarContratistas();
  }

  getTipoContratistaLabel(tipo: string | undefined): string {
    if (!tipo) return '-';
    
    const tipos: Record<string, string> = {
      'PERSONA_NATURAL': 'Persona Natural',
      'PERSONA_JURIDICA': 'Persona Jurídica',
      'CONSORCIO': 'Consorcio',
      'UNION_TEMPORAL': 'Unión Temporal'
    };
    return tipos[tipo] || tipo;
  }

  verDetalle(id: string): void {
    this.router.navigate(['/contratistas/detail', id]);
  }

  editarContratista(id: string): void {
    this.router.navigate(['/contratistas/edit', id]);
  }

  nuevoContratista(): void {
    this.router.navigate(['/contratistas/crear']);
  }

  cambiarEstado(contratista: Contratista): void {
    const nuevoEstado = contratista.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const mensaje = contratista.estado === 'ACTIVO' 
      ? `¿Está seguro de desactivar a "${contratista.razonSocial}"?`
      : `¿Está seguro de activar a "${contratista.razonSocial}"?`;
    
    if (confirm(mensaje)) {
      const updateData: any = { estado: nuevoEstado };
      this.contratistaService.actualizarContratista(contratista.id, updateData).subscribe({
        next: () => {
          this.successMessage = `Contratista ${nuevoEstado === 'ACTIVO' ? 'activado' : 'desactivado'} exitosamente`;
          this.cargarContratistas();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error cambiando estado:', error);
          this.errorMessage = 'Error al cambiar el estado del contratista';
          setTimeout(() => this.errorMessage = '', 3000);
        }
      });
    }
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }
}