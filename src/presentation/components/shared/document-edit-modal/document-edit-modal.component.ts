import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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
  description: string;
  department: string;
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
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <div class="document-edit-modal" [class.rtl]="isRTL" [attr.dir]="isRTL ? 'rtl' : 'ltr'">
      <div mat-dialog-title class="dialog-title" [class.arabic-font]="isRTL">
        <mat-icon>edit</mat-icon>
        <span>{{ 'documents.edit.title' | translate }}</span>
      </div>
      
      <div mat-dialog-content class="dialog-content">
        <form [formGroup]="editForm" class="edit-form" [class.arabic-font]="isRTL">
          <!-- Title Field -->
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>{{ 'documents.form.title' | translate }}</mat-label>
            <input 
              matInput 
              formControlName="title"
              [placeholder]="'documents.form.titlePlaceholder' | translate">
            <mat-error *ngIf="editForm.get('title')?.hasError('required')">
              {{ 'validation.required' | translate }}
            </mat-error>
            <mat-error *ngIf="editForm.get('title')?.hasError('maxlength')">
              {{ 'validation.maxLength' | translate: {max: 255} }}
            </mat-error>
          </mat-form-field>

          <!-- Description Field -->
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>{{ 'documents.form.description' | translate }}</mat-label>
            <textarea 
              matInput 
              formControlName="description"
              rows="4"
              [placeholder]="'documents.form.descriptionPlaceholder' | translate">
            </textarea>
            <mat-error *ngIf="editForm.get('description')?.hasError('maxlength')">
              {{ 'validation.maxLength' | translate: {max: 1000} }}
            </mat-error>
          </mat-form-field>

          <!-- Department Field -->
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>{{ 'documents.form.department' | translate }}</mat-label>
            <mat-select formControlName="department">
              <mat-option value="finance">{{ 'departments.finance' | translate }}</mat-option>
              <mat-option value="hr">{{ 'departments.hr' | translate }}</mat-option>
              <mat-option value="it">{{ 'departments.it' | translate }}</mat-option>
              <mat-option value="legal">{{ 'departments.legal' | translate }}</mat-option>
              <mat-option value="operations">{{ 'departments.operations' | translate }}</mat-option>
              <mat-option value="marketing">{{ 'departments.marketing' | translate }}</mat-option>
            </mat-select>
            <mat-error *ngIf="editForm.get('department')?.hasError('required')">
              {{ 'validation.required' | translate }}
            </mat-error>
          </mat-form-field>

          <!-- Priority Field -->
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>{{ 'documents.form.priority' | translate }}</mat-label>
            <mat-select formControlName="priority">
              <mat-option value="low">{{ 'priorities.low' | translate }}</mat-option>
              <mat-option value="medium">{{ 'priorities.medium' | translate }}</mat-option>
              <mat-option value="high">{{ 'priorities.high' | translate }}</mat-option>
            </mat-select>
            <mat-error *ngIf="editForm.get('priority')?.hasError('required')">
              {{ 'validation.required' | translate }}
            </mat-error>
          </mat-form-field>

          <!-- Status Field -->
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>{{ 'documents.form.status' | translate }}</mat-label>
            <mat-select formControlName="status">
              <mat-option value="pending">{{ 'statuses.pending' | translate }}</mat-option>
              <mat-option value="in_progress">{{ 'statuses.inProgress' | translate }}</mat-option>
              <mat-option value="completed">{{ 'statuses.completed' | translate }}</mat-option>
              <mat-option value="signed">{{ 'statuses.signed' | translate }}</mat-option>
            </mat-select>
            <mat-error *ngIf="editForm.get('status')?.hasError('required')">
              {{ 'validation.required' | translate }}
            </mat-error>
          </mat-form-field>

          <!-- File Upload Section -->
          <div class="file-upload-section">
            <h4 class="file-section-title" [class.arabic-font]="isRTL">
              {{ ('documents.form.attachment' | translate) }}
            </h4>
            <p class="file-section-subtitle" [class.arabic-font]="isRTL">
              {{ ('documents.form.attachmentNote' | translate) }}
            </p>
            
            <!-- File Input -->
            <div class="file-input-container">
              <input 
                type="file" 
                (change)="onFileSelected($event)"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                class="file-input"
                id="file-input">
              
              <button 
                type="button"
                mat-stroked-button 
                color="primary"
                (click)="triggerFileInput()"
                class="file-select-button"
                [class.arabic-font]="isRTL">
                <mat-icon>attach_file</mat-icon>
                {{ (selectedFile ? 'documents.form.changeFile' : 'documents.form.selectFile') | translate }}
              </button>
            </div>

            <!-- Selected File Display -->
            <div *ngIf="selectedFile" class="selected-file" [class.arabic-font]="isRTL">
              <mat-icon color="primary">description</mat-icon>
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
              <button 
                type="button"
                mat-icon-button 
                color="warn" 
                (click)="removeFile()"
                [matTooltip]="'common.delete' | translate">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- File Validation Error -->
            <div *ngIf="fileError" class="file-error" [class.arabic-font]="isRTL">
              <mat-icon color="warn">error</mat-icon>
              <span>{{ fileError }}</span>
            </div>
          </div>
        </form>
      </div>
      
      <div mat-dialog-actions class="dialog-actions" [class.rtl]="isRTL">
        <button 
          mat-button 
          (click)="onCancel()"
          class="cancel-button"
          [disabled]="isSubmitting"
          [class.arabic-font]="isRTL">
          {{ 'common.cancel' | translate }}
        </button>
        <button 
          mat-raised-button 
          color="primary"
          (click)="onSubmit()"
          class="submit-button"
          [disabled]="editForm.invalid || isSubmitting"
          [class.arabic-font]="isRTL">
          <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
          <span *ngIf="!isSubmitting">{{ 'common.submit' | translate }}</span>
          <span *ngIf="isSubmitting">{{ 'common.saving' | translate }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .document-edit-modal {
      min-width: 500px;
      max-width: 600px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      font-size: 20px;
      font-weight: 500;
    }

    .dialog-title mat-icon {
      color: #2196f3;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-field {
      width: 100%;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .dialog-actions.rtl {
      justify-content: flex-start;
      flex-direction: row-reverse;
    }

    .submit-button {
      min-width: 120px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cancel-button {
      min-width: 100px;
    }

    .submit-button mat-spinner {
      margin-right: 8px;
    }

    .rtl .submit-button mat-spinner {
      margin-right: 0;
      margin-left: 8px;
    }

    /* RTL Support */
    .arabic-font {
      font-family: 'Cairo', 'Noto Sans Arabic', sans-serif;
    }

    /* Form field RTL adjustments */
    .rtl .mat-mdc-form-field {
      text-align: right;
    }

    .rtl .mat-mdc-form-field .mat-mdc-select-arrow {
      margin-left: 0;
      margin-right: 16px;
    }

    /* File Upload Styles */
    .file-upload-section {
      margin-top: 24px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #fafafa;
    }

    .file-section-title {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    .file-section-subtitle {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #666;
    }

    .file-input-container {
      margin-bottom: 16px;
    }

    .file-input {
      display: none;
    }

    .file-select-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .file-name {
      flex: 1;
      font-weight: 500;
    }

    .file-size {
      color: #666;
      font-size: 12px;
    }

    .file-error {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      font-size: 14px;
      margin-top: 8px;
    }

    /* RTL File Upload Support */
    .rtl .file-select-button {
      flex-direction: row-reverse;
    }

    .rtl .selected-file {
      flex-direction: row-reverse;
    }

    .rtl .file-error {
      flex-direction: row-reverse;
    }

    /* Responsive design */
    @media (max-width: 600px) {
      .document-edit-modal {
        min-width: 90vw;
        max-width: 90vw;
      }
    }
  `]
})
export class DocumentEditModalComponent implements OnInit {
  editForm: FormGroup;
  isRTL = false;
  isSubmitting = false;
  selectedFile: File | null = null;
  fileError: string | null = null;
  
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
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(1000)]],
      department: ['', [Validators.required]],
      priority: ['', [Validators.required]],
      status: ['', [Validators.required]]
    });
  }

  private populateForm(): void {
    if (this.data.document) {
      this.editForm.patchValue({
        title: this.data.document.title,
        description: this.data.document.description || '',
        department: this.data.document.department,
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
        department: formValue.department,
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
}
