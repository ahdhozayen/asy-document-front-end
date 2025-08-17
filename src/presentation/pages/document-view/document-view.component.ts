import { Component, OnInit } from '@angular/core';
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
import { SignatureModalComponent } from '../../components/shared/signature-modal/signature-modal.component';
import { CommentsModalComponent } from '../../components/shared/comments-modal/comments-modal.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '@env/environment';

@Component({
  selector: 'app-document-view',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    TranslateModule,
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
  currentAttachment: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private languageService: LanguageService,
    private documentService: DocumentService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private sanitizer: DomSanitizer
  ) {
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
        next: (document) => {
          let newDocument = document.results[0];

          this.document = newDocument;

          if (newDocument.attachments && newDocument.attachments.length > 0) {
            this.currentAttachment = newDocument.attachments[0];
          }
          this.isLoading = false;
          this.documentNotFound = false;
        },
        error: (error) => {
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
    if (this.documentId) {
      this.router.navigate(['/document/edit', this.documentId]);
    }
  }

  onComments(): void {
    const dialogRef = this.dialog.open(CommentsModalComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: {
        documentId: this.documentId,
        commentCount: this.commentCount,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Handle comment submission
        this.toastService.successTranslated('documents.comments.success');
      }
    });
  }

  onSignDocument(): void {
    const dialogRef = this.dialog.open(SignatureModalComponent, {
      width: '500px',
      maxWidth: '95vw',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((signatureData) => {
      if (signatureData && signatureData.signatureBase64) {
        this.submitSignature(signatureData.signatureBase64);
      }
    });
  }

  private submitSignature(signatureBase64: string): void {
    if (
      this.documentId &&
      this.document &&
      this.document.attachments &&
      this.document.attachments.length > 0
    ) {
      console.log('test the document');
      console.log(this.document.attachments[0].id);
      // Send signature to backend
      this.documentService
        .signDocument(this.documentId, {
          signature_data: signatureBase64,
          attachmentId: this.document.attachments[0].id,
        })
        .subscribe({
          next: () => {
            this.toastService.successTranslated('documents.sign.success');
            // Refresh document data
            this.loadDocument();
          },
          error: (error) => {
            this.toastService.errorTranslated('documents.sign.error');
          },
        });
    }
  }

  onDownload(): void {
    if (this.currentAttachment?.file) {
      // Construct the full URL for the file
      const baseUrl = 'http://localhost:8000'; // This should come from environment config
      const fileUrl = baseUrl + this.currentAttachment.file;
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
    const filePath = file;

    if (filePath.startsWith('http')) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(filePath);
    }

    const baseUrl = environment.mediaURL + filePath;

    return this.sanitizer.bypassSecurityTrustResourceUrl(baseUrl);
  }

  getFileTypeDisplay(mimeType: string): string {
    if (!mimeType) return 'Unknown';

    const typeMap: { [key: string]: string } = {
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
}
