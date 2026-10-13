import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router";

import { AuthService } from "../auth/services/auth.service";

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./profile.html",
  styleUrl: "./profile.css",
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  get userName(): string {
    return this.authService.getUserName() || "User";
  }

  get userEmail(): string {
    return this.authService.getUserEmail() || "Not provided";
  }

  get userPhone(): string {
    return this.authService.getUserPhone() || "Not provided";
  }

  get userRole(): string {
    return this.authService.getUserRole() || "Customer";
  }

  get userInitial(): string {
    return this.userName.charAt(0).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(["/login"]);
  }
}