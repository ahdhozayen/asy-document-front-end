import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LanguageService } from '../../../core/use-cases/language.service';
import { DocumentService } from '../../../core/use-cases/document.service';
import { Document } from '../../../core/entities/document.model';
import { ToastService } from '../../../core/use-cases/toast.service';
import { AuthorizationService } from '../../../core/use-cases/authorization.service';
import { SignatureModalComponent } from '../../components/shared/signature-modal/signature-modal.component';
import { CommentsModalComponent } from '../../components/shared/comments-modal/comments-modal.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '@env/environment';
import { HasPermissionDirective } from '@presentation/shared/directives/has-permission.directive';
import { Attachment } from '../../../core/entities/document.model';
import { SignCommentModalComponent } from '../../components/shared/sign-comment-modal/sign-comment-modal.component';

@Component({
    selector: 'app-document-view',
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        TranslateModule,
        HasPermissionDirective,
    ],
    templateUrl: './document-view.component.html',
    styleUrls: ['./document-view.component.scss']
})
export class DocumentViewComponent implements OnInit {
  document: Document | null = null;
  isRTL = false;
  documentId: number | null = null;
  isLoading = true;
  documentNotFound = false;
  commentCount = 0;
  currentAttachment: Attachment | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private languageService = inject(LanguageService);
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);
  private authorizationService = inject(AuthorizationService);

  constructor() {
    this.languageService.isRTL$.subscribe((isRTL) => {
      this.isRTL = isRTL;
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.documentId = +params['id'];
      if (this.documentId) {
        this.loadDocument();
      }
    });
  }

  private loadDocument(): void {
    if (this.documentId) {
      this.isLoading = true;
      this.documentService.getDocument(this.documentId).subscribe({
        next: (response) => {
          // Handle both paginated responses and direct document responses
          let newDocument: Document;

          if (
            response &&
            'results' in response &&
            Array.isArray(response.results)
          ) {
            // It's a paginated response
            newDocument = response.results[0];
          } else {
            // It's a direct document response
            newDocument = response as Document;
          }

          this.document = newDocument;

          if (newDocument.attachments && newDocument.attachments.length > 0) {
            this.currentAttachment = newDocument.attachments[0];
          }
          this.isLoading = false;
          this.documentNotFound = false;
        },
        error: () => {
          this.isLoading = false;
          this.documentNotFound = true;
          this.toastService.errorTranslated('documents.view.loadError');
        },
      });
    }
  }

  onBack(): void {
    this.router.navigate(['/dashboard']);
  }

  onEdit(): void {
    if (this.documentId && this.canEditDocument()) {
      this.router.navigate(['/document/edit', this.documentId]);
    }
  }

  onSignAndComment(): void {
    if (this.documentId && this.document && this.document.attachments && this.document.attachments.length > 0) {
      const dialogRef = this.dialog.open(SignCommentModalComponent, {
        width: '500px',
        maxWidth: '95vw',
        disableClose: true,
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result && result.signature_data && result.comments) {
          const attachmentId = this.document!.attachments![0].id;
          this.documentService.signDocumentWithComment({
            attachment: attachmentId,
            comments: result.comments, // Ensure comments are included
            signature_data: result.signature_data
          }).subscribe({
            next: () => {
              this.toastService.successTranslated('documents.signAndComment.success');
              this.loadDocument();
            },
            error: () => {
              this.toastService.errorTranslated('documents.signAndComment.error');
            }
          });
        }
      });
    }
  }

  onDownload(): void {
    if (this.currentAttachment?.file) {
      // Fallback to direct file path if ID is not available
      const fileUrl = environment.mediaURL + this.currentAttachment.file;
      // const fileUrl = `${environment.mediaURL}${normalizedPath}`;
      window.open(fileUrl, '_blank');
    } else {
      this.toastService.errorTranslated('documents.download.error');
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800';
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';

    // Convert string to Date if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if date is valid
    if (isNaN(dateObj.getTime())) return '-';

    // Format date with day, month, year, hours and minutes
    return dateObj.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getFileUrl(file: string): SafeResourceUrl {
    if (!file) {
      console.error('File path is empty or undefined');
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }

    // If it's already a full URL, use it directly
    if (file.startsWith('http')) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(file);
    }

    // For file paths, ensure they're properly joined with the media URL
    // Remove any leading slash to avoid double slashes
    const normalizedPath = file.startsWith('/') ? file.substring(1) : file;
    const baseUrl = `${environment.mediaURL}${normalizedPath}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(baseUrl);
  }

  getFileTypeDisplay(mimeType: string): string {
    if (!mimeType) return 'Unknown';

    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF Document',
      'application/msword': 'Word Document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'Word Document',
      'image/jpeg': 'JPEG Image',
      'image/jpg': 'JPEG Image',
      'image/png': 'PNG Image',
    };

    return (
      typeMap[mimeType] || `${mimeType.split('/')[1]?.toUpperCase()} Document`
    );
  }

  canEditDocument(): boolean {
    if (!this.document) return false;
    return this.authorizationService.canEditDocumentSync(this.document);
  }

  canCommentOnDocument(): boolean {
    if (!this.document) return false;
    return this.authorizationService.canCommentOnDocumentSync(this.document);
  }
}
