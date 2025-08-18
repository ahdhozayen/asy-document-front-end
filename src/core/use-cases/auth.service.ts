import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HttpClientService } from '../../infrastructure/http/http-client.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { ToastService } from '../../infrastructure/ui/toast.service';
import { ApiConfig } from '../../infrastructure/http/api.config';
import { User, AuthResult, LoginCredentials } from '../entities';
import { UserApiResponse } from '../entities/user.model';

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    avatar?: string;
    created_at: string;
    updated_at: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private config = ApiConfig.getInstance();
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(true);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  private httpClient = inject(HttpClientService);
  private storage = inject(StorageService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  constructor() {
    this.initializeAuth();
  }

  // Synchronous method to check authentication status
  isAuthenticatedSync(): boolean {
    return this.storage.hasValidTokens();
  }

  private initializeAuth(): void {
    this.isLoadingSubject.next(true);
    const hasTokens = this.storage.hasValidTokens();

    if (hasTokens) {
      this.loadStoredUser();
      if (hasTokens && !this.currentUserSubject.value?.displayName) {
  const placeholderUser = this.createPlaceholderUser(this.storage.getItem('username') || 'User');
  this.currentUserSubject.next(placeholderUser);
  this.storage.setObject('current-user', placeholderUser);
}
      this.isAuthenticatedSubject.next(true);

      this.getCurrentUser().subscribe({
        next: (user) => this.currentUserSubject.next(user)
      });
    } else {
      this.storage.removeItem('current-user');
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      this.isLoadingSubject.next(false);
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResult> {
    return this.httpClient.postLogin<LoginResponse>(this.config.endpoints.auth.login, {
      username: credentials.username,
      password: credentials.password
    }).pipe(
      map(response => {


        const user = response.user ?
          User.fromApiResponse(response.user) :
          this.createPlaceholderUser(credentials.username);

        const result = {
          user,
          accessToken: response.access,
          refreshToken: response.refresh
        };



        return result;
      }),
      tap(result => {


        this.storage.setAuthTokens(result.accessToken, result.refreshToken);

        // Store user for faster initialization on refresh
        this.storage.setObject('current-user', result.user);
        this.storage.setItem('username', credentials.username);

        // Verify tokens were stored


        this.currentUserSubject.next(result.user);
        this.isAuthenticatedSubject.next(true);

        // If we have a placeholder user, try to fetch real user data
        if (result.user.email === credentials.username && !result.user.firstName) {
          this.getCurrentUser().subscribe({
            next: (user) => this.currentUserSubject.next(user),
            error: () => {
              // Ignore errors, keep placeholder user
            }
          });
        }
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Logs out the user and clears all authentication data.
   * If a reason is provided (e.g., 'session_expired'), shows a message.
   * @param reason Optional reason for logout, used for showing appropriate messages
   */
  logout(reason?: 'session_expired'): void {
    // Clear all authentication data
    this.clearTokens();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    // Handle session expiration notification
    if (reason === 'session_expired') {
      // Show session expired notification
      this.toastService.warning('auth.session_expired');

      // Navigate to login with query param to indicate session expired
      this.router.navigate(['/login'], { queryParams: { expired: 'true' } });
    } else {
      // Regular logout - just navigate to login
      this.router.navigate(['/login']);
    }
  }

  /**
   * Removes all tokens and user data from storage.
   */
  clearTokens(): void {
    this.storage.clearAuthTokens();
    this.storage.removeItem('current-user');
  }

  /**
   * Attempts to refresh the access token using the refresh token.
   * Returns Observable<{ access: string, refresh: string }>
   */
  refreshToken(refreshToken: string): Observable<{ access: string; refresh: string }> {
    const config = ApiConfig.getInstance();
    const refreshEndpoint = config.endpoints.auth.refresh;
    return this.httpClient.post<{ access: string; refresh: string }>(refreshEndpoint, {
      refresh: refreshToken
    });
  }

  getCurrentUser(): Observable<User> {
    const profileEndpoint = this.config.endpoints.auth.profile;
    
    if (!profileEndpoint) {
      const currentUser = this.currentUserSubject.value;
      
      if (currentUser) {
        return new Observable(observer => {
          observer.next(currentUser);
          observer.complete();
        });
      }
      return throwError(() => new Error('No current user and profile endpoint not configured'));
    }

    return this.httpClient.get<UserApiResponse | { result?: UserApiResponse[]; results?: UserApiResponse[] }>(profileEndpoint).pipe(
      map(response => {
        if ('result' in response && Array.isArray(response.result) && response.result.length > 0) {
          return User.fromApiResponse(response.result[0]);
        } else if ('results' in response && Array.isArray(response.results) && response.results.length > 0) {
          return User.fromApiResponse(response.results[0]);
        } else {
          // Direct response object
          return User.fromApiResponse(response as UserApiResponse);
        }
      }),
      tap(user => this.currentUserSubject.next(user)),
      catchError(error => {
        console.error('Error fetching user profile:', error);
        return throwError(() => error);
      })
    );
  }

  changePassword(data: ChangePasswordData): Observable<void> {
    if (data.newPassword !== data.confirmPassword) {
      return throwError(() => new Error('New password and confirmation do not match'));
    }

    return this.httpClient.post<void>(this.config.endpoints.auth.changePassword, {
      old_password: data.oldPassword,
      new_password: data.newPassword
    });
  }

  updateProfile(profileData: UpdateProfileData): Observable<User> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      return throwError(() => new Error('No authenticated user found'));
    }

    const updatedUser = new User(
      currentUser.id,
      currentUser.email,
      profileData.firstName || currentUser.firstName,
      profileData.lastName || currentUser.lastName,
      currentUser.role,
      currentUser.isStaff,
      currentUser.isSuperuser,
      currentUser.dateJoined,
      currentUser.lastLogin,
      profileData.avatar || currentUser.avatar
    );

    return this.httpClient.put<{ result: UserApiResponse[] }>(this.config.endpoints.auth.profile, updatedUser.toApiRequest()).pipe(
      map(response => User.fromApiResponse(response.result[0])),
      tap(user => this.currentUserSubject.next(user))
    );
  }

  private createPlaceholderUser(email: string): User {
    return new User(
      0,
      email,
      'User',
      '',
      'user',
      false,
      false,
      new Date()
    );
  }

  public loadStoredUser(): void {
    const storedUser = this.storage.getObject<User>('current-user');
    if (storedUser) {
      this.currentUserSubject.next(storedUser);
      this.isAuthenticatedSubject.next(true);
    }
  }

  // Getters for current state
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  get isLoading(): boolean {
    return this.isLoadingSubject.value;
  }
}
