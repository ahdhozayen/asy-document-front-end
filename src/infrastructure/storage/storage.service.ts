import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Intentionally ignored
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      // Intentionally ignored
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Intentionally ignored
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Intentionally ignored
    }
  }

  setObject<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.setItem(key, serialized);
    } catch {
      // Intentionally ignored
    }
  }

  getObject<T>(key: string): T | null {
    try {
      const item = this.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      // Intentionally ignored
      return null;
    }
  }

  // Auth-specific methods
  setAuthTokens(accessToken: string, refreshToken: string): void {
    this.setItem('access', accessToken);
    this.setItem('refresh', refreshToken);
  }

  getAccessToken(): string | null {
    return this.getItem('access');
  }

  getRefreshToken(): string | null {
    return this.getItem('refresh');
  }

  clearAuthTokens(): void {
    this.removeItem('access');
    this.removeItem('refresh');
  }

  hasValidTokens(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (!accessToken || !refreshToken) {
      return false;
    }

    // Basic JWT token validation - check if token is not expired
    try {
      const tokenPayload = this.parseJwt(accessToken);
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check if token is expired (with 5 minute buffer)
      if (tokenPayload.exp && tokenPayload.exp < (currentTime + 300)) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return false;
    }
  }

  private parseJwt(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to parse JWT token:', error);
      return {};
    }
  }

  // Language preference
  setLanguage(language: string): void {
    this.setItem('preferred-language', language);
  }

  getLanguage(): string | null {
    return this.getItem('preferred-language');
  }

  // User preferences
  setUserPreferences(preferences: Record<string, unknown>): void {
    this.setObject('user-preferences', preferences);
  }

  getUserPreferences(): Record<string, unknown> | null {
    return this.getObject('user-preferences');
  }
}
