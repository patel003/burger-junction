import { Component, OnInit, inject } from "@angular/core";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/services/api.service";
import { Category, CartItem, Product } from "../../../core/models/models";
import { AuthService } from "../../auth/services/auth.service";

@Component({
  selector: "app-menu",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./menu.component.html",
  // Naya CSS alag file me hai, purani menu.component.css waisi hi rahegi
  styleUrls: ["./menu.component.css"],
})
export class MenuComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private authService = inject(AuthService);

  private get cartStorageKey(): string {
    const userId = this.authService.getUserId();

    return userId
      ? `burger_junction_cart_${userId}`
      : "burger_junction_cart_guest";
  }

  categories: Category[] = [];
  products: Product[] = [];
  cart: CartItem[] = [];

  // Kaun sa screen dikhana hai: category cards ya items
  selectedCategoryId?: number;
  showAll = false;
  foodFilter: "all" | "veg" | "nonVeg" = "all";

  showCart = false;
  loading = true;
  error = "";

  customerName = "";
  customerPhone = "";
  deliveryAddress = "";

  ngOnInit(): void {
    this.loadCart();
    this.loadCategories();
    this.loadProducts();
  }

  /* ---------- Cart ---------- */

  loadCart(): void {
    if (!this.authService.isLoggedIn()) {
      this.cart = [];
      localStorage.removeItem("burger_junction_cart_guest");
      return;
    }

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
    if (!this.authService.isLoggedIn()) {
      return;
    }

    localStorage.setItem(this.cartStorageKey, JSON.stringify(this.cart));
  }

  /* ---------- Data ---------- */

  loadCategories(): void {
    this.api.getCategories().subscribe({
      next: (data) => {
        this.categories = data.filter((category) => category.isActive);
      },

      error: () =>
        (this.error = "Unable to load categories. Please try again."),
    });
  }

  // Poora menu ek baar laate hain, category ka filter page par hi hota hai
  loadProducts(): void {
    this.loading = true;

    this.api.getCustomerProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
        this.error = "";
      },

      error: () => {
        this.error = "Unable to load products. Please try again.";
        this.loading = false;
      },
    });
  }

  /* ---------- Category screens ---------- */

  get inProducts(): boolean {
    return this.showAll || this.selectedCategoryId !== undefined;
  }

  get selectedCategory(): Category | undefined {
    return this.categories.find((c) => c.id === this.selectedCategoryId);
  }

  // Sirf wahi categories dikhao jinme items hain
  // Menu me categories is order me dikhengi (baaki aakhir me)
  private readonly categoryOrder = [
    "burgers",
    "combos",
    "wraps",
    "rolls",
    "sandwiches",
    "pizzas",
    "pasta",
    "momos",
    "starters",
    "sides",
    "drinks",
    "shakes",
    "hot beverages",
    "desserts",
    "add-ons",
  ];

  private orderOf(category: Category): number {
    const i = this.categoryOrder.indexOf((category.name || "").toLowerCase());
    return i === -1 ? 999 : i;
  }

  get visibleCategories(): Category[] {
    return this.categories
      .filter((category) => {
        const categoryProducts = this.products.filter(
          (product) => product.categoryId === category.id,
        );

        if (this.foodFilter === "veg") {
          return categoryProducts.some((product) => product.isVeg);
        }

        if (this.foodFilter === "nonVeg") {
          return categoryProducts.some((product) => !product.isVeg);
        }

        return categoryProducts.length > 0;
      })
      .sort((a, b) => this.orderOf(a) - this.orderOf(b));
  }

  get visibleProducts(): Product[] {
    let products = this.showAll
      ? this.products
      : this.products.filter((p) => p.categoryId === this.selectedCategoryId);

    if (this.foodFilter === "veg") {
      products = products.filter((p) => p.isVeg);
    }

    if (this.foodFilter === "nonVeg") {
      products = products.filter((p) => !p.isVeg);
    }

    return products;
  }

  getCount(category: Category): number {
    return this.products.filter((p) => p.categoryId === category.id).length;
  }

  getCover(category: Category): string {
    const withImage = this.products.find(
      (p) => p.categoryId === category.id && !!p.imageUrl,
    );

    return withImage?.imageUrl ?? "";
  }

  getEmoji(category: Category): string {
    const name = (category.name || "").toLowerCase();

    if (name.includes("combo")) return "🍱";
    if (name.includes("wrap")) return "🌯";
    if (name.includes("roll")) return "🌯";
    if (name.includes("sandwich")) return "🥪";
    if (name.includes("pizza")) return "🍕";
    if (name.includes("pasta")) return "🍝";
    if (name.includes("momo")) return "🥟";
    if (name.includes("starter")) return "🍗";
    if (name.includes("side")) return "🍟";
    if (name.includes("hot")) return "☕";
    if (name.includes("shake")) return "🥤";
    if (name.includes("drink") || name.includes("beverage")) return "🥤";
    if (name.includes("dessert")) return "🍰";
    if (name.includes("add")) return "🧀";
    if (name.includes("burger")) return "🍔";

    return "🍽️";
  }

  openCategory(categoryId: number): void {
    this.selectedCategoryId = categoryId;
    this.showAll = false;
    window.scrollTo({ top: 0 });
  }

  openAll(): void {
    this.selectedCategoryId = undefined;
    this.showAll = true;
    window.scrollTo({ top: 0 });
  }

  backToCategories(): void {
    this.selectedCategoryId = undefined;
    this.showAll = false;
    window.scrollTo({ top: 0 });
  }

  /* ---------- Cart actions ---------- */

  addToCart(product: Product): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(["/login"]);
      return;
    }

    if (!product.isAvailable || product.stockQuantity <= 0) {
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

  removeFromCart(productId: number): void {
    const item = this.cart.find((x) => x.product.id === productId);

    if (!item) return;

    item.quantity--;

    if (item.quantity <= 0) {
      this.cart = this.cart.filter((x) => x.product.id !== productId);
    }

    this.saveCart();
  }

  get cartCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  get cartTotal(): number {
    return this.cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
  }

  goToCart(): void {
    this.router.navigate(["/cart"]);
  }

  placeOrder(): void {
    if (
      !this.customerName ||
      !this.customerPhone ||
      !this.deliveryAddress ||
      !this.cart.length
    ) {
      this.error =
        "Name, phone number, delivery address, and cart are required.";
      return;
    }

    this.api
      .createOrder({
        customerName: this.customerName,
        customerPhone: this.customerPhone,
        deliveryAddress: this.deliveryAddress,
        items: this.cart.map((x) => ({
          productId: x.product.id,
          quantity: x.quantity,
        })),
      })
      .subscribe({
        next: (order) => {
          alert(
            `Order #${order.id} placed successfully! Total ₹${order.totalAmount}`,
          );

          this.cart = [];

          localStorage.removeItem(this.cartStorageKey);

          this.showCart = false;
          this.customerName = "";
          this.customerPhone = "";
          this.deliveryAddress = "";
          this.error = "";
        },

        error: (err) =>
          (this.error =
            err?.error?.message ??
            "Unable to place the order. Please try again."),
      });
  }
}
