import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LanguageService } from '../../../core/use-cases/language.service';
import { DocumentService } from '../../../core/use-cases/document.service';
import { ToastService } from '../../../core/use-cases/toast.service';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from '@env/environment';
import { AuthorizationService } from '../../../core/use-cases/authorization.service';
import { HasPermissionDirective } from '@presentation/shared/directives/has-permission.directive';
import { PermissionDisableDirective } from '@presentation/shared/directives/permission-disable.directive';
import { Document } from '../../../core/entities/document.model';
import { inject } from '@angular/core';

export interface DocumentEditData {
  title: string;
  description?: string;
  fromDepartment: string;
  priority: string;
  status: string;
  file?: File;
}

@Component({
  selector: 'app-document-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule,
    HasPermissionDirective,
    PermissionDisableDirective
  ],
  templateUrl: './document-edit.component.html',
  styleUrls: ['./document-edit.component.scss']
})
export class DocumentEditComponent implements OnInit {
  editForm: FormGroup;
  isRTL = false;
  isSubmitting = false;
  selectedFile: File | null = null;
  fileError: string | null = null;
  currentDocument: (Document & { uploadDate?: string | Date }) | null = null;
  commentCount = 0;
  documentId: number | null = null;
  
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private languageService = inject(LanguageService);
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private authorizationService = inject(AuthorizationService);

  constructor() {
    this.editForm = this.createForm();
    
    this.languageService.isRTL$.subscribe(isRTL => {
      this.isRTL = isRTL;
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.documentId = +params['id'];
      if (this.documentId) {
        this.loadDocument();
      } else {
        // If no document ID, redirect back to dashboard
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private loadDocument(): void {
    if (this.documentId) {
      this.documentService.getDocument(this.documentId).subscribe({
        next: (document) => {
          // Create a proper Document instance with additional properties
          this.currentDocument = Object.assign(document, {
            uploadDate: document.attachments?.[0]?.created_at || new Date()
          });
          
          // Check if user has permission to edit this document
          if (!this.authorizationService.canEditDocumentSync(this.currentDocument)) {
            this.toastService.errorTranslated('documents.edit.noPermission');
            this.router.navigate(['/dashboard']);
            return;
          }
          
          this.populateForm();
        },
        error: undefined
      });
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      fromDepartment: ['', [Validators.required]],
      priority: ['', [Validators.required]],
      status: ['', [Validators.required]]
    });
  }

  private populateForm(): void {
    if (this.currentDocument) {
      this.editForm.patchValue({
        title: this.currentDocument.title,
        description: this.currentDocument.description || '',
        fromDepartment: this.currentDocument.department,
        priority: this.currentDocument.priority,
        status: this.currentDocument.status
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/dashboard']);
  }

  onSubmit(): void {
    if (this.editForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const formValue = this.editForm.value;
      const editData: DocumentEditData = {
        title: formValue.title.trim(),
        description: formValue.description?.trim() || '',
        fromDepartment: formValue.fromDepartment,
        priority: formValue.priority,
        status: formValue.status,
        file: this.selectedFile || undefined
      };

      if (this.documentId) {
        this.updateDocument(editData);
      }
    }
  }

  private updateDocument(editData: DocumentEditData): void {
    if (this.selectedFile) {
      // Update document with new file
      this.updateDocumentWithFile(editData);
    } else {
      // Update only metadata
      this.updateDocumentMetadata(editData);
    }
  }

  private updateDocumentMetadata(editData: DocumentEditData): void {
    if (this.documentId) {
      this.documentService.updateDocument(this.documentId, {
        title: editData.title,
        description: editData.description,
        department: editData.fromDepartment,
        priority: editData.priority,
        status: editData.status
      }).subscribe({
        next: () => {
          this.toastService.successTranslated('documents.edit.success');
          this.router.navigate(['/dashboard']);
        },
        error: undefined
      });
    }
  }

  private updateDocumentWithFile(editData: DocumentEditData): void {
    if (this.documentId) {
      // First update the metadata
      this.documentService.updateDocument(this.documentId, {
        title: editData.title,
        description: editData.description,
        department: editData.fromDepartment,
        priority: editData.priority,
        status: editData.status
      }).subscribe({
        next: () => {
          // Then upload the new attachment
          if (this.selectedFile) {
            this.documentService.uploadDocumentAttachment({
              documentId: this.documentId!,
              file: this.selectedFile,
              originalName: this.selectedFile.name
            }).subscribe({
              next: () => {
                this.toastService.successTranslated('documents.edit.success');
                this.router.navigate(['/dashboard']);
              },
              error: undefined
            });
          }
        },
        error: undefined
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      this.validateAndSetFile(file);
    }
  }

  private validateAndSetFile(file: File): void {
    this.fileError = null;

    // Check file size
    if (file.size > this.maxFileSize) {
      this.fileError = `File size must be less than ${this.formatFileSize(this.maxFileSize)}`;
      return;
    }

    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      this.fileError = 'File type not supported. Please select a PDF, Word document, or image file.';
      return;
    }

    this.selectedFile = file;
  }

  removeFile(): void {
    this.selectedFile = null;
    this.fileError = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFieldError(fieldName: string): string | null {
    const field = this.editForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return 'validation.required';
      }
      if (field.errors['maxlength']) {
        return 'validation.maxLength';
      }
    }
    return null;
  }

  getFileTypeDisplay(fileType: string): string {
    if (!fileType) return 'Unknown';
    
    const typeMap: Record<string, string> = {
      'pdf': 'PDF Document',
      'doc': 'Word Document',
      'docx': 'Word Document',
      'jpg': 'JPEG Image',
      'jpeg': 'JPEG Image',
      'png': 'PNG Image'
    };
    
    return typeMap[fileType.toLowerCase()] || `${fileType.toUpperCase()} Document`;
  }

  /**
   * Opens the current document attachment in a new tab
   */
  viewCurrentAttachment(): void {
    if (this.currentDocument?.attachments && this.currentDocument.attachments.length > 0) {
      const attachment = this.currentDocument.attachments[0];
      
      // First try to use the attachment ID (preferred method)
      if (attachment.id) {
        const fileUrl = environment.mediaURL+attachment.file;
        // const fileUrl = `${environment.apiUrl}/documents/attachments/${attachment.id}`;
        window.open(fileUrl, '_blank');
        return;
      }
      
      // Fallback to using the file path if ID is not available
      if (attachment.file) {
        const normalizedPath = attachment.file.startsWith('/') ? attachment.file : `/${attachment.file}`;
        const fileUrl = `${environment.mediaURL}${normalizedPath}`;
        window.open(fileUrl, '_blank');
        return;
      }
      
      this.toastService.errorTranslated('documents.view.fileNotFound');
    } else {
      this.toastService.errorTranslated('documents.view.noAttachment');
    }
  }

  canEditDocument(): boolean {
    if (!this.currentDocument) return false;
    return this.authorizationService.canEditDocumentSync(this.currentDocument);
  }

  canCommentOnDocument(): boolean {
    if (!this.currentDocument) return false;
    return this.authorizationService.canCommentOnDocumentSync(this.currentDocument);
  }
}
