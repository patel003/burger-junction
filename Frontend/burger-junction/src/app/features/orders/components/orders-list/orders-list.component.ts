import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { OrdersService, Order } from "../../services/orders.service";

@Component({
  selector: "app-orders-list",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./orders-list.component.html",
  styleUrl: "./orders-list.component.css",
})
export class OrdersListComponent {
  private ordersService = inject(OrdersService);

  orders: Order[] = [];

  loading = false;
  errorMessage = "";

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMessage = "";

    this.ordersService.getMyOrders().subscribe({
      next: (response) => {
        this.orders = response;
        this.loading = false;

        console.log("My Orders:", response);
      },

      error: (error) => {
        console.error("Failed to load orders:", error);

        this.loading = false;

        if (error.status === 401) {
          this.errorMessage = "Please login to view your orders.";
        } else {
          this.errorMessage = "Unable to load your orders. Please try again.";
        }
      },
    });
  }

  getStatusIndex(status: string): number {
    const currentStatus = status.trim().toLowerCase();

    switch (currentStatus) {
      case "pending":
        return 0;

      case "confirmed":
        return 1;

      case "preparing":
      case "ready for pickup":
        return 2;

      case "out for delivery":
        return 3;

      case "delivered":
      case "completed":
        return 4;

      default:
        return 0;
    }
  }

  isStatusCompleted(status: string, stepIndex: number): boolean {
    return this.getStatusIndex(status) >= stepIndex;
  }

  isCurrentStatus(status: string, stepIndex: number): boolean {
    return this.getStatusIndex(status) === stepIndex;
  }
}
