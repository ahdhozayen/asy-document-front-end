import { Directive, ElementRef, Input, OnDestroy, Renderer2, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Document } from '../../../core/entities';
import { AuthorizationService } from '../../../core/use-cases/authorization.service';

/**
 * Attribute directive to conditionally disable elements based on user permissions
 * Usage examples:
 * 
 * Disable edit button if user cannot edit document:
 * <button [appPermissionDisable]="{ permission: 'edit', document: documentObj }">Edit</button>
 * 
 * Disable comment button if user cannot comment on document:
 * <button [appPermissionDisable]="{ permission: 'comment', document: documentObj }">Comment</button>
 */
@Directive({
  selector: '[appPermissionDisable]',
  standalone: true
})
export class PermissionDisableDirective implements OnDestroy {
  private authorizationService = inject(AuthorizationService);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private destroy$ = new Subject<void>();

  @Input() set appPermissionDisable(options: {
    permission: 'edit' | 'viewOnDashboard' | 'comment' | 'delete' | 'sign' | 'review';
    document?: Document;
    inverse?: boolean; // If true, disable when user HAS permission instead of when they don't
  }) {
    if (!options) {
      this.setDisabled(false);
      return;
    }

    const { permission, document, inverse = false } = options;

    switch (permission) {
      case 'edit':
        if (!document) {
          this.setDisabled(true);
          return;
        }
        this.authorizationService.canEditDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canEdit => this.setDisabled(inverse ? canEdit : !canEdit));
        break;

      case 'viewOnDashboard':
        this.authorizationService.canViewDocumentOnDashboard()
          .pipe(takeUntil(this.destroy$))
          .subscribe(canView => this.setDisabled(inverse ? canView : !canView));
        break;

      case 'comment':
        if (!document) {
          this.setDisabled(true);
          return;
        }
        this.authorizationService.canCommentOnDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canComment => this.setDisabled(inverse ? canComment : !canComment));
        break;

      case 'delete':
        if (!document) {
          this.setDisabled(true);
          return;
        }
        this.authorizationService.canDeleteDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canDelete => this.setDisabled(inverse ? canDelete : !canDelete));
        break;

      case 'sign':
        if (!document) {
          this.setDisabled(true);
          return;
        }
        this.authorizationService.canSignDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canSign => this.setDisabled(inverse ? canSign : !canSign));
        break;

      case 'review':
        if (!document) {
          this.setDisabled(true);
          return;
        }
        this.authorizationService.canReviewDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canReview => this.setDisabled(inverse ? canReview : !canReview));
        break;

      default:
        this.setDisabled(false);
    }
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setDisabled(disabled: boolean): void {
    this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', disabled);
    
    // Add or remove disabled class for styling
    if (disabled) {
      this.renderer.addClass(this.elementRef.nativeElement, 'disabled');
    } else {
      this.renderer.removeClass(this.elementRef.nativeElement, 'disabled');
    }
  }
}
