import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { CartItem } from "../../../core/models/models";
import { AuthService } from "../../auth/services/auth.service";

@Component({
  selector: "app-cart",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./cart.component.html",
  styleUrl: "./cart.component.css",
})
export class CartComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private get cartStorageKey(): string {
    const userId = this.authService.getUserId();

    return userId
      ? `burger_junction_cart_${userId}`
      : "burger_junction_cart_guest";
  }

  cartItems: CartItem[] = [];

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    if (!this.authService.isLoggedIn()) {
      this.cartItems = [];
      localStorage.removeItem("burger_junction_cart_guest");
      return;
    }

    const savedCart = localStorage.getItem(this.cartStorageKey);

    if (!savedCart) {
      this.cartItems = [];
      return;
    }

    try {
      this.cartItems = JSON.parse(savedCart);
    } catch {
      this.cartItems = [];
    }
  }

  saveCart(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    localStorage.setItem(this.cartStorageKey, JSON.stringify(this.cartItems));
  }

  increaseQuantity(item: CartItem): void {
    if (!item.product.isAvailable) {
      return;
    }

    if (item.quantity >= item.product.stockQuantity) {
      return;
    }

    item.quantity++;
    this.saveCart();
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      item.quantity--;
      this.saveCart();
      return;
    }

    this.removeItem(item.product.id);
  }

  hasUnavailableItems(): boolean {
    return this.cartItems.some(
      (item) =>
        !item.product.isAvailable ||
        item.product.stockQuantity <= 0 ||
        item.quantity > item.product.stockQuantity,
    );
  }

  canIncrease(item: CartItem): boolean {
    return (
      item.product.isAvailable && item.quantity < item.product.stockQuantity
    );
  }

  removeItem(productId: number): void {
    this.cartItems = this.cartItems.filter(
      (item) => item.product.id !== productId,
    );

    this.saveCart();
  }

  getItemCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  getSubtotal(): number {
    return this.cartItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    );
  }

  formatPrice(price: number): string {
    return `₹${price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  proceedToCheckout(): void {
    if (this.cartItems.length === 0) {
      return;
    }

    if (this.hasUnavailableItems()) {
      return;
    }

    this.router.navigate(["/checkout"]);
  }
}
