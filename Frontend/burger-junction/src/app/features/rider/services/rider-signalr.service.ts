import { Injectable, NgZone, inject } from "@angular/core";
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { Subject } from "rxjs";

import { environment } from "../../../../environments/environment";
import { AuthService } from "../../auth/services/auth.service";

export interface RiderDeliveryAssignedEvent {
  orderId: number;
  message: string;
  customerName: string;
  deliveryAddress: string;
  status: string;
}

export interface RiderLocationUpdate {
  orderId: number;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

// Rider ki location itne milliseconds me ek baar server ko jayegi.
// Rider ruka hua ho tab bhi last position isi interval par dobara bheji jati hai,
// taaki customer ko "GPS signal weak" na dikhe.
const SEND_INTERVAL_MS = 5000;

@Injectable({
  providedIn: "root",
})
export class RiderSignalRService {
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  private connection: HubConnection | null = null;
  private connectingPromise: Promise<void> | null = null;

  private readonly hubUrl = `${environment.apiUrl.replace(/\/api\/?$/, "")}/hubs/rider`;

  private locationWatchId: number | null = null;
  private sendTimer: ReturnType<typeof setInterval> | null = null;
  private latest: { latitude: number; longitude: number } | null = null;

  private deliveryAssignedSubject = new Subject<RiderDeliveryAssignedEvent>();
  readonly deliveryAssigned$ = this.deliveryAssignedSubject.asObservable();

  private riderLocationSubject = new Subject<RiderLocationUpdate>();
  readonly riderLocation$ = this.riderLocationSubject.asObservable();

  private trackingErrorsSubject = new Subject<string>();
  readonly trackingErrors$ = this.trackingErrorsSubject.asObservable();

  get isSharingLocation(): boolean {
    return this.locationWatchId !== null;
  }

  // =========================================
  // CONNECTION
  // =========================================

  async startConnection(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    if (!this.authService.getToken()) {
      throw new Error("JWT token missing. Please log in again.");
    }

    const connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.authService.getToken() ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection = connection;

    connection.on("DeliveryAssigned", (event: RiderDeliveryAssignedEvent) => {
      this.ngZone.run(() => this.deliveryAssignedSubject.next(event));
    });

    connection.on("RiderLocationUpdated", (event: RiderLocationUpdate) => {
      this.ngZone.run(() => this.riderLocationSubject.next(event));
    });

    connection.onreconnecting(() => {
      console.warn("Rider SignalR reconnecting...");
    });

    connection.onreconnected(async () => {
      console.log("Rider SignalR reconnected.");

      // User group dobara join karna padta hai (DeliveryAssigned events ke liye).
      // Location sharing ko order group ki zarurat nahi, isliye wahan kuch rejoin nahi.
      try {
        const userId = this.authService.getUserId();

        if (userId) {
          await connection.invoke("JoinUserGroup", userId);
        }
      } catch (error) {
        console.error("Unable to rejoin user group:", error);
      }
    });

    connection.onclose(() => {
      console.warn("Rider SignalR connection closed.");

      if (this.connection === connection) {
        this.connection = null;
      }
    });

    this.connectingPromise = (async () => {
      try {
        await connection.start();

        const userId = this.authService.getUserId();

        if (userId) {
          await connection.invoke("JoinUserGroup", userId);
        }
      } catch (error) {
        if (this.connection === connection) {
          this.connection = null;
        }

        try {
          await connection.stop();
        } catch {
          // Ignore connection cleanup errors.
        }

        throw error;
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  async joinOrderTracking(orderId: number): Promise<void> {
    await this.ensureConnected();
    await this.connection!.invoke("JoinOrderTrackingGroup", orderId);
  }

  // =========================================
  // LIVE LOCATION (rider ke SAARE active orders ke liye ek hi watcher)
  // =========================================

  async startLocationSharing(): Promise<void> {
    if (!navigator.geolocation) {
      const message = "This browser does not support GPS location.";
      this.trackingErrorsSubject.next(message);
      throw new Error(message);
    }

    await this.ensureConnected();

    // Check await ke BAAD hai, taaki do saath wali calls me do watcher na ban jayein.
    if (this.locationWatchId !== null) {
      return;
    }

    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const isFirstFix = this.latest === null;

        this.latest = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Pehli location turant bhejo, baaki timer se jayengi.
        if (isFirstFix) {
          void this.sendLatest();
        }
      },
      (error) => {
        let message = "Unable to access rider location.";

        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location permission denied. Browser settings mein GPS allow karein.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message =
            "GPS location unavailable hai. Device location settings check karein.";
        } else if (error.code === error.TIMEOUT) {
          message = "GPS request timeout hua. Dobara try karein.";
        }

        console.error("Rider GPS watcher error:", {
          code: error.code,
          message: error.message,
        });

        this.ngZone.run(() => this.trackingErrorsSubject.next(message));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      },
    );

    // Timer Angular ke bahar chalta hai taaki har 5 sec par change detection na chale.
    this.ngZone.runOutsideAngular(() => {
      this.sendTimer = setInterval(
        () => void this.sendLatest(),
        SEND_INTERVAL_MS,
      );
    });
  }

  stopLocationSharing(): void {
    if (this.locationWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }

    if (this.sendTimer !== null) {
      clearInterval(this.sendTimer);
    }

    this.locationWatchId = null;
    this.sendTimer = null;
    this.latest = null;
  }

  private async sendLatest(): Promise<void> {
    const connection = this.connection;
    const position = this.latest;

    if (
      !position ||
      !connection ||
      connection.state !== HubConnectionState.Connected
    ) {
      return;
    }

    try {
      // Server khud rider ke saare "Out for Delivery" orders update karta hai.
      await connection.invoke(
        "UpdateMyLocation",
        position.latitude,
        position.longitude,
      );
    } catch (error) {
      console.error("GPS update failed:", error);

      this.ngZone.run(() => {
        this.trackingErrorsSubject.next(
          "Backend ne GPS update accept nahi kiya. Backend logs check karein.",
        );
      });
    }
  }

  private get isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  private async ensureConnected(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    await this.startConnection();

    if (!this.isConnected) {
      throw new Error("Rider SignalR connection is not available.");
    }
  }

  async stopConnection(): Promise<void> {
    this.stopLocationSharing();

    if (!this.connection) {
      return;
    }

    const connection = this.connection;
    this.connection = null;

    try {
      await connection.stop();
    } catch (error) {
      console.error("Unable to stop Rider SignalR:", error);
    }
  }
}
