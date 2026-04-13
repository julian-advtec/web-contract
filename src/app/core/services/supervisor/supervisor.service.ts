import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Documento } from '../../models/documento.model';
import { SupervisorDocumentosService } from './supervisor-documentos.service';
import { SupervisorRevisionService } from './supervisor-revision.service';
import { SupervisorArchivosService } from './supervisor-archivos.service';
import { SupervisorEstadisticasService } from './supervisor-estadisticas.service';
import { SupervisorOperacionesService } from './supervisor-operaciones.service';
import { FiltrosEstadisticasSupervisor, PeriodoStats } from '../../models/supervisor-estadisticas.model';

interface SupervisorStats {
    pendientes: number;
    aprobados: number;
    observados: number;
    rechazados: number;
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class SupervisorService {
    private documentosService = inject(SupervisorDocumentosService);
    private revisionService = inject(SupervisorRevisionService);
    private archivosService = inject(SupervisorArchivosService);
    private estadisticasService = inject(SupervisorEstadisticasService);
    private operacionesService = inject(SupervisorOperacionesService);

    /**
     * ✅ Documentos
     */
    obtenerDocumentosDisponibles(): Observable<Documento[]> {
        return this.documentosService.obtenerDocumentosDisponibles();
    }

    obtenerDocumentoPorId(id: string): Observable<any> {
        return this.documentosService.obtenerDocumentoPorId(id);
    }

    obtenerMisRevisiones(): Observable<Documento[]> {
        return this.documentosService.obtenerMisRevisiones();
    }

    obtenerDocumentosPendientes(): Observable<any> {
        return this.documentosService.obtenerDocumentosPendientes();
    }

    obtenerDocumentosRevisados(): Observable<any> {
        return this.documentosService.obtenerDocumentosRevisados();
    }

    /**
     * ✅ Revisiones
     */
    guardarRevision(documentoId: string, datosRevision: any): Observable<any> {
        return this.revisionService.guardarRevision(documentoId, datosRevision);
    }

    guardarRevisionConArchivo(
        documentoId: string,
        datosRevision: any,
        archivoAprobacion?: File | null,
        archivoPazSalvo?: File | null
    ): Observable<any> {
        return this.revisionService.guardarRevisionConArchivo(
            documentoId, datosRevision, archivoAprobacion, archivoPazSalvo
        );
    }

    guardarRevisionConDocumentos(documentoId: string, formData: FormData): Observable<any> {
        return this.revisionService.guardarRevisionConDocumentos(documentoId, formData);
    }

    subirDocumentosCorregidos(formData: FormData): Observable<any> {
        return this.revisionService.subirDocumentosCorregidos(formData);
    }

    subirArchivoRevision(documentoId: string, indice: number, archivo: File): Observable<any> {
        return this.revisionService.subirArchivoRevision(documentoId, indice, archivo);
    }

    obtenerHistorialConArchivos(documentoId: string): Observable<any> {
        return this.revisionService.obtenerHistorialConArchivos(documentoId);
    }

    tomarDocumentoParaRevision(documentoId: string): Observable<any> {
        return this.revisionService.tomarDocumentoParaRevision(documentoId);
    }

    liberarDocumento(documentoId: string): Observable<any> {
        return this.revisionService.liberarDocumento(documentoId);
    }

    devolverDocumento(documentoId: string, motivo: string, instrucciones: string): Observable<any> {
        return this.revisionService.devolverDocumento(documentoId, motivo, instrucciones);
    }

    aprobarDocumento(id: string, observaciones?: string): Observable<any> {
        return this.revisionService.aprobarDocumento(id, observaciones);
    }

    rechazarDocumento(id: string, motivo: string): Observable<any> {
        return this.revisionService.rechazarDocumento(id, motivo);
    }

    observarDocumento(id: string, observaciones: string): Observable<any> {
        return this.revisionService.observarDocumento(id, observaciones);
    }

    /**
     * ✅ Archivos
     */
    descargarArchivo(documentoId: string, numeroArchivo: number): Observable<Blob> {
        return this.archivosService.descargarArchivo(documentoId, numeroArchivo);
    }

    previsualizarArchivo(id: string, index: number): void {
        return this.archivosService.previsualizarArchivo(id, index);
    }

    previsualizarDocumento(documentoId: string, index: number): void {
        return this.archivosService.previsualizarDocumento(documentoId, index);
    }

    descargarPazSalvo(nombreArchivo: string): Observable<Blob> {
        return this.archivosService.descargarPazSalvo(nombreArchivo);
    }

    previsualizarPazSalvo(nombreArchivo: string): void {
        return this.archivosService.previsualizarPazSalvo(nombreArchivo);
    }

    descargarArchivoAprobacion(nombreArchivo: string): Observable<Blob> {
        return this.archivosService.descargarArchivoAprobacion(nombreArchivo);
    }

    verArchivoAprobacion(nombreArchivo: string): void {
        return this.archivosService.verArchivoAprobacion(nombreArchivo);
    }

    getArchivoUrlConToken(id: string, index: number, download = false): string {
        return this.archivosService.getArchivoUrlConToken(id, index, download);
    }

    getPreviewUrl(documentoId: string, index: number): string {
        return this.archivosService.getPreviewUrl(documentoId, index);
    }

    getDownloadUrl(documentoId: string, index: number): string {
        return this.archivosService.getDownloadUrl(documentoId, index);
    }

    descargarArchivoDirecto(id: string, index: number, nombreArchivo?: string): void {
        return this.archivosService.descargarArchivoDirecto(id, index, nombreArchivo);
    }

getUrlArchivoSupervisor(nombreArchivo: string | null, tipo: 'aprobacion' | 'pazsalvo' = 'aprobacion'): string {
    return this.archivosService.getUrlArchivoSupervisor(nombreArchivo, tipo);
}

    descargarTodosArchivosSimple(documentoId: string): Observable<void> {
        return this.archivosService.descargarTodosArchivosSimple(documentoId);
    }

    /**
     * ✅ Estadísticas
     */
    obtenerEstadisticas(filtros: FiltrosEstadisticasSupervisor = { periodo: PeriodoStats.ANO }): Observable<any> {
        return this.estadisticasService.obtenerEstadisticas(filtros);
    }



    /**
     * ✅ Operaciones
     */
    forzarAsignacionDocumentos(): Observable<any> {
        return this.operacionesService.forzarAsignacionDocumentos();
    }

    verificarUltimoRadicado(documentoId: string, contratistaId: string): Observable<boolean> {
        return this.operacionesService.verificarUltimoRadicado(documentoId, contratistaId);
    }

    obtenerInfoContratista(documentoId: string): Observable<any> {
        return this.operacionesService.obtenerInfoContratista(documentoId);
    }

    obtenerHistorial(): Observable<any[]> {
        return this.estadisticasService.obtenerHistorial();
    }

    obtenerMisSupervisiones(): Observable<Documento[]> {
        return this.documentosService.obtenerMisSupervisiones();
    }
}