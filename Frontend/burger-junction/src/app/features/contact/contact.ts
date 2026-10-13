import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-contact",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./contact.html",
  styleUrl: "./contact.css",
})
export class ContactComponent {}