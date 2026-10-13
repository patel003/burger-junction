import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

import { CartItem } from "../../../core/models/models";
import { ApiService } from "../../../core/services/api.service";
import { PaymentService } from "../../../core/services/payment.service";
import { AuthService } from "../../auth/services/auth.service";

import {
  CouponApplyResult,
  CouponCheckoutService,
} from "../services/coupon-checkout.service";
import {
  AfterViewInit,
  Component,
  OnDestroy,
  inject,
  OnInit,
} from "@angular/core";
import * as L from "leaflet";
// class line:  implements OnInit, AfterViewInit, OnDestroy

declare global {
  interface Window {
    Razorpay: any;
  }
}

declare const Razorpay: any;

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./checkout.component.html",
  styleUrl: "./checkout.component.css",
})
export class CheckoutComponent implements OnInit {
  private couponService = inject(CouponCheckoutService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);

  private get cartStorageKey(): string {
    const userId = this.authService.getUserId();

    return userId
      ? `burger_junction_cart_${userId}`
      : "burger_junction_cart_guest";
  }

  cartItems: CartItem[] = [];

  couponCode = "";
  customerName = "";
  customerPhone = "";
  deliveryAddress = "";

  paymentMethod = "Cash on Delivery";

  orderAmount = 0;
  discountAmount = 0;
  finalAmount = 0;

  couponApplied = false;
  couponMessage = "";
  couponError = false;
  applyingCoupon = false;

  // Razorpay
  processingPayment = false;
  deliveryLatitude: number | null = null;
  deliveryLongitude: number | null = null;
  locating = false;
  locationMessage = "";
  addressEditedByUser = false; // public rakho, template me use hoga

  private map: L.Map | null = null;
  private pin: L.Marker | null = null;

  // IMPORTANT:
  // Yahan apna Razorpay TEST KEY ID paste karna hai.
  // Secret Key kabhi frontend mein mat dalna.
  private readonly razorpayKeyId = "rzp_test_TiO36RQHZLpfqR";

  // =========================================
  // ORDER SUCCESS MODAL
  // =========================================

  showOrderSuccess = false;
  successOrderId = 0;
  successOrderTotal = 0;

  // =========================================
  // INITIALIZE
  // =========================================

  ngOnInit(): void {
    this.loadCart();
    this.loadCustomerDetails();

    const coupon = this.route.snapshot.queryParamMap.get("coupon");

    if (coupon && this.cartItems.length > 0) {
      this.couponCode = coupon;
      this.applyCoupon();
    }
  }

  // =========================================
  // LOAD CART
  // =========================================

  loadCart(): void {
    const savedCart = localStorage.getItem(this.cartStorageKey);

    if (!savedCart) {
      this.cartItems = [];
      this.orderAmount = 0;
      this.finalAmount = 0;
      return;
    }

    try {
      this.cartItems = JSON.parse(savedCart);

      this.orderAmount = this.cartItems.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0,
      );

      this.finalAmount = this.orderAmount;
    } catch {
      this.cartItems = [];
      this.orderAmount = 0;
      this.finalAmount = 0;
    }
  }

  // =========================================
  // LOAD CUSTOMER DETAILS
  // =========================================

  loadCustomerDetails(): void {
    this.customerName = this.authService.getUserName() ?? "";

    this.customerPhone = this.authService.getUserPhone() ?? "";
  }

  // =========================================
  // APPLY COUPON
  // =========================================

  applyCoupon(): void {
    const code = this.couponCode.trim();

    if (!code) {
      this.couponError = true;
      this.couponMessage = "Please enter a coupon code.";
      return;
    }

    if (this.orderAmount <= 0) {
      this.couponError = true;
      this.couponMessage = "Your cart is empty.";
      return;
    }

    this.applyingCoupon = true;
    this.couponMessage = "";
    this.couponError = false;

    this.couponService
      .applyCoupon({
        code,
        orderAmount: this.orderAmount,
      })
      .subscribe({
        next: (result: CouponApplyResult) => {
          this.applyingCoupon = false;

          if (!result.isValid) {
            this.couponApplied = false;
            this.discountAmount = 0;
            this.finalAmount = this.orderAmount;
            this.couponError = true;
            this.couponMessage = result.message;
            return;
          }

          this.couponApplied = true;
          this.couponError = false;
          this.discountAmount = result.discountAmount;
          this.finalAmount = result.finalAmount;
          this.couponMessage = result.message;
        },

        error: (error) => {
          console.error("Coupon apply failed:", error);

          this.applyingCoupon = false;
          this.couponApplied = false;
          this.discountAmount = 0;
          this.finalAmount = this.orderAmount;
          this.couponError = true;
          this.couponMessage = "Unable to apply coupon. Please try again.";
        },
      });
  }

  // =========================================
  // REMOVE COUPON
  // =========================================

  removeCoupon(): void {
    this.couponCode = "";
    this.couponApplied = false;
    this.couponMessage = "";
    this.couponError = false;
    this.discountAmount = 0;
    this.finalAmount = this.orderAmount;
  }

  // =========================================
  // PLACE ORDER
  // =========================================

  placeOrder(): void {
    // =================================
    // NAME VALIDATION
    // =================================

    if (!this.customerName.trim()) {
      this.couponError = true;
      this.couponMessage = "Please enter your name.";
      return;
    }

    // =================================
    // PHONE VALIDATION
    // =================================

    const phone = this.customerPhone.trim();

    if (!phone) {
      this.couponError = true;
      this.couponMessage = "Please enter your phone number.";
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      this.couponError = true;
      this.couponMessage =
        "Please enter a valid 10-digit Indian mobile number.";
      return;
    }

    // =================================
    // ADDRESS VALIDATION
    // =================================

    if (!this.deliveryAddress.trim()) {
      this.couponError = true;
      this.couponMessage = "Please enter your delivery address.";
      return;
    }

    if (this.deliveryLatitude === null || this.deliveryLongitude === null) {
      this.locationMessage =
        "Please map par apni delivery location pin karein.";
      document
        .getElementById("checkout-map")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // =================================
    // CART VALIDATION
    // =================================

    if (!this.cartItems.length) {
      this.couponError = true;
      this.couponMessage = "Your cart is empty.";
      return;
    }

    // =================================
    // PAYMENT PROCESSING
    // =================================

    if (this.processingPayment) {
      return;
    }

    // =================================
    // ORDER PAYLOAD
    // =================================

    const payload = {
      customerName: this.customerName.trim(),
      customerPhone: this.customerPhone.trim(),
      deliveryAddress: this.deliveryAddress.trim(),

      items: this.cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),

      couponCode: this.couponApplied ? this.couponCode.trim() : undefined,
      deliveryLatitude: this.deliveryLatitude,
      deliveryLongitude: this.deliveryLongitude,
    };

    this.couponError = false;
    this.couponMessage = "";
    this.processingPayment = true;

    // =================================
    // CREATE ORDER
    // =================================

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        // =================================
        // CASH ON DELIVERY
        // =================================

        if (this.paymentMethod === "Cash on Delivery") {
          this.paymentService
            .createPayment({
              orderId: order.id,
              paymentMethod: this.paymentMethod,
            })
            .subscribe({
              next: (payment) => {
                console.log("COD payment created successfully:", payment);

                this.processingPayment = false;

                this.showSuccessModal(order.id, order.totalAmount);
              },

              error: (paymentError) => {
                console.error("COD payment creation failed:", paymentError);

                this.processingPayment = false;

                this.couponError = true;

                this.couponMessage =
                  paymentError?.error?.message ||
                  "Order created, but payment could not be recorded. Please contact support.";
              },
            });

          return;
        }

        // =================================
        // RAZORPAY ONLINE PAYMENT
        // =================================

        this.openRazorpayCheckout(order);
      },

      // =================================
      // ORDER ERROR
      // =================================

      error: (error) => {
        console.error("Order creation failed:", error);

        this.processingPayment = false;
        this.couponError = true;

        // =================================
        // BACKEND VALIDATION ERRORS
        // =================================

        if (error?.error?.errors) {
          const errors = error.error.errors;
          const messages: string[] = [];

          Object.keys(errors).forEach((key) => {
            const fieldErrors = errors[key];

            if (Array.isArray(fieldErrors)) {
              messages.push(...fieldErrors);
            }
          });

          this.couponMessage =
            messages.length > 0
              ? messages[0]
              : "Please check your order details.";

          return;
        }

        // =================================
        // BACKEND BUSINESS ERROR
        // =================================

        const backendMessage =
          error?.error?.message ||
          "Order place nahi ho saka. Please try again.";

        if (
          backendMessage === "Restaurant is currently not accepting new orders."
        ) {
          this.couponMessage =
            "Online ordering is currently unavailable. Please try again later.";
        } else {
          this.couponMessage = backendMessage;
        }
      },
    });
  }

  // =========================================
  // RAZORPAY CHECKOUT
  // =========================================

  private openRazorpayCheckout(order: any): void {
    console.log("Creating Razorpay order for:", order.id);

    this.paymentService.createRazorpayOrder(order.id).subscribe({
      next: (razorpayOrder) => {
        console.log("Razorpay order created:", razorpayOrder);

        const options = {
          key: this.razorpayKeyId,

          amount: Math.round(razorpayOrder.amount * 100),

          currency: razorpayOrder.currency,

          name: "Burger Junction",

          description: `Payment for Order #${order.id}`,

          order_id: razorpayOrder.razorpayOrderId,

          prefill: {
            name: this.customerName.trim(),
            contact: this.customerPhone.trim(),
          },

          notes: {
            orderId: order.id.toString(),
            customerName: this.customerName.trim(),
          },

          theme: {
            color: "#f97316",
          },

          modal: {
            ondismiss: () => {
              console.log("Razorpay checkout closed.");

              this.processingPayment = false;

              this.couponError = true;

              this.couponMessage =
                "Payment was cancelled. Your order is still pending.";
            },
          },

          handler: (response: any) => {
            console.log("Razorpay payment response:", response);

            // =========================================
            // VERIFY PAYMENT ON BACKEND
            // =========================================

            this.paymentService
              .verifyRazorpayPayment({
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              .subscribe({
                next: (result) => {
                  console.log("Razorpay payment verified:", result);

                  this.processingPayment = false;

                  this.showSuccessModal(order.id, order.totalAmount);
                },

                error: (error) => {
                  console.error("Razorpay payment verification failed:", error);

                  this.processingPayment = false;

                  this.couponError = true;

                  this.couponMessage =
                    error?.error?.message ||
                    "Payment verification failed. Please contact support.";
                },
              });
          },
        };

        if (!window.Razorpay) {
          this.processingPayment = false;

          this.couponError = true;

          this.couponMessage =
            "Razorpay Checkout load nahi hua. Please refresh the page and try again.";

          console.error("Razorpay Checkout script not loaded.");

          return;
        }

        const razorpay = new Razorpay(options);

        razorpay.on("payment.failed", (response: any) => {
          console.error("Razorpay payment failed:", response);

          this.processingPayment = false;

          this.couponError = true;

          this.couponMessage =
            response?.error?.description || "Payment failed. Please try again.";
        });

        razorpay.open();
      },

      error: (error) => {
        console.error("Razorpay order creation failed:", error);

        this.processingPayment = false;

        this.couponError = true;

        this.couponMessage =
          error?.error?.message ||
          "Unable to start online payment. Please try again.";
      },
    });
  }

  // =========================================
  // SUCCESS MODAL
  // =========================================

  private showSuccessModal(orderId: number, totalAmount: number): void {
    this.successOrderId = orderId;
    this.successOrderTotal = totalAmount;

    this.showOrderSuccess = true;

    // =================================
    // CLEAR CART
    // =================================

    localStorage.removeItem(this.cartStorageKey);

    this.cartItems = [];

    this.orderAmount = 0;
    this.discountAmount = 0;
    this.finalAmount = 0;

    this.couponCode = "";
    this.couponApplied = false;

    this.paymentMethod = "Cash on Delivery";
  }

  // =========================================
  // SUCCESS MODAL ACTIONS
  // =========================================

  viewMyOrders(): void {
    this.showOrderSuccess = false;
    this.router.navigate(["/orders"]);
  }

  continueShopping(): void {
    this.showOrderSuccess = false;
    this.router.navigate(["/"]);
  }

  closeSuccessModal(): void {
    this.showOrderSuccess = false;
  }

  // =========================================
  // BACK TO CART
  // =========================================

  goBackToCart(): void {
    this.router.navigate(["/cart"]);
  }

  ngAfterViewInit(): void {
    const el = document.getElementById("checkout-map");
    if (!el) return;

    this.map = L.map(el).setView([28.6139, 77.209], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on("click", (e: L.LeafletMouseEvent) =>
      this.setPin(e.latlng.lat, e.latlng.lng),
    );
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.locationMessage =
        "Is browser me GPS nahi hai. Map par pin lagayein.";
      return;
    }
    this.locating = true;
    this.locationMessage = "";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating = false;
        this.setPin(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        this.locating = false;
        this.locationMessage =
          "Location nahi mili. Permission allow karein ya map par pin lagayein.";
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  private setPin(lat: number, lng: number): void {
    this.deliveryLatitude = lat;
    this.deliveryLongitude = lng;
    this.locationMessage = "";
    if (!this.map) return;

    if (!this.pin) {
      this.pin = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: '<div style="font-size:34px;line-height:34px;">📍</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 32],
        }),
      }).addTo(this.map);

      this.pin.on("dragend", () => {
        const p = this.pin!.getLatLng();
        this.setPin(p.lat, p.lng);
      });
    } else {
      this.pin.setLatLng([lat, lng]);
    }

    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 16));
    void this.reverseGeocode(lat, lng);
  }

  // Address khali ho ya user ne khud edit na kiya ho tabhi auto-fill hota hai.
  private async reverseGeocode(lat: number, lng: number): Promise<void> {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      url.searchParams.set("zoom", "18");

      const res = await fetch(url.toString());
      if (!res.ok) return;

      const data = (await res.json()) as { display_name?: string };
      if (data.display_name && !this.addressEditedByUser) {
        this.deliveryAddress = data.display_name;
      }
    } catch {
      // Address manually bhi bhar sakte hain.
    }
  }
}
