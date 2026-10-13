import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminCoupon {
  id: number;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CouponRequest {
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CouponAdminService {
  private http = inject(HttpClient);

  private readonly apiUrl =
  `${environment.apiUrl}/admin/coupons`;

  getAll(): Observable<AdminCoupon[]> {
    return this.http.get<AdminCoupon[]>(this.apiUrl);
  }

  getById(id: number): Observable<AdminCoupon> {
    return this.http.get<AdminCoupon>(
      `${this.apiUrl}/${id}`
    );
  }

  create(coupon: CouponRequest): Observable<AdminCoupon> {
    return this.http.post<AdminCoupon>(
      this.apiUrl,
      coupon
    );
  }

  update(
    id: number,
    coupon: CouponRequest
  ): Observable<AdminCoupon> {
    return this.http.put<AdminCoupon>(
      `${this.apiUrl}/${id}`,
      coupon
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}