// src/app/pages/radicacion/components/radicacion-form/radicacion-form.component.ts
import { Component, Output, EventEmitter, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { CreateDocumentoDto } from '../../../../core/models/documento.model';
import { Contratista } from '../../../../core/models/contratista.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
export class RadicacionFormComponent implements OnInit {
    @Output() documentoRadicado = new EventEmitter<any>();
    @Output() cancelar = new EventEmitter<void>();

    @ViewChild('nombreContratistaInput') nombreContratistaInput!: ElementRef;
    @ViewChild('documentoContratistaInput') documentoContratistaInput!: ElementRef;

    radicacionForm: FormGroup;
    documentosSeleccionados: (File | null)[] = [null, null, null];
    isLoading = false;
    mensaje = '';
    tipoMensaje: 'success' | 'error' = 'success';
    maxFileSize = 10 * 1024 * 1024;

    // ✅ VARIABLES PARA PRIMER RADICADO
    verificandoPrimerRadicado = false;
    primerRadicadoDisponible = true;
    mensajePrimerRadicado = '';

    // ✅ VARIABLES PARA CONTRATISTAS
    contratistas: Contratista[] = [];
    contratistasFiltrados: Contratista[] = [];
    mostrarDropdownContratista = false;
    mostrarDropdownDocumento = false;
    cargandoContratistas = false;

    constructor(
        private fb: FormBuilder,
        private radicacionService: RadicacionService,
        private contratistasService: ContratistasService
    ) {
        this.radicacionForm = this.createForm();
    }

    ngOnInit(): void {
        this.cargarContratistas();
        this.setupAutocomplete();
        this.setupSincronizacionContratista();

        // Escuchar cambios en el número de radicado para verificar primer radicado
        this.radicacionForm.get('numeroRadicado')?.valueChanges.subscribe(value => {
            if (value && value.match(/^R\d{4}-\d{3}$/)) {
                const ano = value.substring(1, 5);
                const anoActual = new Date().getFullYear().toString();

                // Solo permitir marcar si es del año actual
                if (ano !== anoActual) {
                    this.radicacionForm.patchValue({ primerRadicadoDelAno: false });
                    this.radicacionForm.get('primerRadicadoDelAno')?.disable();
                    this.mostrarMensaje(
                        `⚠️ Solo se puede marcar como primer radicado para el año actual (${anoActual})`,
                        'warning'
                    );
                } else {
                    this.radicacionForm.get('primerRadicadoDelAno')?.enable();
                    // Solo verificar si está marcado
                    if (this.radicacionForm.value.primerRadicadoDelAno) {
                        this.verificarPrimerRadicadoDisponible();
                    }
                }
            } else {
                this.radicacionForm.patchValue({ primerRadicadoDelAno: false });
                this.primerRadicadoDisponible = true;
                this.mensajePrimerRadicado = '';
            }
        });

        // ✅ DEBUG: Verificar el valor del checkbox en tiempo real
        this.radicacionForm.get('primerRadicadoDelAno')?.valueChanges.subscribe(value => {
            console.log('🔄 Valor de primerRadicadoDelAno cambiado a:', value, 'tipo:', typeof value);
        });
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
            descripcionCuentaCobro: ['Cuenta de Cobro', Validators.maxLength(200)],
            descripcionSeguridadSocial: ['Seguridad Social', Validators.maxLength(200)],
            descripcionInformeActividades: ['Informe de Actividades', Validators.maxLength(200)],
            observacion: ['', Validators.maxLength(500)],
            primerRadicadoDelAno: [false]
        });
    }

    // ===============================
    // MÉTODOS PARA CONTRATISTAS
    // ===============================

    cargarContratistas(): void {
        this.cargandoContratistas = true;
        this.contratistasService.obtenerTodos().subscribe({
            next: (contratistas) => {
                this.contratistas = contratistas;
                this.contratistasFiltrados = [...contratistas];
                this.cargandoContratistas = false;
                console.log('📋 Contratistas cargados:', contratistas.length);
            },
            error: (error) => {
                console.error('❌ Error cargando contratistas:', error);
                this.cargandoContratistas = false;
            }
        });
    }

    setupAutocomplete(): void {
        // Autocomplete para nombre de contratista
        this.radicacionForm.get('nombreContratista')?.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged()
            )
            .subscribe(termino => {
                if (termino && termino.length >= 2) {
                    this.buscarContratistasPorNombre(termino);
                    this.mostrarDropdownContratista = true;
                } else {
                    this.contratistasFiltrados = [...this.contratistas];
                    this.mostrarDropdownContratista = false;
                }
            });

        // Autocomplete para documento de contratista
        this.radicacionForm.get('documentoContratista')?.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged()
            )
            .subscribe(termino => {
                if (termino && termino.length >= 2) {
                    this.buscarContratistasPorDocumento(termino);
                    this.mostrarDropdownDocumento = true;
                } else {
                    this.contratistasFiltrados = [...this.contratistas];
                    this.mostrarDropdownDocumento = false;
                }
            });
    }

    setupSincronizacionContratista(): void {
        // Sincronizar cuando se selecciona un contratista del dropdown
        this.radicacionForm.get('nombreContratista')?.valueChanges.subscribe(nombre => {
            // Solo sincronizar si el nombre coincide exactamente con un contratista existente
            const contratista = this.contratistas.find(c => 
                c.nombreCompleto === nombre
            );
            if (contratista && this.radicacionForm.get('documentoContratista')?.value !== contratista.documentoIdentidad) {
                this.radicacionForm.patchValue({
                    documentoContratista: contratista.documentoIdentidad
                }, { emitEvent: false });
            }
        });

        this.radicacionForm.get('documentoContratista')?.valueChanges.subscribe(documento => {
            const contratista = this.contratistas.find(c => 
                c.documentoIdentidad === documento
            );
            if (contratista && this.radicacionForm.get('nombreContratista')?.value !== contratista.nombreCompleto) {
                this.radicacionForm.patchValue({
                    nombreContratista: contratista.nombreCompleto
                }, { emitEvent: false });
            }
        });
    }

    buscarContratistasPorNombre(nombre: string): void {
        this.contratistasService.buscarPorNombre(nombre).subscribe({
            next: (contratistas) => {
                this.contratistasFiltrados = contratistas;
            },
            error: (error) => {
                console.error('❌ Error buscando por nombre:', error);
                this.contratistasFiltrados = [];
            }
        });
    }

    buscarContratistasPorDocumento(documento: string): void {
        this.contratistasService.buscarPorDocumento(documento).subscribe({
            next: (contratista) => {
                this.contratistasFiltrados = contratista ? [contratista] : [];
            },
            error: (error) => {
                console.error('❌ Error buscando por documento:', error);
                this.contratistasFiltrados = [];
            }
        });
    }

    seleccionarContratista(contratista: Contratista): void {
        this.radicacionForm.patchValue({
            nombreContratista: contratista.nombreCompleto,
            documentoContratista: contratista.documentoIdentidad
        }, { emitEvent: false });
        
        this.mostrarDropdownContratista = false;
        this.mostrarDropdownDocumento = false;
        
        // Forzar validación
        this.radicacionForm.get('nombreContratista')?.updateValueAndValidity();
        this.radicacionForm.get('documentoContratista')?.updateValueAndValidity();
    }

    // Métodos para manejar el dropdown
    onFocusContratista(): void {
        const valor = this.radicacionForm.get('nombreContratista')?.value;
        if (valor && valor.length >= 2) {
            this.buscarContratistasPorNombre(valor);
        }
        this.mostrarDropdownContratista = true;
    }

    onFocusDocumento(): void {
        const valor = this.radicacionForm.get('documentoContratista')?.value;
        if (valor && valor.length >= 2) {
            this.buscarContratistasPorDocumento(valor);
        }
        this.mostrarDropdownDocumento = true;
    }

    @HostListener('document:click', ['$event'])
    onClickOutside(event: Event): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.autocomplete-container')) {
            this.mostrarDropdownContratista = false;
            this.mostrarDropdownDocumento = false;
        }
    }

    puedeCrearNuevoContratista(): boolean {
        const nombre = this.radicacionForm.get('nombreContratista')?.value;
        const documento = this.radicacionForm.get('documentoContratista')?.value;
        
        return nombre && documento && 
               nombre.length >= 3 && 
               documento.length >= 3 &&
               this.contratistasFiltrados.length === 0;
    }

    crearNuevoContratista(): void {
        const nombre = this.radicacionForm.get('nombreContratista')?.value;
        const documento = this.radicacionForm.get('documentoContratista')?.value;
        
        if (!nombre || !documento) {
            this.mostrarMensaje('Nombre y documento son requeridos', 'error');
            return;
        }

        this.isLoading = true;
        this.contratistasService.crearContratista({
            documentoIdentidad: documento,
            nombreCompleto: nombre
        }).subscribe({
            next: (nuevoContratista) => {
                this.contratistas.push(nuevoContratista);
                this.seleccionarContratista(nuevoContratista);
                this.mostrarMensaje('Contratista creado exitosamente', 'success');
                this.isLoading = false;
            },
            error: (error) => {
                console.error('❌ Error creando contratista:', error);
                this.mostrarMensaje('Error al crear contratista', 'error');
                this.isLoading = false;
            }
        });
    }

    // ===============================
    // MÉTODOS PARA ARCHIVOS
    // ===============================

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

        const descripcionControls = [
            'descripcionCuentaCobro',
            'descripcionSeguridadSocial',
            'descripcionInformeActividades'
        ];

        const descripcionControl = descripcionControls[index];
        const currentValue = this.radicacionForm.get(descripcionControl)?.value;

        const defaultValues = ['Cuenta de Cobro', 'Seguridad Social', 'Informe de Actividades'];

        if (!currentValue || currentValue === defaultValues[index]) {
            const nombreSinExtension = file.name.replace(/\.[^/.]+$/, "");
            this.radicacionForm.get(descripcionControl)?.setValue(nombreSinExtension);
        }

        this.mostrarMensaje(`Archivo cargado`, 'success');
    }

    removeFile(index: number): void {
        this.documentosSeleccionados[index] = null;
        this.mostrarMensaje(`Archivo ${index + 1} removido`, 'success');
    }

    getNombreArchivo(index: number): string {
        return this.documentosSeleccionados[index]?.name || 'Sin archivo';
    }

    // ===============================
    // MÉTODO PRINCIPAL DE ENVÍO
    // ===============================

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

        // Convertir fechas a string
        let fechaInicioStr = this.radicacionForm.value.fechaInicio;
        let fechaFinStr = this.radicacionForm.value.fechaFin;

        // Si son objetos Date, convertirlos a string YYYY-MM-DD
        if (fechaInicioStr instanceof Date) {
            fechaInicioStr = fechaInicioStr.toISOString().split('T')[0];
        }

        if (fechaFinStr instanceof Date) {
            fechaFinStr = fechaFinStr.toISOString().split('T')[0];
        }

        // Asegurarse de que son strings
        fechaInicioStr = String(fechaInicioStr).trim();
        fechaFinStr = String(fechaFinStr).trim();

        // Validaciones de fecha
        if (!fechaInicioStr || fechaInicioStr === 'undefined' || fechaInicioStr === 'null') {
            this.mostrarMensaje('La fecha de inicio es requerida', 'error');
            return;
        }

        if (!fechaFinStr || fechaFinStr === 'undefined' || fechaFinStr === 'null') {
            this.mostrarMensaje('La fecha de fin es requerida', 'error');
            return;
        }

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

        // Preparar DTO - IMPORTANTE: Asegurar que primerRadicadoDelAno sea booleano
        const createDocumentoDto: CreateDocumentoDto = {
            numeroRadicado: this.radicacionForm.value.numeroRadicado.toUpperCase().trim(),
            numeroContrato: this.radicacionForm.value.numeroContrato.trim(),
            nombreContratista: this.radicacionForm.value.nombreContratista.trim(),
            documentoContratista: this.radicacionForm.value.documentoContratista.trim(),
            fechaInicio: fechaInicioStr,
            fechaFin: fechaFinStr,
            descripcionCuentaCobro: this.radicacionForm.value.descripcionCuentaCobro?.trim() || 'Cuenta de Cobro',
            descripcionSeguridadSocial: this.radicacionForm.value.descripcionSeguridadSocial?.trim() || 'Seguridad Social',
            descripcionInformeActividades: this.radicacionForm.value.descripcionInformeActividades?.trim() || 'Informe de Actividades',
            observacion: this.radicacionForm.value.observacion?.trim() || '',
            // ✅ CORREGIDO: Asegurar que sea booleano
            primerRadicadoDelAno: !!this.radicacionForm.value.primerRadicadoDelAno
        };

        // Obtener archivos como array
        const archivos = archivosSeleccionados as File[];

        console.log('📤 Datos a enviar:', {
            dto: createDocumentoDto,
            primerRadicadoDelAno: createDocumentoDto.primerRadicadoDelAno,
            tipoPrimerRadicado: typeof createDocumentoDto.primerRadicadoDelAno
        });

        // Enviar al backend
        this.radicacionService.crearDocumento(createDocumentoDto, archivos).subscribe({
            next: (documentoCreado: any) => {
                console.log('✅ Documento radicado exitosamente:', documentoCreado);

                if (documentoCreado && documentoCreado.id && documentoCreado.numeroRadicado) {
                    const mensaje = documentoCreado.primerRadicadoDelAno
                        ? `✅ Documento radicado exitosamente - Marcado como primer radicado del año ${this.getAnoRadicado()}`
                        : '✅ Documento radicado exitosamente';

                    this.mostrarMensaje(mensaje, 'success');
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
                } else if (error.message.includes('primerRadicadoDelAno') || error.message.includes('boolean')) {
                    mensajeError = '❌ Error en el campo "Primer radicado del año". Contacte al administrador.';
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

    // ===============================
    // MÉTODOS PARA PRIMER RADICADO
    // ===============================

    verificarPrimerRadicadoDisponible(): void {
        const ano = this.getAnoRadicado();
        if (!ano || ano.length !== 4) {
            return;
        }

        this.verificandoPrimerRadicado = true;
        this.mensajePrimerRadicado = 'Verificando disponibilidad...';

        this.radicacionService.verificarPrimerRadicadoDisponible(ano).subscribe({
            next: (result) => {
                console.log('📊 Resultado verificación primer radicado:', result);

                this.primerRadicadoDisponible = result.disponible;
                this.mensajePrimerRadicado = result.mensaje;

                // Si ya existe un primer radicado y está marcado, desmarcar
                if (!result.disponible && this.radicacionForm.value.primerRadicadoDelAno) {
                    this.radicacionForm.patchValue({ primerRadicadoDelAno: false });
                    this.mostrarMensaje(result.mensaje, 'warning');

                    // Forzar actualización visual
                    setTimeout(() => {
                        this.radicacionForm.get('primerRadicadoDelAno')?.updateValueAndValidity();
                    }, 0);
                }
            },
            error: (error) => {
                console.error('❌ Error verificando primer radicado:', error);
                this.primerRadicadoDisponible = true;
                this.mensajePrimerRadicado = 'No se pudo verificar disponibilidad';
                this.mostrarMensaje('No se pudo verificar la disponibilidad del primer radicado', 'warning');
            },
            complete: () => {
                this.verificandoPrimerRadicado = false;
            }
        });
    }

    onPrimerRadicadoChange(event: any): void {
        const isChecked = event.target.checked;
        console.log('🔔 Checkbox cambiado a:', isChecked);

        // Actualizar el valor en el formulario
        this.radicacionForm.patchValue({
            primerRadicadoDelAno: isChecked
        });

        // Forzar la actualización de la vista
        this.radicacionForm.get('primerRadicadoDelAno')?.updateValueAndValidity();

        // Log para debug
        console.log('📋 Valor en formulario:', this.radicacionForm.value.primerRadicadoDelAno);
        console.log('📋 Tipo:', typeof this.radicacionForm.value.primerRadicadoDelAno);

        // Verificar disponibilidad si se marca
        if (isChecked) {
            this.verificarPrimerRadicadoDisponible();
        }
    }

    // ===============================
    // MÉTODOS AUXILIARES
    // ===============================

    onCancel(): void {
        this.cancelar.emit();
        this.resetForm();
    }

    resetForm(): void {
        this.radicacionForm.reset({
            descripcionCuentaCobro: 'Cuenta de Cobro',
            descripcionSeguridadSocial: 'Seguridad Social',
            descripcionInformeActividades: 'Informe de Actividades',
            observacion: '',
            primerRadicadoDelAno: false
        });
        this.documentosSeleccionados = [null, null, null];
        this.mostrarDropdownContratista = false;
        this.mostrarDropdownDocumento = false;
        this.primerRadicadoDisponible = true;
        this.mensajePrimerRadicado = '';
    }

    private marcarControlesComoSucios(): void {
        Object.keys(this.radicacionForm.controls).forEach(key => {
            const control = this.radicacionForm.get(key);
            control?.markAsDirty();
            control?.updateValueAndValidity();
        });
    }

    private mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning'): void {
        this.mensaje = texto;
        this.tipoMensaje = tipo === 'warning' ? 'error' : tipo;

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

    getAnoRadicado(): string {
        const numeroRadicado = this.radicacionForm.get('numeroRadicado')?.value;
        if (numeroRadicado && numeroRadicado.match(/^R\d{4}-\d{3}$/)) {
            return numeroRadicado.substring(1, 5);
        }
        return '';
    }
}