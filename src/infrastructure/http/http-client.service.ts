import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

  private http = inject(HttpClient);

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access');

    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
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

    const apiError = new ApiError(
      error.error?.message || error.message || 'An error occurred',
      error.status,
      error.error
    );

    return throwError(() => apiError);
  };

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

  postLogin<T>(url: string, data: unknown): Observable<T> {
    const headers = this.getBasicHeaders();
    return this.http.post<T>(url, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }
}
