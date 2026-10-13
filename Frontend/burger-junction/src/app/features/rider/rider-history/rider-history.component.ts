import {
  Component,
  OnInit,
  inject,
} from "@angular/core";

import { CommonModule } from "@angular/common";

import {
  RiderService,
  RiderOrder,
} from "../../../core/services/rider.service";

@Component({
  selector: "app-rider-history",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./rider-history.component.html",
  styleUrl: "./rider-history.component.css",
})
export class RiderHistoryComponent
  implements OnInit
{
  private riderService = inject(RiderService);

  orders: RiderOrder[] = [];

  loading = false;

  errorMessage = "";

  totalDeliveries = 0;

  totalCashCollected = 0;

  totalEarnings = 0;

  ngOnInit(): void {
    this.loadHistory();
  }

  /* =========================
     LOAD HISTORY
  ========================= */

  loadHistory(): void {
    this.loading = true;
    this.errorMessage = "";

    this.riderService.getOrderHistory().subscribe({
      next: (response) => {
        this.orders = response ?? [];

        /* =========================
           TOTAL DELIVERIES
        ========================= */

        this.totalDeliveries =
          this.orders.filter(
            (order) =>
              order.status.toLowerCase() ===
              "delivered",
          ).length;

        /* =========================
           CASH COLLECTED
           
           After delivery, backend
           may return cashDue = 0
           because payment is Paid.

           Therefore for history:
           
           COD + Paid
           => Order Amount is collected.
        ========================= */

        this.totalCashCollected =
          this.orders.reduce(
            (total, order) => {
              const paymentMethod =
                (order.paymentMethod ?? "")
                  .trim()
                  .toLowerCase();

              const paymentStatus =
                (order.paymentStatus ?? "")
                  .trim()
                  .toLowerCase();

              const isCod =
                paymentMethod ===
                "cash on delivery";

              const isPaid =
                paymentStatus === "paid";

              if (isCod && isPaid) {
                return (
                  total +
                  (order.totalAmount ?? 0)
                );
              }

              return total;
            },
            0,
          );

        /* =========================
           TOTAL RIDER EARNINGS
        ========================= */

        this.totalEarnings =
          this.orders.reduce(
            (total, order) =>
              total +
              (order.riderEarning ?? 0),
            0,
          );

        this.loading = false;
      },

      error: (error) => {
        console.error(
          "Rider history loading failed:",
          error,
        );

        this.orders = [];

        this.totalDeliveries = 0;
        this.totalCashCollected = 0;
        this.totalEarnings = 0;

        this.loading = false;

        this.errorMessage =
          error?.error?.message ??
          "Unable to load delivery history.";
      },
    });
  }
}