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
  isRTL = false;
  isLoading = false;
  attachmentId: number | null = null;
  isReplacement = false;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  public dialogRef = inject(MatDialogRef<SignCommentModalComponent>);
  private fb = inject(FormBuilder);
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private data = inject(MAT_DIALOG_DATA);

  ngOnInit(): void {
    // Try to detect RTL from document or use a service if available
    this.isRTL =
      document.dir === 'rtl' || document.documentElement.dir === 'rtl';

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
    this.canvas.width = 450;
    this.canvas.height = 300;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
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

  private updateCommentsValue(): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width+50;
    tempCanvas.height = this.canvas.height+50;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(this.canvas, 0, 0);
    // Set text properties
    tempCtx.font = '20px Arial'; // Use a font that supports Arabic, e.g., 'Arial' or 'Noto Sans Arabic'
    tempCtx.fillStyle = 'black';
    tempCtx.textAlign = 'right'; // Arabic is right-to-left
    tempCtx.textBaseline = 'middle';

    // Split text by newline and draw each line
    const lines = this.form.value.comments.split('\n');
    const lineHeight = 30; // Adjust line height as needed
    lines.forEach((line, index) => {
      tempCtx?.fillText(line, tempCanvas.width - 10, 10 + index * lineHeight);
    });
    const commentsBase64 = tempCanvas.toDataURL('image/png');
    return commentsBase64;
  }

  onSave(): void {
    if (this.attachmentId) {
      this.isLoading = true;
      console.log(this.form.value);
      let commentsBase64 = this.updateCommentsValue();

      this.documentService
        .signDocumentWithComment({
          attachment: this.attachmentId,
          comments: this.form.value.comments,
          signature_data: commentsBase64,
        })
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.successTranslated(
              'documents.signAndComment.success'
            );
            this.dialogRef.close({ success: true });
          },
          error: () => {
            this.isLoading = false;
            this.toastService.errorTranslated(
              'documents.signAndComment.error'
            );
          },
        });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
