import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { Documento } from '../../../../core/models/documento.model';
import { UserRole } from '../../../../core/models/user.types';

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

    // Propiedades para vista previa MEJORADA
    isLoadingPreview = false;
    previewError = '';
    previewUrl: SafeResourceUrl | null = null;
    previewDocumentName = '';
    previewDocumentId = '';
    previewDocumentNumber = 0;
    previewIsPdf = false;
    previewIsImage = false;
    previewIsOffice = false;
    previewFileExtension = '';
    previewFileSize = '';
    previewFileType = '';

    // Propiedades para controles de imagen
    loadingProgress = 0;
    imageRotation = 0;
    imageZoom = 1;

    // Navegación entre documentos
    hasPreviousDocument = false;
    hasNextDocument = false;
    currentDocumentIndex = -1;
    currentDocumentList: any[] = [];
    currentPreviewDocument: Documento | null = null;

    // Rol del usuario actual
    currentUserRole: UserRole = UserRole.RADICADOR;

    constructor(
        private radicacionService: RadicacionService,
        private router: Router,
        private sanitizer: DomSanitizer
    ) { }

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
        this.usingMockData = false;

        console.log('📥 Solicitando documentos al servidor...');

        this.radicacionService.obtenerDocumentos().subscribe({
            next: (documentos) => {
                console.log('✅ Documentos recibidos del servidor:', documentos);

                // Asegurar que documentos sea un array
                const documentosArray = Array.isArray(documentos) ? documentos : [];

                console.log(`📊 Total de documentos: ${documentosArray.length}`);

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

    getDocumentCount(doc: Documento): number {
        let count = 0;
        if (doc.nombreDocumento1) count++;
        if (doc.nombreDocumento2) count++;
        if (doc.nombreDocumento3) count++;
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

    formatDateShort(date: Date | string): string {
        if (!date) return 'N/A';

        try {
            const fecha = new Date(date);
            return fecha.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'Fecha inválida';
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

    // MÉTODOS DE VISTA PREVIA MEJORADA

    // MÉTODO SIMPLIFICADO PARA VISTA PREVIA
    // MÉTODO MEJORADO PARA VISTA PREVIA
    verVistaPrevia(documento: Documento, numeroDocumento: number): void {
        console.log('📄 Iniciando vista previa para documento:', {
            id: documento.id,
            numero: numeroDocumento,
            contratista: documento.nombreContratista,
            radicado: documento.numeroRadicado
        });

        // Resetear estado
        this.resetPreviewState();

        // Determinar nombre del documento
        let nombreDocumento = '';
        let descripcionDocumento = '';

        switch (numeroDocumento) {
            case 1:
                nombreDocumento = documento.nombreDocumento1;
                descripcionDocumento = documento.descripcionDoc1 || 'Documento 1';
                break;
            case 2:
                nombreDocumento = documento.nombreDocumento2;
                descripcionDocumento = documento.descripcionDoc2 || 'Documento 2';
                break;
            case 3:
                nombreDocumento = documento.nombreDocumento3;
                descripcionDocumento = documento.descripcionDoc3 || 'Documento 3';
                break;
        }

        if (!nombreDocumento) {
            console.error('❌ No se encontró nombre del documento');
            this.previewError = 'El documento no tiene un archivo asociado';
            this.mostrarModalVistaPrevia();
            return;
        }

        // Configurar propiedades básicas
        this.previewDocumentName = nombreDocumento;
        this.previewDocumentId = documento.id;
        this.previewDocumentNumber = numeroDocumento;
        this.previewFileExtension = this.getFileExtension(nombreDocumento);
        this.currentPreviewDocument = documento;

        // Configurar navegación
        this.configurarNavegacion(documento, numeroDocumento);

        console.log('🔍 Configuración de vista previa:', {
            nombre: this.previewDocumentName,
            descripcion: descripcionDocumento,
            extension: this.previewFileExtension
        });

        // Cargar el documento
        this.cargarDocumentoParaVistaPrevia(documento.id, numeroDocumento);
    }

    // MÉTODO MEJORADO PARA CARGAR DOCUMENTO
    cargarDocumentoParaVistaPrevia(documentoId: string, docNumber: number): void {
        this.isLoadingPreview = true;
        this.previewError = '';
        this.loadingProgress = 30;

        const token = localStorage.getItem('token');
        if (!token) {
            this.previewError = 'Sesión no válida';
            this.isLoadingPreview = false;
            this.mostrarModalVistaPrevia();
            return;
        }

        // 🔑 EXTENSIÓN DEL ARCHIVO
        const ext = this.previewFileExtension;

        let previewUrl = '';

        // 🧠 WORD → PDF (temporal)
        if (ext === 'doc' || ext === 'docx') {
            previewUrl =
                `/api/radicacion/${documentoId}/archivo/${docNumber}/preview?token=${token}`;
        }
        // 📄 PDF normal
        else if (ext === 'pdf') {
            previewUrl =
                `/api/radicacion/${documentoId}/archivo/${docNumber}?token=${token}`;
        }
        // 🖼️ Imagen
        else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
            this.previewIsImage = true;
            previewUrl =
                `/api/radicacion/${documentoId}/archivo/${docNumber}?token=${token}`;
        }

        // 🎯 FLAGS FINALES
        this.previewIsPdf = !this.previewIsImage;
        this.previewIsOffice = false;

        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl);

        setTimeout(() => {
            this.loadingProgress = 100;
            this.isLoadingPreview = false;
            this.mostrarModalVistaPrevia();
        }, 300);
    }


    // MÉTODO PARA DETECTAR TIPO POR BLOB (más preciso)
    detectarTipoPorBlob(blob: Blob): void {
        const mimeType = blob.type;
        console.log('🔍 Tipo MIME del blob:', mimeType);

        if (mimeType.startsWith('image/')) {
            this.previewIsImage = true;
            this.previewIsPdf = false;
            this.previewIsOffice = false;
            this.previewFileType = 'Imagen';
        } else if (mimeType === 'application/pdf') {
            this.previewIsPdf = true;
            this.previewIsImage = false;
            this.previewIsOffice = false;
            this.previewFileType = 'Documento PDF';
        } else if (mimeType.includes('word') ||
            mimeType.includes('excel') ||
            mimeType.includes('powerpoint') ||
            mimeType.includes('officedocument')) {
            this.previewIsOffice = true;
            this.previewIsImage = false;
            this.previewIsPdf = false;
            this.previewFileType = this.getOfficeFileType(this.previewFileExtension);
        } else {
            this.previewFileType = `Archivo .${this.previewFileExtension.toUpperCase()}`;
        }
    }

    // MÉTODO PARA MOSTRAR MODAL (VERSIÓN MÁS ROBUSTA)
    mostrarModalVistaPrevia(): void {
        const modalElement = document.getElementById('previewModal');
        if (!modalElement) {
            console.error('❌ No se encontró el elemento del modal');
            return;
        }

        try {
            // Ocultar cualquier modal abierto
            const existingModal = bootstrap.Modal.getInstance(modalElement);
            if (existingModal) {
                existingModal.hide();
            }

            // Crear nueva instancia del modal
            const modal = new bootstrap.Modal(modalElement, {
                backdrop: 'static',
                keyboard: false
            });

            // Mostrar el modal
            modal.show();

            console.log('✅ Modal mostrado correctamente');

        } catch (error) {
            console.error('❌ Error mostrando modal:', error);

            // Fallback: usar show() directamente
            modalElement.classList.add('show');
            modalElement.style.display = 'block';
            modalElement.style.paddingRight = '17px';
            modalElement.setAttribute('aria-modal', 'true');
            modalElement.setAttribute('role', 'dialog');

            // Añadir backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);

            console.log('⚠️ Usando fallback para mostrar modal');
        }
    }

    // Detectar tipo de archivo basado en extensión
    detectarTipoArchivo(): void {
        const ext = this.previewFileExtension.toLowerCase();

        // Resetear flags
        this.previewIsPdf = false;
        this.previewIsImage = false;
        this.previewIsOffice = false;

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
            this.previewIsImage = true;
            this.previewFileType = 'Imagen';
        } else if (ext === 'pdf') {
            this.previewIsPdf = true;
            this.previewFileType = 'Documento PDF';
        } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
            this.previewIsOffice = true;
            this.previewFileType = this.getOfficeFileType(ext);
        } else {
            this.previewFileType = `Archivo .${ext.toUpperCase()}`;
        }
    }

    getOfficeFileType(extension: string): string {
        switch (extension) {
            case 'doc':
            case 'docx':
                return 'Documento Word';
            case 'xls':
            case 'xlsx':
                return 'Hoja de cálculo Excel';
            case 'ppt':
            case 'pptx':
                return 'Presentación PowerPoint';
            default:
                return 'Documento Office';
        }
    }

    getFileExtension(filename: string): string {
        return filename.split('.').pop()?.toLowerCase() || '';
    }

    configurarNavegacion(documento: Documento, numeroDocumento: number): void {
        // Encontrar índice del documento actual en la lista paginada
        this.currentDocumentIndex = this.paginatedDocumentos.findIndex(doc => doc.id === documento.id);

        // Configurar navegación
        this.hasPreviousDocument = this.currentDocumentIndex > 0;
        this.hasNextDocument = this.currentDocumentIndex < this.paginatedDocumentos.length - 1;

        // Guardar referencia a la lista actual
        this.currentDocumentList = [...this.paginatedDocumentos];
    }



    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getErrorMessage(error: any): string {
        if (error.status === 404) {
            return 'El archivo no fue encontrado en el servidor.';
        } else if (error.status === 401 || error.status === 403) {
            return 'No tienes permisos para ver este archivo.';
        } else if (error.status === 0) {
            return 'Error de conexión. Verifica tu conexión a internet.';
        } else {
            return error.message || 'Error desconocido al cargar el documento.';
        }
    }

    // CONTROLES DE IMAGEN
    rotateImage(degrees: number): void {
        this.imageRotation += degrees;
        this.imageRotation = this.imageRotation % 360;
    }

    zoomIn(): void {
        this.imageZoom = Math.min(this.imageZoom + 0.1, 3);
    }

    zoomOut(): void {
        this.imageZoom = Math.max(this.imageZoom - 0.1, 0.5);
    }

    resetZoom(): void {
        this.imageZoom = 1;
        this.imageRotation = 0;
    }

    // MANEJO DE EVENTOS
    onImageLoaded(): void {
        console.log('✅ Imagen cargada correctamente');
    }

    onImageError(): void {
        this.previewError = 'Error al cargar la imagen. El archivo puede estar corrupto o no ser una imagen válida.';
    }

    onPdfLoaded(): void {
        console.log('✅ PDF cargado correctamente');
    }

    // ACCIONES
    downloadPreview(): void {
        if (this.previewDocumentId && this.previewDocumentNumber && this.previewDocumentName) {
            this.descargarDocumento(this.previewDocumentId, this.previewDocumentNumber, this.previewDocumentName);
        }
    }

    openPdfInNewTab(): void {
        if (this.previewUrl) {
            window.open(this.previewUrl.toString(), '_blank');
        }
    }

    retryPreview(): void {
        if (this.currentPreviewDocument && this.previewDocumentNumber) {
            this.cargarDocumentoParaVistaPrevia(this.currentPreviewDocument.id, this.previewDocumentNumber);
        }
    }

    viewPreviousDocument(): void {
        if (this.hasPreviousDocument && this.currentDocumentIndex > 0) {
            const prevDoc = this.currentDocumentList[this.currentDocumentIndex - 1];
            // Buscar el primer documento disponible en el documento anterior
            let docNumber = 1;
            if (prevDoc.nombreDocumento1) docNumber = 1;
            else if (prevDoc.nombreDocumento2) docNumber = 2;
            else if (prevDoc.nombreDocumento3) docNumber = 3;

            this.verVistaPrevia(prevDoc, docNumber);
        }
    }

    viewNextDocument(): void {
        if (this.hasNextDocument && this.currentDocumentIndex < this.currentDocumentList.length - 1) {
            const nextDoc = this.currentDocumentList[this.currentDocumentIndex + 1];
            // Buscar el primer documento disponible en el siguiente documento
            let docNumber = 1;
            if (nextDoc.nombreDocumento1) docNumber = 1;
            else if (nextDoc.nombreDocumento2) docNumber = 2;
            else if (nextDoc.nombreDocumento3) docNumber = 3;

            this.verVistaPrevia(nextDoc, docNumber);
        }
    }

    resetPreviewState(): void {
        // Limpiar URL anterior para liberar memoria
        if (this.previewUrl) {
            try {
                const url = this.previewUrl.toString();
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            } catch (e) {
                console.warn('Error al liberar URL del blob:', e);
            }
        }

        // Resetear estado
        this.previewUrl = null;
        this.previewError = '';
        this.previewIsPdf = false;
        this.previewIsImage = false;
        this.previewIsOffice = false;
        this.imageRotation = 0;
        this.imageZoom = 1;
        this.loadingProgress = 0;
    }

    descargarDocumento(documentoId: string, numeroDocumento: number, nombreArchivo: string): void {
        this.radicacionService.descargarDocumento(documentoId, numeroDocumento).subscribe({
            next: (blob) => {
                this.radicacionService.descargarArchivo(blob, nombreArchivo);
            },
            error: (error) => {
                alert('Error al descargar documento: ' + (error.message || 'Desconocido'));
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

    // ===============================
    // PREVISUALIZACIÓN DIRECTA (INLINE)
    // ===============================
    previsualizarDocumento(doc: any, index: number) {
        const nombre = doc.archivos[index]?.nombre || '';
        const ext = nombre.split('.').pop()?.toLowerCase();

        if (ext === 'doc' || ext === 'docx') {
            window.open(
                this.radicacionService.getArchivoPreviewUrl(doc.id, index),
                '_blank'
            );
        } else {
            this.radicacionService.previsualizarArchivo(doc.id, index);
        }
    }




    // ===============================
    // DESCARGA DIRECTA
    // ===============================
    descargarDocumentoDirecto(documento: Documento, index: number): void {
        if (!documento?.id || index == null) {
            console.warn('Documento o índice inválido');
            return;
        }

        const nombre =
            documento[`nombreDocumento${index}` as keyof Documento] as string;

        this.radicacionService.descargarArchivoDirecto(
            documento.id,
            index,
            nombre
        );
    }


    // ===============================
    // OBTENER URL DE ARCHIVO
    // ===============================
    getArchivoUrl(documentoId: string, numeroDocumento: number, descarga: boolean = false): string {
        const baseUrl = '/api/radicacion'; // Ajusta según tu API
        const token = localStorage.getItem('token') || '';
        return `${baseUrl}/${documentoId}/archivo/${numeroDocumento}?descarga=${descarga}&token=${token}`;
    }

    previsualizarDocumentoDirecto(documento: Documento, index: number): void {
        if (!documento?.id || index == null) {
            console.warn('Documento o índice inválido');
            return;
        }

        this.radicacionService.previsualizarArchivo(documento.id, index);
    }
}