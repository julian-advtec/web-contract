import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { SupervisorCoreService } from './supervisor-core.service';

@Injectable({
    providedIn: 'root'
})
export class SupervisorArchivosService extends SupervisorCoreService {
    
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

    descargarPazSalvo(nombreArchivo: string): Observable<Blob> {
        const headers = this.getAuthHeaders();
        console.log(`📥 Descargando paz y salvo: ${nombreArchivo}...`);

        return this.http.get(`${this.apiUrl}/descargar-paz-salvo/${nombreArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError(this.handleError)
        );
    }

    descargarArchivoAprobacion(nombreArchivo: string): Observable<Blob> {
        const headers = this.getAuthHeaders();
        console.log(`📥 Descargando archivo de aprobación: ${nombreArchivo}...`);

        return this.http.get(`${this.apiUrl}/descargar-archivo/${nombreArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError(this.handleError)
        );
    }

    previsualizarArchivo(id: string, index: number): void {
        console.log(`👁️ Previsualizando archivo ${index} del documento ${id}...`);
        this.descargarArchivo(id, index).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                console.log('✅ Archivo abierto en nueva pestaña');
            },
            error: (error) => {
                console.error('❌ Error previsualizando archivo:', error);
            }
        });
    }

    previsualizarPazSalvo(nombreArchivo: string): void {
        if (!nombreArchivo) return;

        console.log(`👁️ Intentando PREVISUALIZAR paz y salvo: ${nombreArchivo}`);

        this.http.get(`${this.apiUrl}/ver-paz-salvo/${encodeURIComponent(nombreArchivo)}`, {
            headers: this.getAuthHeaders(),
            responseType: 'blob'
        }).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const nuevaVentana = window.open(url, '_blank');
                if (nuevaVentana) nuevaVentana.focus();
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                console.log('✅ Paz y salvo abierto en pestaña');
            },
            error: (err) => {
                console.error('Error previsualizando paz y salvo:', err);
            }
        });
    }

    verArchivoAprobacion(nombreArchivo: string): void {
        if (!nombreArchivo) return;

        console.log(`👁️ Intentando PREVISUALIZAR aprobación: ${nombreArchivo}`);

        this.http.get(`${this.apiUrl}/ver-archivo-supervisor/${encodeURIComponent(nombreArchivo)}`, {
            headers: this.getAuthHeaders(),
            responseType: 'blob'
        }).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const nuevaVentana = window.open(url, '_blank');
                if (nuevaVentana) nuevaVentana.focus();
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                console.log('✅ Aprobación abierto en pestaña');
            },
            error: (err) => {
                console.error('Error previsualizando aprobación:', err);
            }
        });
    }

    previsualizarDocumento(documentoId: string, index: number): void {
        this.previsualizarArchivo(documentoId, index);
    }

    getArchivoUrlConToken(id: string, index: number, download = false): string {
        const token = this.getAuthToken().replace('Bearer ', ''); // Remover 'Bearer ' para query
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

    getUrlArchivoSupervisor(nombreArchivo: string | null): string {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            console.warn('[getUrlArchivoSupervisor] Nombre de archivo vacío o nulo');
            return '#';
        }

        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
        const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        const apiBase = environment.apiUrl;

        let url = `${apiBase}/supervisor/ver-archivo-supervisor/${encodeURIComponent(nombreArchivo)}`;

        if (rawToken) {
            url += `?token=${encodeURIComponent(rawToken)}`;
        } else {
            console.warn('[getUrlArchivoSupervisor] No se encontró token de autenticación');
        }

        console.log('[URL generada para archivo supervisor]:', url);
        return url;
    }

    descargarTodosArchivosSimple(documentoId: string): Observable<void> {
        console.log(`📥 Preparando descarga múltiple para documento ${documentoId}...`);

        return new Observable<void>(observer => {
            observer.next();
            observer.complete();
        });
    }
}