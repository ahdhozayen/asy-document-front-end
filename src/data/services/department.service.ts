import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Department } from '../../domain/models/department.model';
import { environment } from '@env/environment';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl = `${environment.apiUrl}/lookups/departments`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches all departments from the API
   * @returns Observable of Department array
   */
  getDepartments(): Observable<Department[]> {
    return this.http.get<any>(this.apiUrl)
      .pipe(
        map(response => {
          // Check if response has the expected format
          if (response && response.results && Array.isArray(response.results)) {
            console.log('Department API response:', response);
            return response.results;
          } else if (Array.isArray(response)) {
            // Handle case where API returns direct array instead of paginated response
            console.log('Department API returned direct array:', response);
            return response;
          } else {
            console.error('Unexpected department API response format:', response);
            return [];
          }
        })
      );
  }
}
