import { Component, Output, EventEmitter, OnInit, Input, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { Documento } from '../../../../core/models/documento.model';
import { UserRole } from '../../../../core/models/user.types';
import { forkJoin } from 'rxjs';

declare var bootstrap: any;

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
export class RadicacionListComponent implements OnInit, AfterViewInit {
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
    puedeRadicar = false;

    // Rol del usuario actual
    currentUserRole: UserRole = UserRole.RADICADOR;

    // Propiedad para controlar descargas múltiples
    isDownloadingAll = false;

    constructor(
        private radicacionService: RadicacionService,
        private router: Router
    ) { }

    ngOnInit(): void {
        console.log('🔄 Inicializando componente de lista de radicación...');
        this.verificarAutenticacionYPermisos();
        this.loadDocumentos();
    }

    ngAfterViewInit(): void {
        // Inicializar tooltips de Bootstrap después de que la vista esté cargada
        setTimeout(() => {
            this.initTooltips();
        }, 100);
    }

initTooltips(): void {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length > 0 && typeof bootstrap !== 'undefined') {
        Array.from(tooltipTriggerList).forEach((tooltipTriggerEl: Element) => {
            new bootstrap.Tooltip(tooltipTriggerEl, {
                placement: 'top',
                trigger: 'hover' // Solo al hacer hover
            });
        });
    }
}

    // ===============================
    // MÉTODO PARA TOOLTIP DE OBSERVACIÓN
    // ===============================
    
getObservacionTooltip(doc: Documento): string {
    if (!doc.observacion || doc.observacion.trim() === '') {
        return '';
    }
    
    // Solo devolver el texto plano de la observación
    return `Observación: ${doc.observacion.trim()}`;
}

    // Método auxiliar para escapar HTML
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===============================
    // NUEVOS MÉTODOS PARA LOS BOTONES DE ABRIR Y DESCARGAR TODOS
    // ===============================
    
    /**
     * Abre todos los documentos de un radicado en nuevas pestañas
     */
    abrirTodosDocumentos(documento: Documento): void {
        console.log('📂 Abriendo todos los documentos para:', documento.numeroRadicado);
        
        // Contador para documentos abiertos
        let documentosAbiertos = 0;
        
        // Abrir cada documento que exista en una nueva pestaña
        for (let i = 1; i <= 3; i++) {
            if (this.getDocumentByIndex(documento, i)) {
                const nombreArchivo = this.getDocumentNameByIndex(documento, i);
                console.log(`   Abriendo documento ${i}: ${nombreArchivo}`);
                
                // Abrir documento en nueva pestaña
                this.previsualizarDocumentoDirecto(documento, i);
                documentosAbiertos++;
                
                // Pequeño delay entre aperturas para evitar problemas
                setTimeout(() => {}, 100);
            }
        }
        
        // Mostrar mensaje informativo
        if (documentosAbiertos > 0) {
            this.showSuccess = true;
            this.successMessage = `Se abrieron ${documentosAbiertos} documentos en nuevas pestañas`;
            
            setTimeout(() => {
                this.showSuccess = false;
            }, 3000);
        }
    }
    
    /**
     * Descarga todos los documentos de un radicado - VERSIÓN CORREGIDA
     */
    descargarTodosDocumentos(documento: Documento): void {
        if (this.isDownloadingAll) {
            console.log('⏳ Ya se está descargando, espera...');
            return;
        }
        
        console.log('📥 Descargando todos los documentos para:', documento.numeroRadicado);
        
        // Crear array de observables para descargas
        const descargas: any[] = [];
        const nombresArchivos: string[] = [];
        const indices: number[] = [];
        
        // Preparar todas las descargas
        for (let i = 1; i <= 3; i++) {
            if (this.getDocumentByIndex(documento, i)) {
                const nombreArchivo = this.getDocumentNameByIndex(documento, i);
                console.log(`   Preparando descarga documento ${i}: ${nombreArchivo}`);
                
                // Agregar a los arrays
                indices.push(i);
                nombresArchivos.push(nombreArchivo);
                
                // Crear observable para la descarga
                const observable = this.radicacionService.descargarDocumento(documento.id, i);
                descargas.push(observable);
            }
        }
        
        if (descargas.length === 0) {
            console.log('⚠️ No hay documentos para descargar');
            this.showError = true;
            this.errorMessage = 'No hay documentos para descargar';
            setTimeout(() => this.dismissError(), 3000);
            return;
        }
        
        this.isDownloadingAll = true;
        this.showSuccess = true;
        this.successMessage = `Iniciando descarga de ${descargas.length} documentos...`;
        
        // Ejecutar todas las descargas en paralelo
        forkJoin(descargas).subscribe({
            next: (blobs: Blob[]) => {
                console.log(`✅ Todos los documentos descargados (${blobs.length} archivos)`);
                
                // Descargar cada archivo individualmente
                blobs.forEach((blob, index) => {
                    const nombreArchivo = nombresArchivos[index];
                    const indice = indices[index];
                    
                    console.log(`   Descargando: ${nombreArchivo} (índice: ${indice})`);
                    
                    // Crear un delay para evitar conflictos de descarga
                    setTimeout(() => {
                        this.radicacionService.descargarArchivo(blob, nombreArchivo);
                    }, index * 300);
                });
                
                this.showSuccess = true;
                this.successMessage = `✅ Descarga completada: ${blobs.length} archivos`;
                this.isDownloadingAll = false;
                
                setTimeout(() => {
                    this.showSuccess = false;
                }, 5000);
            },
            error: (error) => {
                console.error('❌ Error al descargar documentos:', error);
                this.showError = true;
                this.errorMessage = `Error al descargar documentos: ${error.message || 'Error desconocido'}`;
                this.isDownloadingAll = false;
                
                setTimeout(() => {
                    this.showError = false;
                }, 5000);
            }
        });
    }

    // ===============================
    // MÉTODOS EXISTENTES CON MODIFICACIONES
    // ===============================

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

                // Guardar el rol del usuario para control de estados
                this.setCurrentUserRole(user.role);

            } catch (e) {
                console.error('❌ Error parseando usuario:', e);
            }
        }
    }

    setCurrentUserRole(roleString: string): void {
        // Mapear string del rol al enum UserRole
        switch (roleString.toLowerCase()) {
            case 'admin':
                this.currentUserRole = UserRole.ADMIN;
                break;
            case 'radicador':
                this.currentUserRole = UserRole.RADICADOR;
                break;
            case 'supervisor':
                this.currentUserRole = UserRole.SUPERVISOR;
                break;
            case 'auditor_cuentas':
            case 'auditor cuentas':
                this.currentUserRole = UserRole.AUDITOR_CUENTAS;
                break;
            case 'contabilidad':
                this.currentUserRole = UserRole.CONTABILIDAD;
                break;
            case 'tesoreria':
                this.currentUserRole = UserRole.TESORERIA;
                break;
            case 'asesor_gerencia':
            case 'asesor gerencia':
                this.currentUserRole = UserRole.ASESOR_GERENCIA;
                break;
            case 'rendicion_cuentas':
            case 'rendición cuentas':
                this.currentUserRole = UserRole.RENDICION_CUENTAS;
                break;
            default:
                this.currentUserRole = UserRole.RADICADOR;
        }
    }

    loadDocumentos(): void {
        this.isLoading = true;
        this.errorMessage = '';
        this.showError = false;

        console.log('📥 Solicitando documentos al servidor...');

        this.radicacionService.obtenerDocumentos().subscribe({
            next: (documentos) => {
                console.log('✅ Documentos recibidos del servidor:', documentos);

                // Asegurar que documentos sea un array
                const documentosArray = Array.isArray(documentos) ? documentos : [];

                console.log(`📊 Total de documentos: ${documentosArray.length}`);
                
                // DEBUG: Verificar si los documentos tienen observación
                if (documentosArray.length > 0) {
                    console.log('🔍 Primer documento recibido:', {
                        id: documentosArray[0].id,
                        numeroRadicado: documentosArray[0].numeroRadicado,
                        tieneObservacion: !!documentosArray[0].observacion,
                        observacion: documentosArray[0].observacion
                    });
                }

                // Aplicar filtros según el rol del usuario
                const documentosFiltrados = this.filtrarPorRol(documentosArray);

                this.documentos = documentosFiltrados;
                this.filteredDocumentos = [...documentosFiltrados];
                this.updatePagination();
                this.isLoading = false;

                if (documentosFiltrados.length === 0) {
                    console.log('📭 No hay documentos radicados aún');
                    this.showSuccess = true;
                    this.successMessage = 'No hay documentos radicados. ¡Comienza radicando uno nuevo!';

                    setTimeout(() => {
                        this.showSuccess = false;
                    }, 3000);
                } else {
                    this.showSuccess = true;
                    this.successMessage = `Se encontraron ${documentosFiltrados.length} documentos`;

                    // Ocultar mensaje después de 3 segundos
                    setTimeout(() => {
                        this.showSuccess = false;
                    }, 3000);
                }

                // Inicializar tooltips después de cargar datos
                setTimeout(() => {
                    this.initTooltips();
                }, 100);
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

    filtrarPorRol(documentos: Documento[]): Documento[] {
        // Si es admin o radicador, ve todos los documentos
        if (this.currentUserRole === UserRole.ADMIN || this.currentUserRole === UserRole.RADICADOR) {
            return documentos;
        }

        // Filtrar según el rol y el estado del documento
        return documentos.filter(doc => {
            const estado = doc.estado?.toUpperCase();

            switch (this.currentUserRole) {
                case UserRole.SUPERVISOR:
                    // Supervisor ve documentos en estado RADICADO
                    return estado === 'RADICADO' || estado === 'PENDIENTE';

                case UserRole.AUDITOR_CUENTAS:
                    // Auditor de cuentas ve documentos en estado REVISADO por supervisor
                    return estado === 'REVISADO' || estado === 'EN AUDITORIA';

                case UserRole.CONTABILIDAD:
                    // Contabilidad ve documentos aprobados por auditoría
                    return estado === 'APROBADO_AUDITORIA' || estado === 'EN_CONTABILIDAD';

                case UserRole.TESORERIA:
                    // Tesorería ve documentos procesados por contabilidad
                    return estado === 'PROCESADO_CONTABILIDAD' || estado === 'EN_TESORERIA';

                case UserRole.ASESOR_GERENCIA:
                    // Asesor de gerencia ve documentos listos para firma
                    return estado === 'LISTO_FIRMA' || estado === 'EN_REVISION_GERENCIA';

                case UserRole.RENDICION_CUENTAS:
                    // Rendición de cuentas ve documentos finalizados
                    return estado === 'FINALIZADO' || estado === 'EN_RENDICION';

                default:
                    return false;
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
                doc.estado?.toLowerCase().includes(term) ||
                (doc.observacion && doc.observacion.toLowerCase().includes(term)) // También buscar en observaciones
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

    getDocumentCount(doc: Documento): number {
        let count = 0;
        if (doc.cuentaCobro) count++;
        if (doc.seguridadSocial) count++;
        if (doc.informeActividades) count++;
        return count;
    }

    getEstadoClass(estado: string): string {
        if (!estado) return 'pending';

        const estadoUpper = estado.toUpperCase();

        // Estados según el flujo de trabajo
        switch (estadoUpper) {
            case 'RADICADO':
                return 'radicado';
            case 'EN_REVISION':
            case 'PENDIENTE':
                return 'pending';
            case 'REVISADO':
                return 'revisado';
            case 'EN_AUDITORIA':
                return 'auditoria';
            case 'APROBADO_AUDITORIA':
                return 'aprobado-auditoria';
            case 'EN_CONTABILIDAD':
                return 'contabilidad';
            case 'PROCESADO_CONTABILIDAD':
                return 'procesado';
            case 'EN_TESORERIA':
                return 'tesoreria';
            case 'LISTO_FIRMA':
                return 'listo-firma';
            case 'EN_REVISION_GERENCIA':
                return 'revision-gerencia';
            case 'FIRMADO':
                return 'firmado';
            case 'EN_RENDICION':
                return 'rendicion';
            case 'FINALIZADO':
                return 'finalizado';
            case 'RECHAZADO':
                return 'rechazado';
            case 'APROBADO':
                return 'aprobado';
            default:
                return 'pending';
        }
    }

    getEstadoTexto(estado: string): string {
        if (!estado) return 'Desconocido';

        const estadoUpper = estado.toUpperCase();

        switch (estadoUpper) {
            case 'RADICADO':
                return 'Radicado';
            case 'EN_REVISION':
            case 'PENDIENTE':
                return 'En Revisión';
            case 'REVISADO':
                return 'Revisado';
            case 'EN_AUDITORIA':
                return 'En Auditoría';
            case 'APROBADO_AUDITORIA':
                return 'Aprobado Auditoría';
            case 'EN_CONTABILIDAD':
                return 'En Contabilidad';
            case 'PROCESADO_CONTABILIDAD':
                return 'Procesado';
            case 'EN_TESORERIA':
                return 'En Tesorería';
            case 'LISTO_FIRMA':
                return 'Listo para Firma';
            case 'EN_REVISION_GERENCIA':
                return 'Revisión Gerencia';
            case 'FIRMADO':
                return 'Firmado';
            case 'EN_RENDICION':
                return 'En Rendición';
            case 'FINALIZADO':
                return 'Finalizado';
            case 'RECHAZADO':
                return 'Rechazado';
            case 'APROBADO':
                return 'Aprobado';
            default:
                return estado;
        }
    }

    // Formato DD/MM/AAAA
    formatDateShort(date: Date | string): string {
        if (!date) return 'N/A';
        
        try {
            const fecha = new Date(date);
            
            // Formato DD/MM/AAAA
            const dia = fecha.getDate().toString().padStart(2, '0');
            const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
            const anio = fecha.getFullYear();
            
            return `${dia}/${mes}/${anio}`;
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'Fecha inválida';
        }
    }

    getDocumentByIndex(doc: Documento, index: number): boolean {
        switch(index) {
            case 1: return !!doc.cuentaCobro;
            case 2: return !!doc.seguridadSocial;
            case 3: return !!doc.informeActividades;
            default: return false;
        }
    }

    getDocumentNameByIndex(doc: Documento, index: number): string {
        switch(index) {
            case 1: return doc.cuentaCobro || '';
            case 2: return doc.seguridadSocial || '';
            case 3: return doc.informeActividades || '';
            default: return '';
        }
    }

    // Métodos de utilidad
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

    // ===============================
    // DESCARGA DIRECTA
    // ===============================
    previsualizarDocumentoDirecto(documento: Documento, index: number): void {
        if (!documento?.id || index == null) {
            console.warn('Documento o índice inválido');
            return;
        }

        this.radicacionService.previsualizarArchivo(documento.id, index);
    }

    descargarDocumentoDirecto(documento: Documento, index: number): void {
        if (!documento?.id || index == null) {
            console.warn('Documento o índice inválido');
            return;
        }

        let nombre = '';
        switch(index) {
            case 1: nombre = documento.cuentaCobro; break;
            case 2: nombre = documento.seguridadSocial; break;
            case 3: nombre = documento.informeActividades; break;
        }

        this.radicacionService.descargarArchivoDirecto(
            documento.id,
            index,
            nombre
        );
    }
}