import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Category, Product, Order, Coupon } from "../models/models";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`);
  }

  getProducts(categoryId?: number): Observable<Product[]> {
    const url = categoryId
      ? `${this.baseUrl}/products/category/${categoryId}`
      : `${this.baseUrl}/products`;
    return this.http.get<Product[]>(url);
  }

  getCustomerProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products/menu`);
  }

  getCustomerProductsByCategory(categoryId: number): Observable<Product[]> {
    return this.http.get<Product[]>(
      `${this.baseUrl}/products/menu/category/${categoryId}`,
    );
  }

  createOrder(payload: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    items: { productId: number; quantity: number }[];
    couponCode?: string;
  }): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, payload);
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders`);
  }

  getActiveCoupons(): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(`${this.baseUrl}/coupons/active`);
  }

  /* ---------- Forgot / Reset password ---------- */

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/auth/forgot-password`,
      { email },
    );
  }

  resetPassword(payload: {
    email: string;
    token: string;
    newPassword: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/auth/reset-password`,
      payload,
    );
  }
}