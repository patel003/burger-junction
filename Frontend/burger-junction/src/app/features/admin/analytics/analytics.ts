import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface AnalyticsData {
  todaySales: number;
  monthlySales: number;
  averageOrderValue: number;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
 preparingOrders: number;
 outForDeliveryOrders: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnInit {

  private readonly apiUrl =
  `${environment.apiUrl}/admin/analytics`;

  analytics: AnalyticsData = {
    todaySales: 0,
    monthlySales: 0,
    averageOrderValue: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    preparingOrders: 0,
    outForDeliveryOrders: 0
  };

  loading = true;
  errorMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<AnalyticsData>(this.apiUrl).subscribe({
      next: (response) => {
        this.analytics = response;
        this.loading = false;
      },

      error: (error) => {
        this.loading = false;

        this.errorMessage =
          error?.error?.message ||
          'Unable to load analytics data.';
      }
    });
  }
}