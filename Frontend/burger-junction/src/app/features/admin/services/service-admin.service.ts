import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminService {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceRequest {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceAdminService {

  private http = inject(HttpClient);

 private readonly apiUrl =
  `${environment.apiUrl}/admin/services`;

  getAll(): Observable<AdminService[]> {
    return this.http.get<AdminService[]>(this.apiUrl);
  }

  getById(id: number): Observable<AdminService> {
    return this.http.get<AdminService>(
      `${this.apiUrl}/${id}`
    );
  }

  create(service: ServiceRequest): Observable<AdminService> {
    return this.http.post<AdminService>(
      this.apiUrl,
      service
    );
  }

  update(
    id: number,
    service: ServiceRequest
  ): Observable<AdminService> {
    return this.http.put<AdminService>(
      `${this.apiUrl}/${id}`,
      service
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}