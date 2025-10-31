import {
  Component,
  ViewChild,
  ElementRef,
  inject,
  OnInit,
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { DocumentService } from '../../../../core/use-cases/document.service';
import { ToastService } from '../../../../core/use-cases/toast.service';
import { LanguageService } from '../../../../core/use-cases/language.service';

@Component({
  selector: 'app-sign-comment-modal',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './sign-comment-modal.component.html',
  styleUrls: ['./sign-comment-modal.component.scss'],
})
export class SignCommentModalComponent implements OnInit {
  @ViewChild('signatureCanvas', { static: false })
  signatureCanvas!: ElementRef<HTMLCanvasElement>;
  form: FormGroup;
  isDrawing = false;
  lastX = 0;
  lastY = 0;
  isLoading = false;
  attachmentId: number | null = null;
  isReplacement = false;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  public dialogRef = inject(MatDialogRef<SignCommentModalComponent>);
  private fb = inject(FormBuilder);
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private languageService = inject(LanguageService);
  private data = inject(MAT_DIALOG_DATA);

  ngOnInit(): void {
    // Get attachment ID from dialog data
    if (this.data && this.data.attachmentId) {
      this.attachmentId = this.data.attachmentId;
    }

    // Pre-populate comments if this is a replacement
    if (this.data && this.data.existingComments) {
      this.form.patchValue({
        comments: this.data.existingComments
      });
    }

    // Set replacement flag
    if (this.data && this.data.isReplacement) {
      this.isReplacement = this.data.isReplacement;
    }
  }

  constructor() {
    this.form = this.fb.group({
      comments: [''],
      signature: [''],
    });
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
  }

  private initializeCanvas(): void {
    this.canvas = this.signatureCanvas.nativeElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.canvas.width = 430;
    this.canvas.height = 300;
    this.ctx.strokeStyle = '#FF0000'; // Red color for signature
    this.ctx.lineWidth = 4; // Thicker line for bolder signature
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.clearCanvas();
  }

  onMouseDown(event: MouseEvent): void {
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDrawing) return;
    const rect = this.canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(currentX, currentY);
    this.ctx.stroke();
    this.lastX = currentX;
    this.lastY = currentY;
  }

  onMouseUp(): void {
    this.isDrawing = false;
    this.updateSignatureValue();
  }

  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = touch.clientX - rect.left;
    this.lastY = touch.clientY - rect.top;
    this.isDrawing = true;
  }

  onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing) return;
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(currentX, currentY);
    this.ctx.stroke();
    this.lastX = currentX;
    this.lastY = currentY;
  }

  onTouchEnd(): void {
    this.isDrawing = false;
    this.updateSignatureValue();
  }

  clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.updateSignatureValue();
  }

  private isCanvasEmpty(): boolean {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] !== 0) {
        return false;
      }
    }
    return true;
  }

  private updateSignatureValue(): void {
    if (this.isCanvasEmpty()) {
      this.form.get('signature')?.setValue('');
    } else {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(this.canvas, 0, 0);
      const signatureBase64 = tempCanvas.toDataURL('image/png');
      this.form.get('signature')?.setValue(signatureBase64);
    }
    this.form.get('signature')?.markAsTouched();
  }

  private createCommentsImageBase64(): string {
    if (!this.form.value.comments || this.form.value.comments.trim() === '') {
      return '';
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    // Get current language to determine text direction
    const isRTL = this.languageService.isRTL;
    const textDirection = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left'; // Right-align for RTL, left-align for LTR

    // FIXED WIDTH for comments image
    const FIXED_WIDTH = 1200;  // Image width in pixels
    const padding = 30;
    const MAX_TEXT_WIDTH = FIXED_WIDTH - (padding * 2); // Account for margins
    const lineHeight = 50;  // Increased from 40 to 50px

    // Set text properties FIRST for measuring
    tempCtx.font = 'bold 36px Arial'; // Increased from 32px to 36px
    tempCtx.fillStyle = '#FF0000';
    tempCtx.textAlign = textAlign as CanvasTextAlign;
    tempCtx.direction = textDirection;
    tempCtx.textBaseline = 'top';

    // Split by newlines and wrap long lines
    const inputLines = this.form.value.comments.split('\n');
    const wrappedLines: string[] = [];

    // Helper function to break long word into smaller chunks
    const breakLongWord = (word: string, maxWidth: number): string[] => {
      const chunks: string[] = [];
      let currentChunk = '';

      // Try breaking by characters for very long words
      for (let i = 0; i < word.length; i++) {
        const testChunk = currentChunk + word[i];
        const metrics = tempCtx.measureText(testChunk);

        if (metrics.width > maxWidth && currentChunk) {
          chunks.push(currentChunk);
          currentChunk = word[i];
        } else {
          currentChunk = testChunk;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }

      return chunks.length > 0 ? chunks : [word];
    };

    // Wrap each line if it's too long
    inputLines.forEach((line) => {
      if (line.trim() === '') {
        wrappedLines.push('');
        return;
      }

      const words = line.split(' ');
      let currentLine = '';

      words.forEach((word, index) => {
        // Check if the word itself is too long
        const wordMetrics = tempCtx.measureText(word);
        
        if (wordMetrics.width > MAX_TEXT_WIDTH) {
          // Word itself is too long, break it first
          if (currentLine) {
            // Push current line before breaking the long word
            wrappedLines.push(currentLine);
            currentLine = '';
          }
          
          // Break the long word
          const wordChunks = breakLongWord(word, MAX_TEXT_WIDTH);
          // Push all chunks except the last one
          for (let i = 0; i < wordChunks.length - 1; i++) {
            wrappedLines.push(wordChunks[i]);
          }
          // Keep the last chunk for the current line
          currentLine = wordChunks[wordChunks.length - 1] || '';
        } else {
          // Normal word, try adding it to current line
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const metrics = tempCtx.measureText(testLine);

          if (metrics.width > MAX_TEXT_WIDTH && currentLine) {
            // Line is too long, push current line and start new one
            wrappedLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
      });

      // Push the last line if it exists
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    });

    // Calculate canvas height based on wrapped lines
    tempCanvas.width = FIXED_WIDTH;
    tempCanvas.height = (wrappedLines.length * lineHeight) + (padding * 2);

    // Re-apply text properties after canvas resize
    tempCtx.font = 'bold 36px Arial';
    tempCtx.fillStyle = '#FF0000';
    tempCtx.textAlign = textAlign as CanvasTextAlign;
    tempCtx.direction = textDirection;
    tempCtx.textBaseline = 'top';

    // Calculate x position based on alignment (right for RTL, left for LTR)
    const textX = isRTL ? FIXED_WIDTH - padding : padding;

    // Draw each wrapped line with appropriate alignment
    wrappedLines.forEach((line, index) => {
      tempCtx.fillText(line, textX, padding + (index * lineHeight));
    });

    const commentsBase64 = tempCanvas.toDataURL('image/png');
    return commentsBase64;
  }

  onSave(): void {
    if (this.attachmentId) {
      this.isLoading = true;
      console.log(this.form.value);

      // Get signature Base64 from form (canvas drawing only)
      const signatureBase64 = this.form.value.signature;

      // Get comments Base64 (text rendered as image, auto-sized)
      const commentsBase64 = this.createCommentsImageBase64();

      this.documentService
        .signDocumentWithComment({
          attachment: this.attachmentId,
          comments: this.form.value.comments, // Plain text for Document.comments
          signature_data: signatureBase64,     // Signature drawing Base64
          comments_data: commentsBase64,       // Comments text as Base64 image
        })
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.successTranslated(
              'documents.signAndComment.success'
            );
            this.dialogRef.close({ success: true });
          },
          error: (error) => {
            this.isLoading = false;
            console.log('Full error object:', error);
            console.log('error.data:', error?.data);

            // Get current language
            const currentLang = this.languageService.currentLanguage;
            console.log('Current language:', currentLang);

            // Try to get the localized error message from backend
            let errorMessage = null;

            // Check for language-specific messages (message_ar or message_en)
            if (currentLang === 'ar' && error?.data?.message_ar) {
              errorMessage = error.data.message_ar;
            } else if (currentLang === 'en' && error?.data?.message_en) {
              errorMessage = error.data.message_en;
            }
            // Fallback to message field
            else if (error?.data?.message) {
              errorMessage = error.data.message;
            }
            // Check error.message (ApiError extracts from backend message)
            else if (error?.message && error.message !== 'An error occurred') {
              errorMessage = error.message;
            }
            // Check for field-specific errors in error.data.errors
            else if (error?.data?.errors) {
              const firstField = Object.keys(error.data.errors)[0];
              const fieldError = error.data.errors[firstField];
              if (Array.isArray(fieldError) && fieldError.length > 0) {
                const firstError = fieldError[0];
                // Check if error is an object with language keys
                if (typeof firstError === 'object' && firstError !== null) {
                  errorMessage = currentLang === 'ar' ? firstError['ar'] : firstError['en'];
                } else {
                  errorMessage = firstError;
                }
              } else {
                errorMessage = fieldError;
              }
            }
            // Check for signature_data error directly in error.data
            else if (error?.data?.signature_data) {
              const sigError = Array.isArray(error.data.signature_data)
                ? error.data.signature_data[0]
                : error.data.signature_data;
              // Check if error is an object with language keys
              if (typeof sigError === 'object' && sigError !== null) {
                errorMessage = currentLang === 'ar' ? sigError['ar'] : sigError['en'];
              } else {
                errorMessage = sigError;
              }
            }
            // Check for non_field_errors (common DRF error format)
            else if (error?.data?.non_field_errors && Array.isArray(error.data.non_field_errors)) {
              errorMessage = error.data.non_field_errors[0];
            }

            // Display the error message or fallback to generic
            if (errorMessage) {
              console.log('Displaying error message:', errorMessage);
              this.toastService.error(errorMessage);
            } else {
              console.log('No specific error message found, using generic');
              this.toastService.errorTranslated(
                'documents.signAndComment.error'
              );
            }
          },
        });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
