import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer-modal.component.html',
  styleUrls: ['./pdf-viewer-modal.component.scss']
})
export class PdfViewerModalComponent implements OnInit, OnDestroy {
  @Input() blob: Blob | null = null;
  @Input() title: string = 'Visualizador de PDF';
  @Output() closed = new EventEmitter<void>();

  isOpen = false;
  pdfUrl: SafeResourceUrl | null = null;
  error: string | null = null;
  private objectUrl: string | null = null;

  private preventContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    return false;
  };

  private preventShortcuts = (e: KeyboardEvent) => {
    // Bloquear Ctrl+S (guardar), Ctrl+P (imprimir)
    if ((e.ctrlKey && (e.key === 's' || e.key === 'p')) ||
        (e.metaKey && (e.key === 's' || e.key === 'p'))) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    return true;
  };

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    if (this.blob) {
      this.objectUrl = URL.createObjectURL(this.blob);
      
      // Parámetros para ocultar barra de herramientas del visor nativo
      const viewerUrl = `${this.objectUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
      
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
      this.isOpen = true;

      // Protección anti-descarga/copia
      document.addEventListener('contextmenu', this.preventContextMenu);
      document.addEventListener('keydown', this.preventShortcuts);
    } else {
      this.error = 'No se proporcionó ningún archivo PDF';
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

  close(): void {
    this.isOpen = false;

    // Limpieza de eventos
    document.removeEventListener('contextmenu', this.preventContextMenu);
    document.removeEventListener('keydown', this.preventShortcuts);

    // Revocar URL para liberar memoria
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    // Limpiar URL segura
    this.pdfUrl = null;

    // Emitir evento al padre
    setTimeout(() => {
      this.closed.emit();
    }, 300); // Dar tiempo a la animación de cierre
  }

  ngOnDestroy(): void {
    this.close(); // Asegurar limpieza si se destruye sin cerrar
  }
}