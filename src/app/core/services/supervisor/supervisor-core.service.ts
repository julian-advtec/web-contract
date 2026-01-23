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
                    supervisorAsignado: doc.supervisorAsignado || doc.asignacion?.supervisorActual || undefined,
                    fechaAsignacion: doc.fechaAsignacion ? new Date(doc.fechaAsignacion) : undefined,
                    supervisorEstado: doc.supervisorEstado || doc.asignacion?.estado || undefined,
                    requierePazSalvo: doc.requierePazSalvo || false,
                    pazSalvo: doc.pazSalvo || undefined,
                    fechaPazSalvo: doc.fechaPazSalvo ? new Date(doc.fechaPazSalvo) : undefined,
                    esUltimoRadicado: doc.esUltimoRadicado || false,
                    tipoContrato: doc.tipoContrato || 'SERVICIOS',
                    valorContrato: doc.valorContrato || 0,
                    disponible: doc.disponible || true,
                    asignacion: doc.asignacion || {
                        enRevision: doc.asignacion?.enRevision || false,
                        puedoTomar: doc.asignacion?.puedoTomar || true,
                        usuarioAsignado: doc.usuarioAsignadoNombre,
                        supervisorActual: doc.asignacion?.supervisorActual
                    }
                };

                return documentoMapeado;
            } catch (error) {
                console.error('❌ Error mapeando documento:', error, doc);
                return null;
            }
        }).filter((doc): doc is Documento => doc !== null);
    }
}