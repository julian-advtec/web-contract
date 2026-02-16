import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';          // ← IMPORTAR AQUÍ el map de RxJS
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

// Definir una interfaz para la respuesta real del backend
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
   * Obtener mi firma
   */
getMySignature(): Observable<Signature | null> {
    return this.http.get<SignatureApiResponse>(`${this.apiUrl}/my-signature`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: SignatureApiResponse) => response?.data || null)
    );
  }

  

  /**
   * Subir o actualizar firma
   */
  uploadSignature(file: File, name: string): Observable<Signature> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    
    const userId = this.authService.getCurrentUser()?.id;
    console.log('📤 Enviando firma para usuario:', userId);
    
    return this.http.post<Signature>(`${this.apiUrl}/upload`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Eliminar firma
   */
  deleteSignature(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Verificar si tiene firma
   */
  hasSignature(): Observable<{ has: boolean }> {
    return this.http.get<{ has: boolean }>(`${this.apiUrl}/has-signature`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Verificar si el rol puede tener firma
   */
  canRoleHaveSignature(role: string): boolean {
    const allowedRoles = ['admin', 'asesor_gerencia', 'rendicion_cuentas', 'tesoreria'];
    return allowedRoles.includes(role);
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
   * Obtener URL para ver la firma (con token en URL)
   */
  getSignatureViewUrl(): string {
    const token = this.authService.getToken();
    return `${this.apiUrl}/view?token=${token}`;
  }

// core/services/signature.service.ts
getSignatureBlob(): Observable<Blob> {
  // Forzar búsqueda en ambos storages
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (!token) {
    console.error('❌ No hay token disponible en ningún storage');
    throw new Error('No hay token disponible');
  }
  
  console.log('🔑 Token encontrado, longitud:', token.length);
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });
  
  return this.http.get(`${this.apiUrl}/view`, {
    headers: headers,
    responseType: 'blob'
  });
}


}