// src/app/pages/contratistas/components/contratista-envio-enlaces/contratista-envio-enlaces.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { NotificationService } from '../../../../core/services/notification.service'; // ✅ CAMBIAR

interface ContratistaSeleccionado {
    id: string;
    documentoIdentidad: string;
    razonSocial: string;
    email: string;
    telefono?: string;
    estado: string;
    seleccionado: boolean;
    tieneEmail: boolean;
}

@Component({
    selector: 'app-contratista-envio-enlaces',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './contratista-envio-enlaces.component.html',
    styleUrls: ['./contratista-envio-enlaces.component.scss']
})
export class ContratistaEnvioEnlacesComponent implements OnInit, OnDestroy {
    // ✅ EXPONER Math PARA EL TEMPLATE
    Math = Math;

    contratistas: ContratistaSeleccionado[] = [];
    filteredContratistas: ContratistaSeleccionado[] = [];

    isLoading = false;
    isSending = false;
    searchTerm = '';
    filtroEstado = 'TODOS';
    seleccionTodos = false;

    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
    pages: number[] = [];

    estadisticas = {
        total: 0,
        conEmail: 0,
        sinEmail: 0,
        activos: 0,
        enviadosHoy: 0
    };

    enviandoIds: Set<string> = new Set();
    enviadosExitosos: string[] = [];
    enviadosFallidos: string[] = [];

    private subscriptions: Subscription[] = [];

    constructor(
        private contratistaService: ContratistasService,
        private notificationService: NotificationService, // ✅ CAMBIAR
        private router: Router
    ) { }

    ngOnInit(): void {
        this.cargarContratistas();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    // ===============================
    // CARGA DE DATOS
    // ===============================

    cargarContratistas(): void {
        this.isLoading = true;
        this.contratistas = [];
        this.filteredContratistas = [];

        const sub = this.contratistaService.obtenerTodos().subscribe({
            next: (response: any) => {
                this.isLoading = false;
                const data = response || [];

                this.contratistas = data.map((c: any) => ({
                    id: c.id,
                    documentoIdentidad: c.documentoIdentidad || '',
                    razonSocial: c.razonSocial || c.nombreCompleto || 'Sin nombre',
                    email: c.email || '',
                    telefono: c.telefono || '',
                    estado: c.estado || 'ACTIVO',
                    seleccionado: false,
                    tieneEmail: !!c.email
                }));

                this.calcularEstadisticas();
                this.aplicarFiltros();
                this.updatePagination();
            },
            error: (error) => {
                this.isLoading = false;
                console.error('❌ Error cargando contratistas:', error);
                this.notificationService.error('Error al cargar los contratistas', '❌ Error');
            }
        });
        this.subscriptions.push(sub);
    }

    // ===============================
    // ESTADÍSTICAS
    // ===============================

    calcularEstadisticas(): void {
        const total = this.contratistas.length;
        const conEmail = this.contratistas.filter(c => c.tieneEmail).length;
        const sinEmail = total - conEmail;
        const activos = this.contratistas.filter(c => c.estado === 'ACTIVO').length;

        this.estadisticas = {
            total,
            conEmail,
            sinEmail,
            activos,
            enviadosHoy: 0
        };
    }

    // ===============================
    // FILTROS Y BÚSQUEDA
    // ===============================

    aplicarFiltros(): void {
        let filtrados = [...this.contratistas];

        if (this.searchTerm.trim()) {
            const term = this.searchTerm.toLowerCase().trim();
            filtrados = filtrados.filter(c =>
                c.razonSocial.toLowerCase().includes(term) ||
                c.documentoIdentidad.includes(term) ||
                (c.email && c.email.toLowerCase().includes(term))
            );
        }

        if (this.filtroEstado !== 'TODOS') {
            filtrados = filtrados.filter(c => c.estado === this.filtroEstado);
        }

        filtrados.sort((a, b) => {
            if (a.tieneEmail && !b.tieneEmail) return -1;
            if (!a.tieneEmail && b.tieneEmail) return 1;
            return a.razonSocial.localeCompare(b.razonSocial);
        });

        this.filteredContratistas = filtrados;
        this.currentPage = 1;
        this.updatePagination();
    }

    onSearch(): void {
        this.aplicarFiltros();
    }

    limpiarFiltros(): void {
        this.searchTerm = '';
        this.filtroEstado = 'TODOS';
        this.aplicarFiltros();
    }

    // ===============================
    // PAGINACIÓN
    // ===============================

    updatePagination(): void {
        this.totalPages = Math.ceil(this.filteredContratistas.length / this.pageSize);
        this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    getContratistasPaginated(): ContratistaSeleccionado[] {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredContratistas.slice(start, start + this.pageSize);
    }

    changePage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    // ===============================
    // SELECCIÓN
    // ===============================

    toggleSeleccion(contratista: ContratistaSeleccionado): void {
        if (!contratista.tieneEmail) {
            this.notificationService.warning('Este contratista no tiene email', 'No se puede seleccionar');
            return;
        }
        contratista.seleccionado = !contratista.seleccionado;
        this.actualizarSeleccionTodos();
    }

    toggleSeleccionTodos(): void {
        const visibles = this.getContratistasPaginated();
        const seleccionables = visibles.filter(c => c.tieneEmail);

        if (seleccionables.every(c => c.seleccionado)) {
            seleccionables.forEach(c => c.seleccionado = false);
        } else {
            seleccionables.forEach(c => c.seleccionado = true);
        }

        this.seleccionTodos = seleccionables.every(c => c.seleccionado);
    }

    actualizarSeleccionTodos(): void {
        const visibles = this.getContratistasPaginated();
        const seleccionables = visibles.filter(c => c.tieneEmail);
        this.seleccionTodos = seleccionables.length > 0 && seleccionables.every(c => c.seleccionado);
    }

    deseleccionarTodos(): void {
        this.contratistas.forEach(c => c.seleccionado = false);
        this.seleccionTodos = false;
    }

    getContratistasSeleccionados(): ContratistaSeleccionado[] {
        return this.contratistas.filter(c => c.seleccionado);
    }

    // ===============================
    // ENVÍO DE ENLACES
    // ===============================

    enviarEnlaceIndividual(contratista: ContratistaSeleccionado): void {
        if (!contratista.tieneEmail) {
            this.notificationService.warning('El contratista no tiene email', 'No se puede enviar');
            return;
        }

        if (!confirm(`¿Enviar enlace a "${contratista.razonSocial}"?\nEmail: ${contratista.email}`)) {
            return;
        }

        this.enviandoIds.add(contratista.id);
        this.isSending = true;

        const sub = this.contratistaService.enviarEnlaceAlContratista(contratista.id, contratista.email).subscribe({
            next: (response: any) => {
                this.enviandoIds.delete(contratista.id);
                this.isSending = false;

                if (response?.data?.success) {
                    this.notificationService.success(
                        `Enlace enviado a ${contratista.email}`,
                        '✅ Enlace enviado'
                    );
                    this.enviadosExitosos.push(contratista.id);
                } else {
                    this.notificationService.error(
                        response?.data?.message || 'Error al enviar el enlace',
                        '❌ Error'
                    );
                    this.enviadosFallidos.push(contratista.id);
                }
            },
            error: (error: any) => {
                this.enviandoIds.delete(contratista.id);
                this.isSending = false;
                console.error('❌ Error:', error);
                this.notificationService.error('Error al enviar el enlace', '❌ Error');
                this.enviadosFallidos.push(contratista.id);
            }
        });
        this.subscriptions.push(sub);
    }

    enviarEnlaceMultiple(): void {
        const seleccionados = this.getContratistasSeleccionados();

        if (seleccionados.length === 0) {
            this.notificationService.warning('Seleccione al menos un contratista', 'Sin selección');
            return;
        }

        const sinEmail = seleccionados.filter(c => !c.tieneEmail);
        if (sinEmail.length > 0) {
            const nombres = sinEmail.map(c => c.razonSocial).join(', ');
            this.notificationService.warning(
                `${sinEmail.length} contratista(s) sin email: ${nombres}`,
                '⚠️ No se pueden enviar'
            );
            return;
        }

        if (!confirm(`¿Enviar enlace a ${seleccionados.length} contratista(s)?`)) {
            return;
        }

        this.isSending = true;
        let enviados = 0;
        let fallidos = 0;

        seleccionados.forEach((contratista) => {
            this.enviandoIds.add(contratista.id);

            const sub = this.contratistaService.enviarEnlaceAlContratista(contratista.id, contratista.email).subscribe({
                next: (response: any) => {
                    this.enviandoIds.delete(contratista.id);

                    if (response?.data?.success) {
                        enviados++;
                        this.enviadosExitosos.push(contratista.id);
                    } else {
                        fallidos++;
                        this.enviadosFallidos.push(contratista.id);
                    }

                    if (enviados + fallidos === seleccionados.length) {
                        this.isSending = false;
                        this.deseleccionarTodos();

                        if (fallidos === 0) {
                            this.notificationService.success(
                                `Enlaces enviados a ${enviados} contratista(s)`,
                                '✅ Envío completado'
                            );
                        } else {
                            this.notificationService.warning(
                                `${enviados} enviados, ${fallidos} fallaron`,
                                '⚠️ Envío parcial'
                            );
                        }
                    }
                },
                error: (error: any) => {
                    this.enviandoIds.delete(contratista.id);
                    fallidos++;
                    this.enviadosFallidos.push(contratista.id);

                    if (enviados + fallidos === seleccionados.length) {
                        this.isSending = false;
                        this.deseleccionarTodos();
                        this.notificationService.warning(
                            `${enviados} enviados, ${fallidos} fallaron`,
                            '⚠️ Envío parcial'
                        );
                    }
                }
            });
            this.subscriptions.push(sub);
        });
    }

    // ===============================
    // UTILIDADES
    // ===============================

    getEstadoClass(estado: string): string {
        const clases: Record<string, string> = {
            'ACTIVO': 'active',
            'INACTIVO': 'inactive',
            'SUSPENDIDO': 'warning'
        };
        return clases[estado] || 'pending';
    }

    getEstadoTexto(estado: string): string {
        const textos: Record<string, string> = {
            'ACTIVO': 'Activo',
            'INACTIVO': 'Inactivo',
            'SUSPENDIDO': 'Suspendido'
        };
        return textos[estado] || estado;
    }

    getEmailStatusIcon(contratista: ContratistaSeleccionado): string {
        return contratista.tieneEmail ? 'fa-envelope' : 'fa-envelope-slash';
    }

    getEmailStatusColor(contratista: ContratistaSeleccionado): string {
        return contratista.tieneEmail ? 'text-success' : 'text-danger';
    }

    getEmailStatusTooltip(contratista: ContratistaSeleccionado): string {
        return contratista.tieneEmail ? `Email: ${contratista.email}` : 'Sin email registrado';
    }

    volverAlListado(): void {
        this.router.navigate(['/contratistas/list']);
    }

    refrescar(): void {
        this.cargarContratistas();
    }

    getContratistasConEmailFiltrados(): ContratistaSeleccionado[] {
        return this.getContratistasPaginated().filter(c => c.tieneEmail);
    }
}