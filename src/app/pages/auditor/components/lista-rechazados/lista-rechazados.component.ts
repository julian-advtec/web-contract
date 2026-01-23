import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditorService } from '../../../../core/services/auditor.service';
import { Documento } from '../../../../core/models/documento.model';

@Component({
  selector: 'app-lista-rechazados',
  templateUrl: './lista-rechazados.component.html',
  styleUrls: ['./lista-rechazados.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ListaRechazadosComponent implements OnInit {
  documentos: Documento[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(private auditorService: AuditorService) {}

  ngOnInit(): void {
    
  }

 
  verDetalle(id: string): void {
    // Ejemplo: navegar al detalle
    // this.router.navigate(['/auditor/revisar', id]);
  }
}