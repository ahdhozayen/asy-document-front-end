import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

export interface SignatureModalResult {
  signatureBase64: string;
}

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslateModule
  ],
  templateUrl: './signature-modal.component.html',
  styleUrls: ['./signature-modal.component.scss']
})
export class SignatureModalComponent implements AfterViewInit {
  @ViewChild('signatureCanvas', { static: false }) signatureCanvas!: ElementRef<HTMLCanvasElement>;
  
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  constructor(public dialogRef: MatDialogRef<SignatureModalComponent>) {}

  ngAfterViewInit(): void {
    this.initializeCanvas();
  }

  private initializeCanvas(): void {
    this.canvas = this.signatureCanvas.nativeElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Set canvas size
    this.canvas.width = 400;
    this.canvas.height = 200;
    
    // Set canvas style
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Clear canvas
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
  }

  clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  onSubmit(): void {
    if (this.isCanvasEmpty()) {
      return; // Don't submit if canvas is empty
    }
    
    const signatureBase64 = this.canvas.toDataURL('image/png');
    const result: SignatureModalResult = {
      signatureBase64: signatureBase64
    };
    
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private isCanvasEmpty(): boolean {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Check if all pixels are transparent or white
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) { // Alpha channel
        return false;
      }
    }
    return true;
  }
}
