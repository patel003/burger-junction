import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../auth/services/auth.service";

import { ApiService } from "../../core/services/api.service";
import { Product, Category, CartItem, Coupon } from "../../core/models/models";

interface CategoryGroup {
  category: Category;
  items: Product[];
  image: string;
}

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private authService = inject(AuthService);

  private get userKey(): string {
    return this.authService.getUserId() ?? "guest";
  }

  private get cartStorageKey(): string {
    const userId = this.authService.getUserId();

    return userId
      ? `burger_junction_cart_${userId}`
      : "burger_junction_cart_guest";
  }

  private get favouriteStorageKey(): string {
    return `burger_junction_favourites_${this.userKey}`;
  }

  categories: Category[] = [];
  products: Product[] = [];
  coupons: Coupon[] = [];

  cart: CartItem[] = [];
  favouriteIds: number[] = [];

  loading = true;

  // Search / filter
  searchText = "";
  selectedCategoryId: number | null = null;

  // Coupon copy feedback
  copiedCode = "";

  ngOnInit(): void {
    this.loadCart();
    this.loadFavourites();
    this.loadDashboardData();
  }

  /* =========================
     CART
  ========================= */

  loadCart(): void {
    const savedCart = localStorage.getItem(this.cartStorageKey);

    if (!savedCart) {
      this.cart = [];
      return;
    }

    try {
      this.cart = JSON.parse(savedCart);
    } catch {
      this.cart = [];
    }
  }

  saveCart(): void {
    localStorage.setItem(this.cartStorageKey, JSON.stringify(this.cart));
  }

  addToCart(product: Product): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(["/login"]);
      return;
    }

    if (this.isOutOfStock(product)) {
      return;
    }

    const existing = this.cart.find((x) => x.product.id === product.id);

    if (existing) {
      if (existing.quantity >= product.stockQuantity) {
        return;
      }

      existing.quantity++;
    } else {
      this.cart.push({
        product,
        quantity: 1,
      });
    }

    this.saveCart();
  }

  decreaseFromCart(product: Product): void {
    const existing = this.cart.find((x) => x.product.id === product.id);

    if (!existing) {
      return;
    }

    if (existing.quantity > 1) {
      existing.quantity--;
    } else {
      this.cart = this.cart.filter((x) => x.product.id !== product.id);
    }

    this.saveCart();
  }

  get cartCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  cartQuantity(productId: number): number {
    return (
      this.cart.find((item) => item.product.id === productId)?.quantity ?? 0
    );
  }

  goToCart(): void {
    this.router.navigate(["/cart"]);
  }

  /* =========================
     DATA
  ========================= */

  loadDashboardData(): void {
    this.loading = true;

    this.api.getCategories().subscribe({
      next: (categories) => {
        this.categories = (categories ?? []).filter(
          (category) => category.isActive,
        );
      },

      error: (error) => {
        console.error("Categories loading failed:", error);
      },
    });

    this.api.getActiveCoupons().subscribe({
      next: (coupons) => {
        this.coupons = (coupons ?? []).slice(0, 6);
      },
      error: (error) => {
        console.error("Coupons loading failed:", error);
        this.coupons = [];
      },
    });

    this.api.getCustomerProducts().subscribe({
      next: (products) => {
        this.products = products ?? [];
        this.loading = false;
      },

      error: (error) => {
        console.error("Products loading failed:", error);

        this.loading = false;
      },
    });
  }

  /* =========================
     PRODUCT HELPERS
  ========================= */

  isOutOfStock(product: Product): boolean {
    return !product.isAvailable || product.stockQuantity <= 0;
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find((x) => x.id === categoryId);

    return category?.name ?? "Food";
  }

  getCategoryEmoji(name: string): string {
    const value = (name || "").toLowerCase();

    if (value.includes("wrap") || value.includes("roll")) return "🌯";
    if (value.includes("side") || value.includes("fries")) return "🍟";
    if (value.includes("momo")) return "🥟";
    if (value.includes("pizza")) return "🍕";
    if (value.includes("pasta")) return "🍝";
    if (value.includes("sandwich")) return "🥪";
    if (value.includes("shake") || value.includes("drink")) return "🥤";
    if (value.includes("beverage") || value.includes("coffee")) return "☕";
    if (value.includes("dessert")) return "🍰";
    if (value.includes("burger")) return "🍔";

    return "🍽️";
  }

  /** Add-ons (dips, extra cheese) Home ke dishes me nahi dikhte, sirf Menu me */
  private isAddOnCategory(name: string): boolean {
    return /add-?ons?/i.test(name || "");
  }

  private isAddOnProduct(product: Product): boolean {
    return this.isAddOnCategory(this.getCategoryName(product.categoryId));
  }

  /** Available items pehle, unavailable aakhir me */
  private availableFirst(list: Product[]): Product[] {
    return [...list].sort(
      (a, b) => Number(this.isOutOfStock(a)) - Number(this.isOutOfStock(b)),
    );
  }

  /* =========================
     HOME SECTIONS
  ========================= */

  /** Hero ke photos: sirf jin products ki asli photo ho */
  get heroImages(): Product[] {
    return this.products.filter((p) => !!p.imageUrl).slice(0, 3);
  }

  get topPicks(): Product[] {
    return this.availableFirst(
      this.products.filter((p) => !this.isAddOnProduct(p)),
    ).slice(0, 4);
  }

  /** Sirf wahi categories jinme items hain (khali categories hide) */
  get categoriesWithProducts(): CategoryGroup[] {
    return this.categories
      .map((category) => {
        const items = this.availableFirst(
          this.products.filter((p) => p.categoryId === category.id),
        );

        return {
          category,
          items,
          image: items.find((p) => !!p.imageUrl)?.imageUrl ?? "",
        };
      })
      .filter(
        (group) =>
          group.items.length > 0 && !this.isAddOnCategory(group.category.name),
      );
  }

  /* =========================
     SEARCH / FILTER
  ========================= */

  get isFiltering(): boolean {
    return this.searchText.trim() !== "" || this.selectedCategoryId !== null;
  }

  get selectedCategoryName(): string {
    return this.selectedCategoryId === null
      ? ""
      : this.getCategoryName(this.selectedCategoryId);
  }

  get filteredProducts(): Product[] {
    const text = this.searchText.trim().toLowerCase();

    const list = this.products.filter((product) => {
      const inCategory =
        this.selectedCategoryId === null ||
        product.categoryId === this.selectedCategoryId;

      const matchesText =
        !text ||
        `${product.name ?? ""} ${product.description ?? ""}`
          .toLowerCase()
          .includes(text);

      return inCategory && matchesText;
    });

    return this.availableFirst(list);
  }

  onSearch(value: string): void {
    this.searchText = value ?? "";
  }

  selectCategory(categoryId: number | null): void {
    this.selectedCategoryId =
      this.selectedCategoryId === categoryId ? null : categoryId;
  }

  clearFilters(): void {
    this.searchText = "";
    this.selectedCategoryId = null;
  }

  /* =========================
     FAVOURITES (is device me save hote hain)
  ========================= */

  loadFavourites(): void {
    try {
      const saved = localStorage.getItem(this.favouriteStorageKey);
      this.favouriteIds = saved ? JSON.parse(saved) : [];
    } catch {
      this.favouriteIds = [];
    }
  }

  isFavourite(productId: number): boolean {
    return this.favouriteIds.includes(productId);
  }

  toggleFavourite(product: Product): void {
    this.favouriteIds = this.isFavourite(product.id)
      ? this.favouriteIds.filter((id) => id !== product.id)
      : [...this.favouriteIds, product.id];

    localStorage.setItem(
      this.favouriteStorageKey,
      JSON.stringify(this.favouriteIds),
    );
  }

  get favouriteProducts(): Product[] {
    return this.products.filter((p) => this.favouriteIds.includes(p.id));
  }

  /* =========================
     COUPONS
  ========================= */

  copyCode(code: string): void {
    navigator.clipboard?.writeText(code).then(
      () => {
        this.copiedCode = code;
        setTimeout(() => (this.copiedCode = ""), 2000);
      },
      () => {
        this.copiedCode = "";
      },
    );
  }
}