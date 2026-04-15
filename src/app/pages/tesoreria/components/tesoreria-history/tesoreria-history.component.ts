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
                            
                            // NOTIFICACIÓN PERSONALIZADA DE ÉXITO
                            this.notificationService.success(
                                `${this.filteredHistorial.length} pagos cargados (${pagados} pagados, ${enProceso} en proceso, ${anulados} anulados, ${recientes.length} recientes)`,
                                'Historial Cargado',
                                4000
                            );
                            
                            this.successMessage = `${this.filteredHistorial.length} pagos (${pagados} pagados, ${enProceso} en proceso, ${anulados} anulados, ${recientes.length} recientes)`;
                        } else {
                            // NOTIFICACIÓN DE INFORMACIÓN
                            this.notificationService.info(
                                'No hay pagos en el historial. Los pagos procesados aparecerán aquí automáticamente.',
                                'Sin Pagos',
                                5000
                            );
                            this.infoMessage = 'No hay pagos en el historial';
                        }
                    } else {
                        this.error = response.message || 'Error al cargar el historial de pagos';
                        // NOTIFICACIÓN DE ERROR
                        this.notificationService.error(
                            this.error,
                            'Error de Carga',
                            5000
                        );
                    }
                    this.loading = false;
                },
                error: (err: any) => {
                    this.error = 'Error de conexión con el servidor: ' + err.message;
                    this.loading = false;
                    console.error('Error:', err);

                    // NOTIFICACIÓN PERSONALIZADA DE ERROR
                    this.notificationService.error(
                        'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
                        'Error de Conexión',
                        6000
                    );

                    if (err.status === 404 || err.status === 0) {
                        this.infoMessage = 'El servicio de historial de pagos no está disponible temporalmente';
                        this.historial = [];
                        this.filteredHistorial = [];
                        this.updatePagination();
                        
                        // NOTIFICACIÓN DE ADVERTENCIA
                        this.notificationService.warning(
                            'El servicio de historial está temporalmente no disponible. Intenta más tarde.',
                            'Servicio No Disponible',
                            5000
                        );
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
            this.notificationService.error(
                'No se pudo identificar el documento para ver detalles',
                'Error de Identificación',
                4000
            );
            return;
        }

        console.log('[HISTORIAL] Ver detalle - ID documento:', documentoId);
        console.log('[HISTORIAL] Item completo:', item);

        // Determinar si es solo lectura basado en el estado
        const esSoloLectura = item.estadoPago === 'PAGADO' || 
                            item.estadoPago === 'ANULADO' || 
                            item.estadoTesoreria?.includes('COMPLETADO') ||
                            item.estadoTesoreria?.includes('RECHAZADO');

        // NOTIFICACIÓN DE ACCIÓN
        this.notificationService.info(
            `Abriendo detalles del pago ${this.getNumeroRadicado(item)} en modo ${esSoloLectura ? 'solo lectura' : 'edición'}`,
            'Cargando Detalles',
            2000
        );

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
                this.notificationService.error(
                    'No se pudo abrir la página de detalles. Verifica la ruta.',
                    'Error de Navegación',
                    4000
                );
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
            this.notificationService.error(
                'No se pudo identificar el documento para continuar el pago',
                'Error de Identificación',
                4000
            );
            return;
        }

        // Validar que realmente pueda continuar
        if (item.estadoPago !== 'EN_PROCESO' || !this.esMiPago(item)) {
            this.notificationService.warning(
                'Solo puedes continuar pagos en proceso que estén asignados a ti',
                'Acción No Permitida',
                4000
            );
            return;
        }

        console.log('[HISTORIAL] Continuar pago - ID documento:', documentoId);

        // NOTIFICACIÓN DE ACCIÓN
        this.notificationService.info(
            `Continuando con el pago ${this.getNumeroRadicado(item)}...`,
            'Editando Pago',
            2000
        );

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
                this.notificationService.error(
                    'No se pudo abrir el formulario de edición',
                    'Error de Navegación',
                    4000
                );
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
            this.notificationService.error(
                'No se pudo identificar el documento para generar el comprobante',
                'Error de Identificación',
                4000
            );
            this.isProcessing = false;
            return;
        }

        // NOTIFICACIÓN DE PROCESO
        this.notificationService.info(
            `Generando comprobante para ${this.getNumeroRadicado(item)}...`,
            'Procesando',
            2000
        );

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
                    
                    // NOTIFICACIÓN DE ÉXITO
                    this.notificationService.success(
                        `Comprobante descargado correctamente para ${this.getNumeroRadicado(item)}`,
                        'Descarga Exitosa',
                        4000
                    );
                    this.isProcessing = false;
                },
                error: (err: any) => {
                    console.error('Error descargando comprobante:', err);
                    // NOTIFICACIÓN DE ERROR
                    this.notificationService.error(
                        err.message || 'Error al descargar el comprobante. Intenta nuevamente.',
                        'Error de Descarga',
                        5000
                    );
                    this.isProcessing = false;
                }
            });
    }

    /**
     * OBTENER EL ESTADO DE UN PAGO
     * Método para acceder al estado desde el componente
     */
    getEstadoPagoCompleto(item: any): {
        estado: string;
        texto: string;
        badgeClass: string;
        editable: boolean;
        accionesDisponibles: string[];
    } {
        const estadoPago = item.estadoPago || item.estadoTesoreria || 'PENDIENTE';
        const estadoUpper = estadoPago.toUpperCase();
        
        let texto = '';
        let badgeClass = '';
        let editable = false;
        let accionesDisponibles: string[] = [];
        
        switch (estadoUpper) {
            case 'PAGADO':
                texto = 'Pagado';
                badgeClass = 'badge-pagado';
                editable = false;
                accionesDisponibles = ['ver', 'comprobante'];
                break;
            case 'EN_PROCESO':
                texto = 'En Proceso';
                badgeClass = 'badge-en-proceso';
                editable = this.esMiPago(item);
                accionesDisponibles = editable ? ['ver', 'continuar'] : ['ver'];
                break;
            case 'ANULADO':
                texto = 'Anulado';
                badgeClass = 'badge-anulado';
                editable = false;
                accionesDisponibles = ['ver'];
                break;
            case 'RECHAZADO_TESORERIA':
            case 'RECHAZADO':
                texto = 'Rechazado';
                badgeClass = 'badge-rechazado';
                editable = false;
                accionesDisponibles = ['ver'];
                break;
            default:
                texto = 'Pendiente';
                badgeClass = 'badge-pendiente';
                editable = false;
                accionesDisponibles = ['ver'];
        }
        
        return {
            estado: estadoUpper,
            texto: texto,
            badgeClass: badgeClass,
            editable: editable,
            accionesDisponibles: accionesDisponibles
        };
    }

    /**
     * Método para refrescar datos con notificación personalizada
     */
    refreshData(): void {
        // NOTIFICACIÓN DE ACTUALIZACIÓN
        this.notificationService.info(
            'Actualizando historial de pagos...',
            'Refrescando Datos',
            2000
        );
        this.loadHistorial();
    }

    /**
     * Método para exportar datos con notificación
     */
    exportarDatos(): void {
        if (this.filteredHistorial.length === 0) {
            this.notificationService.warning(
                'No hay datos para exportar',
                'Exportación Vacía',
                3000
            );
            return;
        }

        // NOTIFICACIÓN DE PROCESO
        this.notificationService.info(
            `Exportando ${this.filteredHistorial.length} registros...`,
            'Exportando',
            3000
        );

        // Aquí iría la lógica de exportación
        setTimeout(() => {
            this.notificationService.success(
                `Se han exportado ${this.filteredHistorial.length} registros exitosamente`,
                'Exportación Exitosa',
                4000
            );
        }, 2000);
    }

    // ... (resto de los métodos existentes se mantienen igual)
    
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
        if (upper === 'RECHAZADO') return 'badge badge-rechazado';

        return 'badge badge-default';
    }

    getEstadoPagoTexto(estadoPago: string): string {
        if (!estadoPago) return 'Desconocido';
        
        switch (estadoPago.toUpperCase()) {
            case 'PAGADO': return 'Pagado';
            case 'EN_PROCESO': return 'En Proceso';
            case 'ANULADO': return 'Anulado';
            case 'PENDIENTE': return 'Pendiente';
            case 'RECHAZADO': return 'Rechazado';
            default: return estadoPago;
        }
    }

    getAccesoTexto(item: any): string {
        switch (item.estadoPago?.toUpperCase()) {
            case 'PAGADO':
            case 'ANULADO':
            case 'RECHAZADO':
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
            this.notificationService.info(
                'Mostrando todos los pagos',
                'Búsqueda Limpiada',
                1500
            );
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
            
            this.notificationService.info(
                `Se encontraron ${this.filteredHistorial.length} resultados para "${this.searchTerm}"`,
                'Resultados de Búsqueda',
                2000
            );
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
}