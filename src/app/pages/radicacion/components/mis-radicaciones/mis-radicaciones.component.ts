// src/app/pages/radicacion/components/mis-radicaciones/mis-radicaciones.component.ts
import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { ModulesService, AppModule } from '../../../../core/services/modules.service'; // Cambiado a AppModule
import { User, UserRole, stringToUserRole, getUserRoleName } from '../../../../core/models/user.types';
import { Documento } from '../../../../core/models/documento.model';

declare var bootstrap: any;

@Component({
    selector: 'app-mis-radicaciones',
    standalone: true,
    imports: [
        CommonModule, 
        FormsModule, 
        RouterModule,

    ],
    templateUrl: './mis-radicaciones.component.html',
    styleUrls: ['./mis-radicaciones.component.scss']
})
export class MisRadicacionesComponent implements OnInit, OnDestroy {

    @Input() sidebarCollapsed = false;

    // Datos del usuario
    currentUser: User | null = null;

    // Lista de documentos
    documentos: Documento[] = [];
    filteredDocumentos: Documento[] = [];
    paginatedDocumentos: Documento[] = [];

    // Estados
    isLoading = true;
    searchTerm = '';

    // Paginación
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
    pages: number[] = [];

    // Mensajes
    errorMessage = '';
    showError = false;
    successMessage = '';
    showSuccess = false;

    // Control de descargas
    isDownloadingAll = false;

    // Módulos disponibles para el sidebar
    availableModules: AppModule[] = []; // Cambiado a AppModule[]

    private destroy$ = new Subject<void>();

    constructor(
        public authService: AuthService,
        private radicacionService: RadicacionService,
        private modulesService: ModulesService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        console.log('🚀 Inicializando Mis Radicaciones...');
        this.loadCurrentUser();
        this.loadMisRadicaciones();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ===============================
    // CARGA DE DATOS
    // ===============================
    loadCurrentUser(): void {
        this.currentUser = this.authService.getCurrentUser();

        if (!this.currentUser) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const parsedUser = JSON.parse(userStr);
                    
                    // Convertir el rol del localStorage al UserRole
                    let normalizedRole: UserRole = UserRole.RADICADOR;
                    
                    if (parsedUser.role) {
                        normalizedRole = stringToUserRole(parsedUser.role);
                    }
                    
                    this.currentUser = {
                        ...parsedUser,
                        role: normalizedRole
                    };
                    
                    console.log('✅ Usuario cargado desde localStorage:', this.currentUser);
                } catch (error) {
                    console.error('Error parseando usuario:', error);
                }
            }
        }

        console.log('👤 Usuario actual:', this.currentUser);
        
        // Cargar módulos después de tener el usuario
        this.loadAvailableModules();
    }

    // ===============================
    // CARGA DE MÓDULOS
    // ===============================
    loadAvailableModules(): void {
        if (!this.currentUser) {
            this.availableModules = [];
            return;
        }

        // Usar el método existente del servicio
        const allModules = this.modulesService.getAllModules();
        
        // Filtrar módulos según el rol del usuario
        this.availableModules = allModules.filter(module => {
            // Si el usuario es ADMIN, puede ver todos los módulos
            if (this.currentUser?.role === UserRole.ADMIN) {
                return true;
            }
            
            // Para RADICADOR, mostrar solo módulos para RADICADOR
            return module.requiredRole === this.currentUser?.role;
        });
        
        console.log('📋 Módulos disponibles en Mis Radicaciones:', this.availableModules);
    }

    // ===============================
    // MÉTODO PARA OBTENER NOMBRE DEL ROL
    // ===============================
    getUserRoleName(): string {
        if (!this.currentUser) {
            return 'Usuario';
        }
        
        return getUserRoleName(this.currentUser.role);
    }

    loadMisRadicaciones(): void {
        this.isLoading = true;
        this.errorMessage = '';
        this.showError = false;
        this.showSuccess = false;

        console.log('📥 Cargando mis radicaciones...');

        this.radicacionService.obtenerMisDocumentos()
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    this.isLoading = false;
                    this.cdr.detectChanges();
                })
            )
            .subscribe({
                next: (documentos: Documento[]) => {
                    console.log('✅ Documentos recibidos:', documentos);

                    const documentosArray = Array.isArray(documentos) ? documentos : [];

                    console.log(`📊 Total de documentos recibidos: ${documentosArray.length}`);

                    this.documentos = documentosArray;
                    this.filteredDocumentos = [...documentosArray];
                    this.updatePagination();

                    if (this.documentos.length === 0) {
                        this.showSuccess = true;
                        this.successMessage = 'No tienes radicaciones registradas';
                    } else {
                        this.showSuccess = true;
                        this.successMessage = `Se encontraron ${this.documentos.length} de tus radicaciones`;

                        setTimeout(() => {
                            this.showSuccess = false;
                        }, 3000);
                    }

                    // Inicializar tooltips
                    setTimeout(() => {
                        this.initTooltips();
                    }, 100);
                },
                error: (error) => {
                    console.error('❌ Error al cargar mis radicaciones:', error);
                    this.showError = true;

                    if (error.status === 401 || error.message.includes('401') || error.message.includes('autenticación')) {
                        this.errorMessage = 'Error de autenticación. Tu sesión ha expirado. Redirigiendo al login...';

                        setTimeout(() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            this.router.navigate(['/auth/login']);
                        }, 2000);
                    } else if (error.status === 403) {
                        this.errorMessage = 'No tienes permisos para ver tus radicaciones';
                    } else if (error.status === 0) {
                        this.errorMessage = 'Error de conexión con el servidor. Verifica tu conexión a internet.';
                    } else {
                        this.errorMessage = `Error al cargar tus radicaciones: ${error.message || 'Error desconocido'}`;
                    }
                }
            });
    }

    // Resto de los métodos se mantienen igual (sin cambios)...
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
                (doc.observacion && doc.observacion.toLowerCase().includes(term))
            );
        }

        this.currentPage = 1;
        this.updatePagination();
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

    changePage(page: number): void {
        if (page < 1 || page > this.totalPages) return;

        this.currentPage = page;
        this.updatePaginatedDocumentos();
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

    formatDateShort(date: Date | string): string {
        if (!date) return 'N/A';

        try {
            const fecha = new Date(date);
            const dia = fecha.getDate().toString().padStart(2, '0');
            const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
            const anio = fecha.getFullYear();

            return `${dia}/${mes}/${anio}`;
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    getDocumentByIndex(doc: Documento, index: number): boolean {
        switch (index) {
            case 1: return !!doc.cuentaCobro;
            case 2: return !!doc.seguridadSocial;
            case 3: return !!doc.informeActividades;
            default: return false;
        }
    }

    getDocumentNameByIndex(doc: Documento, index: number): string {
        switch (index) {
            case 1: return doc.cuentaCobro || '';
            case 2: return doc.seguridadSocial || '';
            case 3: return doc.informeActividades || '';
            default: return '';
        }
    }

    abrirTodosDocumentos(documento: Documento): void {
        console.log('📂 Abriendo todos los documentos para:', documento.numeroRadicado);

        let documentosAbiertos = 0;

        for (let i = 1; i <= 3; i++) {
            if (this.getDocumentByIndex(documento, i)) {
                this.previsualizarDocumentoDirecto(documento, i);
                documentosAbiertos++;

                setTimeout(() => { }, 100);
            }
        }

        if (documentosAbiertos > 0) {
            this.showSuccess = true;
            this.successMessage = `Se abrieron ${documentosAbiertos} documentos en nuevas pestañas`;

            setTimeout(() => {
                this.showSuccess = false;
            }, 3000);
        }
    }

    descargarTodosDocumentos(documento: Documento): void {
        if (this.isDownloadingAll) {
            console.log('⏳ Ya se está descargando, espera...');
            return;
        }

        console.log('📥 Descargando todos los documentos para:', documento.numeroRadicado);

        const descargas: any[] = [];
        const nombresArchivos: string[] = [];
        const indices: number[] = [];

        for (let i = 1; i <= 3; i++) {
            if (this.getDocumentByIndex(documento, i)) {
                const nombreArchivo = this.getDocumentNameByIndex(documento, i);
                console.log(`   Preparando descarga documento ${i}: ${nombreArchivo}`);

                indices.push(i);
                nombresArchivos.push(nombreArchivo);

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

        forkJoin(descargas).subscribe({
            next: (blobs: Blob[]) => {
                console.log(`✅ Todos los documentos descargados (${blobs.length} archivos)`);

                blobs.forEach((blob, index) => {
                    const nombreArchivo = nombresArchivos[index];
                    const indice = indices[index];

                    console.log(`   Descargando: ${nombreArchivo} (índice: ${indice})`);

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

    previsualizarDocumentoDirecto(documento: Documento, index: number): void {
        if (!documento?.id || index == null) {
            console.warn('Documento o índice inválido');
            return;
        }

        this.radicacionService.previsualizarArchivo(documento.id, index);
    }

    getObservacionTooltip(doc: Documento): string {
        if (!doc.observacion || doc.observacion.trim() === '') {
            return '';
        }
        return `Observación: ${doc.observacion.trim()}`;
    }

    // ===============================
    // UI
    // ===============================
    initTooltips(): void {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        if (tooltipTriggerList.length > 0 && typeof bootstrap !== 'undefined') {
            Array.from(tooltipTriggerList).forEach((tooltipTriggerEl: Element) => {
                new bootstrap.Tooltip(tooltipTriggerEl, {
                    placement: 'top',
                    trigger: 'hover'
                });
            });
        }
    }

    refreshData(): void {
        console.log('🔄 Recargando mis radicaciones...');
        this.loadMisRadicaciones();
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

    onToggleSidebar(collapsed: boolean): void {
        this.sidebarCollapsed = collapsed;
    }

    onLogout(): void {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}