export interface RegistroAcceso {
  id: string;
  documentoId: string;
  usuarioId: string;
  nombreUsuario: string;
  rolUsuario: string;
  accion: string;
  detalles?: string;
  fechaAcceso: Date;
}