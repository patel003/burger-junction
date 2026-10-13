import { Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { NotificationBell } from "../../../core/components/notification-bell/notification-bell";

@Component({
  selector: "app-rider-layout",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell],
  templateUrl: "./rider-layout.component.html",
  styleUrl: "./rider-layout.component.css",
})
export class RiderLayoutComponent {}