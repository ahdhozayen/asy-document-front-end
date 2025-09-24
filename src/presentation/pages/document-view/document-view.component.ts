import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { LanguageService } from '../../../core/use-cases/language.service';
import { DocumentService } from '../../../core/use-cases/document.service';
import { Document } from '../../../core/entities/document.model';
import { ToastService } from '../../../core/use-cases/toast.service';
import { AuthorizationService } from '../../../core/use-cases/authorization.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '@env/environment';
import { HasPermissionDirective } from '@presentation/shared/directives/has-permission.directive';
import { Attachment } from '../../../core/entities/document.model';
import { SignCommentModalComponent } from '../../components/shared/sign-comment-modal/sign-comment-modal.component';
import { DepartmentService } from '../../../data/services/department.service';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

export interface Department {
  id: number;
  name_ar: string;
  name_en: string;
}

@Component({
  selector: 'app-document-view',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    HasPermissionDirective,
    MatProgressSpinner,
    MatTooltipModule,
    TranslatePipe,
    NgxExtendedPdfViewerModule,
  ],
  templateUrl: './document-view.component.html',
  styleUrls: ['./document-view.component.scss'],
})
export class DocumentViewComponent implements OnInit {
  document: Document | null = null;
  isRTL = false;
  documentId: number | null = null;
  isLoading = true;
  documentNotFound = false;
  commentCount = 0;
  currentAttachment: Attachment | null = null;
  departments: Department[] = [];

  mediaURL = environment.mediaURL;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private languageService = inject(LanguageService);
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);
  private authorizationService = inject(AuthorizationService);
  private departmentService = inject(DepartmentService);
  private translate = inject(TranslateService);

  constructor() {
    this.languageService.isRTL$.subscribe((isRTL) => {
      this.isRTL = isRTL;
    });
  }

  ngOnInit(): void {
    // Load departments first
    this.loadDepartments();

    this.route.params.subscribe((params) => {
      this.documentId = +params['id'];
      if (this.documentId) {
        this.loadDocument();
      }
    });
  }

  private loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (error) => {
        console.error('Failed to load departments:', error);
      },
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
    if (
      this.documentId &&
      this.document &&
      this.document.attachments &&
      this.document.attachments.length > 0
    ) {
      const attachmentId = this.document.attachments[0].id;
      const dialogRef = this.dialog.open(SignCommentModalComponent, {
        width: '500px',
        maxWidth: '95vw',
        disableClose: true,
        data: { attachmentId: attachmentId }
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result && result.success) {
          this.loadDocument();
        }
      });
    }
  }

  onDownload(): void {
    if (this.currentAttachment?.file) {
      this.downloadAttachment(this.currentAttachment);
    } else {
      this.toastService.errorTranslated('documents.download.error');
    }
  }

  downloadAttachment(attachment: Attachment): void {
    if (attachment?.file) {
      const fileUrl = environment.mediaURL + attachment.file;
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = attachment.original_name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      this.toastService.errorTranslated('documents.download.error');
    }
  }

  selectAttachment(attachment: Attachment): void {
    this.currentAttachment = attachment;
  }

  isImageFile(fileName: string): boolean {
    if (!fileName) return false;
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '');
  }

  async deleteAttachment(attachment: Attachment): Promise<void> {
    const { ConfirmationDialogComponent } = await import('../../components/shared/confirmation-dialog/confirmation-dialog.component');

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      data: {
        title: this.translate.instant('documents.delete.attachment.title'),
        message: this.translate.instant('documents.delete.attachment.message'),
        documentTitle: attachment.original_name,
        confirmText: this.translate.instant('documents.delete.attachment.confirm'),
        cancelText: this.translate.instant('documents.delete.attachment.cancel'),
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.documentService.deleteAttachment(attachment.id).subscribe({
          next: () => {
            this.toastService.successTranslated('documents.delete.attachment.success');
            // If this was the current attachment, select another one or clear it
            if (this.currentAttachment?.id === attachment.id) {
              const remainingAttachments = this.document?.attachments?.filter(a => a.id !== attachment.id);
              this.currentAttachment = remainingAttachments?.length ? remainingAttachments[0] : null;
            }
            // Reload the document to get updated attachments
            if (this.documentId) {
              this.loadDocument();
            }
          },
          error: (error) => {
            console.error('Error deleting attachment:', error);
            this.toastService.errorTranslated('documents.delete.attachment.error');
          }
        });
      }
    });
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

  getDepartmentName(departmentId: string): string {
    if (!departmentId || !this.departments.length) return departmentId;

    const department = this.departments.find(
      (d) => d.id.toString() === departmentId
    );
    if (!department) return departmentId;

    return this.isRTL ? department.name_ar : department.name_en;
  }
}
