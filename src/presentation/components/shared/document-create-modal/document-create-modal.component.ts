import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LanguageService } from '../../../../core/use-cases/language.service';
import { AuthorizationService } from '../../../../core/use-cases/authorization.service';
import { PriorityService } from '../../../../data/services/priority.service';
import { Priority } from '../../../../domain/models/priority.model';

export interface DocumentCreateData {
  title: string;
  description?: string;
  priority: number;
  fileType: 'pdf' | 'images';
  files: File[];
}

@Component({
  selector: 'app-document-create-modal',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatSlideToggleModule,
    TranslateModule
],
  templateUrl: './document-create-modal.component.html',
  styleUrls: ['./document-create-modal.component.scss'],
})
export class DocumentCreateModalComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  
  documentForm: FormGroup;
  isRTL = false;
  selectedFiles: File[] = [];
  fileErrors: string[] = [];
  priorities: Priority[] = [];
  fileType: 'pdf' | 'images' = 'images';

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedPdfExtensions = ['.pdf'];
  private readonly allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
  private readonly allowedPdfMimeTypes = ['application/pdf'];
  private readonly allowedImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff', 'image/svg+xml'];

  private dialogRef = inject(MatDialogRef<DocumentCreateModalComponent>);
  private fb = inject(FormBuilder);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);
  private authorizationService = inject(AuthorizationService);
  private priorityService = inject(PriorityService);

  constructor() {
    this.documentForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      priority: ['', Validators.required],
      fileType: ['images'],
      files: [[], Validators.required],
    });
  }

  ngOnInit(): void {
    this.languageService.isRTL$.subscribe((isRTL) => {
      this.isRTL = isRTL;
    });

    // Load priorities from API
    this.priorityService.getPriorities().subscribe({
      next: (priorities) => {
        this.priorities = priorities;
      },
      error: (error) => {
        console.error('Failed to load priorities:', error);
        this.priorities = [];
      },
    });
  }

  onFileTypeChange(isPdf: boolean): void {
    this.fileType = isPdf ? 'pdf' : 'images';
    this.documentForm.patchValue({ fileType: this.fileType });
    // Clear selected files when switching file type
    this.selectedFiles = [];
    this.fileErrors = [];
    // Reset form control validation state
    const filesControl = this.documentForm.get('files');
    if (filesControl) {
      filesControl.setValue([]);
      filesControl.setErrors(null);
      filesControl.markAsUntouched();
      filesControl.markAsPristine();
      filesControl.updateValueAndValidity();
    }
    // Clear file input element
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const files = Array.from(input.files);
      this.fileErrors = [];
      const validFiles: File[] = [];

      // Validate each file
      for (const file of files) {
        const validationError = this.validateFile(file);
        if (validationError) {
          this.fileErrors.push(`${file.name}: ${validationError}`);
        } else {
          validFiles.push(file);
        }
      }

      if (this.fileType === 'pdf') {
        // For PDF, only allow one file
        if (validFiles.length > 0) {
          this.selectedFiles = [validFiles[0]];
        } else {
          this.selectedFiles = [];
        }
      } else {
        // For images, allow multiple files
        this.selectedFiles = validFiles;
      }

      // Update form control
      const filesControl = this.documentForm.get('files');
      if (filesControl) {
        filesControl.setValue(this.selectedFiles);
        filesControl.markAsDirty();
        
        // If we have valid files, clear errors and mark as valid
        if (this.selectedFiles.length > 0 && this.fileErrors.length === 0) {
          filesControl.setErrors(null);
          filesControl.markAsTouched();
        } else if (this.selectedFiles.length === 0) {
          // If no valid files, set required error
          filesControl.setErrors({ required: true });
        }
        filesControl.updateValueAndValidity();
      }

      // Clear the file input if there are errors to allow re-selection
      if (this.fileErrors.length > 0) {
        input.value = '';
      }
    }
  }

  private validateFile(file: File): string | null {
    // Check file size
    if (file.size > this.maxFileSize) {
      const size = this.formatFileSize(this.maxFileSize);
      return this.translate.instant('documents.create.validation.fileSizeError', { size });
    }

    // Get file extension
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    // Validate based on file type selection
    if (this.fileType === 'pdf') {
      // Check extension
      if (!this.allowedPdfExtensions.includes(fileExtension)) {
        return this.translate.instant('documents.create.validation.invalidFileTypePdf');
      }
      // Check MIME type as additional validation
      if (!this.allowedPdfMimeTypes.includes(file.type)) {
        return this.translate.instant('documents.create.validation.invalidMimeTypePdf');
      }
    } else {
      // Check extension for images
      if (!this.allowedImageExtensions.includes(fileExtension)) {
        return this.translate.instant('documents.create.validation.invalidFileTypeImage');
      }
      // Check MIME type as additional validation
      if (!this.allowedImageMimeTypes.includes(file.type)) {
        return this.translate.instant('documents.create.validation.invalidMimeTypeImage');
      }
    }

    return null;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    // Remove corresponding error if exists
    if (this.fileErrors.length > index) {
      this.fileErrors.splice(index, 1);
    }
    this.documentForm.patchValue({ files: this.selectedFiles });
    this.documentForm.get('files')?.markAsDirty();
  }

  onSubmit(): void {
    if (this.documentForm.valid && this.selectedFiles.length > 0) {
      const formData: DocumentCreateData = {
        title: this.documentForm.get('title')?.value,
        description: this.documentForm.get('description')?.value,
        priority: this.documentForm.get('priority')?.value,
        fileType: this.fileType,
        files: this.selectedFiles,
      };

      this.dialogRef.close(formData);
    } else {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.documentForm);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (Object.prototype.hasOwnProperty.call(control, 'controls')) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  getFileNameFromPath(filePath: string): string {
    return filePath.split('\\').pop() || filePath;
  }
}
