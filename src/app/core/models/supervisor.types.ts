// src/app/core/models/supervisor.types.ts
import { Documento } from './documento.model'; // <-- Agrega esta línea

export interface DocumentoSupervisor extends Documento {
    // Campos adicionales específicos para supervisor
    disponible?: boolean;
    asignacion?: {
        id?: string;
        supervisorId?: string;
        supervisorNombre?: string;
        fechaAsignacion?: Date | string;
        puedeTomar?: boolean;
        estaRevisando?: boolean;
    };
}

export interface DocumentoParaRevision {
    id: string;
    numeroRadicado: string;
    disponible: boolean;
    asignacion?: {
        puedeTomar: boolean;
        estaRevisando: boolean;
        supervisorActual?: string;
    };
    // Otros campos necesarios para la UI
}