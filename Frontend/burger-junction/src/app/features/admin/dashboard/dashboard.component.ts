import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDashboardService, AdminDashboard } from './admin-dashboard.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  private dashboardService = inject(AdminDashboardService);
dashboard: AdminDashboard = {
  totalOrders: 0,
  totalProducts: 0,
  totalCustomers: 0,
  totalRevenue: 0,

  revenueOverview: [],
  orderStatus: [],
  recentOrders: [],
  topSellingProducts: [],
  recentCustomers: []
};

  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dashboardService.getDashboard().subscribe({
      next: (response) => {
        this.dashboard = response;
        this.loading = false;

        console.log('Admin Dashboard:', response);
      },
      error: (error) => {
        console.error('Dashboard API Error:', error);

        this.loading = false;
        this.errorMessage = 'Unable to load dashboard data.';
      }
    });
  }

    // =========================
  // DASHBOARD HELPERS
  // =========================

  getRevenueMax(): number {
    const max = Math.max(
      ...this.dashboard.revenueOverview.map(item => item.revenue),
      0
    );

    return max || 1;
  }

  getRevenueHeight(revenue: number): string {
    const max = this.getRevenueMax();

    if (revenue <= 0) {
      return '4%';
    }

    const percentage = (revenue / max) * 100;

    return `${Math.max(percentage, 8)}%`;
  }

  getTotalStatusCount(): number {
    return this.dashboard.orderStatus.reduce(
      (total, item) => total + item.count,
      0
    );
  }

  getStatusPercentage(count: number): number {
    const total = this.getTotalStatusCount();

    if (!total) {
      return 0;
    }

    return Math.round((count / total) * 100);
  }

  getStatusClass(status: string): string {
    return status
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

  getCustomerInitials(fullName: string): string {
    const parts = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return 'C';
    }

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  formatDashboardDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  }

  formatOrderDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}