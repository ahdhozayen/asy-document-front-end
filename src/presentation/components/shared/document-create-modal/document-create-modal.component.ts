import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LanguageService } from '../../../../core/use-cases/language.service';

export interface DocumentCreateData {
  title: string;
  description?: string;
  fromDepartment: string;
  priority: string;
  file: File;
}

@Component({
  selector: 'app-document-create-modal',
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
    TranslateModule
  ],
  templateUrl: './document-create-modal.component.html',
  styleUrls: ['./document-create-modal.component.scss']
})
export class DocumentCreateModalComponent implements OnInit {
  documentForm: FormGroup;
  isRTL = false;
  selectedFile: File | null = null;
  departments: string[] = ['HR', 'IT', 'Finance', 'Marketing', 'Operations'];
  priorities: string[] = ['High', 'Medium', 'Low'];
  
  constructor(
    private dialogRef: MatDialogRef<DocumentCreateModalComponent>,
    private fb: FormBuilder,
    private languageService: LanguageService,
    private translate: TranslateService
  ) {
    this.documentForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      fromDepartment: ['', Validators.required],
      priority: ['', Validators.required],
      file: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.languageService.isRTL$.subscribe(isRTL => {
      this.isRTL = isRTL;
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
      this.documentForm.patchValue({ file: this.selectedFile });
      this.documentForm.get('file')?.markAsDirty();
    }
  }

  onSubmit(): void {
    if (this.documentForm.valid && this.selectedFile) {
      const formData: DocumentCreateData = {
        title: this.documentForm.get('title')?.value,
        description: this.documentForm.get('description')?.value,
        fromDepartment: this.documentForm.get('fromDepartment')?.value,
        priority: this.documentForm.get('priority')?.value,
        file: this.selectedFile
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
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  getFileNameFromPath(filePath: string): string {
    return filePath.split('\\').pop() || filePath;
  }
}
