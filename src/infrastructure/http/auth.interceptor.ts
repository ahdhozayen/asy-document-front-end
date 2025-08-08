import { Injectable, Injector } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError, from, BehaviorSubject, of } from 'rxjs';
import { catchError, switchMap, filter, take, finalize, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../../core/use-cases/auth.service';
import { StorageService } from '../storage/storage.service';
import { ApiConfig } from './api.config';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshInProgress = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const storage = this.injector.get(StorageService);
    const authService = this.injector.get(AuthService);
    const router = this.injector.get(Router);
    const config = ApiConfig.getInstance();

    // Skip authentication for these endpoints
    const isAuthEndpoint = (
      req.url.includes('/token') || 
      req.url.includes('/auth/login')
    );
    
    // Only add auth token to non-auth endpoints
    if (!isAuthEndpoint) {
      const accessToken = storage.getAccessToken();
      if (accessToken) {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`
          }
        });
      }
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Only handle 401 errors for non-auth endpoints
        if (error.status === 401 && !isAuthEndpoint) {
          return this.handle401Error(req, next, authService, storage);
        }
        
        // For other errors, just propagate them
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler, authService: AuthService, storage: StorageService): Observable<HttpEvent<any>> {
    // If refresh is already in progress, wait for it to complete
    if (this.refreshInProgress) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          return next.handle(this.addTokenToRequest(request, token!));
        })
      );
    } else {
      this.refreshInProgress = true;
      // Reset the token subject to null
      this.refreshTokenSubject.next(null);

      const refreshToken = storage.getRefreshToken();
      
      // If no refresh token, logout and redirect
      if (!refreshToken) {
        this.refreshInProgress = false;
        authService.logout('session_expired');
        return throwError(() => new Error('No refresh token available'));
      }

      // Try to refresh the token
      return authService.refreshToken(refreshToken).pipe(
        switchMap((tokens) => {
          this.refreshInProgress = false;
          
          // Store the new tokens
          storage.setAuthTokens(tokens.access, tokens.refresh);
          
          // Notify all waiting requests that we have a new token
          this.refreshTokenSubject.next(tokens.access);
          
          // Retry the original request with the new token
          return next.handle(this.addTokenToRequest(request, tokens.access));
        }),
        catchError((error) => {
          this.refreshInProgress = false;
          // Clear tokens and redirect to login
          authService.logout('session_expired');
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInProgress = false;
        })
      );
    }
  }

  private addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}
