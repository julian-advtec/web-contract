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
            // ✅ CAMBIADO: Nuevos nombres para las descripciones
            descripcionCuentaCobro: ['Cuenta de Cobro', Validators.maxLength(200)],
            descripcionSeguridadSocial: ['Seguridad Social', Validators.maxLength(200)],
            descripcionInformeActividades: ['Informe de Actividades', Validators.maxLength(200)],
            // ✅ NUEVO: Campo de observación
            observacion: ['', Validators.maxLength(500)]
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

        // ✅ CAMBIADO: Usar los nuevos nombres de controles
        const descripcionControls = [
            'descripcionCuentaCobro',
            'descripcionSeguridadSocial',
            'descripcionInformeActividades'
        ];

        const descripcionControl = descripcionControls[index];
        const currentValue = this.radicacionForm.get(descripcionControl)?.value;

        // ✅ CAMBIADO: Valores por defecto actualizados
        const defaultValues = ['Cuenta de Cobro', 'Seguridad Social', 'Informe de Actividades'];

        if (!currentValue || currentValue === defaultValues[index]) {
            const nombreSinExtension = file.name.replace(/\.[^/.]+$/, "");
            this.radicacionForm.get(descripcionControl)?.setValue(nombreSinExtension);
        }

        this.mostrarMensaje(`Archivo cargado`, 'success');
    }

    onSubmit(): void {
        console.log('🔍 ======= INICIANDO ENVÍO DE RADICACIÓN =======');

        // ✅ DEBUG: Verificar valores del formulario
        console.log('📋 Valores del formulario:', this.radicacionForm.value);
        console.log('📋 fechaInicio:', this.radicacionForm.value.fechaInicio);
        console.log('📋 tipo fechaInicio:', typeof this.radicacionForm.value.fechaInicio);
        console.log('📋 fechaFin:', this.radicacionForm.value.fechaFin);
        console.log('📋 tipo fechaFin:', typeof this.radicacionForm.value.fechaFin);

        // Validar formulario
        if (this.radicacionForm.invalid) {
            console.log('❌ Formulario inválido');
            console.log('❌ Errores:', this.radicacionForm.errors);
            console.log('❌ Errores fechaInicio:', this.radicacionForm.get('fechaInicio')?.errors);
            console.log('❌ Errores fechaFin:', this.radicacionForm.get('fechaFin')?.errors);
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

        // ✅ SOLUCIÓN DEFINITIVA: Convertir explícitamente las fechas a strings en formato YYYY-MM-DD
        let fechaInicioStr = this.radicacionForm.value.fechaInicio;
        let fechaFinStr = this.radicacionForm.value.fechaFin;

        console.log('📅 Fechas originales:');
        console.log('  fechaInicioStr:', fechaInicioStr);
        console.log('  fechaFinStr:', fechaFinStr);

        // Si son objetos Date, convertirlos a string YYYY-MM-DD
        if (fechaInicioStr instanceof Date) {
            fechaInicioStr = fechaInicioStr.toISOString().split('T')[0];
            console.log('📅 fechaInicio convertida de Date a string:', fechaInicioStr);
        }

        if (fechaFinStr instanceof Date) {
            fechaFinStr = fechaFinStr.toISOString().split('T')[0];
            console.log('📅 fechaFin convertida de Date a string:', fechaFinStr);
        }

        // Asegurarse de que son strings
        fechaInicioStr = String(fechaInicioStr).trim();
        fechaFinStr = String(fechaFinStr).trim();

        console.log('📅 Fechas finales para envío:');
        console.log('  fechaInicioStr:', fechaInicioStr);
        console.log('  fechaFinStr:', fechaFinStr);

        // Validar que las fechas no estén vacías
        if (!fechaInicioStr || fechaInicioStr === 'undefined' || fechaInicioStr === 'null') {
            this.mostrarMensaje('La fecha de inicio es requerida', 'error');
            return;
        }

        if (!fechaFinStr || fechaFinStr === 'undefined' || fechaFinStr === 'null') {
            this.mostrarMensaje('La fecha de fin es requerida', 'error');
            return;
        }

        // Validar formato de fechas
        const fechaInicio = new Date(fechaInicioStr);
        const fechaFin = new Date(fechaFinStr);

        if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
            this.mostrarMensaje('Fechas inválidas. Formato esperado: YYYY-MM-DD', 'error');
            return;
        }

        if (fechaInicio > fechaFin) {
            this.mostrarMensaje('La fecha de inicio no puede ser mayor que la fecha de fin', 'error');
            return;
        }

        this.isLoading = true;
        this.mostrarMensaje('Radicando documento...', 'success');

        // ✅ CORREGIDO: Preparar DTO con fechas como strings
        const createDocumentoDto: CreateDocumentoDto = {
            numeroRadicado: this.radicacionForm.value.numeroRadicado.toUpperCase().trim(),
            numeroContrato: this.radicacionForm.value.numeroContrato.trim(),
            nombreContratista: this.radicacionForm.value.nombreContratista.trim(),
            documentoContratista: this.radicacionForm.value.documentoContratista.trim(),
            // ✅ ENVIAR FECHAS COMO STRINGS EXPLÍCITAMENTE
            fechaInicio: fechaInicioStr,
            fechaFin: fechaFinStr,
            // ✅ CAMBIADO: Usar los nuevos nombres de campos
            descripcionCuentaCobro: this.radicacionForm.value.descripcionCuentaCobro?.trim() || 'Cuenta de Cobro',
            descripcionSeguridadSocial: this.radicacionForm.value.descripcionSeguridadSocial?.trim() || 'Seguridad Social',
            descripcionInformeActividades: this.radicacionForm.value.descripcionInformeActividades?.trim() || 'Informe de Actividades',
            // ✅ NUEVO: Campo observación
            observacion: this.radicacionForm.value.observacion?.trim() || ''
        };

        // Obtener archivos como array
        const archivos = archivosSeleccionados as File[];

        console.log('📤 Datos a enviar al servicio:', {
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
                } else if (error.message.includes('fechaInicio') || error.message.includes('fechaFin')) {
                    mensajeError = '❌ Error en las fechas. Por favor verifique que las fechas estén en formato correcto (YYYY-MM-DD).';
                } else if (error.message.includes('should not be empty') || error.message.includes('must be a string')) {
                    mensajeError = '❌ Error de validación: algunos campos requeridos están vacíos o tienen formato incorrecto.';
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

    onCancel(): void {
        this.cancelar.emit();
        this.resetForm();
    }

    resetForm(): void {
        // ✅ CAMBIADO: Valores por defecto actualizados
        this.radicacionForm.reset({
            descripcionCuentaCobro: 'Cuenta de Cobro',
            descripcionSeguridadSocial: 'Seguridad Social',
            descripcionInformeActividades: 'Informe de Actividades',
            observacion: ''
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