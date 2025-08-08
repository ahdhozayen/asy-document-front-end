import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  /**
   * Show a success toast message
   * @param message Message key to translate or direct message
   * @param duration Duration in milliseconds (default: 3000)
   */
  success(message: string, duration: number = 3000): void {
    const translatedMessage = this.translate.instant(message);
    this.snackBar.open(
      translatedMessage,
      this.translate.instant('common.close'),
      {
        duration,
        panelClass: ['success-snackbar'],
        horizontalPosition: 'end',
        verticalPosition: 'top'
      }
    );
  }

  /**
   * Show an error toast message
   * @param message Message key to translate or direct message
   * @param duration Duration in milliseconds (default: 5000)
   */
  error(message: string, duration: number = 5000): void {
    const translatedMessage = this.translate.instant(message);
    this.snackBar.open(
      translatedMessage,
      this.translate.instant('common.close'),
      {
        duration,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'end',
        verticalPosition: 'top'
      }
    );
  }

  /**
   * Show an info toast message
   * @param message Message key to translate or direct message
   * @param duration Duration in milliseconds (default: 4000)
   */
  info(message: string, duration: number = 4000): void {
    const translatedMessage = this.translate.instant(message);
    this.snackBar.open(
      translatedMessage,
      this.translate.instant('common.close'),
      {
        duration,
        panelClass: ['info-snackbar'],
        horizontalPosition: 'end',
        verticalPosition: 'top'
      }
    );
  }

  /**
   * Show a warning toast message
   * @param message Message key to translate or direct message
   * @param duration Duration in milliseconds (default: 4500)
   */
  warning(message: string, duration: number = 4500): void {
    const translatedMessage = this.translate.instant(message);
    this.snackBar.open(
      translatedMessage,
      this.translate.instant('common.close'),
      {
        duration,
        panelClass: ['warning-snackbar'],
        horizontalPosition: 'end',
        verticalPosition: 'top'
      }
    );
  }
}
