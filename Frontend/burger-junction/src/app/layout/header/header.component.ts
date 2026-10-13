import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from "../../features/auth/services/auth.service";
import { NotificationBell } from "../../core/components/notification-bell/notification-bell";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NotificationBell],
  templateUrl: "./header.component.html",
  styleUrl: "./header.component.css",
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  dropdownOpen = false;

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get userName(): string {
    return this.authService.getUserName() || "User";
  }

  toggleMoreDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeMoreDropdown(): void {
    this.dropdownOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(["/login"]);
  }
  closeMobileMenu(menu: HTMLDetailsElement): void {
    menu.open = false;
  }

  mobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeNotificationIfOpen(): void {
    // Notification component ko hamburger ke saath independently
    // open rehne se prevent karne ke liye event handling yahan rahegi.
  }
}
