import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CustomerService {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceService {

  private http = inject(HttpClient);

  private readonly apiUrl =
  `${environment.apiUrl}/admin/services/active`;

  getActiveServices(): Observable<CustomerService[]> {
    return this.http.get<CustomerService[]>(this.apiUrl);
  }
}