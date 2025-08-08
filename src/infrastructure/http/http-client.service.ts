import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ApiConfig } from './api.config';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  private config = ApiConfig.getInstance();
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access');
    console.log('Getting auth headers, token:', token ? 'Present' : 'Missing');
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      console.log('Authorization header added');
    } else {
      console.warn('No access token found in localStorage');
    }

    return headers;
  }

  private getBasicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  private getMultipartHeaders(): HttpHeaders {
    const token = localStorage.getItem('access');
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('HTTP Error:', error);

    if (error.status === 401 && !this.isRefreshing) {
      return this.handle401Error();
    }

    const apiError = new ApiError(
      error.error?.message || error.message || 'An error occurred',
      error.status,
      error.error
    );

    return throwError(() => apiError);
  };

  private handle401Error(): Observable<never> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.asObservable().pipe(
        switchMap(() => throwError(() => new ApiError('Authentication failed', 401)))
      ) as Observable<never>;
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    const refreshToken = localStorage.getItem('refresh');
    if (!refreshToken) {
      this.logout();
      return throwError(() => new ApiError('No refresh token available', 401));
    }

    return this.refreshAccessToken(refreshToken).pipe(
      tap((tokens: { access: string; refresh: string }) => {
        this.isRefreshing = false;
        localStorage.setItem('access', tokens.access);
        this.refreshTokenSubject.next(tokens.access);
      }),
      catchError((error) => {
        this.isRefreshing = false;
        this.logout();
        return throwError(() => new ApiError('Token refresh failed', 401));
      })
    ) as Observable<never>;
  }

  private refreshAccessToken(refreshToken: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(this.config.endpoints.auth.refresh, { refresh: refreshToken }, { headers });
  }

  private logout(): void {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    window.location.href = '/';
  }

  get<T>(url: string): Observable<T> {
    const headers = this.getAuthHeaders();
    return this.http.get<T>(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  post<T>(url: string, data: unknown): Observable<T> {
    const headers = this.getAuthHeaders();
    return this.http.post<T>(url, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(url: string, data: unknown): Observable<T> {
    const headers = this.getAuthHeaders();
    return this.http.put<T>(url, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  patch<T>(url: string, data: unknown): Observable<T> {
    const headers = this.getAuthHeaders();
    return this.http.patch<T>(url, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(url: string): Observable<T> {
    const headers = this.getAuthHeaders();
    return this.http.delete<T>(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  postFormData<T>(url: string, formData: FormData): Observable<T> {
    const headers = this.getMultipartHeaders();
    return this.http.post<T>(url, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  downloadFile(url: string): Observable<Blob> {
    const headers = this.getAuthHeaders();
    return this.http.get(url, { 
      headers, 
      responseType: 'blob' 
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Special method for login requests (no auth header needed)
  postLogin<T>(url: string, data: unknown): Observable<T> {
    console.log('Making login request to:', url);
    const headers = this.getBasicHeaders();
    return this.http.post<T>(url, data, { headers }).pipe(
      tap(response => {
        console.log('Login response received:', response);
      }),
      catchError(error => {
        console.error('Login request failed:', error);
        return this.handleError(error);
      })
    );
  }
}
