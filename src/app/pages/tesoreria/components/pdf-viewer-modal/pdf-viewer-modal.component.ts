import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, Renderer2 } from '@angular/core';
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
  @Input() title: string = 'Visualizador PDF';
  @Output() closed = new EventEmitter<void>();
  
  isOpen = false;
  pdfUrl: SafeResourceUrl | null = null;
  private objectUrl: string | null = null;
  private preventKeydownHandler: (e: KeyboardEvent) => void;

  constructor(
    private sanitizer: DomSanitizer,
    private renderer: Renderer2
  ) {
    this.preventKeydownHandler = this.preventKeydown.bind(this);
  }

  ngOnInit() {
    if (this.blob) {
      this.objectUrl = URL.createObjectURL(this.blob);
      
      // Agregar parámetros para ocultar la barra de herramientas del PDF
      const viewerUrl = `${this.objectUrl}#toolbar=0&navpanes=0&scrollbar=0`;
      
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
      this.isOpen = true;
      
      // Prevenir atajos de teclado
      document.addEventListener('keydown', this.preventKeydownHandler);
      
      // Prevenir menú contextual
      document.addEventListener('contextmenu', this.preventContextMenu);
    }
  }

  preventKeydown(e: KeyboardEvent) {
    // Prevenir Ctrl+S (Guardar)
    if ((e.ctrlKey && e.key === 's') || 
        // Prevenir Ctrl+P (Imprimir)
        (e.ctrlKey && e.key === 'p')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    return true;
  }

  preventContextMenu(e: MouseEvent) {
    e.preventDefault();
    return false;
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

  close() {
    this.isOpen = false;
    
    document.removeEventListener('keydown', this.preventKeydownHandler);
    document.removeEventListener('contextmenu', this.preventContextMenu);
    
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    setTimeout(() => {
      this.pdfUrl = null;
      this.closed.emit();
    }, 300);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.preventKeydownHandler);
    document.removeEventListener('contextmenu', this.preventContextMenu);
    
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }
}