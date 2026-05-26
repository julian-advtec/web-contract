import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

interface SignatureApiResponse {
  ok: boolean;
  path: string;
  timestamp: string;
  data: Signature | null;
}

export interface Signature {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SignatureService {
  private apiUrl = `${environment.apiUrl}/signatures`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtener firma de un usuario específico
   */
  getMySignature(userId?: string): Observable<Signature | null> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    
    return this.http.get<SignatureApiResponse>(`${this.apiUrl}/my-signature`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      map((response: SignatureApiResponse) => response?.data || null)
    );
  }

  /**
   * Subir o actualizar firma
   */
  uploadSignature(file: File, name: string, targetUserId?: string): Observable<Signature> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    
    let params = new HttpParams();
    if (targetUserId) {
      params = params.set('userId', targetUserId);
    }
    
    const currentUserId = this.authService.getCurrentUser()?.id;
    console.log(`📤 Enviando firma - Usuario objetivo: ${targetUserId || currentUserId}`);
    
    return this.http.post<Signature>(`${this.apiUrl}/upload`, formData, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Eliminar firma de un usuario específico
   */
  deleteSignature(userId?: string): Observable<void> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    
    return this.http.delete<void>(`${this.apiUrl}/delete`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Verificar si tiene firma
   */
  hasSignature(userId?: string): Observable<{ has: boolean }> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    
    return this.http.get<{ has: boolean }>(`${this.apiUrl}/has-signature`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Verificar si el rol puede tener firma
   */
  canRoleHaveSignature(role: string): boolean {
    const allowedRoles = [
      'admin', 
      'supervisor',
      'asesor_gerencia', 
      'rendicion_cuentas', 
      'tesoreria',
      'auditor_cuentas',
      'contabilidad',
      'juridica'
    ];
    return allowedRoles.includes(role.toLowerCase());
  }

  /**
   * Obtener headers con token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`
    });
  }

  /**
   * Obtener firma como blob para un usuario específico
   */
  getSignatureBlob(userId?: string): Observable<Blob> {
    const token = this.authService.getToken();
    
    if (!token) {
      console.error('❌ No hay token disponible');
      throw new Error('No hay token disponible');
    }
    
    console.log('🔑 Token encontrado, longitud:', token.length);
    
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get(`${this.apiUrl}/view`, {
      headers: headers,
      params: params,
      responseType: 'blob'
    });
  }
}