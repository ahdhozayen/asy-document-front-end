import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
  HttpClient
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { StorageService } from '../storage/storage.service';
import { ApiConfig } from './api.config';
import { inject } from '@angular/core';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshInProgress = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  private storage = inject(StorageService);
  private httpClient = inject(HttpClient);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip authentication for these endpoints
    const isAuthEndpoint = req.url.includes('/token') || req.url.includes('/auth/login');

    // Only add auth token to non-auth endpoints
    let authReq = req;
    if (!isAuthEndpoint) {
      const accessToken = this.storage.getAccessToken();
      if (accessToken) {
        authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`
          }
        });
      }
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Only handle 401 errors for non-auth endpoints
        if (error.status === 401 && !isAuthEndpoint) {
          return this.handle401Error(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.refreshInProgress) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(this.addTokenToRequest(request, token!)))
      );
    }

    this.refreshInProgress = true;
    this.refreshTokenSubject.next(null);

    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      this.refreshInProgress = false;
      this.storage.clearAuthTokens();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.httpClient
      .post<{ access: string; refresh?: string }>(ApiConfig.getInstance().endpoints.auth.refresh, { refresh: refreshToken })
      .pipe(
        switchMap((tokens: { access: string; refresh?: string }) => {
          this.refreshInProgress = false;
          // Update storage with new access token, keep existing refresh token if not provided
          this.storage.setAuthTokens(tokens.access, tokens.refresh || refreshToken);
          this.refreshTokenSubject.next(tokens.access);
          return next.handle(this.addTokenToRequest(request, tokens.access));
        }),
        catchError(error => {
          this.refreshInProgress = false;
          this.refreshTokenSubject.next(null);
          // Clear tokens on refresh failure
          this.storage.clearAuthTokens();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInProgress = false;
        })
      );
  }

  private addTokenToRequest(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}
