import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AdminService,
  ServiceAdminService,
  ServiceRequest
} from './service-admin.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent implements OnInit {

  private serviceApi = inject(ServiceAdminService);

  services: AdminService[] = [];

  loading = false;
  saving = false;
  deleting = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  statusFilter = 'All';

  showModal = false;
  showDeleteModal = false;

  isEditMode = false;
  editingId: number | null = null;

  serviceToDelete: AdminService | null = null;

  form: ServiceRequest = {
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    isActive: true
  };

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading = true;
    this.errorMessage = '';

    this.serviceApi.getAll().subscribe({
      next: (data) => {
        this.services = data;
        this.loading = false;
      },
      error: (error) => {
        console.error(error);
        this.errorMessage =
          error?.error?.message ||
          'Failed to load services.';
        this.loading = false;
      }
    });
  }

  get filteredServices(): AdminService[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.services.filter(service => {

      const matchesSearch =
        !search ||
        service.name.toLowerCase().includes(search) ||
        service.description.toLowerCase().includes(search);

      const matchesStatus =
        this.statusFilter === 'All' ||
        (this.statusFilter === 'Active' && service.isActive) ||
        (this.statusFilter === 'Inactive' && !service.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  get activeCount(): number {
    return this.services.filter(x => x.isActive).length;
  }

  get inactiveCount(): number {
    return this.services.filter(x => !x.isActive).length;
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.editingId = null;

    this.form = {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      isActive: true
    };

    this.errorMessage = '';
    this.showModal = true;
  }

  openEditModal(service: AdminService): void {
    this.isEditMode = true;
    this.editingId = service.id;

    this.form = {
      name: service.name,
      description: service.description,
      price: service.price,
      imageUrl: service.imageUrl,
      isActive: service.isActive
    };

    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal(): void {
    if (this.saving) {
      return;
    }

    this.showModal = false;
  }

  saveService(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.name.trim()) {
      this.errorMessage = 'Service name is required.';
      return;
    }

    if (this.form.price < 0) {
      this.errorMessage = 'Price cannot be negative.';
      return;
    }

    this.saving = true;

    const request: ServiceRequest = {
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      price: Number(this.form.price),
      imageUrl: this.form.imageUrl.trim(),
      isActive: this.form.isActive
    };

    if (this.isEditMode && this.editingId !== null) {

      this.serviceApi
        .update(this.editingId, request)
        .subscribe({
          next: () => {
            this.saving = false;
            this.showModal = false;
            this.successMessage =
              'Service updated successfully.';
              setTimeout(() => {
                         this.successMessage = '';
             }, 3000);
            this.loadServices();
          },
          error: (error) => {
            console.error(error);
            this.saving = false;
            this.errorMessage =
              error?.error?.message ||
              'Failed to update service.';
          }
        });

    } else {

      this.serviceApi
        .create(request)
        .subscribe({
          next: () => {
            this.saving = false;
            this.showModal = false;
            this.successMessage =
              'Service created successfully.';
              setTimeout(() => {
                    this.successMessage = '';
              }, 3000);
            this.loadServices();
          },
          error: (error) => {
            console.error(error);
            this.saving = false;
            this.errorMessage =
              error?.error?.message ||
              'Failed to create service.';
          }
        });
    }
  }

  openDeleteModal(service: AdminService): void {
    this.serviceToDelete = service;
    this.errorMessage = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) {
      return;
    }

    this.showDeleteModal = false;
    this.serviceToDelete = null;
  }

  confirmDelete(): void {
    if (!this.serviceToDelete) {
      return;
    }

    this.deleting = true;
    this.errorMessage = '';

    const id = this.serviceToDelete.id;

    this.serviceApi.delete(id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.serviceToDelete = null;

        this.successMessage =
          'Service deleted successfully.';
             setTimeout(() => {
                    this.successMessage = '';
                  }, 3000);
        this.loadServices();
      },
      error: (error) => {
        console.error(error);
        this.deleting = false;

        this.errorMessage =
          error?.error?.message ||
          'Failed to delete service.';
      }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  formatPrice(price: number): string {
    return `₹${price.toLocaleString('en-IN')}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  }
}