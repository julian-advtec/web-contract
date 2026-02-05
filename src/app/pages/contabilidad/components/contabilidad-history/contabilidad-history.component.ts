import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
    selector: 'app-contabilidad-history',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './contabilidad-history.component.html',
    styleUrls: ['./contabilidad-history.component.scss']
})
export class ContabilidadHistoryComponent implements OnInit, OnDestroy {
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
        private contabilidadService: ContabilidadService,
        private notificationService: NotificationService,
        private router: Router
    ) { }

    ngOnInit(): void {
        console.log('🚀 Contabilidad: Inicializando historial de procesamientos...');
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
                this.usuarioActual = user.fullName || user.username || 'Contabilidad';
                console.log('👤 Usuario actual de contabilidad:', this.usuarioActual);
            } catch (error) {
                console.error('Error parseando usuario:', error);
                this.usuarioActual = 'Contabilidad';
            }
        }
    }

    loadHistorial(): void {
        this.loading = true;
        this.error = '';
        this.successMessage = '';
        this.infoMessage = '';

        this.contabilidadService.getHistorial()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    console.log('📊 Respuesta del historial:', response);

                    if (response.success) {
                        this.historial = response.data || [];
                        console.log('✅ Historial cargado con', this.historial.length, 'registros');

                        this.filteredHistorial = [...this.historial];
                        this.updatePagination();

                        if (this.filteredHistorial.length > 0) {
                            const recientes = this.filteredHistorial.filter(item => this.esDocumentoReciente(item));
                            this.successMessage = `Se encontraron ${this.filteredHistorial.length} procesamientos (${recientes.length} recientes)`;
                        } else {
                            this.infoMessage = 'No hay procesamientos en el historial';
                        }
                    } else {
                        this.error = response.message || 'Error al cargar el historial';
                        this.notificationService.error('Error', this.error);
                    }
                    this.loading = false;
                },
                error: (err: any) => {
                    this.error = 'Error de conexión con el servidor: ' + err.message;
                    this.loading = false;
                    console.error('Error:', err);

                    if (err.status === 404 || err.status === 0) {
                        this.infoMessage = 'El servicio de historial no está disponible temporalmente';
                        this.historial = [];
                        this.filteredHistorial = [];
                        this.updatePagination();
                    } else {
                        this.notificationService.error('Error', this.error);
                    }
                }
            });
    }

    consultarDocumento(item: any): void {
        console.log('🔍 Consultar procesamiento contable desde historial:', item);

        let documentoId = item.documento?.id || item.id || item.documentoId;
        if (!documentoId) {
            this.notificationService.error('Error', 'ID de documento no disponible');
            return;
        }

        const queryParams = {
            desdeHistorial: 'true',
            soloLectura: 'true',
            modo: 'consulta',
            origen: 'historial-contabilidad'
        };

        console.log('→ Navegando a /contabilidad/procesar con params:', queryParams);

        this.router.navigate(['/contabilidad/procesar', documentoId], { queryParams });
    }

    getContadorRevisor(item: any): string {
        return item.contadorRevisor ||
            item.documento?.contadorRevisor ||
            item.contador?.fullName ||
            item.contador?.username ||
            this.usuarioActual ||
            'Contador';
    }

    getEstadoBadgeClass(estado: string): string {
        if (!estado) return 'badge bg-light text-dark';

        const upper = estado.toUpperCase();

        if (upper.includes('PROCESADO')) return 'badge bg-primary';
        if (upper.includes('COMPLETADO')) return 'badge bg-success';
        if (upper.includes('GLOSADO')) return 'badge bg-warning text-dark';
        if (upper.includes('OBSERVADO')) return 'badge bg-info';
        if (upper.includes('RECHAZADO')) return 'badge bg-danger';
        if (upper.includes('EN_REVISION')) return 'badge bg-secondary';

        return 'badge bg-light text-dark';
    }

    getEstadoTexto(estado: string): string {
        if (!estado) return 'Desconocido';
        const upper = estado.toUpperCase();

        if (upper.includes('PROCESADO_CONTABILIDAD')) return 'Procesado';
        if (upper.includes('COMPLETADO_CONTABILIDAD')) return 'Completado';
        if (upper.includes('GLOSADO_CONTABILIDAD')) return 'Glosado';
        if (upper.includes('OBSERVADO_CONTABILIDAD')) return 'Observado';
        if (upper.includes('RECHAZADO_CONTABILIDAD')) return 'Rechazado';
        if (upper.includes('EN_REVISION')) return 'En Revisión';

        return estado.replace(/_CONTABILIDAD/g, '');
    }

    esDocumentoReciente(item: any): boolean {
        const fechaActualizacion = item.fechaActualizacion || item.updatedAt;
        if (!fechaActualizacion) return false;

        try {
            const fechaDoc = new Date(fechaActualizacion);
            const ahora = new Date();
            const diferenciaDias = Math.floor((ahora.getTime() - fechaDoc.getTime()) / (1000 * 60 * 60 * 24));
            return diferenciaDias <= 7;
        } catch {
            return false;
        }
    }

    tieneDocumentos(item: any): boolean {
        const docData = item.documento || item;
        return !!(docData.cuentaCobro || docData.seguridadSocial || docData.informeActividades);
    }

    getDuracionRevision(item: any): string {
        const fechaInicio = item.fechaInicio || item.documento?.fechaInicio || item.createdAt;
        const fechaFin = item.fechaActualizacion || item.updatedAt || new Date();

        if (!fechaInicio) return 'N/A';

        try {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            const diffMs = fin.getTime() - inicio.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return 'Hoy';
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

    getDocumentCount(item: any): number {
        let count = 0;
        const docData = item.documento || item;

        if (docData.cuentaCobro) count++;
        if (docData.seguridadSocial) count++;
        if (docData.informeActividades) count++;

        return count;
    }

    getNumeroRadicado(item: any): string {
        return item.documento?.numeroRadicado || item.numeroRadicado || 'N/A';
    }

    getNombreContratista(item: any): string {
        return item.documento?.nombreContratista || item.nombreContratista || 'N/A';
    }

    getDocumentoContratista(item: any): string {
        return item.documento?.documentoContratista || item.documentoContratista || 'N/A';
    }

    getNumeroContrato(item: any): string {
        return item.documento?.numeroContrato || item.numeroContrato || 'N/A';
    }

    getSupervisorRevisor(item: any): string {
        return item.contadorRevisor || item.usuarioAsignadoNombre || this.usuarioActual || 'Contador';
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
                    (item.estado?.toLowerCase().includes(term)) ||
                    (item.contadorRevisor?.toLowerCase().includes(term))
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