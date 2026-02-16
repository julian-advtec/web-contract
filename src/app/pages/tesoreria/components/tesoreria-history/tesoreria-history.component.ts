import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TesoreriaService } from '../../../../core/services/tesoreria.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
    selector: 'app-tesoreria-history',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './tesoreria-history.component.html',
    styleUrls: ['./tesoreria-history.component.scss']
})
export class TesoreriaHistoryComponent implements OnInit, OnDestroy {
    historial: any[] = [];
    filteredHistorial: any[] = [];
    paginatedHistorial: any[] = [];

    loading = false;
    isProcessing = false;
    error = '';
    successMessage = '';
    infoMessage = '';

    searchTerm = '';
    currentPage = 1;
    pageSize = 10;
    totalPages = 0;
    pages: number[] = [];

    usuarioActual = '';
    sidebarCollapsed = false;

    private destroy$ = new Subject<void>();

    constructor(
        private tesoreriaService: TesoreriaService,
        private notificationService: NotificationService,
        private router: Router
    ) { }

    ngOnInit(): void {
        console.log('🚀 Tesorería: Inicializando historial de pagos...');
        this.cargarUsuarioActual();
        this.loadHistorial();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    cargarUsuarioActual(): void {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                this.usuarioActual = user.fullName || user.username || 'Tesorería';
                console.log('👤 Usuario actual de tesorería:', this.usuarioActual);
            } catch (error) {
                console.error('Error parseando usuario:', error);
                this.usuarioActual = 'Tesorería';
            }
        }
    }

    loadHistorial(): void {
        this.loading = true;
        this.error = '';
        this.successMessage = '';
        this.infoMessage = '';

        this.tesoreriaService.getHistorial()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    console.log('📊 Respuesta del historial de pagos:', response);

                    if (response.success) {
                        this.historial = response.data || [];
                        console.log('✅ Historial cargado con', this.historial.length, 'pagos');

                        // Ordenar por fecha más reciente primero
                        this.historial.sort((a, b) => {
                            const fechaA = new Date(a.fechaPago || a.fechaActualizacion || a.createdAt);
                            const fechaB = new Date(b.fechaPago || b.fechaActualizacion || b.createdAt);
                            return fechaB.getTime() - fechaA.getTime();
                        });

                        this.filteredHistorial = [...this.historial];
                        this.updatePagination();

                        if (this.filteredHistorial.length > 0) {
                            const recientes = this.filteredHistorial.filter(item => this.esPagoReciente(item));
                            const pagados = this.filteredHistorial.filter(item => item.estadoPago === 'PAGADO').length;
                            const enProceso = this.filteredHistorial.filter(item => item.estadoPago === 'EN_PROCESO').length;
                            const anulados = this.filteredHistorial.filter(item => item.estadoPago === 'ANULADO').length;
                            
                            this.successMessage = `${this.filteredHistorial.length} pagos (${pagados} pagados, ${enProceso} en proceso, ${anulados} anulados, ${recientes.length} recientes)`;
                        } else {
                            this.infoMessage = 'No hay pagos en el historial';
                        }
                    } else {
                        this.error = response.message || 'Error al cargar el historial de pagos';
                        this.notificationService.error('Error', this.error);
                    }
                    this.loading = false;
                },
                error: (err: any) => {
                    this.error = 'Error de conexión con el servidor: ' + err.message;
                    this.loading = false;
                    console.error('Error:', err);

                    if (err.status === 404 || err.status === 0) {
                        this.infoMessage = 'El servicio de historial de pagos no está disponible temporalmente';
                        this.historial = [];
                        this.filteredHistorial = [];
                        this.updatePagination();
                    } else {
                        this.notificationService.error('Error', this.error);
                    }
                }
            });
    }

  /**
 * Ver detalle de un pago desde el historial
 */
verDetallePago(item: any): void {
    // Usar documentoId que viene del backend
    const documentoId = item.documentoId || item.documento?.id;
    
    if (!documentoId) {
        console.error('[HISTORIAL] No se encontró ID de documento válido en item:', item);
        this.notificationService.error('Error', 'No se pudo identificar el documento');
        return;
    }

    console.log('[HISTORIAL] Ver detalle - ID documento:', documentoId);
    console.log('[HISTORIAL] Item completo:', item);

    // Determinar si es solo lectura basado en el estado
    const esSoloLectura = item.estadoPago === 'PAGADO' || 
                        item.estadoPago === 'ANULADO' || 
                        item.estadoTesoreria?.includes('COMPLETADO') ||
                        item.estadoTesoreria?.includes('RECHAZADO');

    this.router.navigate(['/tesoreria/procesar', documentoId], {
        queryParams: {
            desdeHistorial: 'true',
            soloLectura: esSoloLectura ? 'true' : 'false',
            modo: esSoloLectura ? 'consulta' : 'edicion',
            origen: 'historial-tesoreria'
        }
    }).then(success => {
        if (!success) {
            console.error('[HISTORIAL] Falló navegación a detalle');
            this.notificationService.error('Error de ruta', 'No se pudo abrir el detalle');
        }
    });
}

/**
 * Continuar con un pago en proceso
 */
continuarPago(item: any): void {
    // Usar documentoId que viene del backend
    const documentoId = item.documentoId || item.documento?.id;
    
    if (!documentoId) {
        console.error('[HISTORIAL] No se encontró ID de documento válido para continuar:', item);
        this.notificationService.error('Error', 'No se pudo identificar el documento');
        return;
    }

    // Validar que realmente pueda continuar
    if (item.estadoPago !== 'EN_PROCESO' || !this.esMiPago(item)) {
        this.notificationService.warning('No permitido', 'Solo puedes continuar pagos en proceso y asignados a ti');
        return;
    }

    console.log('[HISTORIAL] Continuar pago - ID documento:', documentoId);

    this.router.navigate(['/tesoreria/procesar', documentoId], {
        queryParams: {
            desdeHistorial: 'true',
            soloLectura: 'false',
            modo: 'edicion',
            origen: 'historial-tesoreria'
        }
    }).then(success => {
        if (!success) {
            console.error('[HISTORIAL] Falló navegación para continuar');
            this.notificationService.error('Error', 'No se pudo abrir el formulario');
        }
    });
}

/**
 * Generar comprobante (usa ID de tesorería o documento según corresponda)
 */
generarComprobante(item: any): void {
    this.isProcessing = true;
    // Para descargar comprobante, necesitas el ID del documento
    const documentoId = item.documentoId || item.documento?.id;
    
    if (!documentoId) {
        this.notificationService.error('Error', 'No se pudo identificar el documento');
        this.isProcessing = false;
        return;
    }

    this.tesoreriaService.descargarComprobantePago(documentoId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (blob: Blob) => {
                // Crear URL del blob y descargar
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comprobante_${item.documento?.numeroRadicado || 'pago'}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.notificationService.success('Éxito', 'Comprobante descargado correctamente');
                this.isProcessing = false;
            },
            error: (err: any) => {
                console.error('Error descargando comprobante:', err);
                this.notificationService.error('Error', err.message || 'Error al descargar comprobante');
                this.isProcessing = false;
            }
        });
}

    getResponsablePago(item: any): string {
        return item.responsablePago ||
            item.usuarioResponsable?.fullName ||
            item.usuarioResponsable?.username ||
            item.documento?.responsablePago ||
            this.usuarioActual ||
            'Tesorería';
    }

    getEstadoPagoBadgeClass(estadoPago: string): string {
        if (!estadoPago) return 'badge badge-default';

        const upper = estadoPago.toUpperCase();

        if (upper === 'PAGADO') return 'badge badge-pagado';
        if (upper === 'EN_PROCESO') return 'badge badge-en-proceso';
        if (upper === 'ANULADO') return 'badge badge-anulado';
        if (upper === 'PENDIENTE') return 'badge badge-pendiente';

        return 'badge badge-default';
    }

    getEstadoPagoTexto(estadoPago: string): string {
        if (!estadoPago) return 'Desconocido';
        
        switch (estadoPago.toUpperCase()) {
            case 'PAGADO': return 'Pagado';
            case 'EN_PROCESO': return 'En Proceso';
            case 'ANULADO': return 'Anulado';
            case 'PENDIENTE': return 'Pendiente';
            default: return estadoPago;
        }
    }

    getAccesoTexto(item: any): string {
        switch (item.estadoPago?.toUpperCase()) {
            case 'PAGADO':
            case 'ANULADO':
                return 'Solo lectura';
            case 'EN_PROCESO':
                return 'Editable';
            default:
                return 'Acceso limitado';
        }
    }

    esMiPago(item: any): boolean {
        const responsable = this.getResponsablePago(item);
        return responsable === this.usuarioActual;
    }

    esPagoReciente(item: any): boolean {
        const fechaPago = item.fechaPago || item.fechaActualizacion || item.updatedAt;
        if (!fechaPago) return false;

        try {
            const fechaPagoObj = new Date(fechaPago);
            const ahora = new Date();
            const diferenciaDias = Math.floor((ahora.getTime() - fechaPagoObj.getTime()) / (1000 * 60 * 60 * 24));
            return diferenciaDias <= 7;
        } catch {
            return false;
        }
    }

    getValorPago(item: any): number {
        return item.valorPago || 
               item.valor || 
               item.documento?.valor || 
               item.documento?.valorTotal || 
               0;
    }

    getDuracionProceso(item: any): string {
        const fechaInicio = item.fechaInicioProceso || item.createdAt;
        const fechaFin = item.fechaPago || item.fechaActualizacion || new Date();

        if (!fechaInicio) return 'N/A';

        try {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            const diffMs = fin.getTime() - inicio.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                if (diffHours === 0) {
                    const diffMinutes = Math.floor(diffMs / (1000 * 60));
                    return `${diffMinutes} min`;
                }
                return `${diffHours} h`;
            } else if (diffDays === 1) {
                return '1 día';
            } else {
                return `${diffDays} días`;
            }
        } catch {
            return 'N/A';
        }
    }

    formatDate(fecha: Date | string): string {
        if (!fecha) return 'N/A';
        try {
            const date = new Date(fecha);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    formatDateShort(fecha: Date | string): string {
        if (!fecha) return 'N/A';
        try {
            const date = new Date(fecha);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    formatDateOnly(fecha: Date | string): string {
        if (!fecha) return 'N/A';
        try {
            const date = new Date(fecha);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    getNumeroRadicado(item: any): string {
        return item.documento?.numeroRadicado || 
               item.numeroRadicado || 
               item.documentoRadicado ||
               'N/A';
    }

    getNombreContratista(item: any): string {
        return item.documento?.nombreContratista || 
               item.nombreContratista || 
               'N/A';
    }

    getDocumentoContratista(item: any): string {
        return item.documento?.documentoContratista || 
               item.documentoContratista || 
               'N/A';
    }

    getNumeroContrato(item: any): string {
        return item.documento?.numeroContrato || 
               item.numeroContrato || 
               'N/A';
    }

    onSearch(): void {
        if (!this.searchTerm.trim()) {
            this.filteredHistorial = [...this.historial];
        } else {
            const term = this.searchTerm.toLowerCase();
            this.filteredHistorial = this.historial.filter(item => {
                const doc = item.documento || item;
                return (
                    (doc.numeroRadicado?.toLowerCase().includes(term)) ||
                    (doc.nombreContratista?.toLowerCase().includes(term)) ||
                    (doc.numeroContrato?.toLowerCase().includes(term)) ||
                    (doc.documentoContratista?.toLowerCase().includes(term)) ||
                    (item.estadoPago?.toLowerCase().includes(term)) ||
                    (item.numeroPago?.toString().includes(term)) ||
                    (item.responsablePago?.toLowerCase().includes(term))
                );
            });
        }
        this.currentPage = 1;
        this.updatePagination();
    }

    updatePagination(): void {
        this.totalPages = Math.ceil(this.filteredHistorial.length / this.pageSize);

        this.pages = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            this.pages.push(i);
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredHistorial.length);
        this.paginatedHistorial = this.filteredHistorial.slice(startIndex, endIndex);
    }

    changePage(page: number): void {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.updatePagination();
        }
    }

    dismissError(): void {
        this.error = '';
    }

    dismissSuccess(): void {
        this.successMessage = '';
    }

    dismissInfo(): void {
        this.infoMessage = '';
    }

    refreshData(): void {
        this.loadHistorial();
    }
}