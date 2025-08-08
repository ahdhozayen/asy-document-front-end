import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  setObject<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.setItem(key, serialized);
    } catch (error) {
      console.error('Error serializing object to localStorage:', error);
    }
  }

  getObject<T>(key: string): T | null {
    try {
      const item = this.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error deserializing object from localStorage:', error);
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
      console.log('Missing tokens - access:', !!accessToken, 'refresh:', !!refreshToken);
      return false;
    }
    
    // Check if access token is expired (basic check)
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < currentTime;
      
      if (isExpired) {
        console.log('Access token is expired');
        // Don't return false here - let the refresh token handle it
      }
      
      console.log('Tokens validation - access expired:', isExpired, 'has refresh:', !!refreshToken);
      return true; // Return true if we have both tokens, even if access is expired
    } catch (error) {
      console.error('Error parsing access token:', error);
      return false;
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
