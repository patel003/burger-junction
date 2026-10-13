import {AfterViewInit, Component, NgZone, OnDestroy, OnInit, inject} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import {HubConnection,HubConnectionBuilder,LogLevel} from "@microsoft/signalr";
import * as L from "leaflet";
import { firstValueFrom } from "rxjs";
import { environment } from "../../../../environments/environment";
import { AuthService } from "../../auth/services/auth.service";
import { Router } from "@angular/router";

interface OrderDetails {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  status: string;
  riderName?: string | null;
  riderPhone?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  riderLatitude?: number | null;
  riderLongitude?: number | null;
  riderLocationUpdatedAt?: string | null;
}

interface RiderLocation {
  orderId: number;
  latitude: number;
  longitude: number;
  updatedAt: string | Date | null;
}

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name?: string;
}

interface RouteResult {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: number[][] };
  }>;
}

// Map hamesha banta hai. Destination na mile to ye fallback center use hota hai.
const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];

// Delivery hone ke baad customer is page par bheja jata hai.
// NOTE: app.routes.ts me "My Orders" ka jo path ho wahi likho.
const MY_ORDERS_ROUTE = "/orders";
const REDIRECT_DELAY_MS = 3000;    // "deliver ho gaya" message dikhane ka time
const STATUS_POLL_MS = 5000;       // order status/rider details refresh
const ROUTE_REFRESH_MS = 30000;    // road route max itni baar
const ROUTE_REFRESH_METERS = 150;  // ya rider itna hil jaye
const STALE_AFTER_SECONDS = 60;    // itni der GPS na aaye to warning

const TRACKING_STEPS = [
  { label: "Order placed", statuses: ["Pending", "Confirmed"] },
  { label: "Preparing", statuses: ["Preparing", "Ready for Pickup"] },
  { label: "On the way", statuses: ["Out for Delivery"] },
  { label: "Delivered", statuses: ["Delivered"] }
];

// SQL se aayi date me 'Z' nahi hoti, isliye browser use local time samajh leta hai.
function parseUtc(value: string | Date): Date {
  if (value instanceof Date) return value;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

// Leaflet ke banaye elements par Angular ki component CSS lagti nahi,
// isliye marker ki styling inline rakhi hai.
function pinHtml(background: string, emoji: string, size: number): string {
  return (
    `<div style="width:${size}px;height:${size}px;border-radius:50%;` +
    `background:${background};border:3px solid #fff;` +
    `box-shadow:0 2px 9px rgba(0,0,0,.3);display:flex;` +
    `align-items:center;justify-content:center;font-size:${Math.round(size / 2)}px;">` +
    `${emoji}</div>`
  );
}

@Component({
  selector: "app-order-tracking",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./order-tracking.html",
  styleUrl: "./order-tracking.css"
})
export class OrderTrackingComponent
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);

  private connection: HubConnection | null = null;
  private map: L.Map | null = null;
  private riderMarker: L.Marker | null = null;
  private customerMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;

  private mapReady = false;
  private destroyed = false;
  private routeRequestId = 0;
  private lastRouteAt = 0;
  private lastRoutePosition: [number, number] | null = null;
  private lastRiderPosition: [number, number] | null = null;
  private customerPosition: [number, number] | null = null;
  private animationFrame = 0;
  private statusTimer: ReturnType<typeof setInterval> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  // Phone/background tab me browser timers rok deta hai. Customer jab
  // page par wapas aaye to turant fresh status + OTP le aao.
  private readonly onVisible = (): void => {
    if (document.visibilityState === "visible") {
      void this.refreshOrder();
    }
  };

  readonly steps = TRACKING_STEPS.map((step) => step.label);

  orderId: number | null = null;
  order: OrderDetails | null = null;
  location: RiderLocation | null = null;

  connecting = true;
  connected = false;
  loadingOrder = true;
  loadingDestination = false;

  errorMessage = "";
  destinationMessage = "";
  routeMessage = "";

  // Delivery OTP (sirf order ka customer dekh sakta hai)
  deliveryOtp: string | null = null;

  // Delivery hote hi true: template "My Orders par ja rahe hain" dikhata hai
  redirecting = false;

  distanceKm: number | null = null;
  etaMinutes: number | null = null;

  // "x sec pehle" text ke liye
  now = Date.now();

  // =========================================
  // LIFECYCLE
  // =========================================

  async ngOnInit(): Promise<void> {
    const rawId = new URLSearchParams(window.location.search).get("orderId");
    const id = Number(rawId);

    if (!rawId || !Number.isInteger(id) || id <= 0) {
      this.errorMessage = "Valid order ID nahi mila.";
      this.connecting = false;
      this.loadingOrder = false;
      return;
    }

    this.orderId = id;

    if (!this.authService.getToken()) {
      this.errorMessage = "Login session nahi mila. Dobara login karein.";
      this.connecting = false;
      this.loadingOrder = false;
      return;
    }

    this.clockTimer = setInterval(() => {
      this.now = Date.now();
    }, 5000);

    await this.loadOrder(id);

    if (this.destroyed) return;

    this.statusTimer = setInterval(() => void this.refreshOrder(), STATUS_POLL_MS);
    document.addEventListener("visibilitychange", this.onVisible);

    await this.connectToHub(id);
  }

  ngAfterViewInit(): void {
    this.mapReady = true;
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.routeRequestId++;
    cancelAnimationFrame(this.animationFrame);

    if (this.statusTimer) clearInterval(this.statusTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
    document.removeEventListener("visibilitychange", this.onVisible);
    if (this.redirectTimer) clearTimeout(this.redirectTimer);

    const connection = this.connection;
    this.connection = null;

    if (connection) {
      connection.off("RiderLocationUpdated");
      void connection.stop();
    }

    this.map?.remove();
    this.map = null;
    this.riderMarker = null;
    this.customerMarker = null;
    this.routeLine = null;
  }

  // =========================================
  // ORDER LOAD + REFRESH
  // =========================================

  private fetchOrder(id: number): Promise<OrderDetails> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken() ?? ""}`
    });

    const baseUrl = environment.apiUrl.replace(/\/+$/, "");

    return firstValueFrom(
      this.http.get<OrderDetails>(`${baseUrl}/orders/${id}`, { headers })
    );
  }

  private async loadOrder(id: number): Promise<void> {
    this.loadingOrder = true;

    try {
      const order = await this.fetchOrder(id);

      if (this.destroyed) return;

      this.ngZone.run(() => this.applyOrder(order));

      // Purane orders (jinme pin save nahi) ke liye fallback geocoding.
      if (!this.customerPosition) {
        if (order.deliveryAddress?.trim()) {
          void this.geocodeCustomerAddress(order.deliveryAddress);
        } else {
          this.destinationMessage = "Order ka delivery address nahi mila.";
        }
      }
    } catch (error) {
      console.error("Order load failed:", error);

      this.ngZone.run(() => {
        this.loadingOrder = false;
        this.errorMessage =
          "Order details load nahi hui. Login, API URL aur order access check karein.";
      });
    }
  }

  private redirectToMyOrders(): void {
    if (this.redirectTimer) return;

    this.redirecting = true;

    this.redirectTimer = setTimeout(() => {
      if (!this.destroyed) {
        void this.router.navigateByUrl(MY_ORDERS_ROUTE);
      }
    }, REDIRECT_DELAY_MS);
  }

  private async loadDeliveryOtp(id: number): Promise<void> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken() ?? ""}`
    });

    const baseUrl = environment.apiUrl.replace(/\/+$/, "");

    try {
      const result = await firstValueFrom(
        this.http.get<{ otp: string | null }>(
          `${baseUrl}/orders/${id}/delivery-otp`,
          { headers }
        )
      );

      if (this.destroyed) return;

      this.ngZone.run(() => {
        this.deliveryOtp = result.otp ?? null;
      });
    } catch {
      // Temporary error: agle status poll (5 sec) par dobara try hoga.
    }
  }

  private async refreshOrder(): Promise<void> {
    if (this.destroyed || !this.orderId) return;

    try {
      const order = await this.fetchOrder(this.orderId);

      if (this.destroyed) return;

      this.ngZone.run(() => this.applyOrder(order));

      if (order.status === "Delivered" || order.status === "Cancelled") {
        if (this.statusTimer) clearInterval(this.statusTimer);
        this.statusTimer = null;
      }
    } catch {
      // Temporary network error: agle poll par dobara try hoga.
    }
  }

  private applyOrder(order: OrderDetails): void {
    const previousStatus = this.order?.status ?? null;

    this.order = order;
    this.loadingOrder = false;

    // Delivery page par rehte hue hui hai: thodi der baad My Orders par bhejo.
    // (Purana delivered order seedha kholne par redirect nahi hota.)
    if (
      order.status === "Delivered" &&
      previousStatus !== null &&
      previousStatus !== "Delivered"
    ) {
      this.redirectToMyOrders();
    }

    // Rider ke paas order aate hi customer ko OTP dikhana hai
    if (order.status === "Out for Delivery") {
      void this.loadDeliveryOtp(order.id);
    } else {
      this.deliveryOtp = null;
    }

    // Checkout par save hui pin sabse reliable destination hai.
    if (
      !this.customerPosition &&
      order.deliveryLatitude != null &&
      order.deliveryLongitude != null
    ) {
      this.customerPosition = [order.deliveryLatitude, order.deliveryLongitude];
      this.destinationMessage = `Destination: ${order.deliveryAddress}`;
      this.syncMarkers();
      void this.updateRoute(true);
    }

    // Hub se pehle last known location (agar rider delivery par hai).
    if (
      !this.location &&
      order.status === "Out for Delivery" &&
      order.riderLatitude != null &&
      order.riderLongitude != null
    ) {
      this.applyRiderLocation({
        orderId: order.id,
        latitude: order.riderLatitude,
        longitude: order.riderLongitude,
        updatedAt: order.riderLocationUpdatedAt ?? null
      });
    }
  }

  // =========================================
  // GEOCODING (sirf purane orders ke liye backup)
  // =========================================

  private async geocodeCustomerAddress(address: string): Promise<void> {
    this.loadingDestination = true;
    this.destinationMessage = "Customer ka address map par dhoondh rahe hain...";

    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "in");
      url.searchParams.set("q", address);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const results = (await response.json()) as GeocodingResult[];

      if (this.destroyed) return;

      if (!results.length) {
        this.destinationMessage =
          "Is order ka address map par nahi mila. Rider ki live location phir bhi map par dikhegi.";
        return;
      }

      const latitude = Number(results[0].lat);
      const longitude = Number(results[0].lon);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        this.destinationMessage = "Customer ke coordinates valid nahi hain.";
        return;
      }

      this.customerPosition = [latitude, longitude];
      this.destinationMessage = results[0].display_name
        ? `Destination: ${results[0].display_name}`
        : "Customer destination mil gaya.";

      this.syncMarkers();
      void this.updateRoute(true);
    } catch (error) {
      console.error("Address geocoding failed:", error);
      this.destinationMessage =
        "Address map par locate nahi ho paya. Rider ki live location phir bhi map par dikhegi.";
    } finally {
      this.loadingDestination = false;
    }
  }

  // =========================================
  // SIGNALR
  // =========================================

  private async connectToHub(orderId: number): Promise<void> {
    const baseUrl = environment.apiUrl.replace(/\/api\/?$/, "");
    const hubUrl = `${baseUrl}/hubs/rider`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.authService.getToken() ?? ""
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection = connection;

    connection.on("RiderLocationUpdated", (data: RiderLocation) => {
      if (this.destroyed || data.orderId !== this.orderId) return;

      this.ngZone.run(() => this.applyRiderLocation(data));
    });

    connection.onreconnecting(() => {
      this.ngZone.run(() => {
        this.connected = false;
        this.errorMessage = "Connection reconnect ho raha hai...";
      });
    });

    connection.onreconnected(async () => {
      if (this.destroyed) return;

      try {
        // Join karte hi hub last saved location dobara bhej deta hai.
        await connection.invoke("JoinOrderTrackingGroup", orderId);

        this.ngZone.run(() => {
          this.connected = true;
          this.errorMessage = "";
        });
      } catch (error) {
        console.error("Rejoin failed:", error);
        this.ngZone.run(() => {
          this.connected = false;
          this.errorMessage = "Tracking group dobara join nahi hua.";
        });
      }
    });

    connection.onclose(() => {
      if (this.destroyed) return;

      this.ngZone.run(() => {
        this.connected = false;
        this.errorMessage =
          "Tracking connection band ho gaya. Page refresh karke try karein.";
      });
    });

    try {
      await connection.start();

      if (this.destroyed) {
        await connection.stop();
        return;
      }

      await connection.invoke("JoinOrderTrackingGroup", orderId);

      this.ngZone.run(() => {
        this.connected = true;
        this.errorMessage = "";
      });
    } catch (error) {
      console.error("SignalR connection failed:", error);

      this.ngZone.run(() => {
        this.connected = false;
        this.errorMessage =
          "Live tracking connect nahi hua. Backend URL aur authorization check karein.";
      });
    } finally {
      this.ngZone.run(() => {
        this.connecting = false;
      });
    }
  }

  private applyRiderLocation(data: RiderLocation): void {
    if (
      !Number.isFinite(data.latitude) ||
      !Number.isFinite(data.longitude) ||
      data.latitude < -90 || data.latitude > 90 ||
      data.longitude < -180 || data.longitude > 180
    ) {
      return;
    }

    this.location = data;
    this.now = Date.now();

    const position: [number, number] = [data.latitude, data.longitude];
    this.lastRiderPosition = position;

    this.moveRiderMarker(position);
    void this.updateRoute();
  }

  // =========================================
  // MAP
  // =========================================

  private initializeMap(): void {
    if (this.destroyed || !this.mapReady || this.map) return;

    const element = document.getElementById("rider-live-map");
    if (!element) return;

    const start = this.customerPosition ?? this.lastRiderPosition;

    // Map ke mouse events Angular change detection na chalayein.
    this.ngZone.runOutsideAngular(() => {
      this.map = L.map(element).setView(start ?? DEFAULT_CENTER, start ? 14 : 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
      }).addTo(this.map);
    });

    setTimeout(() => this.map?.invalidateSize(), 200);

    this.syncMarkers();
    void this.updateRoute(true);
  }

  // Jo markers abhi tak nahi bane, unhe banata hai. Zoom sirf tab fit hota hai
  // jab naya marker aaye, taaki customer ka manual zoom/pan na toote.
  private syncMarkers(): void {
    if (!this.map) return;

    let added = false;

    if (this.customerPosition) {
      if (!this.customerMarker) {
        this.customerMarker = L.marker(this.customerPosition, {
          icon: L.divIcon({
            className: "",
            html: pinHtml("#16a34a", "🏠", 42),
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          })
        }).addTo(this.map);

        this.customerMarker.bindPopup("Customer delivery destination");
        added = true;
      } else {
        this.customerMarker.setLatLng(this.customerPosition);
      }
    }

    if (this.lastRiderPosition && !this.riderMarker) {
      this.createRiderMarker(this.lastRiderPosition);
      added = true;
    }

    if (added) this.fitAll();
  }

  private createRiderMarker(position: [number, number]): void {
    if (!this.map) return;

    this.riderMarker = L.marker(position, {
      icon: L.divIcon({
        className: "",
        html: pinHtml("#dc2626", "🛵", 46),
        iconSize: [46, 46],
        iconAnchor: [23, 23]
      }),
      zIndexOffset: 1000
    }).addTo(this.map);

    this.riderMarker.bindPopup("Your delivery rider");
  }

  private moveRiderMarker(target: [number, number]): void {
    if (!this.map) return;

    if (!this.riderMarker) {
      this.createRiderMarker(target);
      this.fitAll();
      return;
    }

    // Marker jump nahi karega, 1.5 second me smoothly slide karega.
    const marker = this.riderMarker;
    const from = marker.getLatLng();
    const startTime = performance.now();
    const duration = 1500;

    cancelAnimationFrame(this.animationFrame);

    this.ngZone.runOutsideAngular(() => {
      const step = (time: number) => {
        const progress = Math.min(1, (time - startTime) / duration);

        marker.setLatLng([
          from.lat + (target[0] - from.lat) * progress,
          from.lng + (target[1] - from.lng) * progress
        ]);

        if (progress < 1 && !this.destroyed) {
          this.animationFrame = requestAnimationFrame(step);
        }
      };

      this.animationFrame = requestAnimationFrame(step);
    });
  }

  private fitAll(): void {
    if (!this.map) return;

    const points: L.LatLngExpression[] = [];
    if (this.customerPosition) points.push(this.customerPosition);
    if (this.lastRiderPosition) points.push(this.lastRiderPosition);

    if (points.length === 1) {
      this.map.setView(points[0], 15);
    } else if (points.length > 1) {
      this.map.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 16 });
    }
  }

  // Template ke "Recenter" button ke liye
  recenter(): void {
    this.fitAll();
  }

  private async updateRoute(force = false): Promise<void> {
    const rider = this.lastRiderPosition;
    const customer = this.customerPosition;
    const map = this.map;

    if (!rider || !customer || !map) return;

    // Public routing server par har GPS update se request nahi bhejni.
    const moved = this.lastRoutePosition
      ? map.distance(this.lastRoutePosition, rider)
      : Infinity;
    const elapsed = Date.now() - this.lastRouteAt;

    if (!force && elapsed < ROUTE_REFRESH_MS && moved < ROUTE_REFRESH_METERS) {
      return;
    }

    this.lastRouteAt = Date.now();
    this.lastRoutePosition = rider;

    const requestId = ++this.routeRequestId;

    if (!this.routeLine) {
      this.routeMessage = "Road route calculate ho raha hai...";
    }

    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${rider[1]},${rider[0]};${customer[1]},${customer[0]}` +
        `?overview=full&geometries=geojson`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Route service failed: ${response.status}`);
      }

      const result = (await response.json()) as RouteResult;

      if (this.destroyed || requestId !== this.routeRequestId) return;

      const route = result.routes?.[0];

      if (result.code !== "Ok" || !route) {
        this.ngZone.run(() => {
          this.routeMessage = "Road route abhi available nahi hai.";
        });
        return;
      }

      const points: L.LatLngExpression[] = route.geometry.coordinates.map(
        ([longitude, latitude]) => [latitude, longitude]
      );

      if (this.routeLine) {
        this.routeLine.setLatLngs(points);
      } else {
        this.routeLine = L.polyline(points, {
          color: "#dc2626",
          weight: 5,
          opacity: 0.85
        }).addTo(map);
      }

      this.ngZone.run(() => {
        this.distanceKm = route.distance / 1000;
        this.etaMinutes = Math.max(1, Math.ceil(route.duration / 60));
        this.routeMessage = "";
      });
    } catch (error) {
      console.error("Route calculation failed:", error);

      if (requestId === this.routeRequestId) {
        this.ngZone.run(() => {
          this.routeMessage =
            "Road route service unavailable. Rider aur destination markers phir bhi dikhte rahenge.";
        });
      }
    }
  }

  // =========================================
  // TEMPLATE HELPERS
  // =========================================

  get isOutForDelivery(): boolean {
    return this.order?.status === "Out for Delivery";
  }

  get isDelivered(): boolean {
    return this.order?.status === "Delivered";
  }

  get isCancelled(): boolean {
    return this.order?.status === "Cancelled";
  }

  get currentStep(): number {
    const status = this.order?.status;
    if (!status) return -1;

    return TRACKING_STEPS.findIndex((step) => step.statuses.includes(status));
  }

  stepState(index: number): "done" | "active" | "todo" {
    const current = this.currentStep;

    if (current < 0) return "todo";
    if (index < current || (index === current && this.isDelivered)) return "done";

    return index === current ? "active" : "todo";
  }

  private get lastUpdated(): Date | null {
    const raw = this.location?.updatedAt;
    if (!raw) return null;

    const date = parseUtc(raw);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  get lastUpdatedText(): string {
    const date = this.lastUpdated;
    if (!date) return "";

    const seconds = Math.max(0, Math.round((this.now - date.getTime()) / 1000));

    if (seconds < 10) return "abhi abhi";
    if (seconds < 60) return `${seconds} sec pehle`;

    return `${Math.floor(seconds / 60)} min pehle`;
  }

  get isStale(): boolean {
    const date = this.lastUpdated;

    return !!date && (this.now - date.getTime()) / 1000 > STALE_AFTER_SECONDS;
  }

  get mapUrl(): string {
    if (!this.location) return "";

    return `https://www.google.com/maps?q=${this.location.latitude},${this.location.longitude}`;
  }

  get destinationMapUrl(): string {
    if (!this.customerPosition) return "";

    const [latitude, longitude] = this.customerPosition;

    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }
}