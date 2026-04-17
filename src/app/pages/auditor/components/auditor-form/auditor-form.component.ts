import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuditorService } from '../../../../core/services/auditor.service';
import { ContratistasService } from '../../../../core/services/contratistas.service';
import { RendicionCuentasService } from '../../../../core/services/rendicion-cuentas.service';
import { RadicacionFormComponent } from '../../../radicacion/components/radicacion-form/radicacion-form.component';

interface ArchivoAuditor {
  subido: boolean;
  archivo: File | null;
  nombreArchivo: string;
  rutaServidor: string | null;
  fuente: 'contrato' | 'contratista' | null;
  metadata?: any;
}

interface DocumentoAuditoriaItem {
  key: string;
  nombre: string;
  icon: string;
}

@Component({
  selector: 'app-auditor-form',
  standalone: true,
  imports: [
    CommonModule,
    RadicacionFormComponent,
    FormsModule
  ],
  templateUrl: './auditor-form.component.html',
  styleUrls: ['./auditor-form.component.scss']
})
export class AuditorFormComponent implements OnInit, OnDestroy {
  @Input() documentoId: string | null = null;
  @Input() modo: 'auditoria' | 'contabilidad' | 'general' = 'auditoria';
  @Input() soloLectura: boolean = false;

  isLoading = false;
  isProcessing = false;
  subiendoArchivos = false;

  documentoEnRevision = false;
  estaEnRevision = false;
  isDownloadingAll = false;

  documentoData: any = null;
  numeroRadicado: string = '';
  nombreContratista: string = '';
  estadoDocumento: string = '';
  primerRadicadoDelAno = false;
  contratistaId: string | null = null;
  numeroContrato: string = '';

  observacionesRevision = '';
  decisionSeleccionada = '';

  decisionAuditor: string = '';
  observacionAuditor: string = '';
  fechaDecisionAuditor: Date | null = null;
  nombreAuditor: string = 'Auditor';
  
  // ✅ NUEVAS PROPIEDADES PARA EL CONTROL DE EDICIÓN
  nombreAuditorAsignado: string = '';
  usuarioActual: string = '';
  esAdmin: boolean = false;

  documentosExistentes: any[] = [
    { nombre: '', disponible: false, tipo: 'cuentaCobro', indice: 1, nombreOriginal: '' },
    { nombre: '', disponible: false, tipo: 'seguridadSocial', indice: 2, nombreOriginal: '' },
    { nombre: '', disponible: false, tipo: 'informeActividades', indice: 3, nombreOriginal: '' }
  ];

  listaDocumentosAuditoria: DocumentoAuditoriaItem[] = [
    { key: 'rp', nombre: 'Resolución de Pago (RP)', icon: 'fas fa-file-invoice-dollar text-primary' },
    { key: 'cdp', nombre: 'Certificado de Disponibilidad Presupuestal (CDP)', icon: 'fas fa-file-contract text-success' },
    { key: 'poliza', nombre: 'Póliza de Cumplimiento', icon: 'fas fa-file-shield text-info' },
    { key: 'certificadoBancario', nombre: 'Certificado Bancario', icon: 'fas fa-university text-danger' },
    { key: 'minuta', nombre: 'Minuta de Contrato', icon: 'fas fa-gavel text-warning' },
    { key: 'actaInicio', nombre: 'Acta de Inicio', icon: 'fas fa-clipboard-check text-success' }
  ];

  archivosAuditorFormulario: Record<string, ArchivoAuditor> = {
    rp: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    cdp: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    poliza: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    certificadoBancario: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    minuta: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null },
    actaInicio: { subido: false, archivo: null, nombreArchivo: '', rutaServidor: null, fuente: null }
  };

  tabActivo: 'auditoria' | 'contratista' | 'decision' = 'auditoria';

  documentosContratista: any[] = [];
  cargandoDocumentosContratista = false;

  archivosCompletos = false;

  private destroy$ = new Subject<void>();

  esModoContabilidad = false;
  esModoGeneral = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auditorService: AuditorService,
    private contratistasService: ContratistasService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private rendicionService: RendicionCuentasService
  ) { }

  ngOnInit(): void {
    console.log('AUDITOR - Iniciando ngOnInit...');
    console.log('Inputs recibidos:', {
      documentoId: this.documentoId,
      modo: this.modo,
      soloLectura: this.soloLectura
    });

    this.cargarUsuarioActual();
    this.esModoContabilidad = this.modo === 'contabilidad';
    this.esModoGeneral = this.modo === 'general';

    if (this.soloLectura === true || this.esModoContabilidad || this.esModoGeneral) {
      this.soloLectura = true;
      console.log('[AUDITOR] Forzado soloLectura = true');
    }

    let idParaCargar: string | null = this.documentoId;

    if (!idParaCargar) {
      const idFromRoute = this.route.snapshot.paramMap.get('id');
      if (idFromRoute) {
        idParaCargar = idFromRoute;
        console.log('[AUDITOR] ID desde ruta:', idParaCargar);
      }
    } else {
      console.log('[AUDITOR] Usando documentoId recibido:', idParaCargar);
    }

    if (idParaCargar) {
      this.cargarDocumentoParaAuditor(idParaCargar);
    } else {
      console.warn('[AUDITOR] No se encontró ID válido');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ NUEVO MÉTODO: Cargar usuario actual
  cargarUsuarioActual(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.usuarioActual = user.fullName || user.username || '';
        this.esAdmin = user.role === 'admin';
        console.log('[AUDITOR] Usuario actual:', { usuarioActual: this.usuarioActual, esAdmin: this.esAdmin });
      } catch (e) {
        console.error('[AUDITOR] Error parseando usuario:', e);
      }
    }
  }

estaEnModoEdicion(): boolean {
  console.log('[AUDITOR] === INICIANDO VERIFICACIÓN DE EDICIÓN ===');
  console.log('[AUDITOR] Variables de estado:', {
    soloLectura: this.soloLectura,
    esModoContabilidad: this.esModoContabilidad,
    esModoGeneral: this.esModoGeneral,
    estadoDocumento: this.estadoDocumento,
    documentoEnRevision: this.documentoEnRevision,
    estaEnRevision: this.estaEnRevision
  });
  
  // Si es solo lectura forzado, no se puede editar
  if (this.soloLectura === true) {
    console.log('[AUDITOR] ❌ Modo edición: NO (soloLectura=true)');
    return false;
  }
  
  // Si es modo contabilidad o general, no se puede editar
  if (this.esModoContabilidad || this.esModoGeneral) {
    console.log('[AUDITOR] ❌ Modo edición: NO (modo contabilidad/general)');
    return false;
  }
  
  // Si no hay estado, no se puede editar
  if (!this.estadoDocumento) {
    console.log('[AUDITOR] ❌ Modo edición: NO (sin estado)');
    return false;
  }
  
  const estado = this.estadoDocumento.toUpperCase();
  
  // ✅ CORRECCIÓN: Estados donde SÍ se puede editar
  const estadosEditables = [
    'RADICADO',
    'EN_REVISION_AUDITOR',
    'EN_REVISION_ASESOR_GERENCIA',
    'EN_REVISION_RENDICION_CUENTAS'
  ];
  
  // Estados donde NO se puede editar (finales)
  const estadosFinales = [
    'APROBADO', 'APROBADO_AUDITOR', 'APROBADO_SUPERVISOR', 'APROBADO_ASESOR_GERENCIA',
    'COMPLETADO', 'COMPLETADO_AUDITOR', 'COMPLETADO_TESORERIA',
    'RECHAZADO', 'RECHAZADO_AUDITOR', 'RECHAZADO_SUPERVISOR', 'RECHAZADO_TESORERIA',
    'OBSERVADO', 'OBSERVADO_AUDITOR', 'OBSERVADO_TESORERIA',
    'PAGADO', 'ANULADO'
  ];
  
  // Si es estado final, no se puede editar
  if (estadosFinales.some(e => estado.includes(e))) {
    console.log('[AUDITOR] ❌ Modo edición: NO (estado final:', estado, ')');
    return false;
  }
  
  // Verificar si está en estado editable
  const esEstadoEditable = estadosEditables.some(e => estado === e);
  
  // Verificar si el usuario actual es el auditor asignado
  const esMiAuditoria = !this.nombreAuditorAsignado || 
                        this.nombreAuditorAsignado === this.usuarioActual ||
                        this.esAdmin;
  
  const puedeEditar = esEstadoEditable && esMiAuditoria;
  
  console.log('[AUDITOR] Verificación de edición:', {
    estado,
    esEstadoEditable,
    nombreAuditorAsignado: this.nombreAuditorAsignado,
    usuarioActual: this.usuarioActual,
    esMiAuditoria,
    puedeEditar
  });
  
  console.log('[AUDITOR] ✅ Modo edición:', puedeEditar ? 'SI' : 'NO');
  return puedeEditar;
}

// ✅ MÉTODO CORREGIDO: Determina si es solo lectura
esModoSoloLectura(): boolean {
  console.log('[AUDITOR] === VERIFICANDO MODO SOLO LECTURA ===');
  
  // Modos especiales siempre son solo lectura
  if (this.esModoContabilidad || this.esModoGeneral) {
    console.log('[AUDITOR] ✅ Solo lectura: SI (modo especial)');
    return true;
  }
  
  // Si explícitamente es solo lectura
  if (this.soloLectura === true) {
    console.log('[AUDITOR] ✅ Solo lectura: SI (soloLectura flag)');
    return true;
  }
  
  // Si está en modo edición, NO es solo lectura
  const enModoEdicion = this.estaEnModoEdicion();
  if (enModoEdicion) {
    console.log('[AUDITOR] ✅ Solo lectura: NO (está en modo edición)');
    return false;
  }
  
  // Por defecto, solo lectura
  console.log('[AUDITOR] ✅ Solo lectura: SI (por defecto)');
  return true;
}

// ✅ MÉTODO CORREGIDO: cargarDocumentoParaAuditor
cargarDocumentoParaAuditor(id: string): void {
  if (!id) {
    console.warn('[AUDITOR] No se recibió ID válido');
    return;
  }

  console.log('[AUDITOR] Cargando documento con ID:', id);
  this.isLoading = true;
  this.documentoId = id;

  this.auditorService.obtenerDocumentoParaVista(id).subscribe({
    next: (res: any) => {
      console.log('[AUDITOR] Respuesta completa de vista:', res);

      const data = res?.data || res;
      const documento = data?.documento || data;

      if (!documento || !documento.id) {
        console.log('[AUDITOR] Documento no encontrado, intentando como rendiciónId...');
        this.cargarViaRendicion(id);
        return;
      }

      this.documentoData = documento;
      this.numeroRadicado = documento.numeroRadicado || '';
      this.nombreContratista = documento.nombreContratista || '';
      this.estadoDocumento = documento.estado || '';
      this.primerRadicadoDelAno = !!documento.primerRadicadoDelAno;
      this.contratistaId = documento.contratistaId || null;
      this.numeroContrato = documento.numeroContrato || '';
      
      // Cargar el auditor asignado
      this.nombreAuditorAsignado = documento.auditorAsignado || data.auditor?.nombreAuditor || '';
      
      // ✅ FORZAR MODO EDICIÓN SEGÚN EL ESTADO
      if (this.estadoDocumento === 'EN_REVISION_AUDITOR') {
        // Documento en revisión - debe ser editable
        this.soloLectura = false;
        this.documentoEnRevision = true;
        this.estaEnRevision = true;
        console.log('[AUDITOR] ✅ Documento EN_REVISION_AUDITOR - Modo edición ACTIVADO');
      } else if (this.estadoDocumento === 'RADICADO' && !this.nombreAuditorAsignado) {
        // Documento radicado sin auditor - debe ser editable
        this.soloLectura = false;
        this.documentoEnRevision = true;
        this.estaEnRevision = true;
        console.log('[AUDITOR] ✅ Documento RADICADO sin auditor - Modo edición ACTIVADO');
      } else if (this.nombreAuditorAsignado === this.usuarioActual) {
        // Documento asignado a este auditor - debe ser editable
        this.soloLectura = false;
        this.documentoEnRevision = true;
        this.estaEnRevision = true;
        console.log('[AUDITOR] ✅ Documento asignado a este auditor - Modo edición ACTIVADO');
      } else {
        // Por defecto, solo lectura
        this.soloLectura = true;
        this.documentoEnRevision = false;
        this.estaEnRevision = false;
        console.log('[AUDITOR] ⚠️ Documento en modo solo lectura');
      }

      // Cargar la decisión del auditor
      this.cargarDecisionAuditor(data, documento);
      this.cargarTodosLosDocumentos();

      // Si ya tiene decisión final, forzar solo lectura
      if (['APROBADO_AUDITOR', 'COMPLETADO_AUDITOR', 'RECHAZADO_AUDITOR', 'OBSERVADO_AUDITOR']
        .includes(this.estadoDocumento)) {
        this.soloLectura = true;
        this.documentoEnRevision = false;
        console.log('[AUDITOR] ⚠️ Documento con decisión final - Forzando solo lectura');
      }

      this.cdr.detectChanges();
      this.isLoading = false;
      
      // Diagnosticar estado final
      console.log('[AUDITOR] ========== ESTADO FINAL ==========');
      console.log('[AUDITOR] Estado documento:', this.estadoDocumento);
      console.log('[AUDITOR] soloLectura:', this.soloLectura);
      console.log('[AUDITOR] documentoEnRevision:', this.documentoEnRevision);
      console.log('[AUDITOR] estaEnRevision:', this.estaEnRevision);
      console.log('[AUDITOR] nombreAuditorAsignado:', this.nombreAuditorAsignado);
      console.log('[AUDITOR] usuarioActual:', this.usuarioActual);
      console.log('[AUDITOR] ¿Puede editar?', this.estaEnModoEdicion());
      console.log('[AUDITOR] ¿Es solo lectura?', this.esModoSoloLectura());
      console.log('[AUDITOR] ==================================');
    },
    error: (err) => {
      console.error('[AUDITOR] Error cargando documento:', err);
      if (err.status === 404) {
        console.log('[AUDITOR] Error 404, intentando como rendiciónId...');
        this.cargarViaRendicion(id);
      } else {
        this.notificationService.error('Error', 'No se pudo cargar el documento');
        this.isLoading = false;
      }
    }
  });
}

// ✅ NUEVO MÉTODO: Forzar modo edición para documentos tomados
forzarModoEdicionSiEsNecesario(): void {
  // Si el documento está RADICADO y el usuario actual es el auditor asignado
  if (this.estadoDocumento === 'RADICADO' && 
      this.nombreAuditorAsignado === this.usuarioActual) {
    console.log('[AUDITOR] Forzando modo edición para documento RADICADO asignado');
    this.soloLectura = false;
    this.documentoEnRevision = true;
    this.estaEnRevision = true;
    this.cdr.detectChanges();
  }
}

  // ✅ NUEVO MÉTODO: Obtiene la razón por la que no se puede editar
  getRazonNoEditable(): string {
    if (this.soloLectura) {
      return 'El documento se abrió en modo solo lectura';
    }
    
    if (this.esModoContabilidad) {
      return 'Modo contabilidad - solo consulta';
    }
    
    if (this.esModoGeneral) {
      return 'Modo general - solo consulta';
    }
    
    if (!this.estadoDocumento) {
      return 'No se pudo determinar el estado del documento';
    }
    
    const estado = this.estadoDocumento.toUpperCase();
    
    const estadosFinales = ['APROBADO', 'APROBADO_AUDITOR', 'APROBADO_SUPERVISOR', 
                            'COMPLETADO', 'COMPLETADO_AUDITOR', 'RECHAZADO', 
                            'RECHAZADO_AUDITOR', 'RECHAZADO_SUPERVISOR', 
                            'OBSERVADO', 'OBSERVADO_AUDITOR', 'PAGADO', 'ANULADO'];
    
    if (estadosFinales.some(e => estado.includes(e))) {
      return 'Este documento ya fue procesado y está en estado final';
    }
    
    if (this.nombreAuditorAsignado && this.nombreAuditorAsignado !== this.usuarioActual && !this.esAdmin) {
      return `Este documento está asignado a otro auditor: ${this.nombreAuditorAsignado}`;
    }
    
    return 'No tienes permisos para editar este documento';
  }

  // ==================== MÉTODOS PRINCIPALES ====================



  private cargarDecisionAuditor(data: any, documento: any): void {
    // Reiniciar valores
    this.decisionAuditor = '';
    this.observacionAuditor = '';
    this.fechaDecisionAuditor = null;
    this.nombreAuditor = 'Auditor';

    // Fuente 1: data.auditor
    if (data?.auditor) {
      const aud = data.auditor;
      this.decisionAuditor = this.mapearEstadoAuditor(aud.estado || aud.decision);
      this.observacionAuditor = aud.observaciones || aud.observacion || '';
      this.fechaDecisionAuditor = aud.fechaAprobacion || aud.fechaFinRevision || aud.fechaDecision || null;
      this.nombreAuditor = aud.auditor?.nombre || aud.nombreAuditor || 'Auditor';
      
      console.log('[AUDITOR] Decisión cargada desde data.auditor:', {
        decision: this.decisionAuditor,
        observacion: this.observacionAuditor
      });
    }

    // Fuente 2: Si no se encontró en data.auditor, buscar en el documento
    if (!this.decisionAuditor && documento) {
      if (documento.auditoria) {
        this.decisionAuditor = this.mapearEstadoAuditor(documento.auditoria.estado || documento.auditoria.decision);
        this.observacionAuditor = documento.auditoria.observaciones || documento.auditoria.observacion || '';
        this.fechaDecisionAuditor = documento.auditoria.fechaDecision || documento.auditoria.fecha;
        console.log('[AUDITOR] Decisión cargada desde documento.auditoria:', this.decisionAuditor);
      }
      
      if (!this.decisionAuditor && documento.revisionAuditor) {
        this.decisionAuditor = this.mapearEstadoAuditor(documento.revisionAuditor.estado);
        this.observacionAuditor = documento.revisionAuditor.observaciones || '';
        console.log('[AUDITOR] Decisión cargada desde documento.revisionAuditor:', this.decisionAuditor);
      }
    }

    console.log('[AUDITOR] Decisión final del auditor:', {
      decision: this.decisionAuditor,
      observacion: this.observacionAuditor,
      fecha: this.fechaDecisionAuditor
    });
  }

  private cargarViaRendicion(rendicionId: string): void {
    this.isLoading = true;

    this.rendicionService.obtenerDetalleRendicion(rendicionId).subscribe({
      next: (data: any) => {
        const documentoIdReal = data.documento?.id || data.documentoId;
        if (documentoIdReal) {
          console.log('[AUDITOR] ✅ DocumentoId real obtenido:', documentoIdReal);
          this.documentoId = documentoIdReal;
          this.cargarDocumentoParaAuditor(documentoIdReal);
        } else {
          console.error('[AUDITOR] No se pudo obtener documentoId real');
          this.notificationService.error('Error', 'No se pudo identificar el documento asociado a esta rendición');
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('[AUDITOR] Error cargando rendición:', err);
        this.notificationService.error('Error', 'No se pudo cargar el documento');
        this.isLoading = false;
      }
    });
  }

  cargarTodosLosDocumentos(): void {
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      this.archivosAuditorFormulario[key] = {
        subido: false,
        archivo: null,
        nombreArchivo: '',
        rutaServidor: null,
        fuente: null
      };
    });

    if (this.numeroContrato) {
      this.cargarDocumentosDesdeContrato();
    }

    if (this.numeroContrato) {
      this.cargarContratistaConDocumentos();
    }

    setTimeout(() => this.diagnosticarArchivos(), 1000);
  }

  cargarContratistaConDocumentos(): void {
    this.cargandoDocumentosContratista = true;

    this.auditorService.obtenerContratistaPorNumeroContrato(this.numeroContrato).subscribe({
      next: (contratista: any) => {
        if (contratista && contratista.id) {
          this.contratistaId = contratista.id;

          const documentos = contratista.documentos || [];
          this.documentosContratista = documentos;

          console.log(`[CONTRATISTA] ✅ Contratista encontrado: ${contratista.razonSocial || contratista.nombre}`);
          console.log(`[CONTRATISTA] 📎 Documentos recibidos: ${documentos.length}`);

          const mapeoTipos: Record<string, string[]> = {
            poliza: ['POLIZA', 'POLIZA_CUMPLIMIENTO', 'GARANTIA', 'PÓLIZA'],
            certificadoBancario: ['CERTIFICADO_BANCARIO', 'CERTIFICADO BANCARIO', 'CERTIFICADO'],
            minuta: ['MINUTA', 'MINUTA_CONTRATO'],
            actaInicio: ['ACTA_INICIO', 'ACTA DE INICIO', 'ACTA_INICIO_CONTRATO']
          };

          const claves = Object.keys(mapeoTipos);

          for (let i = 0; i < claves.length; i++) {
            const clave = claves[i];
            const tiposBuscados = mapeoTipos[clave];

            const documento = documentos.find((doc: any) => {
              if (!doc.tipo) return false;
              const tipoDoc = doc.tipo.toUpperCase();
              return tiposBuscados.some((tb: string) => tipoDoc.includes(tb) || tipoDoc === tb);
            });

            if (documento && documento.rutaArchivo) {
              this.archivosAuditorFormulario[clave] = {
                subido: true,
                archivo: null,
                nombreArchivo: documento.nombreArchivo,
                rutaServidor: documento.rutaArchivo,
                fuente: 'contratista',
                metadata: {
                  id: documento.id,
                  tipo: documento.tipo,
                  fechaSubida: documento.fechaSubida
                }
              };
              console.log(`[CONTRATISTA] ✅ ${clave} cargado:`, documento.nombreArchivo);
            } else {
              console.log(`[CONTRATISTA] ❌ No se encontró ${clave} en contratista`);
            }
          }

          this.verificarArchivosCompletos();
        } else {
          console.warn('[CONTRATISTA] ❌ No se encontró contratista');
          this.documentosContratista = [];
        }

        this.cargandoDocumentosContratista = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('[CONTRATISTA] Error:', error);
        this.documentosContratista = [];
        this.cargandoDocumentosContratista = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarDocumentosDesdeContrato(): void {
    this.auditorService.obtenerContratoPorNumero(this.numeroContrato).subscribe({
      next: (response: any) => {
        const contrato = response?.data || response;
        console.log('[CONTRATO] Datos del contrato:', contrato);

        const documentosContrato = contrato?.documentos || [];

        const rpDoc = documentosContrato.find((d: any) =>
          d.tipoDocumento === 'RP' || d.tipoDocumento === 'RP_DOCUMENTO'
        );

        if (rpDoc && rpDoc.rutaArchivo) {
          this.archivosAuditorFormulario['rp'] = {
            subido: true,
            archivo: null,
            nombreArchivo: rpDoc.nombreArchivo,
            rutaServidor: rpDoc.rutaArchivo,
            fuente: 'contrato',
            metadata: { tipo: 'RP', id: rpDoc.id, esArchivo: true }
          };
          console.log('[CONTRATO] ✅ RP cargado');
        } else if (contrato?.rp) {
          this.archivosAuditorFormulario['rp'] = {
            subido: true,
            archivo: null,
            nombreArchivo: `RP_${contrato.rp}`,
            rutaServidor: null,
            fuente: 'contrato',
            metadata: { numero: contrato.rp, soloNumero: true }
          };
        }

        const cdpDoc = documentosContrato.find((d: any) =>
          d.tipoDocumento === 'CDP' || d.tipoDocumento === 'CDP_DOCUMENTO'
        );

        if (cdpDoc && cdpDoc.rutaArchivo) {
          this.archivosAuditorFormulario['cdp'] = {
            subido: true,
            archivo: null,
            nombreArchivo: cdpDoc.nombreArchivo,
            rutaServidor: cdpDoc.rutaArchivo,
            fuente: 'contrato',
            metadata: { tipo: 'CDP', id: cdpDoc.id, esArchivo: true }
          };
          console.log('[CONTRATO] ✅ CDP cargado');
        } else if (contrato?.cdp) {
          this.archivosAuditorFormulario['cdp'] = {
            subido: true,
            archivo: null,
            nombreArchivo: `CDP_${contrato.cdp}`,
            rutaServidor: null,
            fuente: 'contrato',
            metadata: { numero: contrato.cdp, soloNumero: true }
          };
        }

        const minutaDoc = documentosContrato.find((d: any) =>
          d.tipoDocumento === 'MINUTA' || d.tipoDocumento === 'MINUTA_CONTRATO'
        );

        if (minutaDoc && minutaDoc.rutaArchivo) {
          this.archivosAuditorFormulario['minuta'] = {
            subido: true,
            archivo: null,
            nombreArchivo: minutaDoc.nombreArchivo,
            rutaServidor: minutaDoc.rutaArchivo,
            fuente: 'contrato',
            metadata: { tipo: 'MINUTA', id: minutaDoc.id, esArchivo: true }
          };
          console.log('[CONTRATO] ✅ MINUTA cargada');
        }

        const actaDoc = documentosContrato.find((d: any) =>
          d.tipoDocumento === 'ACTA_INICIO' || d.tipoDocumento === 'ACTA_DE_INICIO'
        );

        if (actaDoc && actaDoc.rutaArchivo) {
          this.archivosAuditorFormulario['actaInicio'] = {
            subido: true,
            archivo: null,
            nombreArchivo: actaDoc.nombreArchivo,
            rutaServidor: actaDoc.rutaArchivo,
            fuente: 'contrato',
            metadata: { tipo: 'ACTA_INICIO', id: actaDoc.id, esArchivo: true }
          };
          console.log('[CONTRATO] ✅ ACTA_INICIO cargada');
        }

        this.verificarArchivosCompletos();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[CONTRATO] Error:', error);
      }
    });
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  getClaseEstado(estado: string): string {
    if (!estado) return 'bg-secondary text-white';
    const upper = estado.toUpperCase();
    if (upper.includes('APROBADO') || upper.includes('COMPLETADO')) return 'bg-success text-white';
    if (upper.includes('OBSERVADO')) return 'bg-warning text-dark';
    if (upper.includes('RECHAZADO')) return 'bg-danger text-white';
    return 'bg-secondary text-white';
  }

  getEstadoBadgeClass(estado: string): string {
    if (!estado || estado === 'SIN ESTADO') {
      return 'badge bg-light text-dark';
    }
    const upper = estado.toUpperCase();
    if (upper.includes('EN_REVISION_AUDITOR')) return 'badge bg-info';
    if (upper.includes('APROBADO_AUDITOR')) return 'badge bg-success';
    if (upper.includes('RECHAZADO_AUDITOR')) return 'badge bg-danger';
    if (upper.includes('OBSERVADO_AUDITOR')) return 'badge bg-warning';
    if (upper.includes('COMPLETADO_AUDITOR')) return 'badge bg-primary';
    return 'badge bg-light text-dark';
  }

  getIconoArchivo(nombreArchivo: string): string {
    if (!nombreArchivo) return 'fas fa-file';
    const extension = nombreArchivo.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return 'fas fa-file-pdf text-danger';
      case 'doc': case 'docx': return 'fas fa-file-word text-primary';
      case 'jpg': case 'jpeg': case 'png': return 'fas fa-file-image text-success';
      case 'xls': case 'xlsx': return 'fas fa-file-excel text-success';
      default: return 'fas fa-file text-secondary';
    }
  }

  getTamanoFormateado(bytes: number): string {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getNombreArchivoSimple(ruta: string): string {
    if (!ruta) return 'Sin nombre';
    const partes = ruta.split(/[\\/]/);
    return partes[partes.length - 1] || ruta;
  }

  getFuenteDocumento(key: string): string {
    const fuente = this.archivosAuditorFormulario[key]?.fuente;
    if (fuente === 'contrato') return 'Contrato';
    if (fuente === 'contratista') return 'Contratista';
    return 'No disponible';
  }

  private mapearEstadoAuditor(estado: string): string {
    if (!estado) return '';
    const upper = estado.toUpperCase();
    if (upper.includes('APROBADO')) return 'APROBADO';
    if (upper.includes('OBSERVADO')) return 'OBSERVADO';
    if (upper.includes('RECHAZADO')) return 'RECHAZADO';
    if (upper.includes('COMPLETADO')) return 'COMPLETADO';
    return estado;
  }

  getDecisionParaMostrar(): string {
    if (this.decisionAuditor) {
      return this.decisionAuditor;
    }
    if (this.estadoDocumento) {
      const estadoUpper = this.estadoDocumento.toUpperCase();
      if (estadoUpper.includes('APROBADO')) return 'APROBADO';
      if (estadoUpper.includes('COMPLETADO')) return 'COMPLETADO';
      if (estadoUpper.includes('RECHAZADO')) return 'RECHAZADO';
      if (estadoUpper.includes('OBSERVADO')) return 'OBSERVADO';
    }
    return 'No registrada';
  }

  getObservacionParaMostrar(): string {
    if (this.observacionAuditor) {
      return this.observacionAuditor;
    }
    return 'Sin observaciones';
  }

  verArchivoAuditor(tipo: string): void {
    if (!this.puedeAccederArchivo(tipo)) {
      this.notificationService.warning('No disponible', 'Archivo no disponible');
      return;
    }
    this.auditorService.previsualizarArchivoAuditor(this.documentoId!, tipo);
  }

  descargarArchivoAuditor(tipo: string): void {
    if (!this.puedeAccederArchivo(tipo)) {
      this.notificationService.warning('No disponible', 'Archivo no disponible');
      return;
    }
    this.auditorService.descargarArchivoAuditorDirecto(this.documentoId!, tipo);
  }

  volverALista(): void {
    if (this.esModoContabilidad) {
      this.router.navigate(['/contabilidad/pendientes']);
      return;
    }
    if (this.esModoGeneral) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.router.navigate(['/auditor/lista']);
  }

  puedeAccederArchivo(tipo: string): boolean {
    const arch = this.archivosAuditorFormulario[tipo];
    return arch?.subido === true && (!!arch.rutaServidor?.trim() || !!arch.nombreArchivo?.trim());
  }

  hayArchivosAuditorSubidos(): boolean {
    return Object.values(this.archivosAuditorFormulario).some(
      arch => arch.subido === true && (!!arch.rutaServidor?.trim() || !!arch.nombreArchivo?.trim())
    );
  }

  contarArchivosRealmenteSubidos(): number {
    return Object.values(this.archivosAuditorFormulario)
      .filter(a => a.subido === true && (a.rutaServidor || a.nombreArchivo))
      .length;
  }

  private getArchivosSubidosAuditor(): string[] {
    return Object.keys(this.archivosAuditorFormulario).filter(key => {
      const arch = this.archivosAuditorFormulario[key];
      return arch.subido === true && (arch.nombreArchivo?.trim() || arch.rutaServidor?.trim());
    });
  }

  descargarTodosArchivosAuditor(): void {
    const subidos = this.getArchivosSubidosAuditor();
    if (subidos.length === 0) {
      this.notificationService.info('Sin documentos', 'No hay archivos disponibles');
      return;
    }
    this.auditorService.descargarTodosArchivosAuditor(this.documentoId!);
  }

  abrirTodosArchivosAuditor(): void {
    const subidos = this.getArchivosSubidosAuditor();
    if (subidos.length === 0) return;
    subidos.forEach((tipo, i) => {
      setTimeout(() => this.verArchivoAuditor(tipo), i * 700);
    });
  }

  registrarDecision(): void {
    if (!this.decisionSeleccionada) {
      this.notificationService.warning('Atención', 'Seleccione una decisión');
      return;
    }

    if (['OBSERVADO', 'RECHAZADO'].includes(this.decisionSeleccionada) &&
      !this.observacionesRevision.trim()) {
      this.notificationService.warning('Atención', 'Ingrese observaciones para esta decisión');
      return;
    }

    if (this.decisionSeleccionada === 'APROBADO' && this.primerRadicadoDelAno && !this.archivosCompletos) {
      this.notificationService.warning('Atención', 'No se puede aprobar. Faltan documentos requeridos.');
      return;
    }

    this.isProcessing = true;

    const datosRevision = {
      estado: this.decisionSeleccionada,
      observaciones: this.observacionesRevision.trim() || 'Sin observaciones adicionales'
    };

    this.auditorService.guardarRevision(this.documentoId!, datosRevision).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Decisión registrada correctamente');
        this.observacionesRevision = '';
        this.decisionSeleccionada = '';
        if (this.documentoId) {
          this.cargarDocumentoParaAuditor(this.documentoId);
        }
        this.isProcessing = false;
        setTimeout(() => this.router.navigate(['/auditor/lista']), 2000);
      },
      error: (err) => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo registrar la decisión');
        this.isProcessing = false;
      }
    });
  }

  liberarDocumento(): void {
    if (!this.documentoId) return;

    this.isProcessing = true;
    this.auditorService.liberarDocumento(this.documentoId).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Documento liberado');
        this.cargarDocumentoParaAuditor(this.documentoId!);
        this.isProcessing = false;
      },
      error: err => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo liberar el documento');
        this.isProcessing = false;
      }
    });
  }

  verificarArchivosCompletos(): void {
    if (!this.primerRadicadoDelAno) {
      this.archivosCompletos = true;
      return;
    }

    const subidosConfirmados = Object.values(this.archivosAuditorFormulario)
      .filter(a => a.subido === true && (a.rutaServidor || a.nombreArchivo))
      .length;

    this.archivosCompletos = subidosConfirmados === 6;

    console.log('[AUDITOR] Verificación archivos:', {
      primerRadicado: this.primerRadicadoDelAno,
      subidos: subidosConfirmados,
      completos: this.archivosCompletos
    });
  }

  puedeRegistrarDecision(): boolean {
    if (this.estadoDocumento !== 'EN_REVISION_AUDITOR') return false;
    if (!this.decisionSeleccionada) return false;
    if (this.primerRadicadoDelAno && this.decisionSeleccionada === 'APROBADO') {
      if (!this.archivosCompletos) return false;
    }
    if (['OBSERVADO', 'RECHAZADO'].includes(this.decisionSeleccionada) &&
      !this.observacionesRevision?.trim()) {
      return false;
    }
    return true;
  }

  verificarEstado(): void {
    this.cargarTodosLosDocumentos();
  }

  recargarEstadoCompleto(): void {
    if (this.documentoId) {
      this.cargarDocumentoParaAuditor(this.documentoId);
    }
  }

  // ==================== DOCUMENTOS DEL CONTRATISTA ====================

  cargarDocumentosContratista(): void {
    if (!this.contratistaId) {
      this.notificationService.warning('Sin documentos', 'No hay contratista asociado');
      return;
    }

    this.cargandoDocumentosContratista = true;

    this.contratistasService.obtenerDocumentos(this.contratistaId).subscribe({
      next: (documentos: any[]) => {
        this.documentosContratista = documentos || [];
        console.log(`✅ Documentos del contratista (TAB2): ${this.documentosContratista.length}`);
        this.cargandoDocumentosContratista = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error cargando documentos del contratista:', error);
        this.documentosContratista = [];
        this.cargandoDocumentosContratista = false;
        this.notificationService.error('Error', 'No se pudieron cargar los documentos');
        this.cdr.detectChanges();
      }
    });
  }

  verDocumentoContratista(documento: any): void {
    if (!this.contratistaId || !documento.id) {
      this.notificationService.warning('Error', 'No se puede visualizar el documento');
      return;
    }

    this.contratistasService.descargarDocumento(this.contratistaId, documento.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      },
      error: (error: any) => {
        console.error('Error visualizando documento:', error);
        this.notificationService.error('Error', 'No se pudo visualizar el documento');
      }
    });
  }

  descargarDocumentoContratista(documento: any): void {
    if (!this.contratistaId || !documento.id) {
      this.notificationService.warning('Error', 'No se puede descargar el documento');
      return;
    }

    this.isProcessing = true;
    const nombreArchivo = this.getNombreArchivoSimple(documento.nombreArchivo) || `documento_${documento.tipo}.pdf`;

    this.contratistasService.descargarDocumento(this.contratistaId, documento.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notificationService.success('Descarga completada', `"${nombreArchivo}" descargado`);
        this.isProcessing = false;
      },
      error: (error: any) => {
        console.error('Error descargando documento:', error);
        this.notificationService.error('Error', 'No se pudo descargar el documento');
        this.isProcessing = false;
      }
    });
  }

  abrirTodosDocumentosContratista(): void {
    if (this.documentosContratista.length === 0) {
      this.notificationService.warning('Sin documentos', 'No hay documentos para abrir');
      return;
    }
    this.documentosContratista.forEach((doc, index) => {
      setTimeout(() => this.verDocumentoContratista(doc), index * 500);
    });
  }

  descargarTodosDocumentosContratista(): void {
    if (this.documentosContratista.length === 0) {
      this.notificationService.warning('Sin documentos', 'No hay documentos para descargar');
      return;
    }

    this.isProcessing = true;
    this.isDownloadingAll = true;

    let descargados = 0;
    let errores = 0;

    this.documentosContratista.forEach((doc, index) => {
      setTimeout(() => {
        const nombreArchivo = this.getNombreArchivoSimple(doc.nombreArchivo) || `documento_${doc.tipo}.pdf`;

        this.contratistasService.descargarDocumento(this.contratistaId!, doc.id).subscribe({
          next: (blob: Blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            descargados++;
            this.verificarFinDescargaContratista(descargados, errores, this.documentosContratista.length);
          },
          error: () => {
            errores++;
            this.verificarFinDescargaContratista(descargados, errores, this.documentosContratista.length);
          }
        });
      }, index * 800);
    });
  }

  private verificarFinDescargaContratista(descargados: number, errores: number, total: number): void {
    if (descargados + errores === total) {
      this.isProcessing = false;
      this.isDownloadingAll = false;
      if (errores === 0) {
        this.notificationService.success('Descarga completada', `Todos los ${total} documentos descargados`);
      } else {
        this.notificationService.warning('Descarga parcial', `${descargados} descargados, ${errores} errores`);
      }
    }
  }

  diagnosticarArchivos(): void {
    console.log('========== DIAGNÓSTICO DE ARCHIVOS ==========');
    console.log('Documento ID:', this.documentoId);
    console.log('Número Contrato:', this.numeroContrato);
    console.log('Primer radicado:', this.primerRadicadoDelAno);
    console.log('Estado documento:', this.estadoDocumento);
    console.log('Decisión auditor:', this.decisionAuditor);
    console.log('Observación auditor:', this.observacionAuditor);

    console.log('\n📁 ARCHIVOS DE AUDITORÍA:');
    Object.keys(this.archivosAuditorFormulario).forEach(key => {
      const arch = this.archivosAuditorFormulario[key];
      console.log(`  ${key}:`, {
        subido: arch.subido,
        nombreArchivo: arch.nombreArchivo,
        rutaServidor: arch.rutaServidor,
        fuente: arch.fuente
      });
    });

    console.log('\n📄 DOCUMENTOS DEL CONTRATISTA:', this.documentosContratista.length);
    this.documentosContratista.forEach(doc => {
      console.log(`  - ${doc.tipo}: ${doc.nombreArchivo}`);
    });

    console.log('=============================================');
  }
}