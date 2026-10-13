import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";

import {
  AdminRider,
  RiderAdminService,
} from "./rider-admin.service";

@Component({
  selector: "app-admin-riders",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./riders.component.html",
  styleUrl: "./riders.component.css",
})
export class RidersComponent implements OnInit {
  private riderService = inject(RiderAdminService);

  riders: AdminRider[] = [];

  loading = false;
  saving = false;
  earningSaving = false;

  errorMessage = "";
  successMessage = "";

  searchText = "";

  showRiderModal = false;
  showEarningModal = false;

  // =========================
  // CREATE RIDER FORM
  // =========================

  fullName = "";
  email = "";
  phoneNumber = "";
  password = "";
  vehicleNumber = "";
  earningPerDelivery = 0;

  // =========================
  // EDIT EARNING
  // =========================

  selectedRider: AdminRider | null = null;
  editEarningPerDelivery = 0;

  ngOnInit(): void {
    this.loadRiders();
  }

  // =========================
  // LOAD RIDERS
  // =========================

  loadRiders(): void {
    this.loading = true;
    this.errorMessage = "";

    this.riderService.getAll().subscribe({
      next: (response) => {
        this.riders = response ?? [];
        this.loading = false;
      },

      error: (error) => {
        console.error("Riders loading failed:", error);

        this.loading = false;

        this.errorMessage =
          error?.error?.message ??
          "Unable to load riders.";
      },
    });
  }

  // =========================
  // SEARCH
  // =========================

  get filteredRiders(): AdminRider[] {
    const search = this.searchText.trim().toLowerCase();

    if (!search) {
      return this.riders;
    }

    return this.riders.filter(
      (rider) =>
        rider.name.toLowerCase().includes(search) ||
        rider.email.toLowerCase().includes(search) ||
        rider.phoneNumber.includes(search) ||
        rider.vehicleNumber.toLowerCase().includes(search),
    );
  }

  // =========================
  // CREATE MODAL
  // =========================

  openCreateModal(): void {
    this.resetForm();
    this.showRiderModal = true;
  }

  closeCreateModal(): void {
    if (this.saving) {
      return;
    }

    this.showRiderModal = false;
    this.resetForm();
  }

  // =========================
  // CREATE RIDER
  // =========================

  createRider(): void {
    if (this.saving) {
      return;
    }

    if (
      !this.fullName.trim() ||
      !this.email.trim() ||
      !this.phoneNumber.trim() ||
      !this.password.trim()
    ) {
      this.errorMessage =
        "Please fill all required fields.";

      return;
    }

    if (this.earningPerDelivery < 0) {
      this.errorMessage =
        "Earning per delivery cannot be negative.";

      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.riderService
      .create({
        fullName: this.fullName.trim(),
        email: this.email.trim(),
        phoneNumber: this.phoneNumber.trim(),
        password: this.password,
        vehicleNumber: this.vehicleNumber.trim(),
        earningPerDelivery: Number(
          this.earningPerDelivery,
        ),
      })
      .subscribe({
        next: (response) => {
          this.saving = false;

          this.successMessage =
            response?.message ??
            "Rider created successfully.";

          this.showRiderModal = false;

          this.resetForm();

          this.loadRiders();
        },

        error: (error) => {
          console.error(
            "Rider creation failed:",
            error,
          );

          this.saving = false;

          this.errorMessage =
            error?.error?.message ??
            "Unable to create rider.";
        },
      });
  }

  // =========================
  // STATUS
  // =========================

  toggleStatus(rider: AdminRider): void {
    const newStatus = !rider.isActive;

    this.riderService
      .updateStatus(rider.id, newStatus)
      .subscribe({
        next: () => {
          rider.isActive = newStatus;

          if (!newStatus) {
            rider.isOnline = false;
          }

          this.successMessage = newStatus
            ? "Rider activated successfully."
            : "Rider deactivated successfully.";
        },

        error: (error) => {
          console.error(
            "Rider status update failed:",
            error,
          );

          this.errorMessage =
            error?.error?.message ??
            "Unable to update rider status.";
        },
      });
  }

  // =========================
  // OPEN EARNING MODAL
  // =========================

  openEarningModal(rider: AdminRider): void {
    this.selectedRider = rider;

    this.editEarningPerDelivery =
      Number(rider.earningPerDelivery ?? 0);

    this.errorMessage = "";

    this.showEarningModal = true;
  }

  // =========================
  // CLOSE EARNING MODAL
  // =========================

  closeEarningModal(): void {
    if (this.earningSaving) {
      return;
    }

    this.showEarningModal = false;

    this.selectedRider = null;

    this.editEarningPerDelivery = 0;
  }

  // =========================
  // UPDATE EARNING RATE
  // =========================

  updateEarningRate(): void {
    if (this.earningSaving) {
      return;
    }

    if (!this.selectedRider) {
      return;
    }

    if (this.editEarningPerDelivery < 0) {
      this.errorMessage =
        "Earning per delivery cannot be negative.";

      return;
    }

    this.earningSaving = true;

    this.errorMessage = "";
    this.successMessage = "";

    this.riderService
      .updateEarningRate(
        this.selectedRider.id,
        Number(this.editEarningPerDelivery),
      )
      .subscribe({
        next: (response) => {
          this.earningSaving = false;

          this.selectedRider!.earningPerDelivery =
            Number(this.editEarningPerDelivery);

          this.successMessage =
            response?.message ??
            "Rider earning updated successfully.";

          this.showEarningModal = false;

          this.selectedRider = null;
        },

        error: (error) => {
          console.error(
            "Rider earning update failed:",
            error,
          );

          this.earningSaving = false;

          this.errorMessage =
            error?.error?.message ??
            "Unable to update rider earning.";
        },
      });
  }

  // =========================
  // RESET CREATE FORM
  // =========================

  private resetForm(): void {
    this.fullName = "";
    this.email = "";
    this.phoneNumber = "";
    this.password = "";
    this.vehicleNumber = "";
    this.earningPerDelivery = 0;
  }
}