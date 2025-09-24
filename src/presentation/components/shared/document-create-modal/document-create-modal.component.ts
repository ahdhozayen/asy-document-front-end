import { Component, OnInit, inject } from '@angular/core';

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
import { DepartmentService } from '../../../../data/services/department.service';
import { Department } from '../../../../domain/models/department.model';

export interface DocumentCreateData {
  title: string;
  description?: string;
  fromDepartment: number;
  priority: string;
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
  documentForm: FormGroup;
  isRTL = false;
  selectedFiles: File[] = [];
  departments: Department[] = [];
  priorities: string[] = ['High', 'Medium', 'Low'];
  fileType: 'pdf' | 'images' = 'pdf';

  private dialogRef = inject(MatDialogRef<DocumentCreateModalComponent>);
  private fb = inject(FormBuilder);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);
  private authorizationService = inject(AuthorizationService);
  private departmentService = inject(DepartmentService);

  constructor() {
    this.documentForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      fromDepartment: ['', Validators.required],
      priority: ['', Validators.required],
      fileType: ['pdf'],
      files: [[], Validators.required],
    });
  }

  ngOnInit(): void {
    this.languageService.isRTL$.subscribe((isRTL) => {
      this.isRTL = isRTL;
    });

    // Load departments from API
    this.departmentService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (error) => {
        console.error('Failed to load departments:', error);
        this.departments = [];
      },
    });
  }

  onFileTypeChange(isPdf: boolean): void {
    this.fileType = isPdf ? 'pdf' : 'images';
    this.documentForm.patchValue({ fileType: this.fileType });
    // Clear selected files when switching file type
    this.selectedFiles = [];
    this.documentForm.patchValue({ files: [] });
    this.documentForm.get('files')?.markAsDirty();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const files = Array.from(input.files);

      if (this.fileType === 'pdf') {
        // For PDF, only allow one file
        this.selectedFiles = [files[0]];
      } else {
        // For images, allow multiple files
        this.selectedFiles = files;
      }

      this.documentForm.patchValue({ files: this.selectedFiles });
      this.documentForm.get('files')?.markAsDirty();
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.documentForm.patchValue({ files: this.selectedFiles });
    this.documentForm.get('files')?.markAsDirty();
  }

  onSubmit(): void {
    if (this.documentForm.valid && this.selectedFiles.length > 0) {
      const formData: DocumentCreateData = {
        title: this.documentForm.get('title')?.value,
        description: this.documentForm.get('description')?.value,
        fromDepartment: this.documentForm.get('fromDepartment')?.value,
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
