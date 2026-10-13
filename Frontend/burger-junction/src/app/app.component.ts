import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

// Rider in pages par bhi ja sakta hai (login/logout ke liye).
// Baaki har page par jaate hi use wapas /rider bhej diya jayega.
const RIDER_ALLOWED_PREFIXES = [
  '/rider',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth',
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  private router = inject(Router);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.keepRiderOnRiderPanel(event.urlAfterRedirects));
  }

  private keepRiderOnRiderPanel(url: string): void {
    if (!this.isRider()) {
      return;
    }

    const path = url.split('?')[0].split('#')[0];

    const allowed = RIDER_ALLOWED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix + '/'),
    );

    if (!allowed) {
      this.router.navigateByUrl('/rider', { replaceUrl: true });
    }
  }

  // Role saved user se aur JWT token se dhoondhta hai (bade-chhote akshar ka farq nahi).
  private isRider(): boolean {
    const roles: string[] = [];

    const add = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(add);
      } else if (typeof value === 'string' && value.trim()) {
        roles.push(value.trim().toLowerCase());
      }
    };

    try {
      const user = JSON.parse(localStorage.getItem('burger_junction_user') ?? 'null');
      add(user?.role);
      add(user?.roles);
    } catch {
      // ignore
    }

    try {
      const token =
        localStorage.getItem('burger_junction_token') ?? localStorage.getItem('token');

      if (token) {
        const payload = JSON.parse(
          atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
        );

        add(payload['role']);
        add(payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
      }
    } catch {
      // ignore
    }

    return roles.includes('rider');
  }
}