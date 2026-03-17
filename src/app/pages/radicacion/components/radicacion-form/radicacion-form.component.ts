import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  ElementRef,
  ViewChild,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { CreateDocumentoDto } from '../../../../core/models/documento.model';
import { Contratista } from '../../../../core/models/contratista.model';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { Subscription, fromEvent, timer } from 'rxjs';

@Component({
  selector: 'app-radicacion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './radicacion-form.component.html',
  styleUrls: ['./radicacion-form.component.scss']
})
export class RadicacionFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() documentoRadicado = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  @ViewChild('nombreContainer') nombreContainer!: ElementRef;
  @ViewChild('documentoContainer') documentoContainer!: ElementRef;
  @ViewChild('contratoContainer') contratoContainer!: ElementRef;

  radicacionForm: FormGroup;
  documentosSeleccionados: (File | null)[] = [null, null, null];
  isLoading = false;
  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'warning' = 'success';
  maxFileSize = 10 * 1024 * 1024; // 10MB

  verificandoPrimerRadicado = false;
  primerRadicadoDisponible = true;
  mensajePrimerRadicado = '';

  contratistas: Contratista[] = [];
  contratistasFiltrados: Contratista[] = [];
  mostrarDropdownNombre = false;
  mostrarDropdownDocumento = false;
  mostrarDropdownContrato = false;
  cargandoContratistas = false;
  contratistaSeleccionado: Contratista | null = null;

  private debounceTimer?: Subscription;
  private clickSubscription?: Subscription;
  private valueChangesSubscriptions: Subscription[] = [];
  private ultimaBusqueda = {
    tipo: '',
    termino: '',
    timestamp: 0
  };

  constructor(
    private fb: FormBuilder,
    private radicacionService: RadicacionService,
    private contratistasService: ContratistasService,
    private cdRef: ChangeDetectorRef
  ) {
    this.radicacionForm = this.createForm();
  }

  ngOnInit(): void {
    this.cargarContratistas();
    this.setupAutocomplete();
    this.setupSincronizacionContratista();
    this.setupRadicadoListeners();
  }

  ngAfterViewInit(): void {
    this.setupClickOutsideListeners();
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }

  createForm(): FormGroup {
    return this.fb.group({
      numeroRadicado: ['', [
        Validators.required,
        Validators.pattern(/^R\d{4}-\d{4,8}$/),
        Validators.maxLength(13)
      ]],
      numeroContrato: ['', [Validators.required, Validators.maxLength(50)]],
      nombreContratista: ['', [Validators.required, Validators.maxLength(200)]],
      documentoContratista: ['', [Validators.required, Validators.maxLength(50)]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      descripcionCuentaCobro: ['Cuenta de Cobro', Validators.maxLength(200)],
      descripcionSeguridadSocial: ['Seguridad Social', Validators.maxLength(200)],
      descripcionInformeActividades: ['Informe de Actividades', Validators.maxLength(200)],
      observacion: ['', Validators.maxLength(500)],
      primerRadicadoDelAno: [false]
    });
  }

  cargarContratistas(): void {
    this.cargandoContratistas = true;
    this.contratistasService.obtenerTodos().subscribe({
      next: (contratistas) => {
        this.contratistas = contratistas;
        this.cargandoContratistas = false;
      },
      error: (error) => {
        console.error('Error cargando contratistas:', error);
        this.cargandoContratistas = false;
      }
    });
  }

  setupAutocomplete(): void {
    this.valueChangesSubscriptions.forEach(sub => sub.unsubscribe());
    this.valueChangesSubscriptions = [];

    const nombreSub = this.radicacionForm.get('nombreContratista')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter(valor => !valor || valor.trim().length >= 1)
      )
      .subscribe(termino => {
        if (termino && termino.trim().length >= 1) {
          this.buscarContratistasPorNombre(termino.trim());
        } else {
          this.contratistasFiltrados = [];
          this.mostrarDropdownNombre = false;
          this.cdRef.detectChanges();
        }
      });

    if (nombreSub) this.valueChangesSubscriptions.push(nombreSub);

    const docSub = this.radicacionForm.get('documentoContratista')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter(valor => !valor || valor.trim().length >= 1)
      )
      .subscribe(termino => {
        if (termino && termino.trim().length >= 1) {
          this.buscarContratistasPorDocumento(termino.trim());
        } else {
          this.contratistasFiltrados = [];
          this.mostrarDropdownDocumento = false;
          this.cdRef.detectChanges();
        }
      });

    if (docSub) this.valueChangesSubscriptions.push(docSub);

    const contratoSub = this.radicacionForm.get('numeroContrato')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter(valor => !valor || valor.trim().length >= 1)
      )
      .subscribe(termino => {
        if (termino && termino.trim().length >= 1) {
          this.buscarContratistasPorContrato(termino.trim());
        } else {
          this.contratistasFiltrados = [];
          this.mostrarDropdownContrato = false;
          this.cdRef.detectChanges();
        }
      });

    if (contratoSub) this.valueChangesSubscriptions.push(contratoSub);
  }

  setupSincronizacionContratista(): void {
    const nombreSyncSub = this.radicacionForm.get('nombreContratista')?.valueChanges.subscribe(nombre => {
      if (!nombre || this.contratistaSeleccionado?.nombreCompleto === nombre) return;

      const contratista = this.contratistas.find(c =>
        c.nombreCompleto?.toLowerCase().includes(nombre.toLowerCase())
      );

      if (contratista &&
        this.radicacionForm.get('documentoContratista')?.value !== contratista.documentoIdentidad) {
        this.contratistaSeleccionado = contratista;
        this.radicacionForm.patchValue({
          documentoContratista: contratista.documentoIdentidad,
          numeroContrato: contratista.numeroContrato || ''
        }, { emitEvent: false });
      }
    });

    if (nombreSyncSub) this.valueChangesSubscriptions.push(nombreSyncSub);

    const docSyncSub = this.radicacionForm.get('documentoContratista')?.valueChanges.subscribe(documento => {
      if (!documento || this.contratistaSeleccionado?.documentoIdentidad === documento) return;

      const contratista = this.contratistas.find(c =>
        c.documentoIdentidad === documento
      );

      if (contratista &&
        this.radicacionForm.get('nombreContratista')?.value !== contratista.nombreCompleto) {
        this.contratistaSeleccionado = contratista;
        this.radicacionForm.patchValue({
          nombreContratista: contratista.nombreCompleto,
          numeroContrato: contratista.numeroContrato || ''
        }, { emitEvent: false });
      }
    });

    if (docSyncSub) this.valueChangesSubscriptions.push(docSyncSub);

    const contratoSyncSub = this.radicacionForm.get('numeroContrato')?.valueChanges.subscribe(numeroContrato => {
      if (!numeroContrato || this.contratistaSeleccionado?.numeroContrato === numeroContrato) return;

      const contratista = this.contratistas.find(c =>
        c.numeroContrato === numeroContrato
      );

      if (contratista &&
        (this.radicacionForm.get('nombreContratista')?.value !== contratista.nombreCompleto ||
          this.radicacionForm.get('documentoContratista')?.value !== contratista.documentoIdentidad)) {
        this.contratistaSeleccionado = contratista;
        this.radicacionForm.patchValue({
          nombreContratista: contratista.nombreCompleto,
          documentoContratista: contratista.documentoIdentidad
        }, { emitEvent: false });
      }
    });

    if (contratoSyncSub) this.valueChangesSubscriptions.push(contratoSyncSub);
  }

  private setupClickOutsideListeners(): void {
    setTimeout(() => {
      this.clickSubscription = fromEvent(document, 'click').subscribe((event: any) => {
        this.handleClickOutside(event);
      });
    });
  }

  private handleClickOutside(event: any): void {
    const target = event.target as HTMLElement;

    const nombreContainerEl = this.nombreContainer?.nativeElement;
    const documentoContainerEl = this.documentoContainer?.nativeElement;
    const contratoContainerEl = this.contratoContainer?.nativeElement;

    if (nombreContainerEl && !nombreContainerEl.contains(target)) {
      this.mostrarDropdownNombre = false;
    }

    if (documentoContainerEl && !documentoContainerEl.contains(target)) {
      this.mostrarDropdownDocumento = false;
    }

    if (contratoContainerEl && !contratoContainerEl.contains(target)) {
      this.mostrarDropdownContrato = false;
    }

    this.cdRef.detectChanges();
  }

  onFocusContratista(tipo: 'nombre' | 'documento' | 'contrato'): void {
    if (tipo === 'nombre') {
      const valor = this.radicacionForm.get('nombreContratista')?.value?.trim();

      if (valor && valor.length >= 1) {
        this.buscarContratistasPorNombre(valor);
        this.mostrarDropdownNombre = true;
      } else {
        this.contratistasFiltrados = [];
        this.mostrarDropdownNombre = false;
      }
      this.mostrarDropdownDocumento = false;
      this.mostrarDropdownContrato = false;

    } else if (tipo === 'documento') {
      const valor = this.radicacionForm.get('documentoContratista')?.value?.trim();

      if (valor && valor.length >= 1) {
        this.buscarContratistasPorDocumento(valor);
        this.mostrarDropdownDocumento = true;
      } else {
        this.contratistasFiltrados = this.contratistas.slice(0, 10);
        this.mostrarDropdownDocumento = this.contratistasFiltrados.length > 0;
      }
      this.mostrarDropdownNombre = false;
      this.mostrarDropdownContrato = false;

    } else {
      const valor = this.radicacionForm.get('numeroContrato')?.value?.trim();

      if (valor && valor.length >= 1) {
        this.buscarContratistasPorContrato(valor);
        this.mostrarDropdownContrato = true;
      } else {
        this.contratistasFiltrados = [];
        this.mostrarDropdownContrato = false;
      }
      this.mostrarDropdownNombre = false;
      this.mostrarDropdownDocumento = false;
    }

    this.cdRef.detectChanges();
  }

  onInputContratista(tipo: 'nombre' | 'documento' | 'contrato'): void {
    const getValue = (): string => {
      switch (tipo) {
        case 'nombre': return this.radicacionForm.get('nombreContratista')?.value || '';
        case 'documento': return this.radicacionForm.get('documentoContratista')?.value || '';
        case 'contrato': return this.radicacionForm.get('numeroContrato')?.value || '';
        default: return '';
      }
    };

    const valor = getValue().trim();

    if (valor.length >= 1) {
      if (tipo === 'nombre') {
        this.mostrarDropdownNombre = true;
        this.mostrarDropdownDocumento = false;
        this.mostrarDropdownContrato = false;
      } else if (tipo === 'documento') {
        this.mostrarDropdownDocumento = true;
        this.mostrarDropdownNombre = false;
        this.mostrarDropdownContrato = false;
      } else {
        this.mostrarDropdownContrato = true;
        this.mostrarDropdownNombre = false;
        this.mostrarDropdownDocumento = false;
      }

      if (this.debounceTimer) {
        this.debounceTimer.unsubscribe();
      }

      this.debounceTimer = timer(300).subscribe(() => {
        const currentValue = getValue().trim();
        if (currentValue.length >= 1) {
          this.ejecutarBusqueda(tipo, currentValue);
        } else {
          this.contratistasFiltrados = [];
          this.mostrarDropdownNombre = false;
          this.mostrarDropdownDocumento = false;
          this.mostrarDropdownContrato = false;
          this.cdRef.detectChanges();
        }
      });
    } else {
      this.contratistasFiltrados = [];
      this.mostrarDropdownNombre = false;
      this.mostrarDropdownDocumento = false;
      this.mostrarDropdownContrato = false;
    }

    this.cdRef.detectChanges();
  }

  private ejecutarBusqueda(tipo: 'nombre' | 'documento' | 'contrato', termino: string): void {
    if (!termino || termino.trim().length < 1) {
      this.contratistasFiltrados = [];
      return;
    }

    switch (tipo) {
      case 'nombre':
        this.buscarContratistasPorNombre(termino);
        break;
      case 'documento':
        this.buscarContratistasPorDocumento(termino);
        break;
      case 'contrato':
        this.buscarContratistasPorContrato(termino);
        break;
    }
  }

  buscarContratistasPorNombre(nombre: string): void {
    if (this.ultimaBusqueda.tipo === 'nombre' &&
      this.ultimaBusqueda.termino === nombre &&
      (Date.now() - this.ultimaBusqueda.timestamp) < 500) {
      return;
    }

    this.ultimaBusqueda = {
      tipo: 'nombre',
      termino: nombre,
      timestamp: Date.now()
    };

    this.cargandoContratistas = true;
    this.cdRef.detectChanges();

    this.contratistasService.buscarPorNombre(nombre).subscribe({
      next: (contratistas) => {
        const valorActual = this.radicacionForm.get('nombreContratista')?.value?.trim() || '';
        if (valorActual && valorActual.toLowerCase().includes(nombre.toLowerCase())) {
          this.contratistasFiltrados = contratistas.slice(0, 10);
          this.mostrarDropdownNombre = contratistas.length > 0;
        } else {
          this.contratistasFiltrados = [];
          this.mostrarDropdownNombre = false;
        }

        this.mostrarDropdownDocumento = false;
        this.mostrarDropdownContrato = false;
        this.cargandoContratistas = false;
        this.cdRef.detectChanges();
      },
      error: (error) => {
        console.error('Error buscando por nombre:', error);
        this.contratistasFiltrados = [];
        this.cargandoContratistas = false;
        this.mostrarDropdownNombre = false;
        this.cdRef.detectChanges();
      }
    });
  }

  buscarContratistasPorDocumento(documento: string): void {
    if (this.ultimaBusqueda.tipo === 'documento' &&
      this.ultimaBusqueda.termino === documento &&
      (Date.now() - this.ultimaBusqueda.timestamp) < 500) {
      return;
    }

    this.ultimaBusqueda = {
      tipo: 'documento',
      termino: documento,
      timestamp: Date.now()
    };

    this.cargandoContratistas = true;
    this.cdRef.detectChanges();

    this.contratistasService.buscarPorDocumento(documento).subscribe({
      next: (contratistas) => {
        if (contratistas && contratistas.length > 0) {
          this.contratistasFiltrados = contratistas.map(c => ({
            id: c.id || '',
            nombreCompleto: c.nombreCompleto || 'Nombre no disponible',
            documentoIdentidad: c.documentoIdentidad || documento,
            numeroContrato: c.numeroContrato || '',
            createdAt: c.createdAt || new Date()
          }));

          this.mostrarDropdownDocumento = true;
        } else {
          this.contratistasFiltrados = [];
          this.mostrarDropdownDocumento = false;
        }

        this.mostrarDropdownNombre = false;
        this.mostrarDropdownContrato = false;
        this.cargandoContratistas = false;
        this.cdRef.detectChanges();
      },
      error: (error) => {
        console.error('Error buscando por documento:', error);
        this.contratistasFiltrados = [];
        this.cargandoContratistas = false;
        this.mostrarDropdownDocumento = false;
        this.cdRef.detectChanges();
      }
    });
  }

  buscarContratistasPorContrato(contrato: string): void {
    if (this.ultimaBusqueda.tipo === 'contrato' &&
      this.ultimaBusqueda.termino === contrato &&
      (Date.now() - this.ultimaBusqueda.timestamp) < 500) {
      return;
    }

    this.ultimaBusqueda = {
      tipo: 'contrato',
      termino: contrato,
      timestamp: Date.now()
    };

    this.cargandoContratistas = true;
    this.cdRef.detectChanges();

    this.contratistasService.buscarPorNumeroContrato(contrato).subscribe({
      next: (contratistas) => {
        const valorActual = this.radicacionForm.get('numeroContrato')?.value?.trim() || '';
        if (valorActual && valorActual.toLowerCase().includes(contrato.toLowerCase())) {
          this.contratistasFiltrados = contratistas.slice(0, 10);
          this.mostrarDropdownContrato = contratistas.length > 0;
        } else {
          this.contratistasFiltrados = [];
          this.mostrarDropdownContrato = false;
        }

        this.mostrarDropdownNombre = false;
        this.mostrarDropdownDocumento = false;
        this.cargandoContratistas = false;
        this.cdRef.detectChanges();
      },
      error: (error) => {
        console.error('Error buscando por contrato:', error);
        this.contratistasFiltrados = [];
        this.mostrarDropdownContrato = false;
        this.cargandoContratistas = false;
        this.cdRef.detectChanges();
      }
    });
  }

  seleccionarContratista(contratista: Contratista): void {
    this.contratistaSeleccionado = contratista;

    this.radicacionForm.patchValue({
      nombreContratista: contratista.nombreCompleto,
      documentoContratista: contratista.documentoIdentidad,
      numeroContrato: contratista.numeroContrato || ''
    }, { emitEvent: false });

    this.mostrarDropdownNombre = false;
    this.mostrarDropdownDocumento = false;
    this.mostrarDropdownContrato = false;
    this.cdRef.detectChanges();
  }

  seleccionarContratistaPorContrato(contratista: Contratista): void {
    this.contratistaSeleccionado = contratista;

    this.radicacionForm.patchValue({
      numeroContrato: contratista.numeroContrato,
      nombreContratista: contratista.nombreCompleto,
      documentoContratista: contratista.documentoIdentidad
    }, { emitEvent: false });

    this.mostrarDropdownContrato = false;
    this.mostrarDropdownNombre = false;
    this.mostrarDropdownDocumento = false;
    this.cdRef.detectChanges();
  }

  esContratistaSeleccionado(contratista: Contratista): boolean {
    return this.contratistaSeleccionado?.id === contratista.id;
  }

  puedeCrearNuevoContratista(): boolean {
    const nombre = this.radicacionForm.get('nombreContratista')?.value;
    const documento = this.radicacionForm.get('documentoContratista')?.value;

    return !!nombre && !!documento &&
      nombre.length >= 3 &&
      documento.length >= 3 &&
      this.contratistasFiltrados.length === 0;
  }

  crearNuevoContratista(): void {
    const nombre = this.radicacionForm.get('nombreContratista')?.value?.trim();
    const documento = this.radicacionForm.get('documentoContratista')?.value?.trim();
    const contrato = this.radicacionForm.get('numeroContrato')?.value?.trim();

    if (!nombre || !documento) {
      this.mostrarMensaje('Nombre y documento son requeridos', 'error');
      return;
    }

    this.isLoading = true;
    this.contratistasService.crearContratista({
      documentoIdentidad: documento,
      nombreCompleto: nombre,
      numeroContrato: contrato || undefined
    }).subscribe({
      next: (nuevoContratista) => {
        this.contratistas.push(nuevoContratista);
        this.seleccionarContratista(nuevoContratista);
        this.mostrarMensaje('Contratista creado exitosamente', 'success');
        this.isLoading = false;
        this.cdRef.detectChanges();
      },
      error: (error) => {
        console.error('Error creando contratista:', error);
        this.mostrarMensaje('Error al crear contratista', 'error');
        this.isLoading = false;
        this.cdRef.detectChanges();
      }
    });
  }

  private setupRadicadoListeners(): void {
    const radicadoSub = this.radicacionForm.get('numeroRadicado')?.valueChanges.subscribe(value => {
      if (value && value.match(/^R\d{4}-\d{4,8}$/)) {
        const ano = value.substring(1, 5);
        console.log(`✅ Año detectado: ${ano}`);
      }
    });

    if (radicadoSub) this.valueChangesSubscriptions.push(radicadoSub);
  }

  onPrimerRadicadoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const checked = input.checked;

    this.radicacionForm.patchValue({ primerRadicadoDelAno: checked });

    if (checked) {
      this.verificarPrimerRadicadoDisponible();
    } else {
      this.primerRadicadoDisponible = true;
      this.mensajePrimerRadicado = '';
      this.verificandoPrimerRadicado = false;
    }

    this.cdRef.detectChanges();
  }

  verificarPrimerRadicadoDisponible(): void {
    this.verificandoPrimerRadicado = true;
    this.mensajePrimerRadicado = 'Verificando si ya existe un primer radicado para este contrato...';
    this.cdRef.detectChanges();

    setTimeout(() => {
      const yaExiste = false;

      this.primerRadicadoDisponible = !yaExiste;
      this.mensajePrimerRadicado = yaExiste
        ? 'Ya existe un primer radicado para este contrato. Puedes marcarlo si es necesario.'
        : 'Disponible para marcar como primer radicado del contrato';

      if (yaExiste) {
        this.mostrarMensaje(
          'Advertencia: Ya existe un primer radicado para este contrato.',
          'warning'
        );
      }

      this.verificandoPrimerRadicado = false;
      this.cdRef.detectChanges();
    }, 800);
  }

  onFileSelected(event: any, index: number): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > this.maxFileSize) {
      this.mostrarMensaje(`El archivo excede 10MB`, 'error');
      event.target.value = '';
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.mostrarMensaje(`Tipo no permitido. Permitidos: PDF, Word, JPG, PNG`, 'error');
      event.target.value = '';
      return;
    }

    this.documentosSeleccionados[index] = file;

    const descripcionControls = [
      'descripcionCuentaCobro',
      'descripcionSeguridadSocial',
      'descripcionInformeActividades'
    ];
    const defaultValues = ['Cuenta de Cobro', 'Seguridad Social', 'Informe de Actividades'];

    const descripcionControl = descripcionControls[index];
    const currentValue = this.radicacionForm.get(descripcionControl)?.value;

    if (!currentValue || currentValue === defaultValues[index]) {
      const nombreSinExtension = file.name.replace(/\.[^/.]+$/, "");
      this.radicacionForm.get(descripcionControl)?.setValue(nombreSinExtension);
    }

    this.mostrarMensaje(`Archivo cargado correctamente`, 'success');
    this.cdRef.detectChanges();
  }

  removeFile(index: number): void {
    this.documentosSeleccionados[index] = null;
    this.mostrarMensaje(`Archivo ${index + 1} removido`, 'success');
    this.cdRef.detectChanges();
  }

  getNombreArchivo(index: number): string {
    return this.documentosSeleccionados[index]?.name || 'Sin archivo';
  }

  onSubmit(): void {
    console.log('======= INICIANDO ENVÍO DE RADICACIÓN =======');

    if (this.radicacionForm.invalid) {
      console.log('❌ Formulario inválido');
      this.marcarControlesComoSucios();
      this.mostrarMensaje('Por favor complete todos los campos requeridos correctamente', 'error');
      return;
    }

    // ✅ Validación del número de radicado
    const numeroRadicado = this.radicacionForm.get('numeroRadicado')?.value;
    const radicadoRegex = /^R\d{4}-\d{4,8}$/;
    if (!radicadoRegex.test(numeroRadicado)) {
      this.mostrarMensaje('El número de radicado debe tener formato RAAAA-NNNN (ej: R2025-0001)', 'error');
      return;
    }

    const archivosSeleccionados = this.documentosSeleccionados.filter(file => file !== null);
    if (archivosSeleccionados.length !== 3) {
      console.log('❌ Archivos insuficientes:', archivosSeleccionados.length);
      this.mostrarMensaje('Debe seleccionar exactamente 3 archivos', 'error');
      return;
    }

    const fechaInicioStr = String(this.radicacionForm.value.fechaInicio).trim();
    const fechaFinStr = String(this.radicacionForm.value.fechaFin).trim();

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
    this.cdRef.detectChanges();

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
      primerRadicadoDelAno: this.radicacionForm.get('primerRadicadoDelAno')?.value ?? false
    };

    console.log('📦 DTO a enviar:', createDocumentoDto);

    const archivos = archivosSeleccionados as File[];

    this.radicacionService.crearDocumento(createDocumentoDto, archivos).subscribe({
      next: (documentoCreado: any) => {
        console.log('✅ Documento radicado exitosamente:', documentoCreado);
        this.mostrarMensaje('Documento radicado exitosamente', 'success');
        this.documentoRadicado.emit(documentoCreado);
        this.resetForm();
        this.isLoading = false;
        this.cdRef.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error en radicación:', error);
        this.mostrarMensaje(error.message || 'Error al radicar documento', 'error');
        this.isLoading = false;
        this.cdRef.detectChanges();
      }
    });
  }

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
    this.mostrarDropdownNombre = false;
    this.mostrarDropdownDocumento = false;
    this.mostrarDropdownContrato = false;
    this.primerRadicadoDisponible = true;
    this.mensajePrimerRadicado = '';
    this.contratistaSeleccionado = null;
    this.cdRef.detectChanges();
  }

  private cleanupSubscriptions(): void {
    if (this.clickSubscription) {
      this.clickSubscription.unsubscribe();
    }

    if (this.debounceTimer) {
      this.debounceTimer.unsubscribe();
    }

    this.valueChangesSubscriptions.forEach(sub => sub.unsubscribe());
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
        this.cdRef.detectChanges();
      }
    }, 5000);

    this.cdRef.detectChanges();
  }

  getNumeroRadicadoError(): string {
    const control = this.radicacionForm.get('numeroRadicado');
    if (control?.errors?.['required']) return 'Requerido';
    if (control?.errors?.['pattern']) return 'Formato: RAAAA-NNNN (ej: R2025-0001)';
    if (control?.errors?.['maxlength']) return 'Máx 13 caracteres';
    return '';
  }

  getAnoRadicado(): string {
    const numeroRadicado = this.radicacionForm.get('numeroRadicado')?.value;
    if (numeroRadicado && numeroRadicado.match(/^R\d{4}-\d{4,8}$/)) {
      return numeroRadicado.substring(1, 5);
    }
    return '';
  }
}