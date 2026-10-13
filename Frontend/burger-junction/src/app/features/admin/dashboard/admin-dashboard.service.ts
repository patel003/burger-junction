import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminDashboard {
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  totalRevenue: number;

  revenueOverview: RevenueOverview[];
  orderStatus: OrderStatusSummary[];
  recentOrders: RecentOrder[];
  topSellingProducts: TopSellingProduct[];
  recentCustomers: RecentCustomer[];
}

export interface RevenueOverview {
  date: string;
  revenue: number;
}

export interface OrderStatusSummary {
  status: string;
  count: number;
}

export interface RecentOrder {
  orderId: number;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface TopSellingProduct {
  productId: number;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface RecentCustomer {
  userId: string;
  fullName: string;
  email: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {

  private http = inject(HttpClient);

 private readonly apiUrl =
  `${environment.apiUrl}/admin/dashboard`;

  getDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(this.apiUrl);
  }
}