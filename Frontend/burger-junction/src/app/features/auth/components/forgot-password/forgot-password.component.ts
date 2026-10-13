import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  private api = inject(ApiService);

  email = '';
  loading = false;
  sent = false;
  emailError = '';
  errorMessage = '';

  onSubmit(): void {
    if (this.loading) return;

    this.emailError = '';
    this.errorMessage = '';

    const email = this.email.trim().toLowerCase();

    if (!email) {
      this.emailError = 'Please enter your email.';
      return;
    }

    if (!EMAIL_RE.test(email)) {
      this.emailError = 'Enter a valid email address.';
      return;
    }

    this.loading = true;

    this.api.forgotPassword(email).subscribe({
      next: () => {
        this.loading = false;
        this.sent = true;
      },

      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.status === 0
            ? 'Cannot reach the server. Check your internet and try again.'
            : 'Something went wrong. Please try again.';
      },
    });
  }
}