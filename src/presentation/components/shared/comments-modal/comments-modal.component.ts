import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { inject } from '@angular/core';

export interface CommentsModalData {
  documentId: number;
  commentCount: number;
}

export interface CommentsModalResult {
  comment: string;
  redirectDepartment: string;
}

@Component({
  selector: 'app-comments-modal',
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
    TranslateModule
  ],
  templateUrl: './comments-modal.component.html',
  styleUrls: ['./comments-modal.component.scss']
})
export class CommentsModalComponent {
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<CommentsModalComponent>);
  public data = inject(MAT_DIALOG_DATA) as CommentsModalData;
  commentForm: FormGroup;
  isSubmitting = false;

  constructor() {
    this.commentForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      comment: ['', [Validators.required, Validators.minLength(10)]],
      redirectDepartment: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.commentForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const formValue = this.commentForm.value;
      const result: CommentsModalResult = {
        comment: formValue.comment.trim(),
        redirectDepartment: formValue.redirectDepartment
      };

      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getFieldError(fieldName: string): string | null {
    const field = this.commentForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return 'validation.required';
      }
      if (field.errors['minlength']) {
        return 'validation.minLength';
      }
    }
    return null;
  }
}
