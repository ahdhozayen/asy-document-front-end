import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../use-cases/auth.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { map, filter, take, tap } from 'rxjs/operators';
import { combineLatest, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const storageService = inject(StorageService);
  const router = inject(Router);
  
  // First check if we have tokens in storage (synchronous check)
  const hasTokens = storageService.hasValidTokens();
  console.log('[AuthGuard] Checking route:', state.url, 'Has tokens:', hasTokens);
  
  // If no tokens at all, redirect to login immediately
  if (!hasTokens) {
    console.log('[AuthGuard] No tokens found, redirecting to login');
    return router.createUrlTree(['/']);
  }
  
  // If we have tokens, wait for auth service to initialize
  return combineLatest([
    authService.isAuthenticated$,
    authService.isLoading$
  ]).pipe(
    tap(([isAuth, isLoading]) => {
      console.log('[AuthGuard] Auth state - isAuthenticated:', isAuth, 'isLoading:', isLoading);
    }),
    filter(([, isLoading]) => !isLoading), // Wait until loading is complete
    take(1), // Take only the first emission after loading completes
    map(([isAuthenticated]) => {
      console.log('[AuthGuard] Final decision - isAuthenticated:', isAuthenticated);
      if (isAuthenticated) {
        return true;
      } else {
        console.log('[AuthGuard] Not authenticated after check, redirecting to login');
        return router.createUrlTree(['/']);
      }
    })
  );
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const storageService = inject(StorageService);
  const router = inject(Router);
  
  // First check if we have tokens in storage (synchronous check)
  const hasTokens = storageService.hasValidTokens();
  console.log('[GuestGuard] Checking route:', state.url, 'Has tokens:', hasTokens);
  
  // If we have tokens, likely authenticated, redirect to dashboard
  if (hasTokens) {
    // Wait for auth service to confirm
    return combineLatest([
      authService.isAuthenticated$,
      authService.isLoading$
    ]).pipe(
      tap(([isAuth, isLoading]) => {
        console.log('[GuestGuard] Auth state - isAuthenticated:', isAuth, 'isLoading:', isLoading);
      }),
      filter(([, isLoading]) => !isLoading), // Wait until loading is complete
      take(1),
      map(([isAuthenticated]) => {
        console.log('[GuestGuard] Final decision - isAuthenticated:', isAuthenticated);
        if (isAuthenticated) {
          console.log('[GuestGuard] User is authenticated, redirecting to dashboard');
          return router.createUrlTree(['/dashboard']);
        } else {
          return true; // Allow access to login page
        }
      })
    );
  }
  
  // No tokens, allow access to login page
  return of(true);
};
