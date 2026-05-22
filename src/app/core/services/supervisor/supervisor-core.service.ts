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
    protected apiUrl = `${environment.apiUrl}/supervisor`;

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

    protected mapearDocumentosDesdeBackend(documentosArray: any[]): Documento[] {
        if (!Array.isArray(documentosArray)) {
            console.error('❌ documentosArray no es un array:', documentosArray);
            return [];
        }

        console.log(`📊 Mapeando ${documentosArray.length} documentos...`);

        return documentosArray.map((doc: any) => {
            try {
                const documentoMapeado: Documento = {
                    id: doc.id || '',
                    numeroRadicado: doc.numeroRadicado || '',
                    numeroContrato: doc.numeroContrato || '',
                    nombreContratista: doc.nombreContratista || 'Sin contratista',
                    documentoContratista: doc.documentoContratista || '',
                    emailContratista: doc.emailContratista || '',
                    telefonoContratista: doc.telefonoContratista || '',
                    fechaInicio: doc.fechaInicio ? new Date(doc.fechaInicio) : new Date(),
                    fechaFin: doc.fechaFin ? new Date(doc.fechaFin) : new Date(),
                    estado: doc.estado || 'RADICADO',
                    fechaRadicacion: doc.fechaRadicacion ? new Date(doc.fechaRadicacion) : new Date(),
                    cuentaCobro: doc.cuentaCobro || '',
                    seguridadSocial: doc.seguridadSocial || '',
                    informeActividades: doc.informeActividades || '',
                    descripcionCuentaCobro: doc.descripcionCuentaCobro || 'Cuenta de Cobro',
                    descripcionSeguridadSocial: doc.descripcionSeguridadSocial || 'Seguridad Social',
                    descripcionInformeActividades: doc.descripcionInformeActividades || 'Informe de Actividades',
                    observacion: doc.observacion || '',
                    nombreRadicador: doc.radicador || doc.nombreRadicador || 'Radicador',
                    usuarioRadicador: doc.usuarioRadicador || '',
                    rutaCarpetaRadicado: doc.rutaCarpetaRadicado || '',
                    radicador: typeof doc.radicador === 'string' ? doc.radicador : doc.nombreRadicador,
                    tokenPublico: doc.tokenPublico || '',
                    tokenActivo: doc.tokenActivo || false,
                    tokenExpiraEn: doc.tokenExpiraEn ? new Date(doc.tokenExpiraEn) : new Date(),
                    contratistaId: doc.contratistaId || '',
                    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
                    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
                    ultimoAcceso: doc.ultimoAcceso ? new Date(doc.ultimoAcceso) : new Date(),
                    ultimoUsuario: doc.ultimoUsuario || '',
                    fechaActualizacion: doc.fechaActualizacion ? new Date(doc.fechaActualizacion) : new Date(),
                    usuarioAsignadoNombre: doc.usuarioAsignadoNombre || doc.asignacion?.usuarioAsignado,
                    primerRadicadoDelAno: doc.primerRadicadoDelAno || false,
                    esUltimoRadicado: doc.esUltimoRadicado || false,
                    tipoContrato: doc.tipoContrato || 'SERVICIOS',
                    valorContrato: doc.valorContrato || 0,
                    supervisorAsignado: doc.supervisorAsignado || doc.asignacion?.supervisorActual || undefined,
                    fechaAprobacionSupervisor: doc.fechaAprobacionSupervisor || doc.fechaAsignacion ? new Date(doc.fechaAsignacion) : undefined,
                    observacionSupervisor: doc.observacionSupervisor || undefined,
                    requierePazSalvo: doc.requierePazSalvo || false,
                    auditorAsignado: doc.auditorAsignado || undefined,
                    fechaAsignacionAuditor: doc.fechaAsignacionAuditor ? new Date(doc.fechaAsignacionAuditor) : undefined,
                    estadoAuditor: doc.estadoAuditor || undefined,
                    historialEstados: doc.historialEstados || [],
                    asignacion: {
                        estado: doc.asignacion?.estado || doc.supervisorEstado || 'PENDIENTE',
                        supervisorActual: doc.asignacion?.supervisorActual || doc.supervisorAsignado,
                        enRevision: doc.asignacion?.enRevision || false,
                        auditorActual: doc.asignacion?.auditorActual || doc.auditorAsignado,
                        puedoTomar: doc.asignacion?.puedoTomar !== undefined ? doc.asignacion.puedoTomar : true
                    },
                    puedeTomar: doc.asignacion?.puedoTomar !== undefined ? doc.asignacion.puedoTomar : true,
                    enRevision: doc.asignacion?.enRevision || false,
                    esPrimerRadicado: doc.primerRadicadoDelAno || false,
                    estadoBadge: {
                        texto: this.getEstadoTexto(doc.estado || doc.asignacion?.estado || 'RADICADO'),
                        clase: this.getEstadoClase(doc.estado || doc.asignacion?.estado || 'RADICADO')
                    }
                };

                return documentoMapeado;
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
            'FINALIZADO': 'Finalizado'
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
            'FINALIZADO': 'badge-success'
        };
        return clases[estado] || 'badge-secondary';
    }
}