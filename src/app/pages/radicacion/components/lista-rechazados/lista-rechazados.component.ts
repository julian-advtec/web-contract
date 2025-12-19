// src/app/pages/radicacion/components/lista-rechazados/lista-rechazados.component.ts
import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { ModulesService, AppModule } from '../../../../core/services/modules.service';
import { User, UserRole, stringToUserRole, getUserRoleName } from '../../../../core/models/user.types';
import { Documento } from '../../../../core/models/documento.model';

declare var bootstrap: any;

@Component({
    selector: 'app-lista-rechazados',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    templateUrl: './lista-rechazados.component.html',
    styleUrls: ['./lista-rechazados.component.scss']
})
export class ListaRechazadosComponent implements OnInit, OnDestroy {

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
    modoPrueba = true; // Modo prueba activado por defecto

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
    availableModules: AppModule[] = [];

    private destroy$ = new Subject<void>();

    constructor(
        public authService: AuthService,
        private radicacionService: RadicacionService,
        private modulesService: ModulesService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        console.log('🔍 ListaRechazadosComponent - ngOnInit llamado');
        console.log('📌 URL actual:', window.location.href);
        console.log('📍 Ruta Router:', this.router.url);
        console.log('🚀 Componente cargado correctamente');

        this.loadCurrentUser();
        
        // Cargar datos de prueba inmediatamente
        this.cargarDatosPrueba();
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
        this.loadAvailableModules();
    }

    loadAvailableModules(): void {
        if (!this.currentUser) {
            this.availableModules = [];
            return;
        }

        const allModules = this.modulesService.getAllModules();

        this.availableModules = allModules.filter(module => {
            if (this.currentUser?.role === UserRole.ADMIN) {
                return true;
            }
            return module.requiredRole === this.currentUser?.role;
        });

        console.log('📋 Módulos disponibles:', this.availableModules);
    }

    // ===============================
    // MÉTODO PRINCIPAL PARA CARGAR DATOS
    // ===============================
    loadDocumentosRechazados(): void {
        this.isLoading = true;
        this.errorMessage = '';
        this.showError = false;
        this.showSuccess = false;

        console.log('📥 Cargando documentos rechazados...');

        if (this.modoPrueba) {
            // Usar datos de prueba
            this.cargarDatosPrueba();
            return;
        }

        // Código original del servicio (comentado temporalmente)
        this.radicacionService.obtenerDocumentos()
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

                    // Filtrar solo los documentos rechazados
                    const documentosRechazados = documentosArray.filter(doc =>
                        doc.estado && doc.estado.toUpperCase() === 'RECHAZADO'
                    );

                    console.log(`📊 Total de documentos: ${documentosArray.length}`);
                    console.log(`📊 Documentos rechazados: ${documentosRechazados.length}`);

                    this.documentos = documentosRechazados;
                    this.filteredDocumentos = [...documentosRechazados];
                    this.updatePagination();

                    if (this.documentos.length === 0) {
                        this.showSuccess = true;
                        this.successMessage = 'No hay documentos rechazados';
                    } else {
                        this.showSuccess = true;
                        this.successMessage = `Se encontraron ${this.documentos.length} documentos rechazados`;

                        setTimeout(() => {
                            this.showSuccess = false;
                        }, 3000);
                    }

                    setTimeout(() => {
                        this.initTooltips();
                    }, 100);
                },
                error: (error: any) => {
                    console.error('❌ Error al cargar documentos rechazados:', error);
                    this.showError = true;
                    this.errorMessage = `Error al cargar documentos rechazados: ${error.message || 'Error desconocido'}`;
                }
            });
    }

    // ===============================
    // DATOS DE PRUEBA COMPLETOS
    // ===============================
    cargarDatosPrueba(): void {
        this.isLoading = true;
        console.log('🧪 Cargando datos de prueba...');

        // Datos de prueba completos según la estructura de Documento
        const mockDocumentos: Documento[] = [
            {
                id: '1',
                numeroRadicado: 'RAD-2024-001',
                numeroContrato: 'CONTRATO-001-2024',
                nombreContratista: 'Empresa Constructora S.A.',
                documentoContratista: '123456789',
                fechaInicio: new Date('2024-01-15'),
                fechaFin: new Date('2024-06-15'),
                estado: 'RECHAZADO',
                cuentaCobro: 'cuenta_cobro_1.pdf',
                seguridadSocial: 'seguridad_social_1.pdf',
                informeActividades: '',
                descripcionCuentaCobro: 'Cuenta de Cobro Enero 2024',
                descripcionSeguridadSocial: 'Certificado de Seguridad Social',
                descripcionInformeActividades: '',
                observacion: 'Documentación incompleta. Faltan firmas en el contrato.',
                radicador: {
                    id: '1',
                    nombre: 'Administrador Sistema',
                    email: 'admin@sistema.com',
                    role: UserRole.ADMIN,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any, // Usar 'as any' temporalmente para evitar complejidad
                nombreRadicador: 'Administrador Sistema',
                usuarioRadicador: 'admin',
                contratistaId: 'CT-001',
                fechaRadicacion: new Date('2024-01-10'),
                rutaCarpetaRadicado: '/documentos/radicados/RAD-2024-001',
                ultimoAcceso: new Date('2024-01-12'),
                ultimoUsuario: 'admin',
                tokenPublico: 'token_publico_001',
                tokenActivo: false,
                tokenExpiraEn: new Date('2024-12-31'),
                createdAt: new Date('2024-01-10'),
                updatedAt: new Date('2024-01-12')
            },
            {
                id: '2',
                numeroRadicado: 'RAD-2024-002',
                numeroContrato: 'CONTRATO-002-2024',
                nombreContratista: 'Servicios Técnicos Ltda.',
                documentoContratista: '987654321',
                fechaInicio: new Date('2024-02-01'),
                fechaFin: new Date('2024-12-31'),
                estado: 'RECHAZADO',
                cuentaCobro: 'cuenta_cobro_2.pdf',
                seguridadSocial: '',
                informeActividades: 'informe_actividades_2.pdf',
                descripcionCuentaCobro: 'Cuenta de Cobro Febrero 2024',
                descripcionSeguridadSocial: '',
                descripcionInformeActividades: 'Informe de Actividades Mensual',
                observacion: 'Certificado de seguridad social vencido. Renovar documento.',
                radicador: {
                    id: '2',
                    nombre: 'Juan Pérez',
                    email: 'juan.perez@empresa.com',
                    role: UserRole.RADICADOR,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any,
                nombreRadicador: 'Juan Pérez',
                usuarioRadicador: 'juan.perez',
                contratistaId: 'CT-002',
                fechaRadicacion: new Date('2024-01-25'),
                rutaCarpetaRadicado: '/documentos/radicados/RAD-2024-002',
                ultimoAcceso: new Date('2024-01-28'),
                ultimoUsuario: 'juan.perez',
                tokenPublico: 'token_publico_002',
                tokenActivo: false,
                tokenExpiraEn: new Date('2024-12-31'),
                createdAt: new Date('2024-01-25'),
                updatedAt: new Date('2024-01-28')
            },
            {
                id: '3',
                numeroRadicado: 'RAD-2024-003',
                numeroContrato: 'CONTRATO-003-2024',
                nombreContratista: 'Consultores Asociados',
                documentoContratista: '456789123',
                fechaInicio: new Date('2024-03-10'),
                fechaFin: new Date('2024-09-10'),
                estado: 'RECHAZADO',
                cuentaCobro: '',
                seguridadSocial: 'seguridad_social_3.pdf',
                informeActividades: 'informe_actividades_3.pdf',
                descripcionCuentaCobro: '',
                descripcionSeguridadSocial: 'Certificado EPS y ARL',
                descripcionInformeActividades: 'Informe Trimestral de Actividades',
                observacion: 'Informe de actividades no cumple con los requisitos mínimos establecidos.',
                radicador: {
                    id: '3',
                    nombre: 'María González',
                    email: 'maria.gonzalez@empresa.com',
                    role: UserRole.RADICADOR,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any,
                nombreRadicador: 'María González',
                usuarioRadicador: 'maria.gonzalez',
                contratistaId: 'CT-003',
                fechaRadicacion: new Date('2024-03-05'),
                rutaCarpetaRadicado: '/documentos/radicados/RAD-2024-003',
                ultimoAcceso: new Date('2024-03-08'),
                ultimoUsuario: 'maria.gonzalez',
                tokenPublico: 'token_publico_003',
                tokenActivo: false,
                tokenExpiraEn: new Date('2024-12-31'),
                createdAt: new Date('2024-03-05'),
                updatedAt: new Date('2024-03-08')
            },
            {
                id: '4',
                numeroRadicado: 'RAD-2024-004',
                numeroContrato: 'CONTRATO-004-2024',
                nombreContratista: 'Ingeniería y Proyectos S.A.S.',
                documentoContratista: '321654987',
                fechaInicio: new Date('2024-04-05'),
                fechaFin: new Date('2024-10-05'),
                estado: 'RECHAZADO',
                cuentaCobro: 'cuenta_cobro_4.pdf',
                seguridadSocial: 'seguridad_social_4.pdf',
                informeActividades: 'informe_actividades_4.pdf',
                descripcionCuentaCobro: 'Cuenta de Cobro Proyecto Ingeniería',
                descripcionSeguridadSocial: 'Certificado de Afiliación',
                descripcionInformeActividades: 'Informe de Avance de Obra',
                observacion: 'Cuenta de cobro con valores incorrectos. Revisar cálculos.',
                radicador: {
                    id: '1',
                    nombre: 'Administrador Sistema',
                    email: 'admin@sistema.com',
                    role: UserRole.ADMIN,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any,
                nombreRadicador: 'Administrador Sistema',
                usuarioRadicador: 'admin',
                contratistaId: 'CT-004',
                fechaRadicacion: new Date('2024-04-01'),
                rutaCarpetaRadicado: '/documentos/radicados/RAD-2024-004',
                ultimoAcceso: new Date('2024-04-03'),
                ultimoUsuario: 'admin',
                tokenPublico: 'token_publico_004',
                tokenActivo: false,
                tokenExpiraEn: new Date('2024-12-31'),
                createdAt: new Date('2024-04-01'),
                updatedAt: new Date('2024-04-03')
            },
            {
                id: '5',
                numeroRadicado: 'RAD-2024-005',
                numeroContrato: 'CONTRATO-005-2024',
                nombreContratista: 'Logística Integral',
                documentoContratista: '789123456',
                fechaInicio: new Date('2024-05-20'),
                fechaFin: new Date('2024-11-20'),
                estado: 'RECHAZADO',
                cuentaCobro: 'cuenta_cobro_5.pdf',
                seguridadSocial: '',
                informeActividades: '',
                descripcionCuentaCobro: 'Cuenta de Cobro Servicios Logísticos',
                descripcionSeguridadSocial: '',
                descripcionInformeActividades: '',
                observacion: 'Falta documentación de respaldo para los costos presentados.',
                radicador: {
                    id: '4',
                    nombre: 'Carlos Rodríguez',
                    email: 'carlos.rodriguez@empresa.com',
                    role: UserRole.RADICADOR,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any,
                nombreRadicador: 'Carlos Rodríguez',
                usuarioRadicador: 'carlos.rodriguez',
                contratistaId: 'CT-005',
                fechaRadicacion: new Date('2024-05-15'),
                rutaCarpetaRadicado: '/documentos/radicados/RAD-2024-005',
                ultimoAcceso: new Date('2024-05-18'),
                ultimoUsuario: 'carlos.rodriguez',
                tokenPublico: 'token_publico_005',
                tokenActivo: false,
                tokenExpiraEn: new Date('2024-12-31'),
                createdAt: new Date('2024-05-15'),
                updatedAt: new Date('2024-05-18')
            }
        ];

        // Simular delay de API
        setTimeout(() => {
            console.log('✅ Datos de prueba cargados:', mockDocumentos);
            
            this.documentos = mockDocumentos;
            this.filteredDocumentos = [...mockDocumentos];
            this.updatePagination();
            this.isLoading = false;
            
            this.showSuccess = true;
            this.successMessage = `✅ Se cargaron ${this.documentos.length} documentos de prueba`;
            
            setTimeout(() => {
                this.showSuccess = false;
            }, 3000);
            
            setTimeout(() => {
                this.initTooltips();
            }, 100);
            
            this.cdr.detectChanges();
        }, 800); // Simular 800ms de carga
    }

    limpiarDatosPrueba(): void {
        this.documentos = [];
        this.filteredDocumentos = [];
        this.paginatedDocumentos = [];
        this.searchTerm = '';
        this.currentPage = 1;
        
        this.showSuccess = true;
        this.successMessage = 'Datos de prueba limpiados';
        
        setTimeout(() => {
            this.showSuccess = false;
        }, 2000);
        
        this.cdr.detectChanges();
    }

    toggleModoPrueba(): void {
        this.modoPrueba = !this.modoPrueba;
        
        if (this.modoPrueba) {
            this.cargarDatosPrueba();
        } else {
            this.limpiarDatosPrueba();
        }
    }

    // ===============================
    // MÉTODOS DE BÚSQUEDA Y PAGINACIÓN
    // ===============================
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
                (doc.observacion && doc.observacion.toLowerCase().includes(term)) ||
                (doc.nombreRadicador && doc.nombreRadicador.toLowerCase().includes(term))
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

    // ===============================
    // MÉTODOS DE DOCUMENTOS
    // ===============================
    getDocumentCount(doc: Documento): number {
        let count = 0;
        if (doc.cuentaCobro && doc.cuentaCobro.trim() !== '') count++;
        if (doc.seguridadSocial && doc.seguridadSocial.trim() !== '') count++;
        if (doc.informeActividades && doc.informeActividades.trim() !== '') count++;
        return count;
    }

    getEstadoClass(estado: string): string {
        if (!estado) return 'pending';

        const estadoUpper = estado.toUpperCase();

        if (estadoUpper === 'RECHAZADO') {
            return 'rechazado';
        }

        return 'pending';
    }

    getEstadoTexto(estado: string): string {
        if (!estado) return 'Desconocido';

        const estadoUpper = estado.toUpperCase();

        if (estadoUpper === 'RECHAZADO') {
            return 'Rechazado';
        }

        return estado;
    }

    formatDateShort(date: Date | string): string {
        if (!date) return 'N/A';

        try {
            const fecha = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(fecha.getTime())) {
                return 'Fecha inválida';
            }
            
            const dia = fecha.getDate().toString().padStart(2, '0');
            const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
            const anio = fecha.getFullYear();

            return `${dia}/${mes}/${anio}`;
        } catch (error) {
            console.warn('Fecha inválida:', date);
            return 'Fecha inválida';
        }
    }

    getDocumentByIndex(doc: Documento, index: number): boolean {
        switch (index) {
            case 1: return !!(doc.cuentaCobro && doc.cuentaCobro.trim() !== '');
            case 2: return !!(doc.seguridadSocial && doc.seguridadSocial.trim() !== '');
            case 3: return !!(doc.informeActividades && doc.informeActividades.trim() !== '');
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

        // Simular descarga en modo prueba
        if (this.modoPrueba) {
            this.isDownloadingAll = true;
            
            setTimeout(() => {
                this.showSuccess = true;
                this.successMessage = `✅ Descarga simulada completada para ${documento.numeroRadicado}`;
                this.isDownloadingAll = false;
                
                setTimeout(() => {
                    this.showSuccess = false;
                }, 3000);
                
                this.cdr.detectChanges();
            }, 1500);
            
            return;
        }

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
            error: (error: any) => {
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

        // Simular previsualización en modo prueba
        if (this.modoPrueba) {
            this.showSuccess = true;
            this.successMessage = `Previsualizando documento ${index} de ${documento.numeroRadicado} (modo prueba)`;
            
            setTimeout(() => {
                this.showSuccess = false;
            }, 2000);
            
            return;
        }

        this.radicacionService.previsualizarArchivo(documento.id, index);
    }

    getObservacionTooltip(doc: Documento): string {
        if (!doc.observacion || doc.observacion.trim() === '') {
            return 'Sin observaciones';
        }
        return `Observación: ${doc.observacion.trim()}`;
    }

    verDetallePrueba(doc: Documento): void {
        console.log('🔍 Ver detalle de prueba para:', doc);
        
        this.showSuccess = true;
        this.successMessage = `Detalle de ${doc.numeroRadicado}: ${doc.observacion || 'Sin observaciones'}`;
        
        setTimeout(() => {
            this.showSuccess = false;
        }, 3000);
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
        console.log('🔄 Recargando documentos rechazados...');
        
        if (this.modoPrueba) {
            this.cargarDatosPrueba();
        } else {
            this.loadDocumentosRechazados();
        }
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

    getUserRoleName(): string {
        if (!this.currentUser) {
            return 'Usuario';
        }

        return getUserRoleName(this.currentUser.role);
    }
}