// core/services/signature.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Signature as SignatureModel } from '../models/signature.types';
import { UserRole } from '../models/user.types';

// 👈 EXPORTAR COMO ALIAS para mantener compatibilidad
export type Signature = SignatureModel;

@Injectable({
  providedIn: 'root'
})
export class SignatureService {
  private apiUrl = `${environment.apiUrl}/signatures`;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Subir una firma
   */
  uploadSignature(file: File, name: string): Observable<Signature> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);

    return this.http.post<Signature>(`${this.apiUrl}/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).pipe(
      map(response => this.normalizeSignature(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener la firma del usuario actual
   */
  getSignature(): Observable<Signature> {
    return this.http.get<Signature>(`${this.apiUrl}/current`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.normalizeSignature(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Alias para getSignature (para compatibilidad con componentes existentes)
   */
  getMySignature(): Observable<Signature> {
    return this.getSignature();
  }

  /**
   * Obtener la firma como blob para descargar/visualizar
   */
  getSignatureBlob(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/current/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar la firma del usuario actual
   */
  deleteSignature(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/current`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Verificar si un rol puede tener firma
   */
  canRoleHaveSignature(role: UserRole | string): boolean {
    // Convertir string a UserRole si es necesario
    let userRole: UserRole;
    if (typeof role === 'string') {
      // Mapeo de strings a UserRole
      const roleMap: Record<string, UserRole> = {
        'admin': UserRole.ADMIN,
        'contratista': UserRole.CONTRATISTA,
        'radicador': UserRole.RADICADOR,
        'supervisor': UserRole.SUPERVISOR,
        'juridica': UserRole.JURIDICA,
        'asesor_gerencia': UserRole.ASESOR_GERENCIA,
        'tesoreria': UserRole.TESORERIA,
        'contabilidad': UserRole.CONTABILIDAD,
        'auditor_cuentas': UserRole.AUDITOR_CUENTAS,
        'rendicion_cuentas': UserRole.RENDICION_CUENTAS
      };
      userRole = roleMap[role.toLowerCase()] || UserRole.RADICADOR;
    } else {
      userRole = role;
    }

    const rolesWithSignature: UserRole[] = [
      UserRole.ADMIN,
      UserRole.RADICADOR,
      UserRole.SUPERVISOR,
      UserRole.JURIDICA,
      UserRole.CONTRATISTA,
      UserRole.ASESOR_GERENCIA,
      UserRole.TESORERIA
    ];
    return rolesWithSignature.includes(userRole);
  }

  /**
   * Normalizar la firma para asegurar que tenga todas las propiedades necesarias
   */
  private normalizeSignature(signature: any): Signature {
    return {
      id: signature.id,
      userId: signature.userId,
      name: signature.name || signature.filename || 'Sin nombre',
      filename: signature.filename || signature.name,
      originalName: signature.originalName || signature.filename,
      path: signature.path || signature.rutaArchivo,
      type: signature.type || (signature.mimeType?.split('/')[1] || 'unknown'),
      size: signature.size || signature.fileSize || signature.tamanoBytes || 0,
      mimeType: signature.mimeType || signature.tipoMime,
      fileSize: signature.fileSize || signature.size || signature.tamanoBytes || 0,
      createdAt: signature.createdAt ? new Date(signature.createdAt) : new Date(),
      updatedAt: signature.updatedAt ? new Date(signature.updatedAt) : new Date(),
      fechaSubida: signature.fechaSubida || signature.createdAt
    };
  }

  private handleError(error: any): Observable<never> {
    console.error('SignatureService Error:', error);
    return throwError(() => error);
  }
}