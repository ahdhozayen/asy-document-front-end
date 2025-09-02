import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private defaultConfig: MatSnackBarConfig = {
    duration: 5000,
    horizontalPosition: 'end',
    verticalPosition: 'bottom'
  };

  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  show(message: string, type: ToastType = 'info', duration?: number): void {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      duration: duration || this.defaultConfig.duration,
      panelClass: [`${type}-snackbar`]
    };

    this.snackBar.open(message, this.translate.instant('common.close'), config);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration || 7000); // Longer duration for errors
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  showTranslated(translationKey: string, type: ToastType = 'info', duration?: number): void {
    const message = this.translate.instant(translationKey);
    this.show(message, type, duration);
  }

  successTranslated(translationKey: string, duration?: number): void {
    this.showTranslated(translationKey, 'success', duration);
  }

  errorTranslated(translationKey: string, duration?: number): void {
    this.showTranslated(translationKey, 'error', duration || 6000);
  }

  warningTranslated(translationKey: string, duration?: number): void {
    this.showTranslated(translationKey, 'warning', duration);
  }

  infoTranslated(translationKey: string, duration?: number): void {
    this.showTranslated(translationKey, 'info', duration);
  }
}
