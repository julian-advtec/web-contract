import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { CreateDocumentoDto } from '../../../../core/models/documento.model';

@Component({
    selector: 'app-radicacion-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    templateUrl: './radicacion-form.component.html',
    styleUrls: ['./radicacion-form.component.scss']
})
export class RadicacionFormComponent {
    @Output() documentoRadicado = new EventEmitter<any>();
    @Output() cancelar = new EventEmitter<void>();

    radicacionForm: FormGroup;
    documentosSeleccionados: (File | null)[] = [null, null, null];
    isLoading = false;
    mensaje = '';
    tipoMensaje: 'success' | 'error' = 'success';
    maxFileSize = 10 * 1024 * 1024;

    constructor(
        private fb: FormBuilder,
        private radicacionService: RadicacionService
    ) {
        this.radicacionForm = this.createForm();
    }

    createForm(): FormGroup {
        return this.fb.group({
            numeroRadicado: ['', [
                Validators.required,
                Validators.pattern(/^R\d{4}-\d{3}$/),
                Validators.maxLength(10)
            ]],
            numeroContrato: ['', [
                Validators.required,
                Validators.maxLength(50)
            ]],
            nombreContratista: ['', [
                Validators.required,
                Validators.maxLength(200)
            ]],
            documentoContratista: ['', [
                Validators.required,
                Validators.maxLength(50)
            ]],
            fechaInicio: ['', Validators.required],
            fechaFin: ['', Validators.required],
            descripcionDoc1: ['Documento 1', Validators.maxLength(200)],
            descripcionDoc2: ['Documento 2', Validators.maxLength(200)],
            descripcionDoc3: ['Documento 3', Validators.maxLength(200)]
        });
    }

    onFileSelected(event: any, index: number): void {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > this.maxFileSize) {
            this.mostrarMensaje(`El archivo excede 10MB`, 'error');
            event.target.value = '';
            return;
        }

        const allowedTypes = ['application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg', 'image/png'];

        if (!allowedTypes.includes(file.type)) {
            this.mostrarMensaje(`Tipo no permitido`, 'error');
            event.target.value = '';
            return;
        }

        this.documentosSeleccionados[index] = file;

        const descripcionControl = `descripcionDoc${index + 1}`;
        const currentValue = this.radicacionForm.get(descripcionControl)?.value;

        if (!currentValue || currentValue.startsWith('Documento')) {
            const nombreSinExtension = file.name.replace(/\.[^/.]+$/, "");
            this.radicacionForm.get(descripcionControl)?.setValue(nombreSinExtension);
        }

        this.mostrarMensaje(`Archivo cargado`, 'success');
    }

    onSubmit(): void {
        console.log('🔍 ======= INICIANDO ENVÍO DE RADICACIÓN =======');

        // Validar formulario
        if (this.radicacionForm.invalid) {
            console.log('❌ Formulario inválido');
            this.marcarControlesComoSucios();
            this.mostrarMensaje('Por favor complete todos los campos requeridos correctamente', 'error');
            return;
        }

        // Validar que se hayan seleccionado 3 archivos
        const archivosSeleccionados = this.documentosSeleccionados.filter(file => file !== null);
        if (archivosSeleccionados.length !== 3) {
            console.log('❌ Archivos insuficientes:', archivosSeleccionados.length);
            this.mostrarMensaje('Debe seleccionar exactamente 3 archivos', 'error');
            return;
        }

        // Validar fechas
        const fechaInicio = new Date(this.radicacionForm.value.fechaInicio);
        const fechaFin = new Date(this.radicacionForm.value.fechaFin);

        if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
            this.mostrarMensaje('Fechas inválidas', 'error');
            return;
        }

        if (fechaInicio > fechaFin) {
            this.mostrarMensaje('La fecha de inicio no puede ser mayor que la fecha de fin', 'error');
            return;
        }

        this.isLoading = true;
        this.mostrarMensaje('Radicando documento...', 'success');

        // Preparar DTO
        const createDocumentoDto: CreateDocumentoDto = {
            numeroRadicado: this.radicacionForm.value.numeroRadicado.toUpperCase().trim(),
            numeroContrato: this.radicacionForm.value.numeroContrato.trim(),
            nombreContratista: this.radicacionForm.value.nombreContratista.trim(),
            documentoContratista: this.radicacionForm.value.documentoContratista.trim(),
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            descripcionDoc1: this.radicacionForm.value.descripcionDoc1?.trim() || 'Documento 1',
            descripcionDoc2: this.radicacionForm.value.descripcionDoc2?.trim() || 'Documento 2',
            descripcionDoc3: this.radicacionForm.value.descripcionDoc3?.trim() || 'Documento 3'
        };

        // Obtener archivos como array
        const archivos = archivosSeleccionados as File[];

        console.log('📤 Datos a enviar:', {
            dto: createDocumentoDto,
            archivos: archivos.map(f => ({ nombre: f.name, tamaño: f.size, tipo: f.type }))
        });

        // Enviar al backend
        this.radicacionService.crearDocumento(createDocumentoDto, archivos).subscribe({
            next: (documentoCreado: any) => {
                console.log('✅ Documento radicado exitosamente:', documentoCreado);

                // Verificar si es un documento válido
                if (documentoCreado && documentoCreado.id && documentoCreado.numeroRadicado) {
                    this.mostrarMensaje('✅ Documento radicado exitosamente', 'success');
                    this.documentoRadicado.emit(documentoCreado);
                    this.resetForm();
                } else {
                    console.warn('⚠️ Respuesta inesperada:', documentoCreado);
                    this.mostrarMensaje('Documento creado pero respuesta inesperada', 'success');
                    this.resetForm();
                }
                this.isLoading = false;
            },
            error: (error) => {
                console.error('❌ Error en radicación:', error);

                let mensajeError = error.message || 'Error desconocido al radicar documento';

                // Mensajes específicos según el tipo de error
                if (error.message.includes('duplicate key') || error.message.includes('ya existe')) {
                    mensajeError = '❌ El número de radicado ya existe. Use un número diferente.';
                } else if (error.message.includes('permisos')) {
                    mensajeError = '❌ No tienes permisos para radicar documentos.';
                } else if (error.message.includes('sesión')) {
                    mensajeError = '❌ Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
                } else if (error.message.includes('conexión')) {
                    mensajeError = '❌ Error de conexión. Verifica tu conexión a internet.';
                }

                this.mostrarMensaje(mensajeError, 'error');
                this.isLoading = false;
            },
            complete: () => {
                console.log('✅ Petición completada');
                this.isLoading = false;
            }
        });
    }

    private debugAuthInfo(): void {
        console.log('🔐 ======= INFO DE AUTENTICACIÓN =======');

        // Verificar token
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        console.log('🔑 Token presente:', !!token);
        if (token) {
            try {
                // Decodificar JWT para ver el payload
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log('🔓 Payload del JWT:', {
                    sub: payload.sub,
                    username: payload.username,
                    role: payload.role,
                    exp: new Date(payload.exp * 1000).toLocaleString(),
                    iat: new Date(payload.iat * 1000).toLocaleString()
                });
            } catch (e) {
                console.log('❌ No se pudo decodificar el JWT:', e);
            }
        }

        // Verificar usuario en localStorage
        const userStr = localStorage.getItem('user');
        console.log('👤 User en localStorage:', !!userStr);
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                console.log('👤 Datos del usuario:', user);
            } catch (e) {
                console.log('❌ Error parseando usuario:', e);
            }
        }
    }

    onCancel(): void {
        this.cancelar.emit();
        this.resetForm();
    }

    resetForm(): void {
        this.radicacionForm.reset({
            descripcionDoc1: 'Documento 1',
            descripcionDoc2: 'Documento 2',
            descripcionDoc3: 'Documento 3'
        });
        this.documentosSeleccionados = [null, null, null];
    }

    private marcarControlesComoSucios(): void {
        Object.keys(this.radicacionForm.controls).forEach(key => {
            const control = this.radicacionForm.get(key);
            control?.markAsDirty();
            control?.updateValueAndValidity();
        });
    }

    private mostrarMensaje(texto: string, tipo: 'success' | 'error'): void {
        this.mensaje = texto;
        this.tipoMensaje = tipo;

        setTimeout(() => {
            if (this.mensaje === texto) {
                this.mensaje = '';
            }
        }, 5000);
    }

    getNumeroRadicadoError(): string {
        const control = this.radicacionForm.get('numeroRadicado');
        if (control?.errors?.['required']) return 'Requerido';
        if (control?.errors?.['pattern']) return 'Formato: RAAAA-NNN';
        if (control?.errors?.['maxlength']) return 'Máx 10 caracteres';
        return '';
    }

    getNombreArchivo(index: number): string {
        return this.documentosSeleccionados[index]?.name || 'Sin archivo';
    }

    removeFile(index: number): void {
        this.documentosSeleccionados[index] = null;
        this.mostrarMensaje(`Archivo ${index + 1} removido`, 'success');
    }
}