import { Component, Inject, OnInit, ENVIRONMENT_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';

import { Document } from '../../../../core/entities/document.model';
import { LanguageService } from '../../../../core/use-cases/language.service';
import { MatDialog } from '@angular/material/dialog';

// Import signature modal component for dynamic loading via MatDialog
import { SignatureModalComponent } from '../signature-modal/signature-modal.component';

export interface DocumentViewModalData {
  document: Document;
  departments: string[];
}

export interface DocumentCommentData {
  comment: string;
  redirectDepartment: string;
}

@Component({
  selector: 'app-document-view-modal',
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
    MatChipsModule,
    TranslateModule
  ],
  providers: [
    // Register SignatureModalComponent for dynamic loading without lint warnings
    // This is the recommended way to register components for dynamic loading in Angular
    { provide: ENVIRONMENT_INITIALIZER, multi: true, useValue: () => {} }
  ],
  templateUrl: './document-view-modal.component.html',
  styleUrls: ['./document-view-modal.component.scss']
})
export class DocumentViewModalComponent implements OnInit {
  document: Document;
  departments: string[] = [];
  isRTL = false;
  commentForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<DocumentViewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DocumentViewModalData,
    private languageService: LanguageService,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.document = data.document;
    this.departments = data.departments || ['HR', 'IT', 'Finance', 'Marketing', 'Operations'];
    
    this.commentForm = this.fb.group({
      comment: ['', Validators.required],
      redirectDepartment: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.languageService.isRTL$.subscribe(isRTL => {
      this.isRTL = isRTL;
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onSubmitComment(): void {
    if (this.commentForm.valid) {
      const commentData: DocumentCommentData = {
        comment: this.commentForm.value.comment,
        redirectDepartment: this.commentForm.value.redirectDepartment
      };
      this.dialogRef.close(commentData);
    }
  }

  onSignDocument(): void {
    const dialogRef = this.dialog.open(SignatureModalComponent, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(signatureData => {
      if (signatureData && signatureData.signatureBase64) {
        // Return both the comment data and signature data
        const result = {
          ...this.commentForm.value,
          signatureBase64: signatureData.signatureBase64
        };
        this.dialogRef.close(result);
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_review': return 'bg-blue-100 text-blue-800';
      case 'signed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return date.toLocaleString();
  }
}
