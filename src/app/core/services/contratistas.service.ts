// src/app/core/services/contratistas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Contratista, CreateContratistaDto, UpdateContratistaDto, FiltrosContratistaDto, DocumentoContratista, TipoDocumento } from '../models/contratista.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContratistasService {
  private apiUrl = `${environment.apiUrl}/contratistas`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private getFormDataHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

private mapearContratista(item: any): Contratista {
  return {
    id: item.id || item._id || '',
    tipoDocumento: item.tipoDocumento || item.tipo_documento || 'CC',
    documentoIdentidad: item.documentoIdentidad || item.documento_identidad || item.documento || '',
    razonSocial: item.razonSocial || item.razon_social || item.nombreCompleto || item.nombre || item.label || item.value || 'Nombre no disponible',
    representanteLegal: item.representanteLegal || item.representante_legal || '',
    documentoRepresentante: item.documentoRepresentante || item.documento_representante || '',
    telefono: item.telefono || '',
    email: item.email || '',
    direccion: item.direccion || '',
    departamento: item.departamento || '',
    ciudad: item.ciudad || '',
    tipoContratista: item.tipoContratista || item.tipo_contratista || item.tipo || '',
    estado: item.estado || 'ACTIVO',
    numeroContrato: item.numeroContrato || item.numero_contrato || '',
    cargo: item.cargo || '',
    // ✅ CORREGIDO: usar 'objetivoContrato' en lugar de 'observaciones'
    objetivoContrato: item.objetivoContrato || item.observaciones || '',
    createdAt: item.createdAt ? new Date(item.createdAt) : item.fecha_creacion ? new Date(item.fecha_creacion) : new Date(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : item.fecha_actualizacion ? new Date(item.fecha_actualizacion) : new Date(),
    nombreCompleto: item.razonSocial || item.razon_social || item.nombreCompleto || item.nombre || '',
    fechaCreacion: item.createdAt ? new Date(item.createdAt) : item.fecha_creacion ? new Date(item.fecha_creacion) : new Date(),
    fechaActualizacion: item.updatedAt ? new Date(item.updatedAt) : item.fecha_actualizacion ? new Date(item.fecha_actualizacion) : new Date()
  };
}

  // ===============================
  // MÉTODOS DE BÚSQUEDA
  // ===============================

  buscarPorDocumento(documento: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization') || !documento || documento.trim().length < 1) {
      return of([]);
    }

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/documento?q=${encodeURIComponent(documento.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        let contratistasData: any[] = [];
        if (response?.data?.data && Array.isArray(response.data.data)) {
          contratistasData = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          contratistasData = response.data;
        } else if (Array.isArray(response)) {
          contratistasData = response;
        }
        return contratistasData.map((item: any) => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  buscarPorNombre(nombre: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization') || !nombre || nombre.trim().length < 1) {
      return of([]);
    }

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/nombre?q=${encodeURIComponent(nombre.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        let contratistasData: any[] = [];
        if (response?.data?.data && Array.isArray(response.data.data)) {
          contratistasData = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          contratistasData = response.data;
        } else if (Array.isArray(response)) {
          contratistasData = response;
        }
        return contratistasData.map((item: any) => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  buscarPorNumeroContrato(numeroContrato: string): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization') || !numeroContrato || numeroContrato.trim().length < 1) {
      return of([]);
    }

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete/contrato?q=${encodeURIComponent(numeroContrato.trim())}`,
      { headers }
    ).pipe(
      map(response => {
        let contratistasData: any[] = [];
        if (response?.data?.data && Array.isArray(response.data.data)) {
          contratistasData = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          contratistasData = response.data;
        } else if (Array.isArray(response)) {
          contratistasData = response;
        }
        return contratistasData.map((item: any) => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  // ===============================
  // CRUD PRINCIPAL
  // ===============================

  obtenerTodos(filtros?: FiltrosContratistaDto): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      console.warn('⚠️ No autenticado para obtener contratistas');
      return of([]);
    }

    let params = new HttpParams();
    if (filtros) {
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
      if (filtros.offset) params = params.set('offset', filtros.offset.toString());
      if (filtros.nombre) params = params.set('nombre', filtros.nombre);
      if (filtros.documento) params = params.set('documento', filtros.documento);
      if (filtros.contrato) params = params.set('contrato', filtros.contrato);
      if (filtros.tipoContratista) params = params.set('tipoContratista', filtros.tipoContratista);
      if (filtros.estado) params = params.set('estado', filtros.estado);
    }

    console.log('📡 Solicitando contratistas a:', this.apiUrl);

    return this.http.get<any>(this.apiUrl, { headers, params }).pipe(
      map(response => {
        let contratistasData: any[] = [];

        if (response?.ok === true && Array.isArray(response.data)) {
          contratistasData = response.data;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          contratistasData = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          contratistasData = response.data;
        } else if (Array.isArray(response)) {
          contratistasData = response;
        }

        if (!contratistasData || contratistasData.length === 0) {
          return [];
        }

        return contratistasData.map((item: any) => this.mapearContratista(item));
      }),
      catchError(error => {
        console.error('❌ Error obteniendo contratistas:', error);
        return of([]);
      })
    );
  }

  obtenerPorId(id: string): Observable<Contratista | null> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return throwError(() => new Error('No autenticado'));
    }

    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return this.mapearContratista(response.data.data);
        }
        if (response?.data) {
          return this.mapearContratista(response.data);
        }
        return null;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo contratista por ID:', error);
        return of(null);
      })
    );
  }

  obtenerCompleto(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    console.log(`📡 Obteniendo contratista completo: ${id}`);

    return this.http.get<any>(`${this.apiUrl}/${id}/completo`, { headers }).pipe(
      map(response => {
        console.log('📥 Respuesta completa - estructura:', JSON.stringify(response, null, 2));

        // Función recursiva para encontrar los datos reales
        const encontrarDatos = (obj: any, profundidad: number = 0): any => {
          if (profundidad > 10) return null;
          if (!obj || typeof obj !== 'object') return null;

          // Si tiene documentos y propiedades de contratista
          if (obj.documentos && Array.isArray(obj.documentos) && obj.id && obj.razonSocial) {
            console.log(`✅ Contratista encontrado con ${obj.documentos.length} documentos`);
            return obj;
          }

          // Buscar en data
          if (obj.data) {
            const encontrado = encontrarDatos(obj.data, profundidad + 1);
            if (encontrado) return encontrado;
          }

          // Buscar en todas las propiedades
          for (const key in obj) {
            if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
              const encontrado = encontrarDatos(obj[key], profundidad + 1);
              if (encontrado) return encontrado;
            }
          }

          return null;
        };

        const datosReales = encontrarDatos(response);

        if (datosReales) {
          console.log('✅ Contratista encontrado:', datosReales.id);
          return datosReales;
        }

        console.error('❌ No se encontraron datos del contratista');
        return null;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo contratista completo:', error);
        return of(null);
      })
    );
  }

  // ===============================
  // CREACIÓN Y ACTUALIZACIÓN
  // ===============================

  crearContratista(contratista: CreateContratistaDto): Observable<Contratista> {
    const headers = this.getAuthHeaders();

    if (!headers.get('Authorization')) {
      return throwError(() => new Error('No autenticado'));
    }

    return this.http.post<any>(this.apiUrl, contratista, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return this.mapearContratista(response.data.data);
        }
        throw new Error('Error al crear contratista');
      }),
      catchError(error => {
        console.error('❌ Error creando contratista:', error);
        throw error;
      })
    );
  }

  crearConDocumentos(formData: FormData): Observable<any> {
    const headers = this.getFormDataHeaders();
    headers.delete('Content-Type');

    console.log('📡 Creando contratista con documentos...');

    return this.http.post<any>(`${this.apiUrl}/completo`, formData, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta creación:', response);
        if (response?.data?.data) {
          return response.data.data;
        }
        throw new Error('Error al crear contratista con documentos');
      }),
      catchError(error => {
        console.error('❌ Error en creación:', error);
        throw error;
      })
    );
  }

  actualizarConDocumentos(id: string, formData: FormData): Observable<any> {
    const headers = this.getFormDataHeaders();
    headers.delete('Content-Type');

    console.log(`📡 Actualizando contratista ${id} con documentos...`);

    return this.http.put<any>(`${this.apiUrl}/${id}/completo`, formData, { headers }).pipe(
      map(response => {
        console.log('✅ Respuesta actualización:', response);
        if (response?.data?.data) {
          return response.data.data;
        }
        throw new Error('Error al actualizar contratista con documentos');
      }),
      catchError(error => {
        console.error('❌ Error en actualización:', error);
        throw error;
      })
    );
  }

  actualizarContratista(id: string, contratista: UpdateContratistaDto): Observable<Contratista> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.apiUrl}/${id}`, contratista, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return this.mapearContratista(response.data.data);
        }
        throw new Error('Error al actualizar contratista');
      }),
      catchError(error => {
        console.error('❌ Error actualizando contratista:', error);
        throw error;
      })
    );
  }

  // ===============================
  // VERIFICACIONES
  // ===============================

  verificarDocumento(documento: string): Observable<{ existe: boolean }> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/verificar/documento/${documento}`, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return response.data.data;
        }
        return { existe: false };
      }),
      catchError(() => of({ existe: false }))
    );
  }

  // ===============================
  // GESTIÓN DE DOCUMENTOS
  // ===============================



  eliminarDocumento(contratistaId: string, documentoId: string): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${contratistaId}/documentos/${documentoId}`, { headers }).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('❌ Error eliminando documento:', error);
        throw error;
      })
    );
  }

  // ===============================
  // ESTADÍSTICAS Y UTILIDADES
  // ===============================

  obtenerEstadisticas(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/estadisticas`, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return response.data.data;
        }
        return { total: 0, ultimoMes: 0 };
      }),
      catchError(() => of({ total: 0, ultimoMes: 0 }))
    );
  }

  obtenerRecientes(limit: number = 10): Observable<Contratista[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/recientes`, { headers, params: { limit: limit.toString() } }).pipe(
      map(response => {
        let contratistasData: any[] = [];
        if (response?.data?.data && Array.isArray(response.data.data)) {
          contratistasData = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          contratistasData = response.data;
        } else if (Array.isArray(response)) {
          contratistasData = response;
        }
        return contratistasData.map((item: any) => this.mapearContratista(item));
      }),
      catchError(() => of([]))
    );
  }

  verificarPermisosUsuario(): Observable<any> {
    const headers = this.getAuthHeaders();
    if (!headers.get('Authorization')) {
      return of({ success: false, data: { puedeCrear: false, puedeVer: false } });
    }
    return this.http.get<any>(`${this.apiUrl}/verificar/permisos`, { headers }).pipe(
      catchError(() => of({ success: false, data: { puedeCrear: true, puedeVer: true } }))
    );
  }

  // ===============================
  // MÉTODOS DE COMPATIBILIDAD
  // ===============================

  buscarPorRazonSocial(razonSocial: string): Observable<Contratista[]> {
    return this.buscarPorNombre(razonSocial);
  }

  buscarPorTermino(termino: string): Observable<Contratista[]> {
    return this.buscarPorNombre(termino);
  }

  buscarCombinado(tipo: 'nombre' | 'documento' | 'contrato', termino: string): Observable<Contratista[]> {
    switch (tipo) {
      case 'nombre': return this.buscarPorNombre(termino);
      case 'documento': return this.buscarPorDocumento(termino);
      case 'contrato': return this.buscarPorNumeroContrato(termino);
      default: return of([]);
    }
  }

  buscarAvanzado(filtros: FiltrosContratistaDto): Observable<{ contratistas: Contratista[]; total: number }> {
    return this.obtenerTodos(filtros).pipe(
      map(contratistas => ({ contratistas, total: contratistas.length }))
    );
  }

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(() => of({ status: 'error' }))
    );
  }

  subirDocumento(contratistaId: string, tipo: TipoDocumento, archivo: File): Observable<DocumentoContratista> {
    const headers = this.getFormDataHeaders();
    headers.delete('Content-Type');

    const formData = new FormData();
    formData.append('documento', archivo);
    formData.append('tipo', tipo);

    return this.http.post<any>(`${this.apiUrl}/${contratistaId}/documentos`, formData, { headers }).pipe(
      map(response => {
        if (response?.data?.data) {
          return response.data.data;
        }
        throw new Error('Error al subir documento');
      }),
      catchError(error => {
        console.error('❌ Error subiendo documento:', error);
        throw error;
      })
    );
  }

obtenerDocumentos(contratistaId: string): Observable<DocumentoContratista[]> {
  const headers = this.getAuthHeaders();
  return this.http.get<any>(`${this.apiUrl}/${contratistaId}/documentos`, { headers }).pipe(
    map(response => {
      console.log('📥 Respuesta de documentos - estructura completa:', response);
      
      // ✅ La respuesta tiene estructura: { ok: true, data: { success: true, data: [...] } }
      // O puede ser: { ok: true, data: [...] }
      
      // Caso 1: response.ok === true y response.data.data es un array
      if (response?.ok === true && response?.data?.data && Array.isArray(response.data.data)) {
        console.log('✅ Documentos encontrados en response.data.data:', response.data.data.length);
        return response.data.data;
      }
      
      // Caso 2: response.ok === true y response.data es un array
      if (response?.ok === true && response?.data && Array.isArray(response.data)) {
        console.log('✅ Documentos encontrados en response.data:', response.data.length);
        return response.data;
      }
      
      // Caso 3: response.data.data es un array
      if (response?.data?.data && Array.isArray(response.data.data)) {
        console.log('✅ Documentos encontrados en data.data:', response.data.data.length);
        return response.data.data;
      }
      
      // Caso 4: response.data es un array
      if (response?.data && Array.isArray(response.data)) {
        console.log('✅ Documentos encontrados en data:', response.data.length);
        return response.data;
      }
      
      // Caso 5: response es directamente un array
      if (Array.isArray(response)) {
        console.log('✅ Documentos encontrados en respuesta directa:', response.length);
        return response;
      }
      
      console.warn('⚠️ Estructura de respuesta no reconocida:', response);
      return [];
    }),
    catchError(error => {
      console.error('❌ Error obteniendo documentos:', error);
      return of([]);
    })
  );
}

  descargarTodosDocumentos(contratistaId: string): Observable<Blob> {
    const headers = this.getFormDataHeaders();
    console.log(`📦 Solicitando descarga de todos los documentos del contratista: ${contratistaId}`);

    // ✅ Agregar options para asegurar que el blob se maneje correctamente
    return this.http.get(`${this.apiUrl}/${contratistaId}/documentos/descargar-todos`, {
      headers,
      responseType: 'blob',
      observe: 'body' // Usar 'body' en lugar de 'response'
    }).pipe(
      map((blob: Blob) => {
        console.log(`📥 Blob recibido, tamaño: ${blob.size} bytes, tipo: ${blob.type}`);
        if (blob.size === 0) {
          throw new Error('El archivo ZIP está vacío');
        }
        return blob;
      }),
      catchError(error => {
        console.error('❌ Error descargando todos los documentos:', error);
        // Intentar leer el error si es un blob de error
        if (error.error instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result as string);
              console.error('Error del servidor:', errorData);
            } catch (e) {
              console.error('Error no parseable:', reader.result);
            }
          };
          reader.readAsText(error.error);
        }
        return throwError(() => error);
      })
    );
  }

  descargarDocumento(contratistaId: string, documentoId: string): Observable<Blob> {
    const headers = this.getFormDataHeaders();
    console.log(`📥 Descargando documento - Contratista: ${contratistaId}, Documento: ${documentoId}`);

    return this.http.get(`${this.apiUrl}/${contratistaId}/documentos/${documentoId}/descargar`, {
      headers,
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('❌ Error descargando documento:', error);
        throw error;
      })
    );
  }
}