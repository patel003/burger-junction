import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  InventoryProduct,
  InventoryService,
  UpdateStockRequest,
} from "../../../core/services/inventory.service";

@Component({
  selector: "app-inventory",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./inventory.component.html",
  styleUrl: "./inventory.component.css",
})
export class InventoryComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  products: InventoryProduct[] = [];

  loading = false;
  errorMessage = "";
  successMessage = "";

  // -----------------------------
  // Search & Filter
  // -----------------------------

  searchText = "";

  set selectedSearch(value: string) {
    this.searchText = value;
    this.currentPage = 1;
  }

  get selectedSearch(): string {
    return this.searchText;
  }

  selectedStatus = "All";

  set statusFilter(value: string) {
    this.selectedStatus = value;
    this.currentPage = 1;
  }

  get statusFilter(): string {
    return this.selectedStatus;
  }

  get filteredProducts(): InventoryProduct[] {
    const search = this.searchText.trim().toLowerCase();

    const statusOrder: Record<string, number> = {
      "In Stock": 1,
      "Low Stock": 2,
      "Out of Stock": 3,
    };

    return this.products
      .filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(search);

        const matchesStatus =
          this.selectedStatus === "All" ||
          product.stockStatus === this.selectedStatus;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => statusOrder[a.stockStatus] - statusOrder[b.stockStatus]);
  }

  // -----------------------------
  // Pagination
  // -----------------------------

  currentPage = 1;
  pageSize = 5;

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.pageSize);
  }

  get paginatedProducts(): InventoryProduct[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;

    return this.filteredProducts.slice(startIndex, startIndex + this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // -----------------------------
  // Update Stock Modal
  // -----------------------------

  showStockModal = false;

  selectedProduct: InventoryProduct | null = null;

  stockQuantity = 0;
  lowStockThreshold = 5;

  savingStock = false;

  ngOnInit(): void {
    this.loadInventory();
  }

  // -----------------------------
  // Load Inventory
  // -----------------------------

  loadInventory(): void {
    this.loading = true;
    this.errorMessage = "";

    this.inventoryService.getAll().subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
      },
      error: (error) => {
        console.error("Failed to load inventory:", error);

        this.errorMessage = "Failed to load inventory.";
        this.loading = false;
      },
    });
  }

  // -----------------------------
  // Statistics
  // -----------------------------

  get totalProducts(): number {
    return this.products.length;
  }

  get inStockCount(): number {
    return this.products.filter((x) => x.stockStatus === "In Stock").length;
  }

  get lowStockCount(): number {
    return this.products.filter((x) => x.stockStatus === "Low Stock").length;
  }

  get outOfStockCount(): number {
    return this.products.filter((x) => x.stockStatus === "Out of Stock").length;
  }

  // -----------------------------
  // Open Update Modal
  // -----------------------------

  openStockModal(product: InventoryProduct): void {
    this.selectedProduct = product;

    this.stockQuantity = product.stockQuantity;

    this.lowStockThreshold = product.lowStockThreshold;

    this.showStockModal = true;
  }

  // -----------------------------
  // Close Modal
  // -----------------------------

  closeStockModal(): void {
    if (this.savingStock) {
      return;
    }

    this.showStockModal = false;

    this.selectedProduct = null;
  }

  // -----------------------------
  // Update Stock
  // -----------------------------

  saveStock(): void {
    if (!this.selectedProduct) {
      return;
    }

    if (this.stockQuantity < 0) {
      return;
    }

    if (this.lowStockThreshold < 0) {
      return;
    }

    const data: UpdateStockRequest = {
      stockQuantity: this.stockQuantity,
      lowStockThreshold: this.lowStockThreshold,
    };

    this.savingStock = true;

    this.inventoryService.updateStock(this.selectedProduct.id, data).subscribe({
      next: () => {
        this.savingStock = false;

        this.showStockModal = false;

        this.selectedProduct = null;

        this.successMessage = "Stock updated successfully.";

        this.loadInventory();

        setTimeout(() => {
          this.successMessage = "";
        }, 3000);
      },
      error: (error) => {
        console.error("Failed to update stock:", error);

        this.savingStock = false;
        this.errorMessage = "Failed to update stock.";
      },
    });
  }
}
