import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { JuridicaService } from '../../../../core/services/juridica.service';
import { CreateContratoDto, Contrato, TipoContrato } from '../../../../core/models/juridica.model';

@Component({
  selector: 'app-juridica-creacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './juridica-creacion.component.html',
  styleUrls: ['./juridica-creacion.component.scss']
})
export class JuridicaCreacionComponent implements OnInit, OnDestroy {
  @ViewChild('contratoFormElement') formElement!: ElementRef;

  contratoForm!: FormGroup;
  isEditMode = false;
  contratoId: string | null = null;
  isLoading = false;
  isSubmitting = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';

  pasoActual = 1;
  vigencias: number[] = [];
  supervisores: any[] = [];
  valorTotal = 0;

  tiposContrato = [
    { value: 'PRESTACION_SERVICIOS', label: 'Prestación de Servicios' },
    { value: 'SUMINISTRO', label: 'Suministro' },
    { value: 'OBRA', label: 'Obra' },
    { value: 'CONSULTORIA', label: 'Consultoría' },
    { value: 'COMPRAVENTA', label: 'Compraventa' },
    { value: 'ARRENDAMIENTO', label: 'Arrendamiento' },
    { value: 'OTRO', label: 'Otro' }
  ];

  tiposIdentificacion = [
    { value: 'NIT', label: 'NIT' },
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'PAS', label: 'Pasaporte' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private juridicaService: JuridicaService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.generarVigencias();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.cargarSupervisores();
    this.checkEditMode();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get f() {
    return this.contratoForm.controls;
  }

  private generarVigencias(): void {
    const añoActual = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.vigencias.push(añoActual + i);
    }
  }

  private initializeForm(): void {
    const hoy = new Date().toISOString().split('T')[0];

    this.contratoForm = this.fb.group({
      // Paso 1: Datos generales
      vigencia: ['', Validators.required],
      numeroContrato: ['', Validators.required],
      tipoContrato: ['', Validators.required],
      
      proveedor: this.fb.group({
        tipoIdentificacion: ['NIT', Validators.required],
        numeroIdentificacion: ['', Validators.required],
        nombreRazonSocial: ['', Validators.required],
        direccion: [''],
        telefono: [''],
        email: ['', [Validators.email]]
      }),
      
      objeto: ['', Validators.required],

      // Paso 2: Valores y plazos
      valor: ['', [Validators.required, Validators.min(1)]],
      plazoDias: ['', [Validators.required, Validators.min(1)]],
      fechaInicio: ['', Validators.required],
      fechaTerminacion: [{ value: '', disabled: true }, Validators.required],
      fechaFirma: ['', Validators.required],
      supervisor: ['', Validators.required],

      // Paso 3: Presupuestal
      cdp: [''],
      rp: [''],

      // Paso 4: Anticipo
      seDesembolsaAnticipo: [false],
      porcentajeAnticipo: [{ value: '', disabled: true }],
      valorAnticipo: [{ value: '', disabled: true }],
      fechaDesembolsoAnticipo: [{ value: '', disabled: true }],
      adiciones: [0]
    });

    // Suscripciones para cálculos
    const fechaInicioSub = this.contratoForm.get('fechaInicio')?.valueChanges.subscribe(() => {
      this.calcularFechaFin();
    });

    const plazoSub = this.contratoForm.get('plazoDias')?.valueChanges.subscribe(() => {
      this.calcularFechaFin();
    });

    const valorSub = this.contratoForm.get('valor')?.valueChanges.subscribe(() => {
      this.calcularValores();
    });

    const adicionesSub = this.contratoForm.get('adiciones')?.valueChanges.subscribe(() => {
      this.calcularValores();
    });

    const anticipoSub = this.contratoForm.get('seDesembolsaAnticipo')?.valueChanges.subscribe((tieneAnticipo) => {
      this.onAnticipoChange(tieneAnticipo);
    });

    const porcentajeSub = this.contratoForm.get('porcentajeAnticipo')?.valueChanges.subscribe(() => {
      this.calcularValorAnticipo();
    });

    if (fechaInicioSub) this.subscriptions.push(fechaInicioSub);
    if (plazoSub) this.subscriptions.push(plazoSub);
    if (valorSub) this.subscriptions.push(valorSub);
    if (adicionesSub) this.subscriptions.push(adicionesSub);
    if (anticipoSub) this.subscriptions.push(anticipoSub);
    if (porcentajeSub) this.subscriptions.push(porcentajeSub);
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.contratoId = id;
      this.cargarContrato(id);
    }
  }

  cargarContrato(id: string): void {
    this.isLoading = true;
    const sub = this.juridicaService.obtenerContratoPorId(id).subscribe({
      next: (contrato) => {
        if (contrato) {
          this.cargarDatosEnFormulario(contrato);
        } else {
          this.errorMessage = 'Contrato no encontrado';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando contrato:', error);
        this.errorMessage = 'Error al cargar el contrato';
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  cargarDatosEnFormulario(contrato: Contrato): void {
    const fechaInicio = contrato.fechaInicio ? new Date(contrato.fechaInicio).toISOString().split('T')[0] : '';
    const fechaTerminacion = contrato.fechaTerminacion ? new Date(contrato.fechaTerminacion).toISOString().split('T')[0] : '';
    const fechaFirma = contrato.fechaFirma ? new Date(contrato.fechaFirma).toISOString().split('T')[0] : '';
    const fechaDesembolso = contrato.fechaDesembolsoAnticipo ? new Date(contrato.fechaDesembolsoAnticipo).toISOString().split('T')[0] : '';

    this.contratoForm.patchValue({
      vigencia: contrato.vigencia,
      numeroContrato: contrato.numeroContrato,
      tipoContrato: contrato.tipoContrato,
      proveedor: {
        tipoIdentificacion: contrato.proveedor.tipoIdentificacion,
        numeroIdentificacion: contrato.proveedor.numeroIdentificacion,
        nombreRazonSocial: contrato.proveedor.nombreRazonSocial,
        direccion: contrato.proveedor.direccion || '',
        telefono: contrato.proveedor.telefono || '',
        email: contrato.proveedor.email || ''
      },
      objeto: contrato.objeto,
      valor: contrato.valor,
      plazoDias: contrato.plazoDias,
      fechaInicio: fechaInicio,
      fechaTerminacion: fechaTerminacion,
      fechaFirma: fechaFirma,
      supervisor: contrato.supervisor || '',
      cdp: contrato.cdp || '',
      rp: contrato.rp || '',
      seDesembolsaAnticipo: contrato.seDesembolsaAnticipo,
      porcentajeAnticipo: contrato.porcentajeAnticipo || '',
      valorAnticipo: contrato.valorAnticipo || '',
      fechaDesembolsoAnticipo: fechaDesembolso,
      adiciones: contrato.adiciones || 0
    });

    this.valorTotal = contrato.valorTotal;
    
    if (contrato.seDesembolsaAnticipo) {
      this.contratoForm.get('porcentajeAnticipo')?.enable();
      this.contratoForm.get('valorAnticipo')?.enable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.enable();
    }
  }

  cargarSupervisores(): void {
    const sub = this.juridicaService.obtenerSupervisores().subscribe({
      next: (supervisores) => {
        this.supervisores = supervisores;
      },
      error: (error) => {
        console.error('Error cargando supervisores:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  siguientePaso(): void {
    if (this.validarPasoActual()) {
      this.pasoActual++;
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) {
      this.pasoActual--;
    }
  }

  private validarPasoActual(): boolean {
    let isValid = true;

    switch (this.pasoActual) {
      case 1:
        if (this.contratoForm.get('vigencia')?.invalid) isValid = false;
        if (this.contratoForm.get('numeroContrato')?.invalid) isValid = false;
        if (this.contratoForm.get('tipoContrato')?.invalid) isValid = false;
        if (this.contratoForm.get('objeto')?.invalid) isValid = false;
        
        const proveedorGroup = this.contratoForm.get('proveedor') as FormGroup;
        if (proveedorGroup.get('numeroIdentificacion')?.invalid) isValid = false;
        if (proveedorGroup.get('nombreRazonSocial')?.invalid) isValid = false;
        break;

      case 2:
        if (this.contratoForm.get('valor')?.invalid) isValid = false;
        if (this.contratoForm.get('plazoDias')?.invalid) isValid = false;
        if (this.contratoForm.get('fechaInicio')?.invalid) isValid = false;
        if (this.contratoForm.get('fechaFirma')?.invalid) isValid = false;
        if (this.contratoForm.get('supervisor')?.invalid) isValid = false;
        break;

      default:
        return true;
    }

    if (!isValid) {
      this.markStepFieldsAsTouched();
    }

    return isValid;
  }

  private markStepFieldsAsTouched(): void {
    switch (this.pasoActual) {
      case 1:
        this.contratoForm.get('vigencia')?.markAsTouched();
        this.contratoForm.get('numeroContrato')?.markAsTouched();
        this.contratoForm.get('tipoContrato')?.markAsTouched();
        this.contratoForm.get('objeto')?.markAsTouched();
        
        const proveedorGroup = this.contratoForm.get('proveedor') as FormGroup;
        proveedorGroup.get('numeroIdentificacion')?.markAsTouched();
        proveedorGroup.get('nombreRazonSocial')?.markAsTouched();
        break;

      case 2:
        this.contratoForm.get('valor')?.markAsTouched();
        this.contratoForm.get('plazoDias')?.markAsTouched();
        this.contratoForm.get('fechaInicio')?.markAsTouched();
        this.contratoForm.get('fechaFirma')?.markAsTouched();
        this.contratoForm.get('supervisor')?.markAsTouched();
        break;
    }
  }

  private onAnticipoChange(tieneAnticipo: boolean): void {
    if (tieneAnticipo) {
      this.contratoForm.get('porcentajeAnticipo')?.enable();
      this.contratoForm.get('porcentajeAnticipo')?.setValidators([Validators.required, Validators.min(1), Validators.max(100)]);
      this.contratoForm.get('valorAnticipo')?.enable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.enable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.setValidators(Validators.required);
    } else {
      this.contratoForm.get('porcentajeAnticipo')?.disable();
      this.contratoForm.get('porcentajeAnticipo')?.clearValidators();
      this.contratoForm.get('porcentajeAnticipo')?.setValue('');
      this.contratoForm.get('valorAnticipo')?.disable();
      this.contratoForm.get('valorAnticipo')?.setValue('');
      this.contratoForm.get('fechaDesembolsoAnticipo')?.disable();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.clearValidators();
      this.contratoForm.get('fechaDesembolsoAnticipo')?.setValue('');
    }

    this.contratoForm.get('porcentajeAnticipo')?.updateValueAndValidity();
    this.contratoForm.get('fechaDesembolsoAnticipo')?.updateValueAndValidity();
  }

  private calcularFechaFin(): void {
    const fechaInicio = this.contratoForm.get('fechaInicio')?.value;
    const plazo = this.contratoForm.get('plazoDias')?.value;

    if (fechaInicio && plazo) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + parseInt(plazo));
      this.contratoForm.patchValue({
        fechaTerminacion: fecha.toISOString().split('T')[0]
      });
    }
  }

  private calcularValorAnticipo(): void {
    const valorContrato = this.contratoForm.get('valor')?.value || 0;
    const porcentaje = this.contratoForm.get('porcentajeAnticipo')?.value || 0;

    if (valorContrato && porcentaje) {
      const valorAnticipo = (valorContrato * porcentaje) / 100;
      this.contratoForm.patchValue({
        valorAnticipo: Math.round(valorAnticipo)
      });
    }
  }

  private calcularValores(): void {
    const valorInicial = this.contratoForm.get('valor')?.value || 0;
    const adiciones = this.contratoForm.get('adiciones')?.value || 0;
    this.valorTotal = valorInicial + adiciones;
  }

  guardarContrato(): void {
    this.submitted = true;

    if (this.contratoForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos requeridos';
      
      if (this.contratoForm.get('vigencia')?.invalid) this.pasoActual = 1;
      else if (this.contratoForm.get('valor')?.invalid) this.pasoActual = 2;
      
      this.markStepFieldsAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.contratoForm.getRawValue();
    
    const dto: CreateContratoDto = {
      vigencia: formValue.vigencia,
      numeroContrato: formValue.numeroContrato,
      tipoContrato: formValue.tipoContrato as TipoContrato,
      proveedor: formValue.proveedor,
      objeto: formValue.objeto,
      valor: formValue.valor,
      plazoDias: formValue.plazoDias,
      cdp: formValue.cdp,
      rp: formValue.rp,
      fechaFirma: formValue.fechaFirma,
      fechaInicio: formValue.fechaInicio,
      fechaTerminacion: formValue.fechaTerminacion,
      seDesembolsaAnticipo: formValue.seDesembolsaAnticipo,
      adiciones: formValue.adiciones || 0,
      valorTotal: this.valorTotal,
      supervisor: formValue.supervisor,
      creadoPor: this.obtenerUsuarioActual()
    };

    if (formValue.seDesembolsaAnticipo) {
      dto.porcentajeAnticipo = formValue.porcentajeAnticipo;
      dto.valorAnticipo = formValue.valorAnticipo;
      dto.fechaDesembolsoAnticipo = formValue.fechaDesembolsoAnticipo;
    }

    let request;
    if (this.isEditMode && this.contratoId) {
      request = this.juridicaService.actualizarContrato(this.contratoId, dto);
    } else {
      request = this.juridicaService.crearContrato(dto);
    }

    const sub = request.subscribe({
      next: (contrato) => {
        this.successMessage = this.isEditMode ? 'Contrato actualizado exitosamente' : 'Contrato creado exitosamente';
        this.isSubmitting = false;
        
        setTimeout(() => {
          this.router.navigate(['/juridica/list']);
        }, 1500);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al guardar el contrato';
        this.isSubmitting = false;
      }
    });

    this.subscriptions.push(sub);
  }

  private obtenerUsuarioActual(): string {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.fullName || user.username || 'Sistema';
      } catch {
        return 'Sistema';
      }
    }
    return 'Sistema';
  }

  cancelar(): void {
    if (confirm('¿Cancelar? Los datos no guardados se perderán.')) {
      this.router.navigate(['/juridica/list']);
    }
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }
}