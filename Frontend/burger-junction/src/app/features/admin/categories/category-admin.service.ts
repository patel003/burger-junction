import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';   

export interface AdminCategory {
  id: number;
  name: string;
  productCount: number;
  isActive: boolean;
}

export interface CategoryRequest {
  name: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryAdminService {

  private http = inject(HttpClient);

  private readonly apiUrl =
  `${environment.apiUrl}/categories`;
  // =========================
  // GET ALL
  // =========================

  getAll(): Observable<AdminCategory[]> {
    return this.http.get<AdminCategory[]>(
      this.apiUrl
    );
  }

  // =========================
  // CREATE
  // =========================

  create(
    category: CategoryRequest
  ): Observable<AdminCategory> {

    return this.http.post<AdminCategory>(
      this.apiUrl,
      category
    );
  }

  // =========================
  // UPDATE
  // =========================

  update(
    id: number,
    category: CategoryRequest
  ): Observable<AdminCategory> {

    return this.http.put<AdminCategory>(
      `${this.apiUrl}/${id}`,
      category
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