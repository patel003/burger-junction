import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;

  riderName: string | null;
  riderPhone: string | null;

  // Order amount after coupon discount
  totalAmount: number;

  // Coupon details
  couponCode?: string;
  discountAmount: number;

  status: string;
  createdAt: string;

  // Payment details
  paymentMethod: string | null;
  paymentStatus: string | null;

  items: OrderItem[];
}

@Injectable({
  providedIn: "root",
})
export class OrdersService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/orders`;

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/my-orders`);
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }
}
