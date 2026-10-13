import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {

  fullName = 'Administrator';
  email = 'Administrator account';
  role = 'Admin';

  // Change Password
  showPasswordModal = false;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  passwordLoading = false;
  passwordSuccess = '';
  passwordError = '';

  private readonly apiUrl =
  `${environment.apiUrl}/auth/change-password`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fullName = localStorage.getItem('fullName') || 'Administrator';
    this.email = localStorage.getItem('email') || 'Administrator account';
    this.role = localStorage.getItem('role') || 'Admin';
  }

  get initials(): string {
    return this.fullName
      .split(' ')
      .filter(name => name.length > 0)
      .map(name => name.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;

    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';

    this.passwordSuccess = '';
    this.passwordError = '';
  }

  closePasswordModal(): void {
    if (this.passwordLoading) {
      return;
    }

    this.showPasswordModal = false;

    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';

    this.passwordSuccess = '';
    this.passwordError = '';
  }

  changePassword(): void {
    this.passwordSuccess = '';
    this.passwordError = '';

    if (
      !this.currentPassword ||
      !this.newPassword ||
      !this.confirmPassword
    ) {
      this.passwordError = 'Please fill in all password fields.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError =
        'New password and confirm password do not match.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordError =
        'New password must be at least 6 characters long.';
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      this.passwordError = 'Your session has expired. Please login again.';
      return;
    }

    this.passwordLoading = true;

    const request = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    };

    this.http.post<{ message: string }>(
      this.apiUrl,
      request
    ).subscribe({
      next: (response) => {
        this.passwordLoading = false;
        this.passwordSuccess =
          response.message || 'Password changed successfully.';

        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },

      error: (error) => {
        this.passwordLoading = false;

        this.passwordError =
          error?.error?.message ||
          'Unable to change password. Please check your current password.';
      }
    });
  }
}