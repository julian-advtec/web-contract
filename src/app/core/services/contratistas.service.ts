import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Contratista } from '../models/contratista.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContratistasService {
  private apiUrl = `${environment.apiUrl}/contratistas`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Método Helper para extraer datos del autocomplete
   * Maneja diferentes niveles de anidación
   */
  private extraerDatosAutocomplete(response: any): any[] {
    console.log('🔍 Extrayendo datos de autocomplete...');
    
    // DEPURACIÓN: Ver estructura completa
    console.log('📊 Estructura completa de respuesta:', JSON.stringify(response, null, 2));
    
    // Nivel 1: response.data.data.data (estructura anidada)
    if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
      console.log('✅ Nivel 3: response.data.data.data');
      return response.data.data.data;
    }
    
    // Nivel 2: response.data.data
    if (response?.data?.data && Array.isArray(response.data.data)) {
      console.log('✅ Nivel 2: response.data.data');
      return response.data.data;
    }
    
    // Nivel 3: response.data
    if (response?.data && Array.isArray(response.data)) {
      console.log('✅ Nivel 1: response.data');
      return response.data;
    }
    
    // Nivel 4: response directo (array)
    if (Array.isArray(response)) {
      console.log('✅ Nivel 0: response (array directo)');
      return response;
    }
    
    console.warn('⚠️ No se pudo extraer array de la respuesta:', response);
    return [];
  }

  /**
   * Buscar contratistas por documento (CORREGIDO)
   */
  buscarPorDocumento(documento: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      console.warn('⚠️ No autenticado para buscar por documento');
      return of([]);
    }

    if (!documento || documento.trim().length < 1) {
      return of([]);
    }

    console.log(`🔍 FRONTEND: Buscando contratista por documento: "${documento}"`);

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/documento?q=${encodeURIComponent(documento.trim())}`, 
      { headers }
    ).pipe(
      map(response => {
        console.log('🔍 FRONTEND: Respuesta completa de /autocomplete/documento:', response);
        
        // ✅✅✅ CORRECCIÓN: Usar el método helper para extraer datos
        const contratistasData = this.extraerDatosAutocomplete(response);
        console.log(`✅ ${contratistasData.length} elementos extraídos:`, contratistasData);
        
        if (contratistasData.length === 0) {
          console.log('⚠️ Array vacío después de extracción');
        }

        // Mapear a Contratista
        const contratistas = contratistasData.map((item: any) => {
          console.log('🔍 Item para mapear:', item);
          
          // DEPURACIÓN: Ver todos los campos disponibles
          console.log('🔍 Campos disponibles en item:', Object.keys(item));
          console.log('🔍 Valores específicos:', {
            id: item.id,
            _id: item._id,
            nombreCompleto: item.nombreCompleto,
            documento: item.documento,
            documentoIdentidad: item.documentoIdentidad,
            value: item.value,
            label: item.label,
            numeroContrato: item.numeroContrato,
            numero_contrato: item.numero_contrato
          });
          
          // Crear objeto Contratista con lógica de respaldo
          const contratista: Contratista = {
            id: item.id || item._id || '',
            nombreCompleto: item.nombreCompleto || item.nombre || item.label || 'Nombre no disponible',
            documentoIdentidad: item.documentoIdentidad || item.documento || item.value || '',
            numeroContrato: item.numeroContrato || item.numero_contrato || '',
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
          };
          
          console.log('🔍 Contratista mapeado:', contratista);
          return contratista;
        });

        console.log(`📋 ${contratistas.length} contratistas mapeados:`, contratistas);
        return contratistas;
      }),
      catchError(error => {
        console.error('❌ Error buscando por documento:', error);
        
        // Si es un 401, no mostrar error en consola
        if (error.status !== 401) {
          console.error('❌ Detalles del error:', {
            status: error.status,
            message: error.message,
            url: error.url
          });
        }
        
        return of([]);
      })
    );
  }

  /**
   * Buscar contratistas por nombre
   */
  buscarPorNombre(nombre: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      console.warn('⚠️ No autenticado para buscar por nombre');
      return of([]);
    }

    if (!nombre || nombre.trim().length < 1) {
      return of([]);
    }

    console.log(`🔍 FRONTEND: Buscando contratista por nombre: "${nombre}"`);

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/nombre?q=${encodeURIComponent(nombre.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        console.log('🔍 FRONTEND: Respuesta de /autocomplete/nombre:', response);
        
        // Usar el mismo método helper
        const contratistasData = this.extraerDatosAutocomplete(response);
        console.log(`✅ ${contratistasData.length} elementos extraídos`);
        
        return contratistasData.map((item: any) => ({
          id: item.id || item._id || '',
          nombreCompleto: item.nombreCompleto || item.nombre || item.label || 'Nombre no disponible',
          documentoIdentidad: item.documentoIdentidad || item.documento || item.value || '',
          numeroContrato: item.numeroContrato || item.numero_contrato || '',
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
        }));
      }),
      catchError(error => {
        console.error('❌ Error buscando por nombre:', error);
        return of([]);
      })
    );
  }

  /**
   * Buscar contratistas por número de contrato
   */
  buscarPorNumeroContrato(numeroContrato: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      console.warn('⚠️ No autenticado para buscar por contrato');
      return of([]);
    }

    if (!numeroContrato || numeroContrato.trim().length < 1) {
      return of([]);
    }

    console.log(`🔍 FRONTEND: Buscando contratista por contrato: "${numeroContrato}"`);

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/contrato?q=${encodeURIComponent(numeroContrato.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        console.log('🔍 FRONTEND: Respuesta de /autocomplete/contrato:', response);
        
        // Usar el mismo método helper
        const contratistasData = this.extraerDatosAutocomplete(response);
        console.log(`✅ ${contratistasData.length} elementos extraídos`);
        
        return contratistasData.map((item: any) => ({
          id: item.id || item._id || '',
          nombreCompleto: item.nombreCompleto || item.nombre || item.label || 'Nombre no disponible',
          documentoIdentidad: item.documentoIdentidad || item.documento || item.value || '',
          numeroContrato: item.numeroContrato || item.numero_contrato || '',
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
        }));
      }),
      catchError(error => {
        console.error('❌ Error buscando por contrato:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener todos los contratistas (para carga inicial)
   */
  obtenerTodos(): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      console.warn('⚠️ No autenticado para obtener contratistas');
      return of([]);
    }

    return this.http.get<Contratista[]>(this.apiUrl, { headers }).pipe(
      catchError(error => {
        console.error('❌ Error obteniendo contratistas:', error);
        return of([]);
      })
    );
  }

  /**
   * Crear un nuevo contratista
   */
  crearContratista(contratista: Partial<Contratista>): Observable<Contratista> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return throwError(() => new Error('No autenticado'));
    }

    return this.http.post<Contratista>(this.apiUrl, contratista, { headers }).pipe(
      catchError(error => {
        console.error('❌ Error creando contratista:', error);
        throw error;
      })
    );
  }

  /**
   * Método de prueba para verificar endpoint
   */
  probarEndpointDocumento(documento: string): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/documento?q=${encodeURIComponent(documento)}`,
      { headers }
    ).pipe(
      tap(response => {
        console.log('🔍 RESPUESTA CRUDA DEL ENDPOINT:', response);
        console.log('🔍 Estructura completa:');
        console.log('1. response:', response);
        console.log('2. response.ok:', response?.ok);
        console.log('3. response.data:', response?.data);
        console.log('4. response.data?.data:', response?.data?.data);
        console.log('5. response.data?.data?.data:', response?.data?.data?.data);
        console.log('6. Array.isArray(response.data.data.data):', Array.isArray(response?.data?.data?.data));
      })
    );
  }
}