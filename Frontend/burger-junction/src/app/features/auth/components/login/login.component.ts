import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth.service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css", "./login.extras.css"],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = "";
  password = "";
  showPassword = false;

  loading = false;
  errorMessage = "";
  emailError = "";
  passwordError = "";

  onLogin(): void {
    if (this.loading) return;

    this.errorMessage = "";
    this.emailError = "";
    this.passwordError = "";

    const email = this.email.trim().toLowerCase();

    if (!email) {
      this.emailError = "Please enter your email.";
    } else if (!EMAIL_RE.test(email)) {
      this.emailError = "Enter a valid email address.";
    }

    if (!this.password) {
      this.passwordError = "Please enter your password.";
    }

    if (this.emailError || this.passwordError) return;

    this.loading = true;

    this.authService.login({ email, password: this.password }).subscribe({
      next: (response) => {
        this.loading = false;
        this.goAfterLogin(response.role);
      },

      error: (error) => {
        this.loading = false;

        if (error.status === 401) {
          this.errorMessage = "Invalid email or password.";
        } else if (error.status === 0) {
          this.errorMessage =
            "Cannot reach the server. Check your internet and try again.";
        } else {
          this.errorMessage = "Something went wrong. Please try again.";
        }
      },
    });
  }

  // Admin -> /admin, Rider -> /rider,
  // customer -> wahi page jahan se login par aaya tha
  private goAfterLogin(role?: string): void {
    if (role === "Admin") {
      this.router.navigate(["/admin"]);
      return;
    }

    if (role === "Rider") {
      this.router.navigate(["/rider"]);
      return;
    }

    const returnUrl = this.route.snapshot.queryParamMap.get("returnUrl");

    const safe =
      returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")
        ? returnUrl
        : "/";

    this.router.navigateByUrl(safe);
  }
}