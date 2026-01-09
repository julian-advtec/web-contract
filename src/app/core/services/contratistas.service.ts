// src/app/core/services/contratistas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Contratista } from '../models/contratista.model';

@Injectable({
  providedIn: 'root'
})
export class ContratistasService {
  private apiUrl = `${environment.apiUrl}/contratistas`;
  private contratistasCache: Contratista[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });
  }

  // ✅ Método para obtener todos los contratistas
  obtenerTodos(): Observable<Contratista[]> {
    const now = Date.now();
    // Usar cache si está fresco
    if (this.contratistasCache.length > 0 && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return of(this.contratistasCache);
    }

    return this.http.get<Contratista[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(contratistas => {
        this.contratistasCache = contratistas;
        this.cacheTimestamp = now;
        console.log('📋 Contratistas cargados:', contratistas.length);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo contratistas:', error);
        // Si hay cache, devolverlo aunque sea viejo
        if (this.contratistasCache.length > 0) {
          return of(this.contratistasCache);
        }
        return of([]);
      })
    );
  }

  buscarPorDocumento(documento: string): Observable<Contratista | null> {
    if (!documento || documento.trim().length < 2) {
      return of(null);
    }

    // Buscar primero en cache
    const encontradoEnCache = this.contratistasCache.find(c => 
      c.documentoIdentidad === documento
    );
    
    if (encontradoEnCache) {
      return of(encontradoEnCache);
    }

    return this.http.get<Contratista>(`${this.apiUrl}/documento/${documento}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(() => of(null))
    );
  }

  buscarPorNombre(nombre: string): Observable<Contratista[]> {
    if (!nombre || nombre.trim().length < 2) {
      return of([]);
    }

    // Buscar primero en cache
    const termino = nombre.toLowerCase();
    const encontradosEnCache = this.contratistasCache.filter(c => 
      c.nombreCompleto.toLowerCase().includes(termino)
    );
    
    if (encontradosEnCache.length > 0) {
      return of(encontradosEnCache);
    }

    return this.http.get<Contratista[]>(`${this.apiUrl}/buscar/${nombre}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(() => of([]))
    );
  }

  crearContratista(contratista: Partial<Contratista>): Observable<Contratista> {
    return this.http.post<Contratista>(this.apiUrl, contratista, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(nuevoContratista => {
        // Agregar al cache
        this.contratistasCache.push(nuevoContratista);
        console.log('✅ Contratista creado y agregado al cache');
      })
    );
  }

  // ✅ Método para buscar por cualquier término (nombre o documento)
  buscarPorTermino(termino: string): Observable<Contratista[]> {
    if (!termino || termino.trim().length < 2) {
      return of([]);
    }

    const terminoLower = termino.toLowerCase();
    
    // Buscar en cache
    const encontradosEnCache = this.contratistasCache.filter(c => 
      c.nombreCompleto.toLowerCase().includes(terminoLower) ||
      c.documentoIdentidad.includes(termino)
    );
    
    if (encontradosEnCache.length > 0) {
      return of(encontradosEnCache);
    }

    // Si no hay en cache, buscar en el backend
    return this.http.get<Contratista[]>(`${this.apiUrl}/buscar/${termino}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(() => of([]))
    );
  }

  // ✅ Limpiar cache
  limpiarCache(): void {
    this.contratistasCache = [];
    this.cacheTimestamp = 0;
  }

  // ✅ Verificar si un documento ya existe
  verificarDocumentoExistente(documento: string): Observable<boolean> {
    return this.buscarPorDocumento(documento).pipe(
      map(contratista => contratista !== null)
    );
  }
}