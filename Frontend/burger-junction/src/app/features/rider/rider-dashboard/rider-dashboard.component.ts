import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  RiderSignalRService,
  RiderDeliveryAssignedEvent,
} from "../services/rider-signalr.service";

import {
  RiderService,
  RiderSummary,
  RiderOrder,
  RiderProfile,
} from "../../../core/services/rider.service";

import { RiderMapComponent } from "./rider-map.component";

@Component({
  selector: "app-rider-dashboard",
  standalone: true,
  imports: [CommonModule, RiderMapComponent],
  templateUrl: "./rider-dashboard.component.html",
  styleUrl: "./rider-dashboard.component.css",
})
export class RiderDashboardComponent implements OnInit {
  private riderService = inject(RiderService);
  private riderSignalR = inject(RiderSignalRService);

  // RIDER STATUS
  isOnline = false;

  // RIDER SUMMARY
  todayDeliveries = 0;
  todayCashCollected = 0;
  todayEarnings = 0;

  // LOADING / ERROR
  loading = false;
  availabilityLoading = false;
  errorMessage = "";

  // ACTIVE ORDERS
  activeOrders: RiderOrder[] = [];
  ordersLoading = false;
  actionLoading = false;

  // Jis order ko bade card me dikhana hai (rider tap karke badal sakta hai)
  selectedOrderId: number | null = null;

  // OTP
  otpLoading = false;
  otpMessage = "";
  otpValue = "";

  // LIVE LOCATION (ek hi GPS watcher rider ke saare Out for Delivery orders ke liye)
  isSharingLocation = false;
  locationError = "";

  readonly stepLabels = ["Accepted", "At shop", "Picked up", "Delivered"];

  get outForDeliveryIds(): number[] {
    return this.activeOrders
      .filter((order) => order.status?.toLowerCase() === "out for delivery")
      .map((order) => order.id);
  }

  // Bada "Current delivery" card isi order ka dikhta hai.
  get focusedOrder(): RiderOrder | null {
    return (
      this.activeOrders.find((order) => order.id === this.selectedOrderId) ??
      this.activeOrders[0] ??
      null
    );
  }

  // Baaki orders "Next up" list me
  get otherOrders(): RiderOrder[] {
    const focused = this.focusedOrder;
    return this.activeOrders.filter((order) => order.id !== focused?.id);
  }

  get canDeliver(): boolean {
    return /^\d{6}$/.test(this.otpValue);
  }

  // Progress bar: Accepted(0) -> At shop(1) -> Picked up(2) -> Delivered(3)
  stepIndex(order: RiderOrder): number {
    const status = order.status?.toLowerCase();

    if (status === "out for delivery") return 2;
    if (status === "ready for pickup") return 1;

    return 0;
  }

  // INIT
  ngOnInit(): void {
    this.loadProfile();
    this.loadSummary();
    this.loadActiveOrders();

    this.riderSignalR.startConnection();

    this.riderSignalR.deliveryAssigned$.subscribe(
      (event: RiderDeliveryAssignedEvent) => {
        console.log("New delivery assigned:", event);

        this.loadActiveOrders();
        this.loadSummary();
      },
    );
    this.riderSignalR.trackingErrors$.subscribe((message) => {
      this.locationError = message;
    });
  }

  // LOAD PROFILE
  loadProfile(): void {
    this.riderService.getProfile().subscribe({
      next: (response: RiderProfile) => {
        this.isOnline = response.isOnline;
      },

      error: (error) => {
        console.error("Rider profile loading failed:", error);
      },
    });
  }

  // LOAD SUMMARY
  loadSummary(): void {
    this.loading = true;
    this.errorMessage = "";

    this.riderService.getSummary().subscribe({
      next: (response: RiderSummary) => {
        this.todayDeliveries = response.todayDeliveries ?? 0;
        this.todayCashCollected = response.todayCashCollected ?? 0;
        this.todayEarnings = response.todayEarnings ?? 0;
        this.loading = false;
      },

      error: (error) => {
        console.error("Rider summary loading failed:", error);

        this.loading = false;
        this.errorMessage = "Unable to load rider summary.";
      },
    });
  }

  // TOGGLE ONLINE / OFFLINE
  toggleOnline(): void {
    if (this.availabilityLoading) {
      return;
    }

    const newStatus = !this.isOnline;

    this.availabilityLoading = true;

    this.riderService.updateAvailability(newStatus).subscribe({
      next: (response) => {
        this.isOnline = response.isOnline;
        this.availabilityLoading = false;
      },

      error: (error) => {
        console.error("Rider availability update failed:", error);

        this.availabilityLoading = false;

        this.errorMessage =
          error?.error?.message ?? "Unable to update availability.";
      },
    });
  }

  // LOAD ACTIVE ORDERS
  loadActiveOrders(): void {
    this.ordersLoading = true;

    this.riderService.getActiveOrders().subscribe({
      next: (response) => {
        this.activeOrders = response ?? [];
        this.ordersLoading = false;

        // Out for Delivery order hai to GPS sharing chalu, nahi hai to band.
        this.syncLocationSharing();
      },

      error: (error) => {
        console.error("Active rider orders loading failed:", error);
        this.activeOrders = [];
        this.ordersLoading = false;
      },
    });
  }

  // Next up list se kisi order par tap
  focusOrder(orderId: number): void {
    this.selectedOrderId = orderId;
    this.otpValue = "";
    this.otpMessage = "";
    this.errorMessage = "";
  }

  // PICKUP ORDER
  pickupOrder(order: RiderOrder): void {
    if (this.actionLoading) {
      return;
    }

    this.actionLoading = true;
    this.errorMessage = "";

    this.riderService.pickupOrder(order.id).subscribe({
      next: async () => {
        this.actionLoading = false;

        await this.startRiderTracking();

        this.loadActiveOrders();
        this.loadSummary();
      },
      error: (error) => {
        console.error("Pickup failed:", error);

        this.actionLoading = false;

        this.errorMessage =
          error?.error?.message ?? "Unable to mark order as picked up.";
      },
    });
  }

  // OTP input: sirf 6 digit number
  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.otpValue = input.value.replace(/\D/g, "").slice(0, 6);
    input.value = this.otpValue;
  }

  // DELIVER ORDER (OTP ab card ke andar bharte hain, browser popup nahi)
  deliverOrder(order: RiderOrder): void {
    if (this.actionLoading) {
      return;
    }

    if (!this.canDeliver) {
      this.errorMessage = "Please enter the 6-digit OTP from the customer.";
      return;
    }

    this.actionLoading = true;
    this.errorMessage = "";

    this.riderService.deliverOrder(order.id, this.otpValue).subscribe({
      next: () => {
        this.actionLoading = false;
        this.otpValue = "";
        this.otpMessage = "";

        // GPS sharing yahan band nahi karni: agar aur orders baaki hain to
        // sharing chalti rehni chahiye. loadActiveOrders() -> syncLocationSharing()
        // khud decide karega.
        this.loadActiveOrders();
        this.loadSummary();
      },

      error: (error) => {
        console.error("Delivery failed:", error);

        this.actionLoading = false;

        this.errorMessage =
          error?.error?.message ?? "Unable to mark order as delivered.";
      },
    });
  }

  // GENERATE DELIVERY OTP
  generateDeliveryOtp(orderId: number): void {
    if (this.otpLoading) {
      return;
    }

    this.otpLoading = true;
    this.otpMessage = "";
    this.errorMessage = "";

    this.riderService.generateDeliveryOtp(orderId).subscribe({
      next: (response) => {
        this.otpLoading = false;

        this.otpMessage =
          response?.message ?? "Delivery OTP generated successfully.";
      },

      error: (error) => {
        console.error("Delivery OTP generation failed:", error);

        this.otpLoading = false;

        this.otpMessage =
          error?.error?.message ?? "Unable to generate delivery OTP.";
      },
    });
  }

  // OPEN GOOGLE MAPS (pin ke coordinates ho to wahi, warna address)
  openInMaps(order: RiderOrder): void {
    window.open(this.riderService.getMapsUrl(order), "_blank");
  }

  // LIVE LOCATION SHARING
  private syncLocationSharing(): void {
    const hasActiveDelivery = this.outForDeliveryIds.length > 0;

    if (hasActiveDelivery && !this.isSharingLocation) {
      void this.startRiderTracking();
    }

    if (!hasActiveDelivery && this.isSharingLocation) {
      this.stopRiderTracking();
    }
  }

  async startRiderTracking(): Promise<void> {
    if (this.isSharingLocation) {
      return;
    }

    try {
      this.locationError = "";

      await this.riderSignalR.startLocationSharing();

      this.isSharingLocation = true;
    } catch (error) {
      console.error("Unable to start rider tracking:", error);

      this.isSharingLocation = false;
      this.locationError =
        "Live location start nahi ho payi. Browser GPS permission aur backend logs check karo.";
    }
  }

  stopRiderTracking(): void {
    this.riderSignalR.stopLocationSharing();
    this.isSharingLocation = false;
  }
}