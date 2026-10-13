import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import * as L from "leaflet";

interface RouteResult {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: number[][] };
  }>;
}

const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const ROUTE_REFRESH_MS = 30000; // road route itni der me ek baar
const ROUTE_REFRESH_METERS = 150; // ya rider itna hil jaye

// Leaflet ke elements par component CSS lagti nahi, isliye inline style
function pin(background: string, size: number, radius: string): string {
  return (
    `<div style="width:${size}px;height:${size}px;border-radius:${radius};` +
    `background:${background};border:3px solid #fff;` +
    `box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>`
  );
}

@Component({
  selector: "app-rider-map",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <div #mapEl class="map" role="application" aria-label="Delivery map"></div>

      <div class="chips">
        <div class="chip" *ngIf="etaMinutes !== null && distanceKm !== null">
          {{ etaMinutes }} min · {{ distanceKm | number: "1.1-1" }} km
        </div>
        <div class="chip warn" *ngIf="gpsMessage">{{ gpsMessage }}</div>
      </div>

      <button
        type="button"
        class="recenter"
        aria-label="Recenter map"
        (click)="recenter()"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>

      <div class="note" *ngIf="!hasDest">
        Customer ka pin save nahi hai (purana order). Navigate address se khulega.
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .wrap {
        position: relative;
        isolation: isolate;
        height: 270px;
        overflow: hidden;
        border: 1.5px solid #dfe6e2;
        border-radius: 22px;
        background: #ecf0ee;
      }

      .map {
        position: absolute;
        inset: 0;
      }

      .chips {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }

      .chip {
        padding: 7px 12px;
        border-radius: 20px;
        background: #fff;
        box-shadow: 0 2px 8px rgba(20, 35, 28, 0.2);
        color: #14231c;
        font-size: 13px;
        font-weight: 800;
      }

      .chip.warn {
        background: #fff4e5;
        color: #8a4300;
        font-weight: 700;
      }

      .recenter {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 1000;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 2px 8px rgba(20, 35, 28, 0.2);
        color: #0b6b4a;
        cursor: pointer;
      }

      .note {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 12px;
        z-index: 1000;
        padding: 9px 12px;
        border-radius: 12px;
        background: #fff4e5;
        color: #8a4300;
        font-size: 12px;
        font-weight: 600;
      }
    `,
  ],
})
export class RiderMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  // Customer ka pin (null ho sakta hai purane orders me)
  @Input() destLat: number | null = null;
  @Input() destLng: number | null = null;

  // false ho to sirf markers dikhte hain (route aur ETA nahi).
  // Pickup se pehle rider pehle restaurant jayega, to customer tak ka ETA galat hota.
  @Input() showRoute = true;

  @ViewChild("mapEl", { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private zone = inject(NgZone);

  private map: L.Map | null = null;
  private riderMarker: L.Marker | null = null;
  private destMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;

  private riderPos: [number, number] | null = null;
  private watchId: number | null = null;
  private lastRouteAt = 0;
  private lastRoutePos: [number, number] | null = null;
  private routeRequestId = 0;
  private destroyed = false;

  distanceKm: number | null = null;
  etaMinutes: number | null = null;
  gpsMessage = "";

  get hasDest(): boolean {
    return this.destLat != null && this.destLng != null;
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.mapEl.nativeElement, { zoomControl: false }).setView(
        this.hasDest ? [this.destLat as number, this.destLng as number] : DEFAULT_CENTER,
        this.hasDest ? 15 : 11,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(this.map);
    });

    setTimeout(() => this.map?.invalidateSize(), 200);

    this.syncDestination();
    this.startWatch();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if (changes["destLat"] || changes["destLng"]) {
      this.syncDestination();
    }

    if (changes["showRoute"]) {
      if (this.showRoute) {
        void this.updateRoute(true);
      } else {
        this.clearRoute();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.routeRequestId++;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.map?.remove();
    this.map = null;
  }

  recenter(): void {
    const map = this.map;
    if (!map) return;

    const points: L.LatLngExpression[] = [];
    if (this.hasDest) points.push([this.destLat as number, this.destLng as number]);
    if (this.riderPos) points.push(this.riderPos);

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points).pad(0.25), { maxZoom: 16 });
    }
  }

  // Rider ki apni location (sirf dikhane ke liye; server ko bhejne ka kaam
  // RiderSignalRService karti hai jab delivery chalu hoti hai).
  private startWatch(): void {
    if (!navigator.geolocation) {
      this.gpsMessage = "GPS is not supported";
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) =>
        this.zone.run(() =>
          this.onPosition([position.coords.latitude, position.coords.longitude]),
        ),
      (error) =>
        this.zone.run(() => {
          this.gpsMessage =
            error.code === error.PERMISSION_DENIED
              ? "Location permission denied"
              : "GPS unavailable";
        }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }

  private onPosition(position: [number, number]): void {
    this.gpsMessage = "";

    const isFirst = !this.riderPos;
    this.riderPos = position;

    if (this.map) {
      if (!this.riderMarker) {
        this.riderMarker = L.marker(position, {
          icon: L.divIcon({
            className: "",
            html: pin("#0b6b4a", 22, "50%"),
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          zIndexOffset: 1000,
        }).addTo(this.map);
      } else {
        this.riderMarker.setLatLng(position);
      }
    }

    if (isFirst) this.recenter();

    void this.updateRoute();
  }

  private syncDestination(): void {
    const map = this.map;
    if (!map) return;

    if (this.hasDest) {
      const position: [number, number] = [
        this.destLat as number,
        this.destLng as number,
      ];

      if (!this.destMarker) {
        this.destMarker = L.marker(position, {
          icon: L.divIcon({
            className: "",
            html: pin("#14231c", 24, "6px"),
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(map);
      } else {
        this.destMarker.setLatLng(position);
      }

      this.recenter();
      void this.updateRoute(true);
    } else {
      this.destMarker?.remove();
      this.destMarker = null;
      this.clearRoute();
    }
  }

  private clearRoute(): void {
    this.routeRequestId++;
    this.routeLine?.remove();
    this.routeLine = null;
    this.distanceKm = null;
    this.etaMinutes = null;
  }

  private async updateRoute(force = false): Promise<void> {
    const map = this.map;
    const rider = this.riderPos;

    if (!map || !rider || !this.hasDest || !this.showRoute) return;

    const dest: [number, number] = [this.destLat as number, this.destLng as number];

    // Public routing server par har GPS update se request nahi bhejni.
    const moved = this.lastRoutePos ? map.distance(this.lastRoutePos, rider) : Infinity;

    if (
      !force &&
      Date.now() - this.lastRouteAt < ROUTE_REFRESH_MS &&
      moved < ROUTE_REFRESH_METERS
    ) {
      return;
    }

    this.lastRouteAt = Date.now();
    this.lastRoutePos = rider;

    const requestId = ++this.routeRequestId;

    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${rider[1]},${rider[0]};${dest[1]},${dest[0]}` +
        `?overview=full&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Route failed: ${response.status}`);

      const result = (await response.json()) as RouteResult;

      if (this.destroyed || requestId !== this.routeRequestId) return;

      const route = result.routes?.[0];
      if (result.code !== "Ok" || !route) return;

      const points: L.LatLngExpression[] = route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng],
      );

      if (this.routeLine) {
        this.routeLine.setLatLngs(points);
      } else {
        this.routeLine = L.polyline(points, {
          color: "#0b6b4a",
          weight: 5,
          opacity: 0.85,
        }).addTo(map);
      }

      this.zone.run(() => {
        this.distanceKm = route.distance / 1000;
        this.etaMinutes = Math.max(1, Math.ceil(route.duration / 60));
      });
    } catch (error) {
      console.error("Route calculation failed:", error);
    }
  }
}