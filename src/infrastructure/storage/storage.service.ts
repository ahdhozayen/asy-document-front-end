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
  return true;

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
