// Basado en el backend que me mostraste
export type EstadoContrato = 
  | 'BORRADOR' 
  | 'EN_APROBACION' 
  | 'FIRMADO' 
  | 'EN_EJECUCION' 
  | 'TERMINADO' 
  | 'LIQUIDADO' 
  | 'SUSPENDIDO';

export type TipoContrato = 
  | 'PRESTACION_SERVICIOS' 
  | 'SUMINISTRO' 
  | 'OBRA' 
  | 'CONSULTORIA' 
  | 'COMPRAVENTA' 
  | 'ARRENDAMIENTO' 
  | 'OTRO';

export interface Proveedor {
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  nombreRazonSocial: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface Contrato {
  id: string;
  vigencia: string;
  numeroContrato: string;
  tipoContrato: TipoContrato;
  proveedor: Proveedor;
  objeto: string;
  valor: number;
  plazoDias: number;
  cdp?: string;
  rp?: string;
  fechaFirma: Date | string;
  fechaInicio: Date | string;
  fechaTerminacion: Date | string;
  seDesembolsaAnticipo: boolean;
  porcentajeAnticipo?: number;
  valorAnticipo?: number;
  fechaDesembolsoAnticipo?: Date | string;
  adiciones: number;
  valorTotal: number;
  supervisor?: string;
  estado: EstadoContrato;
  createdAt: Date | string;
  updatedAt: Date | string;
  creadoPor?: string;
  ultimoUsuario?: string;
  
  // Propiedades de polizas
  requierePolizas?: boolean;
  polizaCumplimientoNumero?: string;
  polizaCumplimientoAseguradora?: string;
  polizaCumplimientoValor?: number;
  polizaCumplimientoVigenciaDesde?: Date | string;
  polizaCumplimientoVigenciaHasta?: Date | string;
  requierePolizaCalidad?: boolean;
  polizaCalidadNumero?: string;
  polizaCalidadAseguradora?: string;
  polizaCalidadValor?: number;
  polizaCalidadVigenciaDesde?: Date | string;
  polizaCalidadVigenciaHasta?: Date | string;
  requierePolizaRC?: boolean;
  polizaRCNumero?: string;
  polizaRCAseguradora?: string;
  polizaRCValor?: number;
  polizaRCVigenciaDesde?: Date | string;
  polizaRCVigenciaHasta?: Date | string;
}

export interface CreateContratoDto {
  vigencia: string;
  numeroContrato: string;
  tipoContrato: TipoContrato;
  proveedor: Proveedor;
  objeto: string;
  valor: number;
  plazoDias: number;
  cdp?: string;
  rp?: string;
  fechaFirma: Date | string;
  fechaInicio: Date | string;
  fechaTerminacion: Date | string;
  seDesembolsaAnticipo?: boolean;
  porcentajeAnticipo?: number;
  valorAnticipo?: number;
  fechaDesembolsoAnticipo?: Date | string;
  adiciones?: number;
  valorTotal: number;
  supervisor?: string;
  creadoPor?: string;
  
  // Propiedades de polizas
  requierePolizas?: boolean;
  polizaCumplimientoNumero?: string;
  polizaCumplimientoAseguradora?: string;
  polizaCumplimientoValor?: number;
  polizaCumplimientoVigenciaDesde?: Date | string;
  polizaCumplimientoVigenciaHasta?: Date | string;
  requierePolizaCalidad?: boolean;
  polizaCalidadNumero?: string;
  polizaCalidadAseguradora?: string;
  polizaCalidadValor?: number;
  polizaCalidadVigenciaDesde?: Date | string;
  polizaCalidadVigenciaHasta?: Date | string;
  requierePolizaRC?: boolean;
  polizaRCNumero?: string;
  polizaRCAseguradora?: string;
  polizaRCValor?: number;
  polizaRCVigenciaDesde?: Date | string;
  polizaRCVigenciaHasta?: Date | string;
}

export interface UpdateContratoDto {
  vigencia?: string;
  numeroContrato?: string;
  tipoContrato?: TipoContrato;
  proveedor?: Proveedor;
  objeto?: string;
  valor?: number;
  plazoDias?: number;
  cdp?: string;
  rp?: string;
  fechaFirma?: Date | string;
  fechaInicio?: Date | string;
  fechaTerminacion?: Date | string;
  seDesembolsaAnticipo?: boolean;
  porcentajeAnticipo?: number;
  valorAnticipo?: number;
  fechaDesembolsoAnticipo?: Date | string;
  adiciones?: number;
  valorTotal?: number;
  supervisor?: string;
  estado?: EstadoContrato;
  ultimoUsuario?: string;
  
  // Propiedades de polizas
  requierePolizas?: boolean;
  polizaCumplimientoNumero?: string;
  polizaCumplimientoAseguradora?: string;
  polizaCumplimientoValor?: number;
  polizaCumplimientoVigenciaDesde?: Date | string;
  polizaCumplimientoVigenciaHasta?: Date | string;
  requierePolizaCalidad?: boolean;
  polizaCalidadNumero?: string;
  polizaCalidadAseguradora?: string;
  polizaCalidadValor?: number;
  polizaCalidadVigenciaDesde?: Date | string;
  polizaCalidadVigenciaHasta?: Date | string;
  requierePolizaRC?: boolean;
  polizaRCNumero?: string;
  polizaRCAseguradora?: string;
  polizaRCValor?: number;
  polizaRCVigenciaDesde?: Date | string;
  polizaRCVigenciaHasta?: Date | string;
}

export interface FiltrosContratoDto {
  vigencia?: string;
  tipoContrato?: TipoContrato;
  estado?: EstadoContrato;
  proveedor?: string;
  numeroContrato?: string;
  supervisor?: string;
  fechaInicioDesde?: Date | string;
  fechaInicioHasta?: Date | string;
  fechaTerminacionDesde?: Date | string;
  fechaTerminacionHasta?: Date | string;
}