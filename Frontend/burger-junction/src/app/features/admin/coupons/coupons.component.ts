import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AdminCoupon,
  CouponAdminService
} from './coupon-admin.service';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupons.component.html',
  styleUrl: './coupons.component.css'
})
export class CouponsComponent implements OnInit {
     readonly Math = Math;
  private couponService = inject(CouponAdminService);

  coupons: AdminCoupon[] = [];
  filteredCoupons: AdminCoupon[] = [];

  loading = false;
  saving = false;
  deleting = false;

  errorMessage = '';
  successMessage = '';

  searchText = '';
  selectedStatus = 'All';

  readonly discountTypes = [
    'Percentage',
    'Fixed'
  ];

  selectedDiscountType = 'Percentage';

  showCouponModal = false;
  showDeleteModal = false;

  editingId: number | null = null;
  deleteCoupon: AdminCoupon | null = null;

  couponCode = '';
  couponDescription = '';
  couponDiscountValue: number | null = null;
  couponMinimumOrderAmount: number | null = null;
  couponMaximumDiscountAmount: number | null = null;

  couponStartDate = '';
  couponExpiryDate = '';

  couponUsageLimit: number | null = null;
  couponIsActive = true;

  ngOnInit(): void {
    this.loadCoupons();
  }

  loadCoupons(): void {
    if (this.loading) return;

    this.loading = true;
    this.errorMessage = '';

    this.couponService.getAll().subscribe({
      next: (response) => {
        this.coupons = response ?? [];
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Coupons loading failed:', error);

        this.loading = false;

        this.errorMessage =
          error?.error?.message ??
          'Unable to load coupons. Please check the backend API.';
      }
    });
  }

  applyFilters(): void {
    const search = this.searchText
      .trim()
      .toLowerCase();

    this.filteredCoupons = this.coupons.filter(coupon => {

      const matchesSearch =
        !search ||
        coupon.code.toLowerCase().includes(search) ||
        coupon.description.toLowerCase().includes(search);

      const matchesStatus =
        this.selectedStatus === 'All' ||
        (this.selectedStatus === 'Active' && coupon.isActive) ||
        (this.selectedStatus === 'Inactive' && !coupon.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  searchCoupons(): void {
    this.applyFilters();
  }

  filterByStatus(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchText = '';
    this.applyFilters();
  }

  openAddModal(): void {
    this.clearMessages();

    this.editingId = null;

    this.resetForm();

    this.showCouponModal = true;
  }

  openEditModal(coupon: AdminCoupon): void {
    this.clearMessages();

    this.editingId = coupon.id;

    this.couponCode = coupon.code;
    this.couponDescription = coupon.description;

    this.selectedDiscountType =
      coupon.discountType;

    this.couponDiscountValue =
      coupon.discountValue;

    this.couponMinimumOrderAmount =
      coupon.minimumOrderAmount;

    this.couponMaximumDiscountAmount =
      coupon.maximumDiscountAmount;

    this.couponStartDate =
      this.toDateTimeLocal(coupon.startDate);

    this.couponExpiryDate =
      this.toDateTimeLocal(coupon.expiryDate);

    this.couponUsageLimit =
      coupon.usageLimit;

    this.couponIsActive =
      coupon.isActive;

    this.showCouponModal = true;
  }

  closeCouponModal(): void {
    if (this.saving) return;

    this.showCouponModal = false;
    this.editingId = null;

    this.resetForm();
  }

  saveCoupon(): void {

    const code = this.couponCode
      .trim()
      .toUpperCase();

    const description =
      this.couponDescription.trim();

    if (!code) {
      this.errorMessage =
        'Coupon code is required.';
      return;
    }

    if (!description) {
      this.errorMessage =
        'Coupon description is required.';
      return;
    }

    if (
      this.couponDiscountValue === null ||
      this.couponDiscountValue <= 0
    ) {
      this.errorMessage =
        'Discount value must be greater than 0.';
      return;
    }

    if (
      this.selectedDiscountType === 'Percentage' &&
      this.couponDiscountValue > 100
    ) {
      this.errorMessage =
        'Percentage discount cannot exceed 100.';
      return;
    }

    if (
      this.couponMinimumOrderAmount === null ||
      this.couponMinimumOrderAmount < 0
    ) {
      this.errorMessage =
        'Minimum order amount is required.';
      return;
    }

    if (
      this.couponMaximumDiscountAmount !== null &&
      this.couponMaximumDiscountAmount < 0
    ) {
      this.errorMessage =
        'Maximum discount cannot be negative.';
      return;
    }

    if (!this.couponStartDate) {
      this.errorMessage =
        'Start date is required.';
      return;
    }

    if (!this.couponExpiryDate) {
      this.errorMessage =
        'Expiry date is required.';
      return;
    }

    const startDate =
      new Date(this.couponStartDate);

    const expiryDate =
      new Date(this.couponExpiryDate);

    if (expiryDate <= startDate) {
      this.errorMessage =
        'Expiry date must be after start date.';
      return;
    }

    if (
      this.couponUsageLimit === null ||
      this.couponUsageLimit <= 0
    ) {
      this.errorMessage =
        'Usage limit must be greater than 0.';
      return;
    }

    if (this.saving) return;

    this.saving = true;
    this.clearMessages();

    const couponData = {
      code,
      description,
      discountType: this.selectedDiscountType,
      discountValue: this.couponDiscountValue,
      minimumOrderAmount:
        this.couponMinimumOrderAmount,
      maximumDiscountAmount:
        this.couponMaximumDiscountAmount,
      startDate: startDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      usageLimit: this.couponUsageLimit,
      isActive: this.couponIsActive
    };

    if (this.editingId !== null) {

      this.couponService
        .update(this.editingId, couponData)
        .subscribe({

          next: (updatedCoupon) => {

            this.coupons =
              this.coupons.map(coupon =>
                coupon.id === updatedCoupon.id
                  ? updatedCoupon
                  : coupon
              );

            this.applyFilters();

            this.saving = false;
            this.showCouponModal = false;
            this.editingId = null;

            this.resetForm();

            this.successMessage =
              'Coupon updated successfully.';

            this.autoHideSuccess();
          },

          error: (error) => {

            console.error(
              'Coupon update failed:',
              error
            );

            this.saving = false;

            this.errorMessage =
              error?.error?.message ??
              'Unable to update coupon.';
          }
        });

      return;
    }

    this.couponService
      .create(couponData)
      .subscribe({

        next: (createdCoupon) => {

          this.coupons = [
            createdCoupon,
            ...this.coupons
          ];

          this.applyFilters();

          this.saving = false;
          this.showCouponModal = false;

          this.resetForm();

          this.successMessage =
            'Coupon created successfully.';

          this.autoHideSuccess();
        },

        error: (error) => {

          console.error(
            'Coupon creation failed:',
            error
          );

          this.saving = false;

          this.errorMessage =
            error?.error?.message ??
            'Unable to create coupon.';
        }
      });
  }

  openDeleteModal(coupon: AdminCoupon): void {
    this.clearMessages();

    this.deleteCoupon = coupon;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) return;

    this.showDeleteModal = false;
    this.deleteCoupon = null;
  }

  confirmDelete(): void {

    if (!this.deleteCoupon) return;
    if (this.deleting) return;

    const couponId =
      this.deleteCoupon.id;

    this.deleting = true;
    this.clearMessages();

    this.couponService
      .delete(couponId)
      .subscribe({

        next: () => {

          this.coupons =
            this.coupons.filter(
              coupon => coupon.id !== couponId
            );

          this.filteredCoupons =
            this.filteredCoupons.filter(
              coupon => coupon.id !== couponId
            );

          this.deleting = false;

          this.showDeleteModal = false;
          this.deleteCoupon = null;

          this.successMessage =
            'Coupon deleted successfully.';

          this.autoHideSuccess();
        },

        error: (error) => {

          console.error(
            'Coupon delete failed:',
            error
          );

          this.deleting = false;

          this.showDeleteModal = false;
          this.deleteCoupon = null;

          this.errorMessage =
            error?.error?.message ??
            'Unable to delete coupon.';
        }
      });
  }

  getDiscountText(coupon: AdminCoupon): string {

    if (coupon.discountType === 'Percentage') {
      return `${coupon.discountValue}% OFF`;
    }

    return `₹${coupon.discountValue} OFF`;
  }

  getStatusText(coupon: AdminCoupon): string {
    return coupon.isActive
      ? 'Active'
      : 'Inactive';
  }

  getStatusClass(coupon: AdminCoupon): string {
    return coupon.isActive
      ? 'active'
      : 'inactive';
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

  formatDateTimeLocal(date: string): string {
    return this.toDateTimeLocal(date);
  }

  private toDateTimeLocal(date: string): string {

    const value = new Date(date);

    const year =
      value.getFullYear();

    const month =
      String(value.getMonth() + 1)
        .padStart(2, '0');

    const day =
      String(value.getDate())
        .padStart(2, '0');

    const hours =
      String(value.getHours())
        .padStart(2, '0');

    const minutes =
      String(value.getMinutes())
        .padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private resetForm(): void {

    this.couponCode = '';
    this.couponDescription = '';

    this.selectedDiscountType =
      'Percentage';

    this.couponDiscountValue = null;

    this.couponMinimumOrderAmount =
      0;

    this.couponMaximumDiscountAmount =
      null;

    this.couponStartDate = '';
    this.couponExpiryDate = '';

    this.couponUsageLimit = 100;

    this.couponIsActive = true;
  }

  private autoHideSuccess(): void {

    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
}