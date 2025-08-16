import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/use-cases/language.service';
import { Document } from '../../../../core/entities';

export interface DocumentEditModalData {
  document: Document;
}

export interface DocumentEditData {
  title: string;
  description?: string;
  fromDepartment: string;
  priority: string;
  status: string;
  file?: File;
}

@Component({
  selector: 'app-document-edit-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
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
  templateUrl: './document-edit-modal.component.html',
    styleUrls: ['./document-edit-modal.component.scss']
})
export class DocumentEditModalComponent implements OnInit {
  editForm: FormGroup;
  isRTL = false;
  isSubmitting = false;
  selectedFile: File | null = null;
  fileError: string | null = null;
  currentDocument: any = null;
  commentCount = 0;
  
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];

  constructor(
    public dialogRef: MatDialogRef<DocumentEditModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DocumentEditModalData,
    private fb: FormBuilder,
    public languageService: LanguageService
  ) {
    this.editForm = this.createForm();
    
    this.languageService.isRTL$.subscribe(isRTL => {
      this.isRTL = isRTL;
    });
  }

  ngOnInit(): void {
    this.populateForm();
    this.setCurrentDocument();
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
    if (this.data.document) {
      this.editForm.patchValue({
        title: this.data.document.title,
        description: this.data.document.description || '',
        fromDepartment: this.data.document.department,
        priority: this.data.document.priority,
        status: this.data.document.status
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
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

      this.dialogRef.close(editData);
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
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
    
    // Clear the file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
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

  private setCurrentDocument(): void {
    if (this.data.document) {
      this.currentDocument = {
        ...this.data.document,
        fileName: this.data.document.fileName || 'transfer-template.pdf',
        fileSize: this.data.document.formattedFileSize || '0.13 MB',
        fileType: this.data.document.mimeType || 'PDF',
        uploadDate: this.data.document.createdAt || new Date()
      };
    }
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
