import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";

import {
  AdminProduct,
  ProductAdminService
} from "./product-admin.service";

import { environment } from "../../../../environments/environment";

import {
  AdminCategory,
  CategoryAdminService
} from "../categories/category-admin.service";

@Component({
  selector: "app-admin-products",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./products.component.html",
  styleUrl: "./products.component.css",
})
export class ProductsComponent implements OnInit {

  private productService = inject(ProductAdminService);
  private categoryService = inject(CategoryAdminService);
  private http = inject(HttpClient);

  // =========================
  // DATA
  // =========================

  products: AdminProduct[] = [];

  filteredProducts: AdminProduct[] = [];

  categories: AdminCategory[] = [];

  // =========================
  // UI STATE
  // =========================

  loading = false;

  loadingCategories = false;

  saving = false;

  deleting = false;

  errorMessage = "";

  successMessage = "";

  searchText = "";

  // =========================
  // PAGINATION
  // =========================

  currentPage = 1;

  pageSize = 10;

  // =========================
  // MODALS
  // =========================

  showProductModal = false;

  showDeleteModal = false;

  editingId: number | null = null;

  deleteProduct: AdminProduct | null = null;

  // =========================
  // FORM
  // =========================

  productName = "";

  productDescription = "";

  productPrice: number | null = null;

  productCategoryId: number | null = null;

  productImageUrl = "";

  productIsAvailable = true;

  productIsVeg = true;

  selectedImage: File | null = null;

  uploadingImage = false;

  // =========================
  // INIT
  // =========================

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  // =========================
  // LOAD PRODUCTS
  // =========================

  loadProducts(): void {

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.productService.getAll().subscribe({

      next: (response) => {

        this.products = response ?? [];

        this.filteredProducts = [...this.products];

        // Always start from first page after reload
        this.currentPage = 1;

        this.loading = false;
      },

      error: (error) => {

        console.error(
          "Products loading failed:",
          error
        );

        this.loading = false;

        this.errorMessage =
          "Unable to load products. Please check the backend API.";
      }

    });
  }

  // =========================
  // LOAD CATEGORIES
  // =========================

  loadCategories(): void {

    this.loadingCategories = true;

    this.categoryService.getAll().subscribe({

      next: (response) => {

        this.categories = response ?? [];

        this.loadingCategories = false;
      },

      error: (error) => {

        console.error(
          "Categories loading failed:",
          error
        );

        this.loadingCategories = false;

        this.errorMessage =
          "Unable to load product categories.";
      }

    });
  }

  // =========================
  // PAGINATION
  // =========================

  get totalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredProducts.length /
        this.pageSize
      )
    );
  }

  get paginatedProducts(): AdminProduct[] {

    const startIndex =
      (this.currentPage - 1) *
      this.pageSize;

    return this.filteredProducts.slice(
      startIndex,
      startIndex + this.pageSize
    );
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

  // =========================
  // SEARCH
  // =========================

  searchProducts(): void {

    // Search result should always start from page 1
    this.currentPage = 1;

    const search =
      this.searchText
        .trim()
        .toLowerCase();

    if (!search) {

      this.filteredProducts =
        [...this.products];

      return;
    }

    this.filteredProducts =
      this.products.filter(product =>

        product.name
          .toLowerCase()
          .includes(search)

        ||

        product.description
          .toLowerCase()
          .includes(search)

        ||

        product.categoryName
          .toLowerCase()
          .includes(search)

      );
  }

  // =========================
  // CLEAR SEARCH
  // =========================

  clearSearch(): void {

    this.searchText = "";

    this.currentPage = 1;

    this.filteredProducts =
      [...this.products];
  }

  // =========================
  // OPEN ADD MODAL
  // =========================

  openAddModal(): void {

    this.clearMessages();

    this.resetForm();

    this.editingId = null;

    this.showProductModal = true;
  }

  // =========================
  // OPEN EDIT MODAL
  // =========================

  openEditModal(product: AdminProduct): void {

    this.clearMessages();

    this.editingId =
      product.id;

    this.productName =
      product.name;

    this.productDescription =
      product.description;

    this.productPrice =
      product.price;

    this.productCategoryId =
      product.categoryId;

    this.productImageUrl =
      product.imageUrl;

    this.productIsAvailable =
      product.isAvailable;

    this.productIsVeg = product.isVeg;

    this.showProductModal = true;
  }

  // =========================
  // CLOSE PRODUCT MODAL
  // =========================

  closeProductModal(): void {

    if (this.saving) {
      return;
    }

    this.showProductModal = false;

    this.editingId = null;

    this.resetForm();
  }

  // =========================
  // IMAGE UPLOAD
  // =========================

  onImageSelected(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }

    const file =
      input.files[0];

    this.selectedImage = file;

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    this.uploadingImage = true;

    this.clearMessages();

    this.http
      .post<{
        imageUrl: string;
      }>(
        `${environment.apiUrl}/admin/products/upload-image`,
        formData
      )
      .subscribe({

        next: (response) => {

          this.productImageUrl =
            response.imageUrl;

          this.uploadingImage = false;

          this.successMessage =
            "Image uploaded successfully.";

          this.autoHideSuccess();
        },

        error: (error) => {

          console.error(
            "Image upload failed:",
            error
          );

          this.uploadingImage = false;

          this.selectedImage = null;

          this.errorMessage =
            error?.error?.message ??
            "Unable to upload product image.";
        },

      });
  }

  // =========================
  // SAVE PRODUCT
  // =========================

  saveProduct(): void {

    const name =
      this.productName.trim();

    const description =
      this.productDescription.trim();

    const imageUrl =
      this.productImageUrl.trim();

    // =========================
    // VALIDATION
    // =========================

    if (!name) {

      this.errorMessage =
        "Product name is required.";

      return;
    }

    if (!description) {

      this.errorMessage =
        "Product description is required.";

      return;
    }

    if (
      this.productPrice === null ||
      this.productPrice <= 0
    ) {

      this.errorMessage =
        "Product price must be greater than 0.";

      return;
    }

    if (
      this.productCategoryId === null
    ) {

      this.errorMessage =
        "Please select a category.";

      return;
    }

    if (!imageUrl) {

      this.errorMessage =
        "Product image URL is required.";

      return;
    }

    if (this.saving) {
      return;
    }

    this.saving = true;

    this.clearMessages();

    const productData = {

      categoryId:
        this.productCategoryId,

      name,

      description,

      price:
        this.productPrice,

      imageUrl,

      isAvailable:
        this.productIsAvailable,

         isVeg: this.productIsVeg

    };

    // =========================
    // UPDATE
    // =========================

    if (this.editingId !== null) {

      this.productService
        .update(
          this.editingId,
          productData
        )
        .subscribe({

          next: (updatedProduct) => {

            this.products =
              this.products.map(
                product =>
                  product.id ===
                  updatedProduct.id
                    ? updatedProduct
                    : product
              );

            this.searchProducts();

            this.saving = false;

            this.showProductModal =
              false;

            this.editingId = null;

            this.resetForm();

            this.successMessage =
              "Product updated successfully.";

            this.autoHideSuccess();
          },

          error: (error) => {

            console.error(
              "Product update failed:",
              error
            );

            this.saving = false;

            this.errorMessage =
              error?.error?.message ??
              "Unable to update product.";
          },

        });

      return;
    }

    // =========================
    // CREATE
    // =========================

    this.productService
      .create(productData)
      .subscribe({

        next: (createdProduct) => {

          this.products = [
            ...this.products,
            createdProduct
          ];

          this.searchProducts();

          this.saving = false;

          this.showProductModal =
            false;

          this.resetForm();

          this.successMessage =
            "Product created successfully.";

          this.autoHideSuccess();
        },

        error: (error) => {

          console.error(
            "Product creation failed:",
            error
          );

          this.saving = false;

          this.errorMessage =
            error?.error?.message ??
            "Unable to create product.";
        },

      });
  }

  // =========================
  // OPEN DELETE MODAL
  // =========================

  openDeleteModal(
    product: AdminProduct
  ): void {

    this.clearMessages();

    this.deleteProduct =
      product;

    this.showDeleteModal =
      true;
  }

  // =========================
  // CLOSE DELETE MODAL
  // =========================

  closeDeleteModal(): void {

    if (this.deleting) {
      return;
    }

    this.showDeleteModal =
      false;

    this.deleteProduct =
      null;
  }

  // =========================
  // CONFIRM DELETE
  // =========================

  confirmDelete(): void {

    if (!this.deleteProduct) {
      return;
    }

    if (this.deleting) {
      return;
    }

    const productId =
      this.deleteProduct.id;

    this.deleting = true;

    this.clearMessages();

    this.productService
      .delete(productId)
      .subscribe({

        next: () => {

          this.products =
            this.products.filter(
              product =>
                product.id !== productId
            );

          this.filteredProducts =
            this.filteredProducts.filter(
              product =>
                product.id !== productId
            );

          // Prevent empty page after deletion
          if (
            this.currentPage >
            this.totalPages
          ) {
            this.currentPage =
              this.totalPages;
          }

          this.deleting = false;

          this.showDeleteModal =
            false;

          this.deleteProduct =
            null;

          this.successMessage =
            "Product deleted successfully.";

          this.autoHideSuccess();
        },

        error: (error) => {

          console.error(
            "Product delete failed:",
            error
          );

          this.deleting = false;

          this.showDeleteModal =
            false;

          this.deleteProduct =
            null;

          this.errorMessage =
            error?.error?.message ??
            "Unable to delete product.";
        },

      });
  }

  // =========================
  // RESET FORM
  // =========================

  private resetForm(): void {

    this.productName = "";

    this.productDescription = "";

    this.productPrice = null;

    this.productCategoryId = null;

    this.productImageUrl = "";

    this.productIsAvailable = true;

    this.productIsVeg = true;

    this.selectedImage = null;
  }

  // =========================
  // CLEAR MESSAGES
  // =========================

  clearMessages(): void {

    this.errorMessage = "";

    this.successMessage = "";
  }

  // =========================
  // SUCCESS MESSAGE
  // =========================

  private autoHideSuccess(): void {

    setTimeout(() => {

      this.successMessage = "";

    }, 3000);
  }
}