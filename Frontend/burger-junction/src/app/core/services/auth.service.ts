import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

 private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly tokenKey = 'burger_junction_token';
  private readonly userKey = 'burger_junction_user';

  constructor(private http: HttpClient) {}

  // -----------------------------
  // Register
  // -----------------------------

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        tap(response => {
          this.saveAuthData(response);
        })
      );
  }

  // -----------------------------
  // Login
  // -----------------------------

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(response => {
          this.saveAuthData(response);
        })
      );
  }

  // -----------------------------
  // Save token + user
  // -----------------------------

  private saveAuthData(response: AuthResponse): void {
    localStorage.setItem(
      this.tokenKey,
      response.token
    );

    localStorage.setItem(
      this.userKey,
      JSON.stringify({
        userId: response.userId,
        fullName: response.fullName,
        email: response.email,
        role: response.role
      })
    );
  }

  // -----------------------------
  // Get token
  // -----------------------------

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // -----------------------------
  // Get logged-in user
  // -----------------------------

  getUser(): {
    userId: string;
    fullName: string;
    email: string;
    role: string;
  } | null {

    const user = localStorage.getItem(this.userKey);

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  }

  // -----------------------------
  // Check authentication
  // -----------------------------

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // -----------------------------
  // Get role
  // -----------------------------

  getRole(): string | null {
    return this.getUser()?.role ?? null;
  }

  // -----------------------------
  // Logout
  // -----------------------------

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}