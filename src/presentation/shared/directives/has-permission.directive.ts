import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Document } from '../../../core/entities';
import { AuthorizationService } from '../../../core/use-cases/authorization.service';

/**
 * Structural directive to conditionally show/hide elements based on user permissions
 * Usage examples:
 * 
 * Show element only if user can edit document:
 * <button *appHasPermission="{ permission: 'edit', document: documentObj }">Edit</button>
 * 
 * Show element only if user can view documents on dashboard:
 * <button *appHasPermission="{ permission: 'viewOnDashboard' }">View</button>
 * 
 * Show element only if user can comment on document:
 * <button *appHasPermission="{ permission: 'comment', document: documentObj }">Comment</button>
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnDestroy {
  private authorizationService = inject(AuthorizationService);

  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appHasPermission(options: {
    permission: 'edit' | 'viewOnDashboard' | 'comment' | 'delete' | 'sign' | 'review';
    document?: Document;
  }) {
    if (!options) {
      this.viewContainer.clear();
      this.hasView = false;
      return;
    }

    const { permission, document } = options;

    switch (permission) {
      case 'edit':
        if (!document) {
          this.viewContainer.clear();
          this.hasView = false;
          return;
        }

        this.authorizationService.canEditDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canEdit => this.updateView(canEdit));

        break;

      case 'viewOnDashboard':
        this.authorizationService.canViewDocumentOnDashboard()
          .pipe(takeUntil(this.destroy$))
          .subscribe(canView => this.updateView(canView));

        break;

      case 'comment':
        if (!document) {
          this.viewContainer.clear();
          this.hasView = false;
          return;
        }
        
        this.authorizationService.canCommentOnDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canComment => {console.log(canComment); this.updateView(canComment)});

        break;

      case 'delete':
        if (!document) {
          this.viewContainer.clear();
          this.hasView = false;
          return;
        }
        this.authorizationService.canDeleteDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canDelete => this.updateView(canDelete));

        break;

      case 'sign':
        if (!document) {
          this.viewContainer.clear();
          this.hasView = false;
          return;
        }
        this.authorizationService.canSignDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canSign => this.updateView(canSign));

        break;

      case 'review':
        if (!document) {
          this.viewContainer.clear();
          this.hasView = false;
          return;
        }
        this.authorizationService.canReviewDocument(document)
          .pipe(takeUntil(this.destroy$))
          .subscribe(canReview => this.updateView(canReview));

        break;

      default:
        this.viewContainer.clear();
        this.hasView = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(hasPermission: boolean): void {
    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
