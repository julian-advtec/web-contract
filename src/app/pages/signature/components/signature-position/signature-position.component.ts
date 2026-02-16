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
  private pageCache: Map<number, any> = new Map(); // Cache para páginas ya cargadas

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
      
      // Precargar la primera página
      const page = await this.pdfDoc.getPage(1);
      this.pageCache.set(1, page);
      
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

  async getPage(pageNum: number): Promise<any> {
    // Usar cache si ya tenemos la página
    if (this.pageCache.has(pageNum)) {
      return this.pageCache.get(pageNum);
    }
    
    // Si no está en cache, cargarla
    const page = await this.pdfDoc.getPage(pageNum);
    this.pageCache.set(pageNum, page);
    return page;
  }

  async renderPage(pageNum: number, drawMarker: boolean = true) {
    if (this.renderInProgress) return;
    
    if (!this.pdfDoc || !this.pdfCanvas) return;
    
    const canvas = this.pdfCanvas.nativeElement;
    if (!canvas) return;
    
    this.renderInProgress = true;
    
    try {
      const page = await this.getPage(pageNum);
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

  /**
   * Dibuja el marcador de la firma en el canvas
   * Las coordenadas son top-left (origen en esquina superior izquierda)
   */
  private drawMarkerOnly() {
    if (!this.canvasContext) return;
    
    this.canvasContext.save();
    
    // Configurar estilo del marcador
    this.canvasContext.strokeStyle = '#28a745';
    this.canvasContext.lineWidth = 3;
    this.canvasContext.setLineDash([10, 5]);
    
    // Rectángulo punteado - usa coordenadas top-left
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

  /**
   * Maneja el clic en el canvas para posicionar la firma
   * Guarda coordenadas top-left para el canvas
   */
  async onCanvasClick(event: MouseEvent) {
    if (!this.pdfCanvas || !this.pdfCanvas.nativeElement) return;
    
    const canvas = this.pdfCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Coordenadas top-left (origen en esquina superior izquierda)
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    this.selectedPosition = { 
      x: Math.round(x), 
      y: Math.round(y) 
    };
    
    // Emitir la posición convertida a bottom-left para el backend
    await this.emitPosition();
    
    // Redibujar la página con el nuevo marcador
    this.renderPage(this.selectedPage, true);
  }

  /**
   * Muestra guías de posición mientras el mouse se mueve
   */
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

  /**
   * Cambia de página en el PDF
   */
  async onPageChange() {
    if (!this.renderInProgress) {
      await this.renderPage(this.selectedPage, true);
    }
  }

  /**
   * Actualiza la posición cuando se modifican los inputs manualmente
   */
  async updatePosition() {
    await this.emitPosition();
    await this.renderPage(this.selectedPage, true);
  }

  /**
   * Emite la posición al componente padre
   * CONVIERTE las coordenadas de top-left (canvas) a bottom-left (pdf-lib)
   */
  private async emitPosition() {
    const canvas = this.pdfCanvas.nativeElement;
    const canvasHeight = canvas.height;
    
    try {
      // Obtener la página actual del PDF para conocer su tamaño real
      const page = await this.getPage(this.selectedPage);
      const viewport = page.getViewport({ scale: 1.0 }); // escala 1.0 para tamaño real
      const pdfHeight = viewport.height;
      const pdfWidth = viewport.width;
      
      // La relación entre el canvas y el PDF real
      const scaleY = canvas.height / pdfHeight;
      const scaleX = canvas.width / pdfWidth;
      
      // Convertir coordenadas considerando el tamaño real del PDF
      // La Y del canvas está en píxeles escalados, necesitamos convertir a puntos del PDF
      const yInPdfPoints = this.selectedPosition.y / scaleY;
      const xInPdfPoints = this.selectedPosition.x / scaleX;
      const heightInPdfPoints = this.signatureHeight / scaleY;
      const widthInPdfPoints = this.signatureWidth / scaleX;
      
      // Ahora convertir de top-left (canvas) a bottom-left (pdf-lib) usando puntos del PDF
      const yBottomLeft = pdfHeight - yInPdfPoints - heightInPdfPoints;
      
      console.log('=== DEBUG POSICIÓN FIRMA ===');
      console.log('📏 Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('📄 PDF dimensions (puntos):', pdfWidth, 'x', pdfHeight);
      console.log('🔍 Escala X:', scaleX, 'Y:', scaleY);
      console.log('👆 Y donde hiciste clic (canvas pixels):', this.selectedPosition.y);
      console.log('📐 Y en puntos PDF:', yInPdfPoints);
      console.log('📐 Altura firma en puntos PDF:', heightInPdfPoints);
      console.log('👇 Y bottom-left para pdf-lib:', yBottomLeft);
      console.log('============================');
      
      this.positionChange.emit({
        page: this.selectedPage,
        x: Math.round(xInPdfPoints),
        y: Math.round(yBottomLeft),
        width: Math.round(widthInPdfPoints),
        height: Math.round(heightInPdfPoints)
      });
      
    } catch (error) {
      console.error('Error al emitir posición:', error);
    }
  }

  /**
   * Cierra el selector de posición
   */
  close() {
    this.onClose.emit();
  }
}