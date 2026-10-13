import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Customer {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css'
})
export class CustomersComponent implements OnInit {

  private http = inject(HttpClient);

private readonly apiUrl =
  `${environment.apiUrl}/admin/customers`;

  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];

  loading = false;
  errorMessage = '';

  searchText = '';

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    if (this.loading) return;

    this.loading = true;
    this.errorMessage = '';

    this.http.get<Customer[]>(this.apiUrl).subscribe({
      next: (response) => {
        this.customers = response ?? [];
        this.filteredCustomers = [...this.customers];
        this.loading = false;
      },

      error: (error) => {
        console.error('Customers loading failed:', error);

        this.loading = false;

        if (error.status === 401) {
          this.errorMessage =
            'Your session has expired. Please login again.';
        } else if (error.status === 403) {
          this.errorMessage =
            'You are not authorized to access customers.';
        } else {
          this.errorMessage =
            'Unable to load customers. Please check the backend API.';
        }
      }
    });
  }

  searchCustomers(): void {
    const search = this.searchText.trim().toLowerCase();

    if (!search) {
      this.filteredCustomers = [...this.customers];
      return;
    }

    this.filteredCustomers = this.customers.filter(customer =>
      customer.fullName.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      (customer.phoneNumber ?? '').toLowerCase().includes(search)
    );
  }

  clearSearch(): void {
    this.searchText = '';
    this.filteredCustomers = [...this.customers];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getInitials(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return 'C';
    }

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
}