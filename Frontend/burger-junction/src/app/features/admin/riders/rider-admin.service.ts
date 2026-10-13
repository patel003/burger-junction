import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

/* =========================
   ADMIN RIDER
========================= */

export interface AdminRider {
  id: number;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  vehicleNumber: string;

  isActive: boolean;
  isOnline: boolean;

  earningPerDelivery: number;

  createdAt: string;
}

/* =========================
   CREATE RIDER REQUEST
========================= */

export interface CreateRiderRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  vehicleNumber: string;

  earningPerDelivery: number;
}

/* =========================
   UPDATE EARNING REQUEST
========================= */

export interface UpdateRiderEarningRequest {
  earningPerDelivery: number;
}

@Injectable({
  providedIn: "root",
})
export class RiderAdminService {
  private http = inject(HttpClient);

  private readonly baseUrl =
    `${environment.apiUrl}/admin/riders`;

  /* =========================
     GET ALL RIDERS
  ========================= */

  getAll(): Observable<AdminRider[]> {
    return this.http.get<AdminRider[]>(
      this.baseUrl,
    );
  }

  /* =========================
     CREATE RIDER
  ========================= */

  create(
    request: CreateRiderRequest,
  ): Observable<any> {
    return this.http.post(
      this.baseUrl,
      request,
    );
  }

  /* =========================
     UPDATE RIDER STATUS
  ========================= */

  updateStatus(
    id: number,
    isActive: boolean,
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/${id}/status`,
      {
        isActive,
      },
    );
  }

  /* =========================
     UPDATE EARNING RATE
  ========================= */

  updateEarningRate(
    id: number,
    earningPerDelivery: number,
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/${id}/earning-rate`,
      {
        earningPerDelivery,
      },
    );
  }
}