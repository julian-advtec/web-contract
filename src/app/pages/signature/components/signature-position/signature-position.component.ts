import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as pdfjsLib from 'pdfjs-dist';

export interface SignaturePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-signature-position',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signature-position.component.html',
  styleUrls: ['./signature-position.component.scss']
})
export class SignaturePositionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() pdfFile: File | null = null;
  @Input() signatureName: string = 'Firma';
  @Output() positionChange = new EventEmitter<SignaturePosition>();
  @Output() onClose = new EventEmitter<void>();

  pdfUrl: string | null = null;
  pdfDoc: any = null;
  pages: number[] = [];
  selectedPage: number = 1;
  
  selectedPosition = { x: 150, y: 150 };
  signatureWidth = 200;
  signatureHeight = 80;
  
  mouseX = 0;
  mouseY = 0;
  showGuide = false;
  isLoading = false;
  errorMessage: string | null = null;

  private canvasContext: CanvasRenderingContext2D | null = null;
  private canvasReady = false;
  private pdfLoaded = false;
  private renderInProgress = false;

  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  async ngOnInit() {
    if (this.pdfFile) {
      await this.loadPdf();
    } else {
      this.errorMessage = 'No se ha proporcionado un archivo PDF';
    }
  }

  ngAfterViewInit() {
    this.canvasReady = true;
    
    if (this.pdfLoaded && this.pdfDoc && this.selectedPage && !this.renderInProgress) {
      this.renderPage(this.selectedPage, true);
    }
  }

  ngOnDestroy() {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
    }
  }

  async loadPdf() {
    if (!this.pdfFile) {
      this.errorMessage = 'No hay archivo PDF';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;
    
    try {
      this.pdfUrl = URL.createObjectURL(this.pdfFile);
      
      const loadingTask = pdfjsLib.getDocument(this.pdfUrl);
      this.pdfDoc = await loadingTask.promise;
      this.pdfLoaded = true;
      
      this.pages = Array.from({ length: this.pdfDoc.numPages }, (_, i) => i + 1);
      
      setTimeout(() => {
        if (this.pdfCanvas && !this.renderInProgress) {
          this.renderPage(1, true);
        }
      }, 300);
      
    } catch (error) {
      this.errorMessage = 'Error al cargar el PDF. Por favor intenta de nuevo.';
    } finally {
      this.isLoading = false;
    }
  }

  async renderPage(pageNum: number, drawMarker: boolean = true) {
    if (this.renderInProgress) return;
    
    if (!this.pdfDoc || !this.pdfCanvas) return;
    
    const canvas = this.pdfCanvas.nativeElement;
    if (!canvas) return;
    
    this.renderInProgress = true;
    
    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const context = canvas.getContext('2d');
      
      if (!context) {
        this.renderInProgress = false;
        return;
      }
      
      this.canvasContext = context;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      if (drawMarker) {
        this.drawMarkerOnly();
      }
      
    } catch (error) {
      this.errorMessage = 'Error al renderizar la página';
    } finally {
      this.renderInProgress = false;
    }
  }

  // Nuevo método: SOLO dibuja el marcador sin re-renderizar
  private drawMarkerOnly() {
    if (!this.canvasContext) return;
    
    // Limpiar cualquier marcador anterior dibujando un rectángulo blanco sobre el área
    // Pero mejor, confiamos en que la página recién renderizada no tiene marcador
    
    this.canvasContext.save();
    
    // Configurar estilo del marcador
    this.canvasContext.strokeStyle = '#28a745';
    this.canvasContext.lineWidth = 3;
    this.canvasContext.setLineDash([10, 5]);
    
    // Rectángulo punteado
    this.canvasContext.strokeRect(
      this.selectedPosition.x,
      this.selectedPosition.y,
      this.signatureWidth,
      this.signatureHeight
    );
    
    // Texto "Firma"
    this.canvasContext.font = 'bold 14px Arial';
    this.canvasContext.fillStyle = '#28a745';
    this.canvasContext.fillText(
      this.signatureName,
      this.selectedPosition.x + 10,
      this.selectedPosition.y + 30
    );
    
    // Icono de firma
    this.canvasContext.font = '20px "Font Awesome 6 Free"';
    this.canvasContext.fillStyle = '#28a745';
    this.canvasContext.fillText(
      '',
      this.selectedPosition.x + 10,
      this.selectedPosition.y + 60
    );
    
    this.canvasContext.restore();
  }

  onCanvasClick(event: MouseEvent) {
    if (!this.pdfCanvas || !this.pdfCanvas.nativeElement) return;
    
    const canvas = this.pdfCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    this.selectedPosition = { 
      x: Math.round(x), 
      y: Math.round(y) 
    };
    
    // Emitir la nueva posición
    this.emitPosition();
    
    // Redibujar la página para limpiar marcadores anteriores y dibujar el nuevo
    this.renderPage(this.selectedPage, true);
  }

  onCanvasMouseMove(event: MouseEvent) {
    if (!this.pdfCanvas || !this.pdfCanvas.nativeElement) return;
    
    const canvas = this.pdfCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    this.mouseX = (event.clientX - rect.left) * scaleX;
    this.mouseY = (event.clientY - rect.top) * scaleY;
    this.showGuide = true;
  }

  onPageChange() {
    if (!this.renderInProgress) {
      this.renderPage(this.selectedPage, true);
    }
  }

  updatePosition() {
    this.renderPage(this.selectedPage, true);
  }

  private emitPosition() {
    this.positionChange.emit({
      page: this.selectedPage,
      x: this.selectedPosition.x,
      y: this.selectedPosition.y,
      width: this.signatureWidth,
      height: this.signatureHeight
    });
  }

  close() {
    this.onClose.emit();
  }
}