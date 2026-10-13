import { Routes } from "@angular/router";

import { authGuard } from "./core/guards/auth.guard";
import { MainLayoutComponent } from "./layout/main-layout/main-layout.component";
import { AdminLayoutComponent } from "./features/admin/layout/admin-layout.component";
import { adminGuard } from "./core/guards/admin.guard";
import { riderGuard } from "./core/guards/rider.guard";
import { RiderLayoutComponent } from "./features/rider/layout/rider-layout.component";

export const routes: Routes = [
  // =========================
  // CUSTOMER WEBSITE
  // =========================

  {
    path: "",
    component: MainLayoutComponent,

    children: [
      // Home
      {
        path: "",
        loadComponent: () =>
          import("./features/home/home.component").then((m) => m.HomeComponent),
      },

      // Menu
      {
        path: "menu",
        loadComponent: () =>
          import("./features/menu/components/menu.component").then(
            (m) => m.MenuComponent,
          ),
      },

      // Offers
      {
        path: "offers",
        loadComponent: () =>
          import("./features/offers/offers").then((m) => m.OffersComponent),
      },

      // Services
      {
        path: "services",
        loadComponent: () =>
          import("./features/services/services.component").then(
            (m) => m.ServicesComponent,
          ),
      },

      // About
      {
        path: "about",
        loadComponent: () =>
          import("./features/about/about").then((m) => m.AboutComponent),
      },

      // Contact
      {
        path: "contact",
        loadComponent: () =>
          import("./features/contact/contact").then((m) => m.ContactComponent),
      },

      // Profile - Login Required
      {
        path: "profile",
        canActivate: [authGuard],
        loadComponent: () =>
          import("./features/profile/profile").then((m) => m.ProfileComponent),
      },

      // Orders - Login Required
      {
        path: "orders",
        canActivate: [authGuard],
        loadComponent: () =>
          import("./features/orders/components/orders-list/orders-list.component").then(
            (m) => m.OrdersListComponent,
          ),
      },

      // Live Order Tracking - Login Required
      {
        path: "track-order",
        canActivate: [authGuard],
        loadComponent: () =>
          import("./features/orders/order-tracking/order-tracking").then(
            (m) => m.OrderTrackingComponent,
          ),
      },

      // Cart
      {
        path: "cart",
        loadComponent: () =>
          import("./features/cart/components/cart.component").then(
            (m) => m.CartComponent,
          ),
      },

      // Checkout - Login Required
      {
        path: "checkout",
        canActivate: [authGuard],
        loadComponent: () =>
          import("./features/checkout/components/checkout.component").then(
            (m) => m.CheckoutComponent,
          ),
      },
    ],
  },

  // =========================
  // AUTH
  // =========================

  // Login
  {
    path: "login",
    loadComponent: () =>
      import("./features/auth/components/login/login.component").then(
        (m) => m.LoginComponent,
      ),
  },

  // Register
  {
    path: "register",
    loadComponent: () =>
      import("./features/auth/components/register/register.component").then(
        (m) => m.RegisterComponent,
      ),
  },

  // Forgot Password
  {
    path: "forgot-password",
    loadComponent: () =>
      import("./features/auth/components/forgot-password/forgot-password.component").then(
        (m) => m.ForgotPasswordComponent,
      ),
  },

  // Reset Password
  {
    path: "reset-password",
    loadComponent: () =>
      import("./features/auth/components/reset-password/reset-password.component").then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // =========================
  // RIDER PANEL
  // =========================

  {
    path: "rider",
    component: RiderLayoutComponent,
    canActivate: [riderGuard],

    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/rider/rider-dashboard/rider-dashboard.component").then(
            (m) => m.RiderDashboardComponent,
          ),
      },

      {
        path: "history",
        loadComponent: () =>
          import("./features/rider/rider-history/rider-history.component").then(
            (m) => m.RiderHistoryComponent,
          ),
      },

      {
        path: "profile",
        loadComponent: () =>
          import("./features/rider/rider-profile/rider-profile.component").then(
            (m) => m.RiderProfileComponent,
          ),
      },
    ],
  },

  // =========================
  // ADMIN PANEL
  // =========================

  {
    path: "admin",
    component: AdminLayoutComponent,
    canActivate: [adminGuard],

    children: [
      // Dashboard
      {
        path: "",
        loadComponent: () =>
          import("./features/admin/dashboard/dashboard.component").then(
            (m) => m.DashboardComponent,
          ),
      },

      // Products
      {
        path: "products",
        loadComponent: () =>
          import("./features/admin/products/products.component").then(
            (m) => m.ProductsComponent,
          ),
      },

      // Inventory
      {
        path: "inventory",
        loadComponent: () =>
          import("./features/admin/inventory/inventory.component").then(
            (m) => m.InventoryComponent,
          ),
      },

      // Categories
      {
        path: "categories",
        loadComponent: () =>
          import("./features/admin/categories/categories.component").then(
            (m) => m.CategoriesComponent,
          ),
      },

      // Orders
      {
        path: "orders",
        loadComponent: () =>
          import("./features/admin/orders/orders.component").then(
            (m) => m.OrdersComponent,
          ),
      },

      // Customers
      {
        path: "customers",
        loadComponent: () =>
          import("./features/admin/customers/customers.component").then(
            (m) => m.CustomersComponent,
          ),
      },

      // Riders
      {
        path: "riders",
        loadComponent: () =>
          import("./features/admin/riders/riders.component").then(
            (m) => m.RidersComponent,
          ),
      },

      // Analytics
      {
        path: "analytics",
        loadComponent: () =>
          import("./features/admin/analytics/analytics").then(
            (m) => m.Analytics,
          ),
      },

      // Coupons
      {
        path: "coupons",
        loadComponent: () =>
          import("./features/admin/coupons/coupons.component").then(
            (m) => m.CouponsComponent,
          ),
      },

      // Services
      {
        path: "services",
        loadComponent: () =>
          import("./features/admin/services/services.component").then(
            (m) => m.ServicesComponent,
          ),
      },

      // Admin Profile
      {
        path: "profile",
        loadComponent: () =>
          import("./features/admin/profile/profile").then((m) => m.Profile),
      },

      // Settings
      {
        path: "settings",
        loadComponent: () =>
          import("./features/admin/settings/settings").then((m) => m.Settings),
      },
    ],
  },

  // =========================
  // UNKNOWN ROUTE
  // =========================

  {
    path: "**",
    redirectTo: "",
  },
];
