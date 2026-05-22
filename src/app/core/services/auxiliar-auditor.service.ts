// src/app/core/services/auxiliar-auditor.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuxiliarAuditorService {
  private apiUrl = `${environment.apiUrl}/auxiliar-auditor`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtener documentos disponibles para subir acta de supervisión
   */
  obtenerDocumentosDisponibles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/documentos/disponibles`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtener detalle completo de un documento
   */
  obtenerDetalleDocumento(documentoId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/documentos/${documentoId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Subir acta de supervisión
   */
  subirActaSupervision(documentoId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('actaSupervision', file);

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(`${this.apiUrl}/documentos/${documentoId}/subir-acta`, formData, {
      headers: headers
    });
  }

  /**
   * Descargar acta de supervisión
   */
  descargarActaSupervision(documentoId: string): Observable<Blob> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.apiUrl}/documentos/${documentoId}/acta`, {
      headers: headers,
      responseType: 'blob'
    });
  }
}