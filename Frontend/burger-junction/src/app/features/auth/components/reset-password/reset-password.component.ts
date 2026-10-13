import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';

const MIN_PASSWORD_LENGTH = 6;

// Backend ke Identity rules se match: 6+ akshar, chhota, bada letter, number
function passwordProblem(pw: string): string {
  if (pw.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter.';
  if (!/\d/.test(pw)) return 'Password must include a number.';
  return '';
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  email = '';
  token = '';
  linkInvalid = false;

  newPassword = '';
  confirmPassword = '';
  showPassword = false;

  loading = false;
  done = false;
  errorMessage = '';
  passwordError = '';
  confirmError = '';

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;

    this.email = params.get('email') ?? '';
    this.token = params.get('token') ?? '';

    if (!this.email || !this.token) {
      this.linkInvalid = true;
    }
  }

  onSubmit(): void {
    if (this.loading) return;

    this.errorMessage = '';
    this.passwordError = '';
    this.confirmError = '';

    if (!this.newPassword) {
      this.passwordError = 'Please enter a new password.';
    } else {
      this.passwordError = passwordProblem(this.newPassword);
    }

    if (!this.confirmPassword) {
      this.confirmError = 'Please confirm your password.';
    } else if (this.newPassword !== this.confirmPassword) {
      this.confirmError = 'Passwords do not match.';
    }

    if (this.passwordError || this.confirmError) return;

    this.loading = true;

    this.api
      .resetPassword({
        email: this.email,
        token: this.token,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.done = true;
          setTimeout(() => this.router.navigate(['/login']), 2500);
        },

        error: (error) => {
          this.loading = false;

          if (error.status === 0) {
            this.errorMessage =
              'Cannot reach the server. Check your internet and try again.';
          } else {
            this.errorMessage =
              error?.error?.message ||
              'This reset link is invalid or has expired. Please request a new one.';
          }
        },
      });
  }
}