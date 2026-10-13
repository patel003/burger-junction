import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { AdminOrder, OrdersAdminService } from "./orders-admin.service";
import { AdminRider, RiderAdminService } from "../riders/rider-admin.service";

@Component({
  selector: "app-admin-orders",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./orders.component.html",
  styleUrl: "./orders.component.css",
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrdersAdminService);
  private riderService = inject(RiderAdminService);

  // =========================
  // DATA
  // =========================

  orders: AdminOrder[] = [];

  filteredOrders: AdminOrder[] = [];

  // =========================
  // UI STATE
  // =========================

  loading = false;

  updatingStatus = false;

  errorMessage = "";

  successMessage = "";

  searchText = "";

  // =========================
  // PAGINATION
  // =========================

  currentPage = 1;

  pageSize = 10;

  // =========================
  // FILTER
  // =========================

  selectedStatus = "All";
  riders: AdminRider[] = [];

selectedRiderId: number | null = null;

loadingRiders = false;

assigningRider = false;

  readonly statuses = [
    "Pending",
    "Confirmed",
    "Preparing",
    "Ready for Pickup",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
  ];

  // =========================
  // ORDER DETAILS
  // =========================

  selectedOrder: AdminOrder | null = null;

  showDetailsModal = false;

  // =========================
  // INIT
  // =========================

  ngOnInit(): void {
  this.loadOrders();
  this.loadRiders();
}

  // =========================
  // LOAD ORDERS
  // =========================

  loadOrders(): void {
    this.loading = true;

    this.errorMessage = "";

    this.orderService.getAll().subscribe({
      next: (response) => {
        this.orders = response ?? [];

        this.currentPage = 1;

        this.applyFilters();

        this.loading = false;
      },

      error: (error) => {
        console.error("Orders loading failed:", error);

        this.loading = false;

        this.errorMessage =
          "Unable to load orders. Please check the backend API.";
      },
    });
  }

  loadRiders(): void {
  this.loadingRiders = true;

  this.riderService.getAll().subscribe({
    next: (response) => {
      this.riders = (response ?? []).filter(
        (rider) => rider.isActive
      );

      this.loadingRiders = false;
    },

    error: (error) => {
      console.error("Riders loading failed:", error);

      this.riders = [];
      this.loadingRiders = false;
    },
  });
}

  // =========================
  // SEARCH + FILTER
  // =========================

  applyFilters(): void {
    const search = this.searchText.trim().toLowerCase();

    this.filteredOrders = this.orders.filter((order) => {
      const matchesSearch =
        !search ||
        order.id.toString().includes(search) ||
        order.customerName.toLowerCase().includes(search) ||
        order.customerPhone.toLowerCase().includes(search);

      const matchesStatus =
        this.selectedStatus === "All" || order.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });

    // Make sure current page remains valid
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  // =========================
  // PAGINATION
  // =========================

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
  }

  get paginatedOrders(): AdminOrder[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;

    return this.filteredOrders.slice(startIndex, startIndex + this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // =========================
  // SEARCH
  // =========================

  searchOrders(): void {
    this.currentPage = 1;

    this.applyFilters();
  }

  // =========================
  // STATUS FILTER
  // =========================

  filterByStatus(): void {
    this.currentPage = 1;

    this.applyFilters();
  }

  // =========================
  // CLEAR SEARCH
  // =========================

  clearSearch(): void {
    this.searchText = "";

    this.currentPage = 1;

    this.applyFilters();
  }

  // =========================
  // OPEN DETAILS
  // =========================

  openDetails(order: AdminOrder): void {
    this.selectedOrder = order;

    this.showDetailsModal = true;

    this.clearMessages();
  }

  assignRider(): void {
  if (!this.selectedOrder || !this.selectedRiderId) {
    return;
  }

  if (this.assigningRider) {
    return;
  }

  this.assigningRider = true;
  this.clearMessages();

  this.orderService
    .assignRider(this.selectedOrder.id, this.selectedRiderId)
    .subscribe({
      next: (response) => {
        this.assigningRider = false;

        this.successMessage =
          response?.message ?? "Rider assigned successfully.";

        this.selectedRiderId = null;

        this.autoHideSuccess();
      },

      error: (error) => {
        console.error("Rider assignment failed:", error);

        this.assigningRider = false;

        this.errorMessage =
          error?.error?.message ?? "Unable to assign rider.";
      },
    });
}

  // =========================
  // CLOSE DETAILS
  // =========================

  closeDetails(): void {
    if (this.updatingStatus) {
      return;
    }

    this.showDetailsModal = false;

    this.selectedOrder = null;
  }

  // =========================
  // UPDATE STATUS
  // =========================

  updateOrderStatus(order: AdminOrder, status: string): void {
    if (!status) {
      return;
    }

    if (this.updatingStatus) {
      return;
    }

    if (order.status === status) {
      return;
    }

    this.updatingStatus = true;

    this.clearMessages();

    this.orderService.updateStatus(order.id, status).subscribe({
      next: () => {
        order.status = status;

        if (this.selectedOrder && this.selectedOrder.id === order.id) {
          this.selectedOrder.status = status;
        }

        this.updatingStatus = false;

        this.successMessage = `Order #${order.id} status updated to ${status}.`;

        this.applyFilters();

        this.autoHideSuccess();
      },

      error: (error) => {
        console.error("Order status update failed:", error);

        this.updatingStatus = false;

        this.errorMessage =
          error?.error?.message ?? "Unable to update order status.";
      },
    });
  }

  // =========================
  // STATUS CLASS
  // =========================

  getStatusClass(status: string): string {
    switch (status) {
      case "Pending":
        return "pending";

      case "Confirmed":
        return "confirmed";

      case "Preparing":
        return "preparing";

      case "Ready for Pickup":
        return "ready-for-pickup";

      case "Out for Delivery":
        return "out-for-delivery";

      case "Delivered":
        return "delivered";

      case "Cancelled":
        return "cancelled";

      default:
        return "default";
    }
  }

  getAvailableStatuses(order: AdminOrder | null): string[] {
    if (!order) {
      return [];
    }

    switch (order.status) {
      case "Pending":
        return ["Confirmed", "Cancelled"];

      case "Confirmed":
        return ["Preparing", "Cancelled"];

      case "Preparing":
        return ["Ready for Pickup", "Cancelled"];

      case "Ready for Pickup":
        return ["Out for Delivery"];
        
      case "Out for Delivery":
        return ["Delivered"];

      case "Delivered":
        return [];

      case "Cancelled":
        return [];

      default:
        return [];
    }
  }

  // =========================
  // FORMAT DATE
  // =========================

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // =========================
  // FORMAT TIME
  // =========================

  formatTime(date: string): string {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // =========================
  // TOTAL ITEMS
  // =========================

  getTotalItems(order: AdminOrder): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  // =========================
  // CLEAR MESSAGES
  // =========================

  clearMessages(): void {
    this.errorMessage = "";

    this.successMessage = "";
  }

  // =========================
  // AUTO HIDE SUCCESS
  // =========================

  private autoHideSuccess(): void {
    setTimeout(() => {
      this.successMessage = "";
    }, 3000);
  }

  // =========================
  // SUBTOTAL
  // =========================

  getSubtotal(order: AdminOrder): number {
    return order.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  }
}
