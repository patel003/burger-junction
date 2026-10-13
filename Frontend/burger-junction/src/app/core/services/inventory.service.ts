import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InventoryProduct {
  id: number;
  name: string;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  stockStatus: string;
}

export interface UpdateStockRequest {
  stockQuantity: number;
  lowStockThreshold: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  private http = inject(HttpClient);

  private readonly apiUrl =
  `${environment.apiUrl}/admin/inventory`;

  getAll(): Observable<InventoryProduct[]> {
    return this.http.get<InventoryProduct[]>(this.apiUrl);
  }

  getById(id: number): Observable<InventoryProduct> {
    return this.http.get<InventoryProduct>(
      `${this.apiUrl}/${id}`
    );
  }

  updateStock(
    id: number,
    data: UpdateStockRequest
  ): Observable<InventoryProduct> {
    return this.http.put<InventoryProduct>(
      `${this.apiUrl}/${id}/stock`,
      data
    );
  }
}