import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { Documento } from '../../../../core/models/documento.model';

@Component({
  selector: 'app-radicacion-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './radicacion-list.component.html',
  styleUrls: ['./radicacion-list.component.scss']
})
export class RadicacionListComponent implements OnInit {
  @Output() nuevoRadicado = new EventEmitter<void>();
  @Input() sidebarCollapsed = false;

  documentos: Documento[] = [];
  filteredDocumentos: Documento[] = [];
  paginatedDocumentos: Documento[] = [];
  isLoading = false;
  searchTerm = '';
  
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  pages: number[] = [];

  // Propiedades para manejo de errores y estado
  errorMessage = '';
  showError = false;
  showSuccess = false;
  successMessage = '';
  usingMockData = false;
  puedeRadicar = false;

  constructor(
    private radicacionService: RadicacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔄 Inicializando componente de lista de radicación...');
    this.verificarAutenticacionYPermisos();
    this.loadDocumentos();
  }

  verificarAutenticacionYPermisos(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    console.log('🔐 Verificación de autenticación:', {
      tokenPresente: !!token,
      usuarioPresente: !!userStr
    });

    if (!token) {
      console.warn('⚠️ Usuario no autenticado.');
      this.errorMessage = 'No estás autenticado. Por favor inicia sesión.';
      this.showError = true;
      return;
    }

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('👤 Usuario autenticado:', {
          username: user.username,
          role: user.role
        });
        
        // Determinar si puede radicar
        this.puedeRadicar = user.role === 'RADICADOR' || user.role === 'ADMIN' || user.role === 'radicador' || user.role === 'admin';
        
        // Verificar permisos para debug
        this.radicacionService.debugUserInfo().subscribe({
          next: (info) => {
            console.log('✅ Info de debug del usuario:', info);
          },
          error: (error) => {
            console.warn('⚠️ No se pudo obtener info de debug:', error);
          }
        });
        
      } catch (e) {
        console.error('❌ Error parseando usuario:', e);
      }
    }
  }

  loadDocumentos(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.showError = false;
    this.usingMockData = false;

    console.log('📥 Solicitando documentos al servidor...');

    this.radicacionService.obtenerDocumentos().subscribe({
      next: (documentos) => {
        console.log('✅ Documentos recibidos del servidor:', documentos);
        
        // Asegurar que documentos sea un array
        const documentosArray = Array.isArray(documentos) ? documentos : [];
        
        console.log(`📊 Total de documentos: ${documentosArray.length}`);
        
        this.documentos = documentosArray;
        this.filteredDocumentos = [...documentosArray];
        this.updatePagination();
        this.isLoading = false;
        
        if (documentosArray.length === 0) {
          console.log('📭 No hay documentos radicados aún');
          this.showSuccess = true;
          this.successMessage = 'No hay documentos radicados. ¡Comienza radicando uno nuevo!';
          
          setTimeout(() => {
            this.showSuccess = false;
          }, 3000);
        } else {
          this.showSuccess = true;
          this.successMessage = `Se encontraron ${documentosArray.length} documentos`;
          
          // Ocultar mensaje después de 3 segundos
          setTimeout(() => {
            this.showSuccess = false;
          }, 3000);
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar documentos:', {
          message: error.message,
          status: error.status
        });
        
        this.isLoading = false;
        
        // Manejo específico de errores de autenticación
        if (error.status === 401 || error.message.includes('401') || error.message.includes('autenticación') || error.message.includes('Sesión expirada')) {
          this.errorMessage = 'Error de autenticación. Tu sesión ha expirado. Redirigiendo al login...';
          this.showError = true;
          
          // Redirigir al login después de 2 segundos
          setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/auth/login']);
          }, 2000);
          
        } else if (error.status === 403 || error.message.includes('403') || error.message.includes('permisos')) {
          this.errorMessage = 'No tienes permisos para ver los documentos. Contacta al administrador.';
          this.showError = true;
          this.documentos = [];
          this.filteredDocumentos = [];
          this.updatePagination();
          
        } else if (error.status === 0 || error.message.includes('NetworkError') || error.message.includes('conexión')) {
          this.errorMessage = 'Error de conexión con el servidor. Verifica tu conexión a internet.';
          this.showError = true;
          this.documentos = [];
          this.filteredDocumentos = [];
          this.updatePagination();
          
        } else {
          this.errorMessage = `Error al cargar documentos: ${error.message || 'Error desconocido'}`;
          this.showError = true;
          this.documentos = [];
          this.filteredDocumentos = [];
          this.updatePagination();
        }
      }
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentos = [...this.documentos];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredDocumentos = this.documentos.filter(doc => 
        doc.numeroRadicado?.toLowerCase().includes(term) ||
        doc.nombreContratista?.toLowerCase().includes(term) ||
        doc.numeroContrato?.toLowerCase().includes(term) ||
        doc.documentoContratista?.toLowerCase().includes(term) ||
        doc.estado?.toLowerCase().includes(term)
      );
    }
    
    this.currentPage = 1;
    this.updatePagination();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    this.updatePaginatedDocumentos();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocumentos.length / this.pageSize);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedDocumentos();
  }

  updatePaginatedDocumentos(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedDocumentos = this.filteredDocumentos.slice(startIndex, endIndex);
  }

  getEstadoClass(estado: string): string {
    if (!estado) return 'pending';
    
    switch (estado.toUpperCase()) {
      case 'APROBADO':
        return 'active';
      case 'RECHAZADO':
        return 'inactive';
      case 'PENDIENTE':
        return 'pending';
      case 'RADICADO':
        return 'warning';
      default:
        return 'pending';
    }
  }

  getEstadoTexto(estado: string): string {
    if (!estado) return 'Desconocido';
    
    switch (estado.toUpperCase()) {
      case 'APROBADO':
        return 'Aprobado';
      case 'RECHAZADO':
        return 'Rechazado';
      case 'PENDIENTE':
        return 'Pendiente';
      case 'RADICADO':
        return 'Radicado';
      default:
        return estado;
    }
  }

  getEstadoIcon(estado: string): string {
    if (!estado) return 'fa-question-circle';
    
    switch (estado.toUpperCase()) {
      case 'APROBADO':
        return 'fa-check-circle';
      case 'RECHAZADO':
        return 'fa-times-circle';
      case 'PENDIENTE':
        return 'fa-clock';
      case 'RADICADO':
        return 'fa-file-alt';
      default:
        return 'fa-question-circle';
    }
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    
    try {
      const fecha = new Date(date);
      return fecha.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  }

  formatShortDate(date: Date | string): string {
    if (!date) return 'N/A';
    
    try {
      const fecha = new Date(date);
      return fecha.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  verDetalles(documento: Documento): void {
    console.log('🔍 Ver detalles del documento:', documento);
    
    // Aquí podrías implementar la lógica para ver detalles del documento
    // Podrías:
    // 1. Abrir un modal con los detalles
    // 2. Navegar a una página de detalles
    // 3. Mostrar un panel lateral con la información
    
    alert(`Detalles del documento:\n\n` +
          `📄 Radicado: ${documento.numeroRadicado}\n` +
          `📋 Contrato: ${documento.numeroContrato}\n` +
          `👤 Contratista: ${documento.nombreContratista}\n` +
          `📅 Fecha radicación: ${this.formatDate(documento.fechaRadicacion)}\n` +
          `🏷️ Estado: ${this.getEstadoTexto(documento.estado)}\n` +
          `👨‍💼 Radicador: ${documento.nombreRadicador}`);
  }

  descargarDocumento(documentoId: string, numeroDocumento: number, nombreArchivo: string): void {
    console.log(`📥 Descargando documento ${documentoId}, archivo ${numeroDocumento}`);
    
    if (!documentoId) {
      alert('ID de documento inválido');
      return;
    }
    
    this.radicacionService.descargarDocumento(documentoId, numeroDocumento).subscribe({
      next: (blob) => {
        console.log('✅ Archivo descargado, iniciando descarga...');
        this.radicacionService.descargarArchivo(blob, nombreArchivo);
        
        this.showSuccess = true;
        this.successMessage = `Descarga iniciada: ${nombreArchivo}`;
        
        setTimeout(() => {
          this.showSuccess = false;
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error al descargar documento:', error);
        
        let errorMsg = `Error al descargar documento: ${error.message}`;
        
        if (error.status === 404) {
          errorMsg = 'El archivo no fue encontrado en el servidor.';
        } else if (error.status === 401 || error.status === 403) {
          errorMsg = 'No tienes permisos para descargar este archivo.';
        } else if (error.status === 0) {
          errorMsg = 'Error de conexión. Verifica tu conexión a internet.';
        }
        
        alert(errorMsg);
      }
    });
  }

  refreshData(): void {
    console.log('🔄 Recargando datos...');
    this.loadDocumentos();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  dismissError(): void {
    this.showError = false;
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.showSuccess = false;
    this.successMessage = '';
  }

  // Método para debug
  debugInfo(): void {
    console.log('🔍 Información de depuración:', {
      documentosTotales: this.documentos.length,
      documentosFiltrados: this.filteredDocumentos.length,
      usandoDatosMock: this.usingMockData,
      paginaActual: this.currentPage,
      totalPaginas: this.totalPages,
      tokenPresente: !!localStorage.getItem('token'),
      usuario: localStorage.getItem('user'),
      puedeRadicar: this.puedeRadicar
    });
    
    // Llamar al endpoint de debug del servicio
    this.radicacionService.debugUserInfo().subscribe({
      next: (info) => {
        console.log('✅ Debug info del backend:', info);
      },
      error: (error) => {
        console.error('❌ Error obteniendo debug info:', error);
      }
    });
  }
}