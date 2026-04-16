// src/app/core/services/supervisor/supervisor-archivos.service.ts

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { SupervisorCoreService } from './supervisor-core.service';

@Injectable({
    providedIn: 'root'
})
export class SupervisorArchivosService extends SupervisorCoreService {

    // ✅ Método para obtener token raw (sin 'Bearer ')
    private getRawToken(): string {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
        return token.startsWith('Bearer ') ? token.slice(7) : token;
    }

    descargarArchivo(documentoId: string, numeroArchivo: number): Observable<Blob> {
        const headers = this.getAuthHeaders();
        console.log(`📥 Descargando archivo ${numeroArchivo} del documento ${documentoId}...`);

        return this.http.get(`${this.apiUrl}/descargar/${documentoId}/archivo/${numeroArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError(this.handleError)
        );
    }

    descargarArchivoAprobacion(nombreArchivo: string): Observable<Blob> {
        const headers = this.getAuthHeaders();
        return this.http.get(`${this.apiUrl}/descargar-archivo/${nombreArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(catchError(this.handleError));
    }

    getArchivoUrlConToken(id: string, index: number, download = false): string {
        const token = this.getAuthToken().replace('Bearer ', '');
        const baseUrl = `${this.apiUrl}/descargar/${id}/archivo/${index}`;
        const params = new URLSearchParams();
        if (download) params.append('download', 'true');
        if (token) params.append('token', token);
        return `${baseUrl}?${params.toString()}`;
    }

    getPreviewUrl(documentoId: string, index: number): string {
        return this.getArchivoUrlConToken(documentoId, index, false);
    }

    getDownloadUrl(documentoId: string, index: number): string {
        return this.getArchivoUrlConToken(documentoId, index, true);
    }

    descargarArchivoDirecto(id: string, index: number, nombreArchivo?: string): void {
        this.descargarArchivo(id, index).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = nombreArchivo || `archivo-${index}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.log('✅ Archivo descargado directamente');
            },
            error: (error) => {
                console.error('❌ Error descargando archivo directo:', error);
            }
        });
    }

    getUrlArchivoAprobacion(nombreArchivo: string | null): string {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            return '#';
        }
        const apiBase = environment.apiUrl;
        const rawToken = this.getRawToken();
        const nombreCodificado = encodeURIComponent(nombreArchivo);
        let url = `${apiBase}/supervisor/ver-archivo-supervisor/${nombreCodificado}`;
        if (rawToken) {
            url += `?token=${encodeURIComponent(rawToken)}`;
        }
        return url;
    }

    // Método para obtener URL de paz y salvo
    getUrlPazSalvo(nombreArchivo: string | null): string {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            return '#';
        }
        const apiBase = environment.apiUrl;
        const rawToken = this.getRawToken();
        const nombreCodificado = encodeURIComponent(nombreArchivo);
        let url = `${apiBase}/supervisor/ver-paz-salvo/${nombreCodificado}`;
        if (rawToken) {
            url += `?token=${encodeURIComponent(rawToken)}`;
        }
        return url;
    }

    // ✅ MÉTODO CORREGIDO: getUrlArchivoSupervisor con token
    getUrlArchivoSupervisor(nombreArchivo: string | null, tipo: 'aprobacion' | 'pazsalvo' = 'aprobacion'): string {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            return '#';
        }

        const apiBase = environment.apiUrl;
        const nombreCodificado = encodeURIComponent(nombreArchivo);
        const rawToken = this.getRawToken();

        let url: string;
        if (tipo === 'pazsalvo') {
            url = `${apiBase}/supervisor/ver-paz-salvo/${nombreCodificado}`;
        } else {
            url = `${apiBase}/supervisor/ver-archivo-supervisor/${nombreCodificado}`;
        }

        // ✅ AGREGAR TOKEN A LA URL
        if (rawToken) {
            url += `?token=${encodeURIComponent(rawToken)}`;
        }

        console.log(`[SupervisorArchivosService] URL generada con token: ${url.substring(0, 150)}...`);
        return url;
    }

    // Método para descarga (requiere autenticación)
    getDownloadUrlArchivoSupervisor(nombreArchivo: string | null, tipo: 'aprobacion' | 'pazsalvo' = 'aprobacion'): string {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            return '#';
        }

        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
        const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        const apiBase = environment.apiUrl;
        const nombreCodificado = encodeURIComponent(nombreArchivo);

        let url: string;
        if (tipo === 'pazsalvo') {
            url = `${apiBase}/supervisor/descargar-paz-salvo/${nombreCodificado}`;
        } else {
            url = `${apiBase}/supervisor/descargar-archivo/${nombreCodificado}`;
        }

        if (rawToken) {
            url += `?token=${encodeURIComponent(rawToken)}`;
        }

        return url;
    }

    descargarTodosArchivosSimple(documentoId: string): Observable<void> {
        console.log(`📥 Preparando descarga múltiple para documento ${documentoId}...`);
        return new Observable<void>(observer => {
            observer.next();
            observer.complete();
        });
    }

    previsualizarArchivoAprobacion(nombreArchivo: string): void {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            console.warn('⚠️ No hay nombre de archivo para previsualizar');
            return;
        }

        const rawToken = this.getRawToken();
        const nombreCodificado = encodeURIComponent(nombreArchivo);
        let url = `${environment.apiUrl}/supervisor/ver-archivo-supervisor/${nombreCodificado}`;
        
        if (rawToken) {
            url += `?token=${encodeURIComponent(rawToken)}`;
        }
        
        console.log(`👁️ Abriendo previsualización de aprobación: ${url}`);
        
        fetch(url, {
            headers: {
                'Authorization': `Bearer ${rawToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        })
        .catch(error => {
            console.error('Error al previsualizar archivo de aprobación:', error);
        });
    }

    /**
     * Previsualizar paz y salvo (usando fetch con headers)
     */
    previsualizarPazSalvo(nombreArchivo: string): void {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            console.warn('⚠️ No hay nombre de archivo de paz y salvo');
            return;
        }

        const rawToken = this.getRawToken();
        const nombreCodificado = encodeURIComponent(nombreArchivo);
        let url = `${environment.apiUrl}/supervisor/ver-paz-salvo/${nombreCodificado}`;
        
        if (rawToken) {
            url += `?token=${encodeURIComponent(rawToken)}`;
        }
        
        console.log(`👁️ Abriendo previsualización de paz y salvo: ${url}`);
        
        fetch(url, {
            headers: {
                'Authorization': `Bearer ${rawToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        })
        .catch(error => {
            console.error('Error al previsualizar paz y salvo:', error);
        });
    }

    /**
     * ✅ DESCARGAR PAZ Y SALVO
     */
    descargarPazSalvo(nombreArchivo: string): Observable<Blob> {
        const headers = this.getAuthHeaders();
        const nombreCodificado = encodeURIComponent(nombreArchivo);
        return this.http.get(`${this.apiUrl}/descargar-paz-salvo/${nombreCodificado}`, {
            headers,
            responseType: 'blob'
        }).pipe(catchError(this.handleError));
    }
}