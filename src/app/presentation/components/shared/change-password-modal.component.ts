import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/use-cases/language.service';

@Component({
    selector: 'app-change-password-modal',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        TranslateModule
    ],
    templateUrl: './change-password-modal.component.html',
    styleUrl: './change-password-modal.component.scss'
})
export class ChangePasswordModalComponent {
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<ChangePasswordModalComponent>);
  public languageService = inject(LanguageService);
  isSubmitting = false;
  isRTL = false;
  passwordForm: FormGroup;
  isOldPasswordVisible = false;
  isNewPasswordVisible = false;
  isConfirmPasswordVisible = false;

  constructor() {
    this.passwordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator });

    // Subscribe to language changes for RTL support
    this.languageService.isRTL$.subscribe(isRTL => {
      this.isRTL = isRTL;
    });
  }

  passwordsMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.passwordForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const { oldPassword, newPassword, confirmPassword } = this.passwordForm.value;
      this.dialogRef.close({ oldPassword, newPassword, confirmPassword });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getFieldError(fieldName: string): string | null {
    const field = this.passwordForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return 'validation.required';
      }
      if (field.errors['minlength']) {
        return 'validation.password.minLength';
      }
    }
    if (fieldName === 'confirmPassword' && this.passwordForm.errors?.['passwordMismatch'] && field?.touched) {
      return 'validation.password.mismatch';
    }
    return null;
  }

  toggleOldPasswordVisibility() {
    this.isOldPasswordVisible = !this.isOldPasswordVisible;
  }
  toggleNewPasswordVisibility() {
    this.isNewPasswordVisible = !this.isNewPasswordVisible;
  }
  toggleConfirmPasswordVisibility() {
    this.isConfirmPasswordVisible = !this.isConfirmPasswordVisible;
  }
}
