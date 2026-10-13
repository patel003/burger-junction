import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from "../footer/footer.component";

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
  HeaderComponent,
  FooterComponent,
  RouterOutlet
],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit {
  private router = inject(Router);

  // Rider ka kaam sirf /rider panel me hai.
  // Agar rider customer website kholta hai to use rider panel par bhej do.
  // (AuthService import nahi kiya: wahi localStorage key padhi jo login save karta hai)
  ngOnInit(): void {
    try {
      const token = localStorage.getItem('burger_junction_token');
      const user = JSON.parse(localStorage.getItem('burger_junction_user') ?? 'null');

      if (token && user?.role === 'Rider') {
        this.router.navigateByUrl('/rider', { replaceUrl: true });
      }
    } catch {
      // localStorage block ho ya data kharab ho to kuch mat karo
    }
  }
}