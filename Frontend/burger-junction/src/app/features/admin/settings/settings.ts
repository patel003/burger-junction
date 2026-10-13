import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface RestaurantSettings {
  id: number;
  restaurantName: string;
  currency: string;
  isOrderingEnabled: boolean;
  isOnlineOrderingEnabled: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {

 private readonly apiUrl =
  `${environment.apiUrl}/admin/settings`;

  settings: RestaurantSettings = {
    id: 0,
    restaurantName: 'Burger Junction',
    currency: 'INR',
    isOrderingEnabled: true,
    isOnlineOrderingEnabled: true
  };

  loading = true;
  saving = false;

  successMessage = '';
  errorMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<RestaurantSettings>(this.apiUrl).subscribe({
      next: (response) => {
        this.settings = response;
        this.loading = false;
      },

      error: (error) => {
        this.loading = false;

        this.errorMessage =
          error?.error?.message ||
          'Unable to load restaurant settings.';
      }
    });
  }

  saveSettings(): void {
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.put<RestaurantSettings>(
      this.apiUrl,
      this.settings
    ).subscribe({
      next: (response) => {
        this.settings = response;
        this.saving = false;
        this.successMessage = 'Settings saved successfully.';

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },

      error: (error) => {
        this.saving = false;

        this.errorMessage =
          error?.error?.message ||
          'Unable to save restaurant settings.';
      }
    });
  }
}