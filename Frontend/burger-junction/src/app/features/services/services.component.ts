import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  CustomerService,
  ServiceService
} from './service.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent implements OnInit {

  private serviceApi = inject(ServiceService);

  services: CustomerService[] = [];

  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading = true;
    this.errorMessage = '';

    this.serviceApi.getActiveServices().subscribe({
      next: (data) => {
        this.services = data;
        this.loading = false;
      },
      error: (error) => {
        console.error(error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to load services. Please try again.';

        this.loading = false;
      }
    });
  }

  formatPrice(price: number): string {
    return `₹${price.toLocaleString('en-IN')}`;
  }
}