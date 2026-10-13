import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminProduct {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  isVeg: boolean;
}

export interface ProductRequest {
  categoryId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProductAdminService {

  private http = inject(HttpClient);

 private readonly apiUrl =
  `${environment.apiUrl}/products`;

  // =========================
  // GET ALL
  // =========================

  getAll(): Observable<AdminProduct[]> {
    return this.http.get<AdminProduct[]>(
      this.apiUrl
    );
  }

  // =========================
  // CREATE
  // =========================

  create(
    product: ProductRequest
  ): Observable<AdminProduct> {

    return this.http.post<AdminProduct>(
      this.apiUrl,
      product
    );
  }

  // =========================
  // UPDATE
  // =========================

  update(
    id: number,
    product: ProductRequest
  ): Observable<AdminProduct> {

    return this.http.put<AdminProduct>(
      `${this.apiUrl}/${id}`,
      product
    );
  }

  // =========================
  // DELETE
  // =========================

  delete(id: number): Observable<void> {

    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}