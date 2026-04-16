import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators'; // ✅ AGREGAR switchMap

import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ContabilidadService } from '../../../../core/services/contabilidad.service';
import { AsesorGerenciaFormComponent } from '../../../asesor-gerencia/components/asesor-gerencia-form/asesor-gerencia-form.component';

@Component({
  selector: 'app-rendicion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AsesorGerenciaFormComponent
  ],
  templateUrl: './rendicion-form.component.html',
  styleUrls: ['./rendicion-form.component.scss']
})
export class RendicionFormComponent implements OnInit {

  @Input() documentoId: string | null = null;
  @Input() forceReadOnly: boolean = false;

  form: FormGroup;
  isProcessing = false;
  isLoading = true;
  documento: any = null;
  
  // ✅ Datos del radicado extraídos
  radicadoData: any = null;
  
  // ✅ Documentos del radicado
  documentosRadicado: Array<{
    tipo: string;
    nombre: string;
    nombreOriginal: string;
    disponible: boolean;
    indice: number;
  }> = [];

  esModoLectura = false;
  estaProcesado = false;
  isDescargando = false;

  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'warning' | 'info' = 'info';

  puedeGuardar = false;
  puedeLiberar = false;

  private estadosProcesados = ['APROBADO', 'OBSERVADO', 'RECHAZADO', 'COMPLETADO'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rendicionService: RendicionCuentasService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private contabilidadService: ContabilidadService
  ) {
    this.form = this.fb.group({
      observaciones: ['', [Validators.minLength(10)]],
      estadoFinal: ['', Validators.required]
    });

    this.form.valueChanges.subscribe(() => this.actualizarEstadoBotones());
  }

  ngOnInit(): void {
    const idParaCargar = this.documentoId || this.route.snapshot.paramMap.get('id');

    if (!idParaCargar) {
      this.mostrarMensaje('No se recibió ID del documento', 'error');
      this.isLoading = false;
      return;
    }

    this.cargarDocumentoCompleto(idParaCargar);
  }

  /**
   * ✅ MÉTODO CORREGIDO: Primero carga la rendición, luego el radicado
   */
  cargarDocumentoCompleto(id: string): void {
    console.log('📥 [RendicionForm] Iniciando carga con ID de rendición:', id);
    this.isLoading = true;

    // PASO 1: Obtener la rendición de cuentas
    this.rendicionService.obtenerDetalleRendicion(id)
        .pipe(
            map((response: any) => {
                console.log('📊 Respuesta de rendición:', response);
                
                // Extraer datos de la rendición
                const rendicionData = response?.data || response;
                
                // ✅ IMPORTANTE: Extraer el radicadoId
                const radicadoId = rendicionData?.radicadoId || 
                                   rendicionData?.documentoId || 
                                   rendicionData?.id;
                
                if (!radicadoId) {
                    throw new Error('No se encontró el ID del radicado asociado');
                }
                
                console.log('✅ Radicado ID encontrado:', radicadoId);
                
                // Guardar datos de la rendición
                this.documento = {
                    ...rendicionData,
                    id: rendicionData.id,
                    rendicionId: rendicionData.id,
                    radicadoId: radicadoId,
                    estado: rendicionData.estado,
                    observaciones: rendicionData.observacion || rendicionData.observaciones
                };
                
                return radicadoId;
            }),
            switchMap((radicadoId: string) => {
                // PASO 2: Cargar el documento radicado usando el radicadoId
                console.log('🔍 Cargando documento radicado con ID:', radicadoId);
                return this.contabilidadService.obtenerDetalleDocumento(radicadoId);
            }),
            map((response: any) => {
                console.log('📊 Respuesta del documento radicado:', response);
                // ✅ CORREGIDO: Pasar el parámetro 'origen' (ahora son 2 argumentos)
                return this.extraerDocumentoDeRespuesta(response, 'contabilidad');
            }),
            catchError(error => {
                console.error('❌ Error cargando:', error);
                
                if (error.status === 404) {
                    this.mostrarMensaje('El documento de radicación no existe', 'error');
                } else if (error.status === 403) {
                    this.mostrarMensaje('No tienes permisos para ver este documento', 'error');
                } else {
                    this.mostrarMensaje('Error al cargar el documento', 'error');
                }
                
                return of(null);
            })
        )
        .subscribe({
            next: (documentoData: any) => {
                if (!documentoData) {
                    this.isLoading = false;
                    return;
                }

                console.log('✅ Documento radicado extraído correctamente:', {
                    id: documentoData.id,
                    numeroRadicado: documentoData.numeroRadicado,
                    estado: documentoData.estado
                });

                // Fusionar datos de rendición con datos del radicado
                this.radicadoData = documentoData;
                this.fusionarDatosConRadicado(documentoData);
                this.isLoading = false;
            },
            error: (err) => {
                console.error('[RendicionForm] Falló carga completa:', err);
                this.isLoading = false;
            }
        });
  }

  /**
   * 🔄 Fusionar datos del radicado con los de la rendición
   */
  private fusionarDatosConRadicado(radicadoData: any): void {
    const docData = radicadoData.documento || radicadoData;
    
    // Actualizar documento con datos del radicado
    this.documento = {
        ...this.documento,
        // Datos del radicado
        documentoId: docData.id,
        numeroRadicado: this.extraerValor(docData, ['numeroRadicado', 'radicadoNumero']),
        numeroContrato: this.extraerValor(docData, ['numeroContrato', 'contratoNumero']),
        nombreContratista: this.extraerValor(docData, ['nombreContratista', 'contratistaNombre']),
        documentoContratista: this.extraerValor(docData, ['documentoContratista', 'contratistaDocumento']),
        fechaInicio: this.extraerValor(docData, ['fechaInicio', 'inicioContrato']),
        fechaFin: this.extraerValor(docData, ['fechaFin', 'finContrato']),
        fechaRadicacion: this.extraerValor(docData, ['fechaRadicacion', 'createdAt']),
        radicadorNombre: this.extraerValor(docData, ['radicador', 'nombreRadicador']),
        radicadorUsuario: this.extraerValor(docData, ['radicadorUsuario', 'usuarioRadicador'])
    };
    
    // Extraer documentos adjuntos
    this.extraerDocumentosAdjuntos(docData);
    
    // Determinar modo y poblar formulario
    this.determinarModoPorEstado();
    this.poblarFormulario();
    
    console.log('✅ Datos fusionados correctamente:', {
        radicadoId: this.documento.documentoId,
        numeroRadicado: this.documento.numeroRadicado,
        estadoRendicion: this.documento.estado
    });
  }

  /**
   * ✅ EXTRACCIÓN ROBUSTA - Soporta múltiples estructuras de respuesta
   */
  private extraerDocumentoDeRespuesta(response: any, origen: string): any {
    console.log(`📊 [${origen}] Procesando respuesta:`, response);
    
    let documentoData = null;
    
    // 🔍 Caso 1: response.data.documento
    if (response?.data?.documento) {
      documentoData = response.data.documento;
      console.log(`✅ [${origen}] Extrayendo de response.data.documento`);
    }
    // 🔍 Caso 2: response.data.data (estructura anidada)
    else if (response?.data?.data?.id) {
      documentoData = response.data.data;
      console.log(`✅ [${origen}] Extrayendo de response.data.data`);
    }
    // 🔍 Caso 3: response.data (si tiene id directamente)
    else if (response?.data?.id) {
      documentoData = response.data;
      console.log(`✅ [${origen}] Extrayendo de response.data`);
    }
    // 🔍 Caso 4: response.documento
    else if (response?.documento) {
      documentoData = response.documento;
      console.log(`✅ [${origen}] Extrayendo de response.documento`);
    }
    // 🔍 Caso 5: response directamente
    else if (response?.id) {
      documentoData = response;
      console.log(`✅ [${origen}] Extrayendo de response`);
    }
    // 🔍 Caso 6: Búsqueda recursiva como último recurso
    else if (response?.data) {
      documentoData = this.buscarDocumentoRecursivamente(response.data);
      if (documentoData) console.log(`✅ [${origen}] Encontrado documento buscando recursivamente`);
    }
    
    // ✅ Asegurar que tenga el estado
    if (documentoData && !documentoData.estado && response?.data?.estado) {
      documentoData.estado = response.data.estado;
    }
    
    return documentoData;
  }

  /**
   * 🔍 Búsqueda recursiva para encontrar objeto con id y estado
   */
  private buscarDocumentoRecursivamente(obj: any): any {
    if (!obj) return null;
    if (obj.id && obj.estado) return obj;
    if (obj.documento?.id && obj.documento?.estado) return obj.documento;
    
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        const found = this.buscarDocumentoRecursivamente(obj[key]);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 🔧 Helper para extraer valores de múltiples nombres de campo posibles
   */
  private extraerValor(obj: any, posiblesNombres: string[]): any {
    if (!obj) return null;
    for (const nombre of posiblesNombres) {
      if (obj[nombre] !== undefined && obj[nombre] !== null && obj[nombre] !== '') {
        return obj[nombre];
      }
    }
    return null;
  }

  /**
   * 📁 Extraer documentos adjuntos del radicado
   */
  private extraerDocumentosAdjuntos(docData: any): void {
    const documentosConfig = [
      { tipo: 'cuentaCobro', indice: 1, nombreDefault: 'Cuenta de Cobro.pdf', campos: ['cuentaCobro', 'cuenta_cobro', 'archivoCuentaCobro'] },
      { tipo: 'seguridadSocial', indice: 2, nombreDefault: 'Seguridad Social.pdf', campos: ['seguridadSocial', 'seguridad_social', 'archivoSeguridadSocial'] },
      { tipo: 'informeActividades', indice: 3, nombreDefault: 'Informe de Actividades.pdf', campos: ['informeActividades', 'informe_actividades', 'archivoInforme'] }
    ];

    this.documentosRadicado = documentosConfig.map(config => {
      let nombreArchivo = null;
      let nombreOriginal = null;
      
      for (const campo of config.campos) {
        if (docData[campo]) {
          nombreArchivo = docData[campo];
          break;
        }
      }
      
      const campoDescripcion = `descripcion${config.tipo.charAt(0).toUpperCase() + config.tipo.slice(1)}`;
      nombreOriginal = docData[campoDescripcion] || nombreArchivo || config.nombreDefault;
      
      return {
        tipo: config.tipo,
        indice: config.indice,
        nombre: nombreArchivo,
        nombreOriginal: nombreOriginal,
        disponible: !!nombreArchivo
      };
    });

    console.log('📁 Documentos del radicado extraídos:', this.documentosRadicado);
  }

  /**
   * 🔒 Determinar modo basado en el estado del documento
   */
  private determinarModoPorEstado(): void {
    const estado = (this.documento?.estado || '').toUpperCase();
    
    this.estaProcesado = this.estadosProcesados.some(s => estado.includes(s));
    
    this.esModoLectura = this.estaProcesado ||
      this.forceReadOnly ||
      this.route.snapshot.queryParamMap.get('modo') === 'consulta' ||
      this.route.snapshot.queryParamMap.get('soloLectura') === 'true';
    
    console.log('🔍 Modo determinado:', {
      estado,
      estaProcesado: this.estaProcesado,
      esModoLectura: this.esModoLectura
    });
  }

  /**
   * 📝 Poblar formulario con datos del documento
   */
  private poblarFormulario(): void {
    const estado = (this.documento?.estado || '').toUpperCase();
    
    let estadoFinal = '';
    if (estado.includes('APROBADO') || estado.includes('COMPLETADO')) {
      estadoFinal = 'APROBADO';
    } else if (estado.includes('OBSERVADO')) {
      estadoFinal = 'OBSERVADO';
    } else if (estado.includes('RECHAZADO')) {
      estadoFinal = 'RECHAZADO';
    }
    
    this.form.patchValue({
      estadoFinal,
      observaciones: this.documento.observaciones || this.documento.observacionOriginal || ''
    });
    
    this.actualizarEstadoBotones();
  }

  // ==================== MÉTODOS EXISTENTES ====================

  descargarCarpeta(): void {
    const idDescarga = this.documento?.documentoId || this.documento?.id || this.documentoId;
    if (!idDescarga) {
      this.mostrarMensaje('No se puede descargar: documento no identificado', 'error');
      return;
    }

    this.isDescargando = true;
    this.mostrarMensaje('Preparando descarga...', 'info');

    this.rendicionService.descargarCarpeta(idDescarga).subscribe({
      next: () => {
        this.isDescargando = false;
        this.mostrarMensaje('Descarga iniciada correctamente', 'success');
      },
      error: (err) => {
        this.isDescargando = false;
        this.mostrarMensaje('Error al descargar la carpeta', 'error');
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.esModoLectura || this.estaProcesado || this.isProcessing || !this.documento) return;

    const estadoFinal = this.form.get('estadoFinal')?.value;
    if (!estadoFinal) {
      this.mostrarMensaje('Selecciona una decisión final', 'error');
      return;
    }

    if ((estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') &&
        this.form.value.observaciones?.trim().length < 10) {
      this.mostrarMensaje('La justificación debe tener al menos 10 caracteres', 'error');
      return;
    }

    this.isProcessing = true;

    const payload = {
      decision: estadoFinal,
      observacion: this.form.value.observaciones?.trim() || ''
    };

    this.rendicionService.tomarDecision(this.documento.rendicionId || this.documento.id, payload).subscribe({
      next: () => {
        this.mostrarMensaje(`Documento marcado como ${estadoFinal}`, 'success');
        this.isProcessing = false;
        setTimeout(() => this.volverALista(), 1800);
      },
      error: (err) => {
        this.mostrarMensaje(err.error?.message || 'Error al procesar', 'error');
        this.isProcessing = false;
      }
    });
  }

  liberarDocumento(): void {
    if (this.esModoLectura || this.estaProcesado || !this.documento) return;

    this.notificationService.showModal({
      title: 'Liberar documento',
      message: '¿Deseas liberar este documento?',
      type: 'confirm',
      confirmText: 'Sí, liberar',
      onConfirm: () => {
        this.rendicionService.liberarDocumento(this.documento.rendicionId || this.documento.id)
          .subscribe({
            next: () => {
              this.mostrarMensaje('Documento liberado correctamente', 'success');
              setTimeout(() => this.volverALista(), 1500);
            },
            error: () => this.mostrarMensaje('Error al liberar', 'error')
          });
      }
    });
  }

  volverALista(): void {
    this.router.navigate(['/rendicion-cuentas/historial']);
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | 'info'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => this.mensaje = '', 5000);
  }

  actualizarEstadoBotones(): void {
    if (this.esModoLectura || this.estaProcesado || this.isProcessing || !this.documento) {
      this.puedeGuardar = false;
      this.puedeLiberar = false;
      return;
    }

    const estadoFinal = this.form.get('estadoFinal')?.value;
    const obsLength = this.form.value.observaciones?.trim().length || 0;

    let valido = !!estadoFinal;
    if (estadoFinal === 'OBSERVADO' || estadoFinal === 'RECHAZADO') {
      valido = valido && obsLength >= 10;
    }

    this.puedeGuardar = valido;
    this.puedeLiberar = true;
  }

  getEstadoBadgeClass(estado?: string): string {
    return this.rendicionService.getEstadoClass(estado || '');
  }

  getEstadoTexto(estado?: string): string {
    return this.rendicionService.getEstadoTexto(estado || '');
  }

  esEstadoAprobadoORechazado(): boolean {
    if (!this.documento?.estado) return false;
    const e = this.documento.estado.toUpperCase();
    return e.includes('APROBADO') || e.includes('RECHAZADO') || e.includes('COMPLETADO');
  }

  esEstadoEnRevision(): boolean {
    if (!this.documento?.estado) return false;
    const e = this.documento.estado.toUpperCase();
    return e.includes('EN_REVISION') || e.includes('PENDIENTE') || e.includes('ASIGNADO');
  }

  // ✅ Getter para Radicación
  get radicacionDocumentoId(): string | null {
    return this.documento?.documentoId || this.documento?.id || this.documentoId;
  }

  // ✅ Getter para documentos del radicado
  get documentosRadicadoDisponibles(): any[] {
    return this.documentosRadicado.filter(doc => doc.disponible);
  }
}