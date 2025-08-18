import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/use-cases/language.service';
import { inject } from '@angular/core';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  documentTitle?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule
  ],
  template: `
    <div class="confirmation-dialog" [class.rtl]="isRTL" [attr.dir]="isRTL ? 'rtl' : 'ltr'">
      <div mat-dialog-title class="dialog-title" [class.arabic-font]="isRTL">
        <mat-icon [class]="getIconClass()">{{ getIcon() }}</mat-icon>
        <span>{{ data.title }}</span>
      </div>
      
      <div mat-dialog-content class="dialog-content" [class.arabic-font]="isRTL">
        <p class="dialog-message">{{ data.message }}</p>
        <div class="document-info" *ngIf="data.documentTitle">
          <strong>{{ 'dialogs.confirmation.documentTitle' | translate }}:</strong>
          <span class="document-title">{{ data.documentTitle }}</span>
        </div>
      </div>
      
      <div mat-dialog-actions class="dialog-actions" [class.rtl]="isRTL">
        <button 
          mat-button 
          (click)="onCancel()"
          class="cancel-button"
          [class.arabic-font]="isRTL">
          {{ data.cancelText || ('common.cancel' | translate) }}
        </button>
        <button 
          mat-raised-button 
          [color]="getButtonColor()"
          (click)="onConfirm()"
          class="confirm-button"
          [class.arabic-font]="isRTL">
          {{ data.confirmText || ('common.confirm' | translate) }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      min-width: 400px;
      max-width: 500px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 20px;
      font-weight: 500;
    }

    .dialog-title mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .icon-danger {
      color: #f44336;
    }

    .icon-warning {
      color: #ff9800;
    }

    .icon-info {
      color: #2196f3;
    }

    .dialog-content {
      margin-bottom: 24px;
    }

    .dialog-message {
      margin-bottom: 16px;
      font-size: 16px;
      line-height: 1.5;
    }

    .document-info {
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
      border-left: 4px solid #2196f3;
    }

    .document-title {
      display: block;
      margin-top: 4px;
      font-weight: 500;
      color: #333;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }

    .dialog-actions.rtl {
      justify-content: flex-start;
      flex-direction: row-reverse;
    }

    .confirm-button {
      min-width: 100px;
    }

    .cancel-button {
      min-width: 100px;
    }

    /* RTL Support */
    .rtl .document-info {
      border-left: none;
      border-right: 4px solid #2196f3;
    }

    .arabic-font {
      font-family: 'Cairo', 'Noto Sans Arabic', sans-serif;
    }
  `]
})
export class ConfirmationDialogComponent {
  public dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as ConfirmationDialogData;
  public languageService = inject(LanguageService);
  isRTL = false;

  constructor() {
    this.languageService.isRTL$.subscribe(isRTL => {
      this.isRTL = isRTL;
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  getIcon(): string {
    switch (this.data.type) {
      case 'danger':
        return 'warning';
      case 'warning':
        return 'warning_amber';
      case 'info':
        return 'info';
      default:
        return 'help';
    }
  }

  getIconClass(): string {
    switch (this.data.type) {
      case 'danger':
        return 'icon-danger';
      case 'warning':
        return 'icon-warning';
      case 'info':
        return 'icon-info';
      default:
        return 'icon-info';
    }
  }

  getButtonColor(): string {
    switch (this.data.type) {
      case 'danger':
        return 'warn';
      case 'warning':
        return 'accent';
      default:
        return 'primary';
    }
  }
}
