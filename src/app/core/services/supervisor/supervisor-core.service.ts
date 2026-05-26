// src/app/core/services/supervisor/supervisor-core.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Documento } from '../../models/documento.model';

@Injectable({
    providedIn: 'root'
})
export class SupervisorCoreService {
    protected http = inject(HttpClient);
    protected apiUrl = `${environment.apiUrl}/supervisor/documentos`;
    protected revisionApiUrl = `${environment.apiUrl}/supervisor/revision`;

    protected getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            console.error('❌ No hay token disponible en localStorage');
            return new HttpHeaders();
        }
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        return new HttpHeaders({
            'Authorization': authToken,
            'Content-Type': 'application/json'
        });
    }

    protected getAuthToken(): string {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
        return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    protected handleError(error: HttpErrorResponse): Observable<never> {
        console.error('❌ Error en servicio supervisor:', error);
        let errorMessage = 'Error desconocido en el servidor';
        if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else {
            switch (error.status) {
                case 0: errorMessage = 'Error de conexión con el servidor'; break;
                case 401: 
                    errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente';
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = '/auth/login';
                    }, 2000);
                    break;
                case 403: errorMessage = 'No tienes permisos para realizar esta acción'; break;
                case 404: errorMessage = 'Recurso no encontrado'; break;
                case 409: errorMessage = error.error?.message || 'Conflicto con el recurso'; break;
                case 500: errorMessage = 'Error interno del servidor'; break;
                default: errorMessage = `Error ${error.status}: ${error.error?.message || error.message}`;
            }
        }
        return throwError(() => new Error(errorMessage));
    }

    protected extraerDatosRespuesta(response: any): any[] {
        // Si la respuesta tiene data y es un array, usarlo
        if (response?.data && Array.isArray(response.data)) {
            console.log('📊 Extrayendo datos de response.data');
            return response.data;
        }
        // Si la respuesta tiene data y dentro tiene data (anidado)
        if (response?.data?.data && Array.isArray(response.data.data)) {
            console.log('📊 Extrayendo datos de response.data.data');
            return response.data.data;
        }
        // Si la respuesta directamente es un array
        if (Array.isArray(response)) {
            console.log('📊 Extrayendo datos de response (array)');
            return response;
        }
        // Si la respuesta tiene success y data
        if (response?.success === true && response?.data && Array.isArray(response.data)) {
            console.log('📊 Extrayendo datos de response.success.data');
            return response.data;
        }
        console.log('⚠️ No se pudieron extraer datos de la respuesta:', response);
        return [];
    }

    protected mapearDocumentosDesdeBackend(response: any): Documento[] {
        // Extraer los datos de la respuesta
        const documentosArray = this.extraerDatosRespuesta(response);
        
        if (!Array.isArray(documentosArray) || documentosArray.length === 0) {
            console.log('📊 No hay documentos para mapear');
            return [];
        }

        console.log(`📊 Mapeando ${documentosArray.length} documentos...`);

        return documentosArray.map((doc: any) => {
            try {
                // Si el documento está dentro de una propiedad "documento"
                const documentoData = doc.documento || doc;
                
                return {
                    id: documentoData.id || '',
                    numeroRadicado: documentoData.numeroRadicado || '',
                    numeroContrato: documentoData.numeroContrato || '',
                    nombreContratista: documentoData.nombreContratista || 'Sin contratista',
                    documentoContratista: documentoData.documentoContratista || '',
                    emailContratista: documentoData.emailContratista || '',
                    telefonoContratista: documentoData.telefonoContratista || '',
                    fechaInicio: documentoData.fechaInicio ? new Date(documentoData.fechaInicio) : new Date(),
                    fechaFin: documentoData.fechaFin ? new Date(documentoData.fechaFin) : new Date(),
                    estado: documentoData.estado || 'RADICADO',
                    fechaRadicacion: documentoData.fechaRadicacion ? new Date(documentoData.fechaRadicacion) : new Date(),
                    cuentaCobro: documentoData.cuentaCobro || '',
                    seguridadSocial: documentoData.seguridadSocial || '',
                    informeActividades: documentoData.informeActividades || '',
                    descripcionCuentaCobro: documentoData.descripcionCuentaCobro || 'Cuenta de Cobro',
                    descripcionSeguridadSocial: documentoData.descripcionSeguridadSocial || 'Seguridad Social',
                    descripcionInformeActividades: documentoData.descripcionInformeActividades || 'Informe de Actividades',
                    observacion: documentoData.observacion || '',
                    nombreRadicador: documentoData.radicador || documentoData.nombreRadicador || 'Radicador',
                    usuarioRadicador: documentoData.usuarioRadicador || '',
                    rutaCarpetaRadicado: documentoData.rutaCarpetaRadicado || '',
                    radicador: typeof documentoData.radicador === 'string' ? documentoData.radicador : documentoData.nombreRadicador,
                    tokenPublico: documentoData.tokenPublico || '',
                    tokenActivo: documentoData.tokenActivo || false,
                    tokenExpiraEn: documentoData.tokenExpiraEn ? new Date(documentoData.tokenExpiraEn) : new Date(),
                    contratistaId: documentoData.contratistaId || '',
                    createdAt: documentoData.createdAt ? new Date(documentoData.createdAt) : new Date(),
                    updatedAt: documentoData.updatedAt ? new Date(documentoData.updatedAt) : new Date(),
                    ultimoAcceso: documentoData.ultimoAcceso ? new Date(documentoData.ultimoAcceso) : new Date(),
                    ultimoUsuario: documentoData.ultimoUsuario || '',
                    fechaActualizacion: documentoData.fechaActualizacion ? new Date(documentoData.fechaActualizacion) : new Date(),
                    usuarioAsignadoNombre: documentoData.usuarioAsignadoNombre || documentoData.asignacion?.usuarioAsignado,
                    primerRadicadoDelAno: documentoData.primerRadicadoDelAno || false,
                    esUltimoRadicado: documentoData.esUltimoRadicado || false,
                    tipoContrato: documentoData.tipoContrato || 'SERVICIOS',
                    valorContrato: documentoData.valorContrato || 0,
                    supervisorAsignado: documentoData.supervisorAsignado || documentoData.asignacion?.supervisorActual,
                    requierePazSalvo: documentoData.requierePazSalvo || false,
                    historialEstados: documentoData.historialEstados || [],
                    asignacion: {
                        estado: documentoData.asignacion?.estado || documentoData.supervisorEstado || 'PENDIENTE',
                        supervisorActual: documentoData.asignacion?.supervisorActual || documentoData.supervisorAsignado,
                        enRevision: documentoData.asignacion?.enRevision || false,
                        puedoTomar: documentoData.asignacion?.puedoTomar !== undefined ? documentoData.asignacion.puedoTomar : true
                    },
                    puedeTomar: documentoData.asignacion?.puedoTomar !== undefined ? documentoData.asignacion.puedoTomar : true,
                    enRevision: documentoData.asignacion?.enRevision || false,
                    esPrimerRadicado: documentoData.primerRadicadoDelAno || false,
                    estadoBadge: {
                        texto: this.getEstadoTexto(documentoData.estado || 'RADICADO'),
                        clase: this.getEstadoClase(documentoData.estado || 'RADICADO')
                    }
                } as Documento;
            } catch (error) {
                console.error('❌ Error mapeando documento:', error, doc);
                return null;
            }
        }).filter((doc): doc is Documento => doc !== null);
    }

    private getEstadoTexto(estado: string): string {
        const estados: Record<string, string> = {
            'RADICADO': 'Radicado',
            'EN_REVISION_SUPERVISOR': 'En Revisión Supervisor',
            'APROBADO_SUPERVISOR': 'Aprobado por Supervisor',
            'OBSERVADO_SUPERVISOR': 'Observado por Supervisor',
            'RECHAZADO_SUPERVISOR': 'Rechazado por Supervisor',
            'EN_REVISION_AUDITOR': 'En Revisión Auditor',
            'APROBADO_AUDITOR': 'Aprobado por Auditor',
            'OBSERVADO_AUDITOR': 'Observado por Auditor',
            'RECHAZADO_AUDITOR': 'Rechazado por Auditor',
            'FINALIZADO': 'Finalizado',
            'FIRMADO_SUPERVISOR': 'Firmado por Supervisor'
        };
        return estados[estado] || estado;
    }

    private getEstadoClase(estado: string): string {
        const clases: Record<string, string> = {
            'RADICADO': 'badge-info',
            'EN_REVISION_SUPERVISOR': 'badge-warning',
            'APROBADO_SUPERVISOR': 'badge-success',
            'OBSERVADO_SUPERVISOR': 'badge-warning',
            'RECHAZADO_SUPERVISOR': 'badge-danger',
            'EN_REVISION_AUDITOR': 'badge-warning',
            'APROBADO_AUDITOR': 'badge-success',
            'OBSERVADO_AUDITOR': 'badge-warning',
            'RECHAZADO_AUDITOR': 'badge-danger',
            'FINALIZADO': 'badge-success',
            'FIRMADO_SUPERVISOR': 'badge-primary'
        };
        return clases[estado] || 'badge-secondary';
    }

    verActa(documentoId: string, soloLectura: boolean = true): void {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (token) {
            const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
            const url = `${this.apiUrl}/${documentoId}/acta?soloLectura=${soloLectura}&token=${encodeURIComponent(cleanToken)}`;
            console.log(`📄 Abriendo acta: ${url}`);
            window.open(url, '_blank');
        } else {
            console.error('❌ No hay token para ver acta');
        }
    }
}