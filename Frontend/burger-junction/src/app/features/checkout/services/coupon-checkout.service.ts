import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ApplyCouponRequest {
  code: string;
  orderAmount: number;
}

export interface CouponApplyResult {
  isValid: boolean;
  message: string;
  code: string;
  discountType: string;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class CouponCheckoutService {

  private http = inject(HttpClient);

  private readonly apiUrl =
  `${environment.apiUrl}/admin/coupons/apply`;

  applyCoupon(
    request: ApplyCouponRequest
  ): Observable<CouponApplyResult> {

    return this.http.post<CouponApplyResult>(
      this.apiUrl,
      request
    );
  }
}