import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Document, UserRole } from '../entities';
import { AuthService } from './auth.service';

export enum USER_ROLES {
  CEO = 'ceo',
  ADMIN = 'admin',
  USER = 'user',
  HELPDESK = 'helpdesk',
}

export enum DOCUMENT_STATUS {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  SIGNED = 'signed',
  REJECTED = 'rejected',
}

@Injectable({
  providedIn: 'root',
})
export class AuthorizationService {
  private authService = inject(AuthService);

  /**
   * Checks if the current user can view documents on the dashboard
   * According to requirements, only CEO users can view documents on the dashboard
   */
  canViewDocumentOnDashboard(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => !!user && user.isCEO())
    );
  }

  /**
   * Checks if the current user can edit a document
   * According to requirements, only help-desk users can edit documents,
   * and signed documents cannot be edited
   */
  canEditDocument(document: Document): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user || !document) return false;

        // Check if document is signed - signed documents cannot be edited
        if (document.status === DOCUMENT_STATUS.SIGNED) return false;

        // Only helpdesk users can edit documents
        return user.isHelpdesk();
      })
    );
  }

  /**
   * Checks if the current user can create a document
   * Only helpdesk users can create documents
   */
  canCreateDocument(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => !!user && user.isHelpdesk())
    );
  }

  /**
   * Checks if the current user can comment on a document
   * Signed documents cannot be commented on
   */
  canCommentOnDocument(document: Document): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user || !document) return false;

        // Signed documents cannot be commented on
        return document.status !== DOCUMENT_STATUS.SIGNED;
      })
    );
  }

  /**
   * Checks if the current user can delete a document
   * All users can delete documents that are not signed
   */
  canDeleteDocument(document: Document): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user || !document) return false;

        // Check if document can be deleted (not signed)
        return document.canBeDeleted;
      })
    );
  }

  /**
   * Checks if the current user can sign a document
   * Only CEO users can sign documents that are in review
   */
  canSignDocument(document: Document): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user || !document) return false;

        return document.status === DOCUMENT_STATUS.PENDING && user.isCEO();
      })
    );
  }

  /**
   * Checks if the current user can review a document
   * Only documents in pending state can be reviewed
   */
  canReviewDocument(document: Document): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user || !document) return false;

        // Check if user can review documents
        if (!user.canReviewDocuments()) return false;

        // Check if document can be reviewed
        return document.canBeReviewed;
      })
    );
  }

  /**
   * Synchronous method to check if a document can be edited
   * Used for quick checks in templates
   */
  canEditDocumentSync(document: Document, userRole?: UserRole): boolean {
    if (!document) return false;

    // Check if document is signed - signed documents cannot be edited
    if (document.status === DOCUMENT_STATUS.SIGNED) return false;

    // If no user role is provided, use the current user from auth service
    if (!userRole && this.authService.currentUser) {
      return this.authService.currentUser.isHelpdesk();
    }

    // Only helpdesk users can edit documents
    return userRole === USER_ROLES.HELPDESK;
  }

  /**
   * Synchronous method to check if a user can view documents on dashboard
   * Used for quick checks in templates
   */
  canViewDocumentOnDashboardSync(userRole?: UserRole): boolean {
    // If no user role is provided, use the current user from auth service
    if (!userRole && this.authService.currentUser) {
      return this.authService.currentUser.isCEO();
    }

    // Only CEO users can view documents on dashboard
    return userRole === USER_ROLES.CEO;
  }

  /**
   * Synchronous method to check if a document can be commented on
   * Used for quick checks in templates
   */
  canCommentOnDocumentSync(document: Document): boolean {
    if (!document) return false;

    // Signed documents cannot be commented on
    return document.status !== DOCUMENT_STATUS.SIGNED;
  }

  /**
   * Synchronous method to check if a document can be signed
   * Used for quick checks in templates
   */
  canSignDocumentSync(document: Document): boolean {
    if (!document) return false;

    // If no user role is provided, use the current user from auth service
    if (this.authService.currentUser) {
      // Only CEO can sign documents
      if (!this.authService.currentUser.isCEO()) return false;

      // Only documents in review can be signed
      return document.isInReview;
    }

    return false;
  }
}
