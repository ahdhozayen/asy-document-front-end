import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { LanguageService } from '../../../../core/use-cases/language.service';

export interface SignatureData {
  signatureBase64: string;
}

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TranslateModule
  ],
  templateUrl: './signature-modal.component.html',
  styleUrls: ['./signature-modal.component.scss']
})
export class SignatureModalComponent implements OnInit, AfterViewInit {
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  
  isRTL = false;
  isDrawing = false;
  canvasContext: CanvasRenderingContext2D | null = null;
  lastX = 0;
  lastY = 0;
  
  constructor(
    private dialogRef: MatDialogRef<SignatureModalComponent>,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.languageService.isRTL$.subscribe(isRTL => {
      this.isRTL = isRTL;
    });
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
  }

  private initializeCanvas(): void {
    const canvas = this.signatureCanvas.nativeElement;
    this.canvasContext = canvas.getContext('2d');
    
    if (this.canvasContext) {
      // Set canvas size to match container
      this.resizeCanvas();
      
      // Set drawing style
      this.canvasContext.lineJoin = 'round';
      this.canvasContext.lineCap = 'round';
      this.canvasContext.lineWidth = 2;
      this.canvasContext.strokeStyle = '#000000';
      
      // Add event listeners
      canvas.addEventListener('mousedown', this.startDrawing.bind(this));
      canvas.addEventListener('mousemove', this.draw.bind(this));
      canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
      canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
      
      // Touch events
      canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
      canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
      canvas.addEventListener('touchend', this.stopDrawing.bind(this));
    }
    
    // Handle window resize
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }

  private resizeCanvas(): void {
    const canvas = this.signatureCanvas.nativeElement;
    const container = canvas.parentElement;
    
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
  }

  private startDrawing(event: MouseEvent): void {
    this.isDrawing = true;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      this.isDrawing = true;
      const touch = event.touches[0];
      const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
      this.lastX = touch.clientX - rect.left;
      this.lastY = touch.clientY - rect.top;
    }
  }

  private draw(event: MouseEvent): void {
    if (!this.isDrawing || !this.canvasContext) return;
    
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(this.lastX, this.lastY);
    this.canvasContext.lineTo(currentX, currentY);
    this.canvasContext.stroke();
    
    this.lastX = currentX;
    this.lastY = currentY;
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.canvasContext || event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(this.lastX, this.lastY);
    this.canvasContext.lineTo(currentX, currentY);
    this.canvasContext.stroke();
    
    this.lastX = currentX;
    this.lastY = currentY;
  }

  private stopDrawing(): void {
    this.isDrawing = false;
  }

  clearSignature(): void {
    if (this.canvasContext) {
      this.canvasContext.clearRect(
        0, 
        0, 
        this.signatureCanvas.nativeElement.width, 
        this.signatureCanvas.nativeElement.height
      );
    }
  }

  saveSignature(): void {
    const canvas = this.signatureCanvas.nativeElement;
    const signatureBase64 = canvas.toDataURL('image/png');
    
    this.dialogRef.close({
      signatureBase64
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
