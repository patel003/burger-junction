import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreatePaymentRequest {
  orderId: number;
  paymentMethod: string;
}

export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export interface RazorpayOrderResponse {
  orderId: number;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private http = inject(HttpClient);

private readonly apiUrl =
  `${environment.apiUrl}/payments`;

  // -----------------------------
  // COD / Normal Payment
  // -----------------------------
  createPayment(
    request: CreatePaymentRequest
  ): Observable<Payment> {

    return this.http.post<Payment>(
      this.apiUrl,
      request
    );
  }

  // -----------------------------
  // Get Payment By Order
  // -----------------------------
  getPaymentByOrderId(
    orderId: number
  ): Observable<Payment> {

    return this.http.get<Payment>(
      `${this.apiUrl}/order/${orderId}`
    );
  }

  // -----------------------------
  // Create Razorpay Order
  // -----------------------------
  createRazorpayOrder(
    orderId: number
  ): Observable<RazorpayOrderResponse> {

    return this.http.post<RazorpayOrderResponse>(
      `${this.apiUrl}/razorpay/order`,
      orderId
    );
  }



  verifyRazorpayPayment(request: {
        orderId: number;
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
   }) {
            return this.http.post<{
              message: string;
              payment: Payment;
                 }>(
                   `${this.apiUrl}/razorpay/verify`,
                   request
                 );
   }
} 