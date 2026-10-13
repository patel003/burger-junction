import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface AdminOrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface AdminOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;

  // Final amount after discount
  totalAmount: number;

  // Coupon details
  couponCode?: string;
  discountAmount: number;

  status: string;
  createdAt: string;

  // Payment details
  paymentMethod: string | null;
  paymentStatus: string | null;

  items: AdminOrderItem[];
}

@Injectable({
  providedIn: "root",
})
export class OrdersAdminService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/orders`;

  // =========================
  // GET ALL ORDERS
  // =========================

  getAll(): Observable<AdminOrder[]> {
    return this.http.get<AdminOrder[]>(this.apiUrl);
  }

  // =========================
  // GET SINGLE ORDER
  // =========================

  getById(id: number): Observable<AdminOrder> {
    return this.http.get<AdminOrder>(`${this.apiUrl}/${id}`);
  }

  // =========================
  // UPDATE STATUS
  // =========================

  updateStatus(id: number, status: string): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}/${id}/status`,
      JSON.stringify(status),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  // =========================
  // UPDATE PAYMENT STATUS
  // =========================

  updatePaymentStatus(paymentId: number, status: string): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/payments/${paymentId}/status`,
      JSON.stringify(status),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  assignRider(orderId: number, riderId: number): Observable<any> {
    return this.http.put(
      `${environment.apiUrl}/admin/orders/${orderId}/assign-rider`,
      { riderId },
    );
  }
}
