import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Priority } from '../../domain/models/priority.model';
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
export class PriorityService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/lookups/priorities`;

  /**
   * Fetches all priorities from the API
   * @returns Observable of Priority array
   */
  getPriorities(): Observable<Priority[]> {
    return this.http.get<PaginatedResponse<Priority>>(this.apiUrl)
      .pipe(
        map(response => {
          // Check if response has the expected format (paginated)
          if (response && response.results && Array.isArray(response.results)) {
            return response.results;
          } else if (Array.isArray(response)) {
            // Handle case where API returns direct array instead of paginated response
            return response;
          } else {
            return [];
          }
        })
      );
  }
}
