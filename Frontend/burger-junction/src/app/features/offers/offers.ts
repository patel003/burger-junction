import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router";

import { ApiService } from "../../core/services/api.service";
import { Coupon } from "../../core/models/models";

type OfferFilter = "all" | "percentage" | "flat";

@Component({
  selector: "app-offers",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./offers.html",
  styleUrl: "./offers.css",
})
export class OffersComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  coupons: Coupon[] = [];

  loading = true;
  errorMessage = "";
  copiedCode = "";
  activeFilter: OfferFilter = "all";

  readonly steps = [
    { title: "Copy the code", text: "Tap Copy on the offer you like." },
    { title: "Add items to cart", text: "Pick your burgers and meet the minimum order." },
    { title: "Apply at checkout", text: "Paste the code and see your discount." },
  ];

  readonly faqs = [
    {
      q: "Can I use two coupons on one order?",
      a: "No. Only one coupon can be applied per order, so pick the one that saves you the most.",
    },
    {
      q: "Why is my coupon not applying?",
      a: "Check that your cart meets the minimum order amount, the offer has not expired, and uses are still left.",
    },
    {
      q: "Is there a limit on how much I can save?",
      a: "Yes. Percentage offers have a maximum saving, shown on each offer card.",
    },
  ];

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.loading = true;
    this.errorMessage = "";

    this.api.getActiveCoupons().subscribe({
      next: (coupons) => {
        this.coupons = coupons ?? [];
        this.loading = false;
      },

      error: (error) => {
        console.error("Offers loading failed:", error);

        this.errorMessage =
          error?.error?.message ||
          "Unable to load offers right now.";

        this.loading = false;
      },
    });
  }

  /* ---------- Filters ---------- */

  private isPercentage(coupon: Coupon): boolean {
    return coupon.discountType.toLowerCase() === "percentage";
  }

  get hasBothTypes(): boolean {
    const pct = this.coupons.some((c) => this.isPercentage(c));
    const flat = this.coupons.some((c) => !this.isPercentage(c));
    return pct && flat;
  }

  get filteredCoupons(): Coupon[] {
    if (this.activeFilter === "all") return this.coupons;
    const wantPct = this.activeFilter === "percentage";
    return this.coupons.filter((c) => this.isPercentage(c) === wantPct);
  }

  setFilter(filter: OfferFilter): void {
    this.activeFilter = filter;
  }

  /* ---------- Hero ---------- */

  get maxSaving(): number {
    return Math.max(0, ...this.coupons.map((c) => c.maximumDiscountAmount || 0));
  }

  get bestCoupon(): Coupon | null {
    if (!this.coupons.length) return null;
    return [...this.coupons].sort(
      (a, b) => (b.maximumDiscountAmount || 0) - (a.maximumDiscountAmount || 0)
    )[0];
  }

  /* ---------- Card helpers ---------- */

  getDiscountText(coupon: Coupon): string {
    if (this.isPercentage(coupon)) {
      return `${coupon.discountValue}% OFF`;
    }

    return `₹${coupon.discountValue} OFF`;
  }

  getMinimumOrderText(coupon: Coupon): string {
    if (coupon.minimumOrderAmount > 0) {
      return `On orders above ₹${coupon.minimumOrderAmount}`;
    }

    return "No minimum order";
  }

  getExpiryText(coupon: Coupon): string {
    return `Valid until ${new Date(
      coupon.expiryDate
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  }

  getDaysLeft(coupon: Coupon): number {
    const ms = new Date(coupon.expiryDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }

  getExpiryBadge(coupon: Coupon): string {
    const days = this.getDaysLeft(coupon);
    if (days > 30) return "";
    if (days <= 1) return "Ends today";
    return `Ends in ${days} days`;
  }

  getUsesLeft(coupon: Coupon): number {
    return Math.max(0, coupon.usageLimit - coupon.usedCount);
  }

  getUsesLeftPercent(coupon: Coupon): number {
    if (!coupon.usageLimit) return 0;
    return Math.round((this.getUsesLeft(coupon) / coupon.usageLimit) * 100);
  }

  /* ---------- Actions ---------- */

  copyCode(code: string): void {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        this.copiedCode = code;

        setTimeout(() => {
          if (this.copiedCode === code) {
            this.copiedCode = "";
          }
        }, 2000);
      })
      .catch(() => {
        this.copiedCode = "";
      });
  }

  useOffer(code: string): void {
    this.router.navigate(
      ["/checkout"],
      {
        queryParams: {
          coupon: code,
        },
      }
    );
  }
}