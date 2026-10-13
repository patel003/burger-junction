import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

/* =========================
   RIDER SUMMARY
========================= */

export interface RiderSummary {
  todayDeliveries: number;
  todayCashCollected: number;
  todayEarnings: number;
  totalEarnings?: number;
}

/* =========================
   RIDER PROFILE
========================= */

export interface RiderProfile {
  fullName: string;
  phoneNumber: string;
  vehicleNumber: string;

  earningPerDelivery?: number;

  isActive: boolean;
  isOnline: boolean;
}

/* =========================
   AVAILABILITY
========================= */

export interface RiderAvailabilityResponse {
  message: string;
  isOnline: boolean;
}

/* =========================
   ORDER ITEM
========================= */

export interface RiderOrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

/* =========================
   RIDER ORDER
========================= */

export interface RiderOrder {
  id: number;

  customerName: string;
  customerPhone: string;
  deliveryAddress: string;

  /*
   * Customer delivery location.
   * Null ho sakta hai (purane orders / agar checkout par
   * coordinates save nahi hue). Us case me address text
   * se Maps khulta hai.
   */
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;

  totalAmount: number;

  status: string;

  createdAt: string;

  assignedAt: string | null;
  pickedUpAt: string | null;

  paymentMethod: string;
  paymentStatus: string;

  cashDue: number;

  /*
   * Rider earning for this particular order.
   *
   * This value is snapshotted when the order
   * is successfully delivered.
   */
  riderEarning: number;

  items: RiderOrderItem[];
}

@Injectable({
  providedIn: "root",
})
export class RiderService {
  private http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/rider`;

  /* =========================
     SUMMARY
  ========================= */

  getSummary(): Observable<RiderSummary> {
    return this.http.get<RiderSummary>(
      `${this.apiUrl}/summary`,
    );
  }

  /* =========================
     PROFILE
  ========================= */

  getProfile(): Observable<RiderProfile> {
    return this.http.get<RiderProfile>(
      `${this.apiUrl}/profile`,
    );
  }

  /* =========================
     AVAILABILITY
  ========================= */

  updateAvailability(
    isOnline: boolean,
  ): Observable<RiderAvailabilityResponse> {
    return this.http.put<RiderAvailabilityResponse>(
      `${this.apiUrl}/availability`,
      {
        isOnline,
      },
    );
  }

  /* =========================
     ACTIVE ORDERS
  ========================= */

  getActiveOrders(): Observable<RiderOrder[]> {
    return this.http.get<RiderOrder[]>(
      `${this.apiUrl}/orders`,
    );
  }

  /* =========================
     PICKUP
  ========================= */

  pickupOrder(
    orderId: number,
  ): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/orders/${orderId}/pickup`,
      {},
    );
  }

  /* =========================
     DELIVER
  ========================= */

  deliverOrder(
    orderId: number,
    otp: string,
  ): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/orders/${orderId}/deliver`,
      {
        otp,
      },
    );
  }

  /* =========================
     GENERATE OTP
  ========================= */

  generateDeliveryOtp(
    orderId: number,
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/orders/${orderId}/generate-otp`,
      {},
    );
  }

  /* =========================
     HISTORY
  ========================= */

  getOrderHistory(): Observable<RiderOrder[]> {
    return this.http.get<RiderOrder[]>(
      `${this.apiUrl}/orders/history`,
    );
  }

  /* =========================
     OPEN IN MAPS
     Coordinates ho to wahi use hote hain (zyada accurate),
     warna address text par fallback.
  ========================= */

  getMapsUrl(order: RiderOrder): string {
    if (
      order.deliveryLatitude != null &&
      order.deliveryLongitude != null
    ) {
      return `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLatitude},${order.deliveryLongitude}`;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}`;
  }
}