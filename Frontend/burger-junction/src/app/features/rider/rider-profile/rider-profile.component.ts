import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import {
  RiderService,
  RiderProfile,
} from "../../../core/services/rider.service";

@Component({
  selector: "app-rider-profile",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./rider-profile.component.html",
  styleUrl: "./rider-profile.component.css",
})
export class RiderProfileComponent implements OnInit {
  private riderService = inject(RiderService);
  private router = inject(Router);

  profile: RiderProfile | null = null;
  loading = false;
  errorMessage = "";

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = "";

    this.riderService.getProfile().subscribe({
      next: (response) => {
        this.profile = response;
        this.loading = false;
      },
      error: (error) => {
        console.error("Rider profile loading failed:", error);

        this.profile = null;
        this.loading = false;
        this.errorMessage =
          error?.error?.message ?? "Unable to load rider profile.";
      },
    });
  }

  goToActive(): void {
    this.router.navigate(["/rider"]);
  }
}