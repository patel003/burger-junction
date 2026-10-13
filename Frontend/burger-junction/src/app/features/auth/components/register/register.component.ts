import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/; // 10 digit Indian mobile number
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
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  // auth-extras.css naya hai, purani register.component.css waisi hi rahegi
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  fullName = '';
  email = '';
  phoneNumber = '';
  password = '';
  confirmPassword = '';
  showPassword = false;

  loading = false;
  errorMessage = '';

  errors = {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  };

  private validate(): boolean {
    this.errors = { fullName: '', email: '', phone: '', password: '', confirm: '' };

    if (!this.fullName.trim()) {
      this.errors.fullName = 'Please enter your full name.';
    }

    const email = this.email.trim();
    if (!email) {
      this.errors.email = 'Please enter your email.';
    } else if (!EMAIL_RE.test(email)) {
      this.errors.email = 'Enter a valid email address.';
    }

    if (!this.phoneNumber) {
      this.errors.phone = 'Please enter your phone number.';
    } else if (!PHONE_RE.test(this.phoneNumber)) {
      this.errors.phone = 'Enter a valid 10 digit mobile number.';
    }

    if (!this.password) {
      this.errors.password = 'Please create a password.';
    } else {
      this.errors.password = passwordProblem(this.password);
    }

    if (!this.confirmPassword) {
      this.errors.confirm = 'Please confirm your password.';
    } else if (this.password !== this.confirmPassword) {
      this.errors.confirm = 'Passwords do not match.';
    }

    return Object.values(this.errors).every((e) => !e);
  }

  // Backend alag-alag format me error bhej sakta hai, sab handle karta hai
  private serverMessage(error: any): string {
    const e = error?.error;

    if (typeof e === 'string' && e) return e;
    if (Array.isArray(e)) return e.map((x: any) => x?.description ?? x).join(' ');
    if (e?.message) return e.message;
    if (e?.errors && typeof e.errors === 'object') {
      return (Object.values(e.errors).flat() as string[]).join(' ');
    }

    return '';
  }

  onRegister(): void {
    if (this.loading) return;

    this.errorMessage = '';

    if (!this.validate()) return;

    this.loading = true;

    this.authService
      .register({
        fullName: this.fullName.trim(),
        email: this.email.trim().toLowerCase(),
        phoneNumber: this.phoneNumber,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/']);
        },

        error: (error) => {
          this.loading = false;

          if (error.status === 409) {
            this.errorMessage = 'Email is already registered. Try logging in.';
          } else if (error.status === 400) {
            this.errorMessage =
              this.serverMessage(error) || 'Invalid registration details.';
          } else if (error.status === 0) {
            this.errorMessage =
              'Cannot reach the server. Check your internet and try again.';
          } else {
            this.errorMessage = 'Something went wrong. Please try again.';
          }
        },
      });
  }
}