// src/app/core/services/formularios-publicos.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FormularioAprobacionData {
  contratistaNombre: string;
  contratistaDocumento: string;
  tipoContratista: string;
  representanteLegal: string;
  documentoRepresentante: string;
  objetivoContrato: string;
  cargo: string;
  telefono: string;
  direccion: string;
  departamento: string;
  ciudad: string;
  estadoFormulario: string;
  estadoGrupos: any;
  totalDocumentos: number;
  fechaCompletado: string;
  idFormulario: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormulariosPublicosService {
  private baseUrl = `${environment.apiUrl}/contratistas/publico`;

  // ✅ Estado de aprobación - Persistente
  private fromAprobacionSubject = new BehaviorSubject<boolean>(false);
  private formularioDataSubject = new BehaviorSubject<FormularioAprobacionData | null>(null);

  fromAprobacion$: Observable<boolean> = this.fromAprobacionSubject.asObservable();
  formularioData$: Observable<FormularioAprobacionData | null> = this.formularioDataSubject.asObservable();

  constructor(private http: HttpClient) { }

  // ===============================
  // ✅ MÉTODOS DEL STATE DE APROBACIÓN
  // ===============================

  setFromAprobacion(fromAprobacion: boolean): void {
    console.log('📌 FormulariosPublicosService - setFromAprobacion:', fromAprobacion);
    this.fromAprobacionSubject.next(fromAprobacion);
  }

  setFormularioData(data: FormularioAprobacionData): void {
    console.log('📌 FormulariosPublicosService - setFormularioData:', data);
    this.formularioDataSubject.next(data);
  }

  getFromAprobacion(): boolean {
    return this.fromAprobacionSubject.getValue();
  }

  getFormularioData(): FormularioAprobacionData | null {
    return this.formularioDataSubject.getValue();
  }

  /**
   * ✅ Verificar si hay estado de aprobación activo
   */
  hasAprobacionState(): boolean {
    return this.getFromAprobacion() && this.getFormularioData() !== null;
  }

  /**
   * ✅ Limpiar el estado - SOLO cuando se haya usado
   */
  clearAprobacionState(): void {
    console.log('📌 FormulariosPublicosService - clearAprobacionState');
    this.fromAprobacionSubject.next(false);
    this.formularioDataSubject.next(null);
  }

  // ===============================
  // ✅ MÉTODOS DE LA API
  // ===============================

  listarPendientesAprobacion(): Observable<any> {
    return this.http.get(`${this.baseUrl}/pendientes-aprobacion`);
  }

  obtenerDetalleAprobacion(formularioId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${formularioId}/detalle-aprobacion`);
  }



  rechazarFormulario(formularioId: string, motivo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${formularioId}/rechazar`, { motivo });
  }

  descargarCombinado(formularioId: string, grupo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${formularioId}/combinado/${grupo}`, {
      responseType: 'blob'
    });
  }

  obtenerEstadoGrupos(formularioId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${formularioId}/estado-grupos`);
  }

  descargarDocumentoIndividual(formularioId: string, documentoId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${formularioId}/documentos/${documentoId}/descargar`, {
      responseType: 'blob'
    });
  }

  /**
 * ✅ Aprobar un formulario - Envía número de contrato como objeto
 */
  aprobarFormulario(formularioId: string, data?: { observaciones?: string; numeroContrato?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${formularioId}/aprobar`, data || {});
  }
}