import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Contratista } from '../models/contratista.model';

@Injectable({
  providedIn: 'root'
})
export class ContratistasService {
  private apiUrl = `${environment.apiUrl}/contratistas`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  buscarPorDocumento(documento: string): Observable<Contratista> {
    return this.http.get<Contratista>(`${this.apiUrl}/documento/${documento}`, {
      headers: this.getAuthHeaders()
    });
  }

  buscarPorNombre(nombre: string): Observable<Contratista[]> {
    return this.http.get<Contratista[]>(`${this.apiUrl}/buscar/${nombre}`, {
      headers: this.getAuthHeaders()
    });
  }

  crearContratista(contratista: Partial<Contratista>): Observable<Contratista> {
    return this.http.post<Contratista>(this.apiUrl, contratista, {
      headers: this.getAuthHeaders()
    });
  }
}