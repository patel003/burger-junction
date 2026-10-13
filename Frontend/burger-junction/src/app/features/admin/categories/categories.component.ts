import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { AdminCategory, CategoryAdminService } from "./category-admin.service";

@Component({
  selector: "app-admin-categories",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./categories.component.html",
  styleUrl: "./categories.component.css",
})
export class CategoriesComponent implements OnInit {
  private categoryService = inject(CategoryAdminService);

  // =========================
  // DATA
  // =========================

  categories: AdminCategory[] = [];

  // =========================
  // UI STATE
  // =========================

  loading = false;
  saving = false;
  deleting = false;

  errorMessage = "";
  successMessage = "";

  // =========================
  // SEARCH + PAGINATION
  // =========================

  searchTerm = "";

  currentPage = 1;
  pageSize = 10;

  // =========================
  // MODAL STATE
  // =========================

  showCategoryModal = false;
  showDeleteModal = false;

  editingId: number | null = null;
  deleteCategory: AdminCategory | null = null;

  // =========================
  // FORM
  // =========================

  categoryName = "";

  // =========================
  // LIFECYCLE
  // =========================

  ngOnInit(): void {
    this.loadCategories();
  }

  // =========================
  // LOAD CATEGORIES
  // =========================

  loadCategories(): void {
    if (this.loading) return;

    this.loading = true;
    this.errorMessage = "";

    this.categoryService.getAll().subscribe({
      next: (response) => {
        this.categories = response ?? [];
        this.currentPage = 1;
        this.loading = false;
      },

      error: (error) => {
        console.error("Categories loading failed:", error);

        this.loading = false;

        this.errorMessage =
          "Unable to load categories. Please check the backend API.";
      },
    });
  }

  // =========================
  // SEARCH
  // =========================

  onSearchChange(): void {
    this.currentPage = 1;
  }

  // =========================
  // SORTING
  // =========================

  sortOption = "default";

  get filteredCategories(): AdminCategory[] {
    const search = this.searchTerm.trim().toLowerCase();

    let result = this.categories.filter(
      (category) => !search || category.name.toLowerCase().includes(search),
    );

    switch (this.sortOption) {
      case "nameAsc":
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;

      case "nameDesc":
        result = [...result].sort((a, b) => b.name.localeCompare(a.name));
        break;

      case "productDesc":
        result = [...result].sort((a, b) => b.productCount - a.productCount);
        break;

      case "productAsc":
        result = [...result].sort((a, b) => a.productCount - b.productCount);
        break;

      default:
        result = [...result].sort((a, b) => a.id - b.id);
        break;
    }

    return result;
  }

  onSortChange(): void {
    this.currentPage = 1;
  }

  // =========================
  // PAGINATION
  // =========================

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredCategories.length / this.pageSize),
    );
  }

  get paginatedCategories(): AdminCategory[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;

    return this.filteredCategories.slice(
      startIndex,
      startIndex + this.pageSize,
    );
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // =========================
  // ADD MODAL
  // =========================

  openAddModal(): void {
    this.clearMessages();

    this.editingId = null;
    this.categoryName = "";

    this.showCategoryModal = true;
  }

  // =========================
  // EDIT MODAL
  // =========================

  openEditModal(category: AdminCategory): void {
    this.clearMessages();

    this.editingId = category.id;
    this.categoryName = category.name;

    this.showCategoryModal = true;
  }


  // =========================
// TOGGLE ACTIVE / INACTIVE
// =========================

toggleCategoryStatus(category: AdminCategory): void {

  if (this.saving) return;

  this.saving = true;
  this.clearMessages();

  this.categoryService
    .update(category.id, {
      name: category.name,
      isActive: !category.isActive
    })
    .subscribe({
      next: (updatedCategory) => {

        this.categories =
          this.categories.map(item =>
            item.id === updatedCategory.id
              ? updatedCategory
              : item
          );

        this.saving = false;

        this.successMessage =
          updatedCategory.isActive
            ? 'Category activated successfully.'
            : 'Category deactivated successfully.';

        this.autoHideSuccess();
      },

      error: (error) => {

        console.error(
          'Category status update failed:',
          error
        );

        this.saving = false;

        this.errorMessage =
          error?.error?.message ??
          'Unable to update category status.';
      }
    });
}

  // =========================
  // CLOSE CATEGORY MODAL
  // =========================

  closeCategoryModal(): void {
    if (this.saving) return;

    this.showCategoryModal = false;
    this.editingId = null;
    this.categoryName = "";
  }

  // =========================
  // SAVE CATEGORY
  // =========================

  saveCategory(): void {
    const name = this.categoryName.trim();

    if (!name) {
      this.errorMessage = "Category name is required.";
      return;
    }

    if (this.saving) return;

    this.saving = true;
    this.clearMessages();

    // =========================
    // UPDATE
    // =========================

    if (this.editingId !== null) {
      this.categoryService.update(this.editingId, {name: name,isActive: this.categories.find(category => category.id === this.editingId )?.isActive ?? true }).subscribe({
        next: (updatedCategory) => {
          this.categories = this.categories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category,
          );

          this.saving = false;
          this.showCategoryModal = false;

          this.editingId = null;
          this.categoryName = "";

          this.successMessage = "Category updated successfully.";

          this.autoHideSuccess();
        },

        error: (error) => {
          console.error("Category update failed:", error);

          this.saving = false;

          this.errorMessage =
            error?.error?.message ?? "Unable to update category.";
        },
      });

      return;
    }

    // =========================
    // CREATE
    // =========================

    this.categoryService.create({ name: name,  isActive: true }).subscribe({
      next: (createdCategory) => {
        this.categories = [...this.categories, createdCategory];

        this.saving = false;
        this.showCategoryModal = false;

        this.categoryName = "";

        this.successMessage = "Category created successfully.";

        this.autoHideSuccess();
      },

      error: (error) => {
        console.error("Category creation failed:", error);

        this.saving = false;

        this.errorMessage =
          error?.error?.message ?? "Unable to create category.";
      },
    });
  }

  // =========================
  // DELETE MODAL
  // =========================

  openDeleteModal(category: AdminCategory): void {
    this.clearMessages();

    this.deleteCategory = category;
    this.showDeleteModal = true;
  }

  // =========================
  // CLOSE DELETE MODAL
  // =========================

  closeDeleteModal(): void {
    if (this.deleting) return;

    this.showDeleteModal = false;
    this.deleteCategory = null;
  }

  // =========================
  // CONFIRM DELETE
  // =========================

  confirmDelete(): void {
    if (!this.deleteCategory) return;
    if (this.deleting) return;

    const categoryId = this.deleteCategory.id;

    this.deleting = true;
    this.clearMessages();

    this.categoryService.delete(categoryId).subscribe({
      next: () => {
        this.categories = this.categories.filter(
          (category) => category.id !== categoryId,
        );

        // Page adjustment after delete
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }

        this.deleting = false;
        this.showDeleteModal = false;
        this.deleteCategory = null;

        this.successMessage = "Category deleted successfully.";

        this.autoHideSuccess();
      },

      error: (error) => {
        console.error("Category delete failed:", error);

        this.deleting = false;
        this.showDeleteModal = false;
        this.deleteCategory = null;

        this.errorMessage =
          error?.error?.message ?? "Unable to delete category.";
      },
    });
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
