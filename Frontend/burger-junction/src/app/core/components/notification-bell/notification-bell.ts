import { CommonModule } from "@angular/common";
import {
  Notification,
  NotificationService,
} from "../../services/notification.service";
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  inject,
} from "@angular/core";
import { Router } from "@angular/router";
import { RiderSignalRService } from "../../../features/rider/services/rider-signalr.service";

@Component({
  selector: "app-notification-bell",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./notification-bell.html",
  styleUrl: "./notification-bell.css",
})
export class NotificationBell implements OnInit {
  notifications: Notification[] = [];

  isOpen = false;
  loading = false;

  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private riderSignalR = inject(RiderSignalRService);

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();

    this.riderSignalR.deliveryAssigned$.subscribe(() => {
      this.loadNotifications();
    });
  }

  loadNotifications(): void {
    // AuthService login par "burger_junction_token" me token rakhta hai.
    // Purani key "token" bhi chalne di hai taaki kuch na tute.
    const token =
      localStorage.getItem("burger_junction_token") ??
      localStorage.getItem("token");

    if (!token) {
      return;
    }

    this.loading = true;

    this.notificationService.getMyNotifications().subscribe({
      next: (response) => {
        this.notifications = response;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notifications = [];
      },
    });
  }

  get unreadCount(): number {
    return this.notifications.filter((notification) => !notification.isRead)
      .length;
  }

  toggleNotifications(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  markAsRead(notification: Notification): void {
    if (notification.isRead) {
      return;
    }

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.isRead = true;
      },
    });
  }

  // Login ke time save hua role (AuthService wali same localStorage key)
  private getRole(): string | null {
    try {
      const user = JSON.parse(
        localStorage.getItem("burger_junction_user") ?? "null",
      );
      return user?.role ?? null;
    } catch {
      return null;
    }
  }

  openNotification(notification: Notification): void {
    this.markAsRead(notification);
    this.isOpen = false;

    // Rider -> rider panel, Admin -> admin orders, Customer -> My Orders
    switch (this.getRole()) {
      case "Rider":
        this.router.navigate(["/rider"]);
        break;
      case "Admin":
        this.router.navigate(["/admin/orders"]);
        break;
      default:
        this.router.navigate(["/orders"]);
        break;
    }
  }

  markAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(
      (notification) => !notification.isRead,
    );

    unreadNotifications.forEach((notification) => {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.isRead = true;
        },
      });
    });
  }

  closeNotifications(): void {
    this.isOpen = false;
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;

    if (!this.elementRef.nativeElement.contains(target)) {
      this.isOpen = false;
    }
  }
}