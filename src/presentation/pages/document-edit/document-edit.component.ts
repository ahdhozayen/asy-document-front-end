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
import { Document } from '../../../core/entities/document.model';
import { ToastService } from '../../../core/use-cases/toast.service';

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
    TranslateModule
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
  currentDocument: any = null;
  commentCount = 0;
  documentId: number | null = null;
  
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private languageService: LanguageService,
    private documentService: DocumentService,
    private toastService: ToastService
  ) {
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
      }
    });
  }

  private loadDocument(): void {
    if (this.documentId) {
      this.documentService.getDocument(this.documentId).subscribe({
        next: (document) => {
          this.currentDocument = {
            ...document,
            fileName: document.fileName || 'No file uploaded',
            fileSize: document.formattedFileSize || '0 MB',
            fileType: document.mimeType || 'Unknown',
            uploadDate: document.createdAt || new Date()
          };
          this.populateForm();
        },
        error: (error) => {
          // Instead of showing error and redirecting, show a warning and allow editing
          this.toastService.warningTranslated('documents.edit.loadWarning');
          // Create a minimal document object to allow editing
          this.currentDocument = {
            id: this.documentId,
            title: 'Document',
            description: '',
            department: 'unknown',
            priority: 'medium',
            status: 'pending',
            fileName: 'No file uploaded',
            fileSize: '0 MB',
            fileType: 'Unknown',
            uploadDate: new Date()
          };
          this.populateForm();
        }
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
        error: (error) => {
          this.toastService.errorTranslated('documents.edit.error');
          this.isSubmitting = false;
        }
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
              error: (error) => {
                this.toastService.errorTranslated('documents.edit.error');
                this.isSubmitting = false;
              }
            });
          }
        },
        error: (error) => {
          this.toastService.errorTranslated('documents.edit.error');
          this.isSubmitting = false;
        }
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
    
    const typeMap: { [key: string]: string } = {
      'pdf': 'PDF Document',
      'doc': 'Word Document',
      'docx': 'Word Document',
      'jpg': 'JPEG Image',
      'jpeg': 'JPEG Image',
      'png': 'PNG Image'
    };
    
    return typeMap[fileType.toLowerCase()] || `${fileType.toUpperCase()} Document`;
  }
}
