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

        const url = `${this.apiUrl}/ver-paz-salvo/${encodeURIComponent(nombreArchivo)}`;
        console.log(`👁️ Abriendo paz y salvo: ${url}`);
        window.open(url, '_blank');
    }

    // PREVISUALIZAR ARCHIVO DE APROBACIÓN - SIN TOKEN
    verArchivoAprobacion(nombreArchivo: string): void {
        if (!nombreArchivo) return;

        const url = `${this.apiUrl}/ver-archivo-supervisor/${encodeURIComponent(nombreArchivo)}`;
        console.log(`👁️ Abriendo archivo de aprobación: ${url}`);
        window.open(url, '_blank');
    }



    // Método auxiliar para descargar (mantener con autenticación si quieres)
    descargarPazSalvo(nombreArchivo: string): Observable<Blob> {
        const headers = this.getAuthHeaders();
        return this.http.get(`${this.apiUrl}/descargar-paz-salvo/${nombreArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(catchError(this.handleError));
    }

    descargarArchivoAprobacion(nombreArchivo: string): Observable<Blob> {
        const headers = this.getAuthHeaders();
        return this.http.get(`${this.apiUrl}/descargar-archivo/${nombreArchivo}`, {
            headers,
            responseType: 'blob'
        }).pipe(catchError(this.handleError));
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

    getUrlArchivoAprobacion(nombreArchivo: string | null): string {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            return '#';
        }
        const apiBase = environment.apiUrl;
        return `${apiBase}/supervisor/ver-archivo-supervisor/${encodeURIComponent(nombreArchivo)}`;
    }

    // Método para obtener URL de paz y salvo
    getUrlPazSalvo(nombreArchivo: string | null): string {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            return '#';
        }
        const apiBase = environment.apiUrl;
        return `${apiBase}/supervisor/ver-paz-salvo/${encodeURIComponent(nombreArchivo)}`;
    }

    getUrlArchivoSupervisor(nombreArchivo: string | null, tipo: 'aprobacion' | 'pazsalvo' = 'aprobacion'): string {
        if (!nombreArchivo || nombreArchivo.trim() === '') {
            console.warn('[getUrlArchivoSupervisor] Nombre de archivo vacío o nulo');
            return '#';
        }

        const apiBase = environment.apiUrl;
        const nombreCodificado = encodeURIComponent(nombreArchivo);

        // Usar rutas públicas según el tipo
        let url: string;
        if (tipo === 'pazsalvo') {
            url = `${apiBase}/supervisor/ver-paz-salvo/${nombreCodificado}`;
        } else {
            url = `${apiBase}/supervisor/ver-archivo-supervisor/${nombreCodificado}`;
        }

        console.log('[URL generada para previsualización]:', url);
        return url;
    }

    // ✅ Método para descarga (requiere autenticación)
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
}