import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';

import { LanguageService, SupportedLanguage } from '../../../../core/use-cases/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule
  ],
  template: `
    <div class="language-switcher" [class.rtl]="isRTL">
      <button
        mat-button
        [matMenuTriggerFor]="languageMenu"
        class="language-button language-switcher-button"
        [class.rtl]="isRTL">
        <mat-icon class="language-icon">language</mat-icon>
        <span class="language-text" [class.font-arabic]="currentLanguage === 'ar'">
          {{ currentLanguage === 'ar' ? 'العربية' : 'English' }}
        </span>
        <mat-icon class="dropdown-icon">arrow_drop_down</mat-icon>
      </button>

      <mat-menu #languageMenu="matMenu" class="language-dropdown" yPosition="below">
        <button mat-menu-item (click)="switchToArabic()" class="language-option">
          <mat-icon class="check-icon">{{ currentLanguage === 'ar' ? 'check' : '' }}</mat-icon>
          <span class="language-name font-arabic">العربية</span>
        </button>
        <button mat-menu-item (click)="switchToEnglish()" class="language-option">
          <mat-icon class="check-icon">{{ currentLanguage === 'en' ? 'check' : '' }}</mat-icon>
          <span class="language-name">English</span>
        </button>
      </mat-menu>
    </div>
  `,
  styles: [`
    .language-switcher {
      position: relative;

      &.rtl {
        direction: rtl;
      }
    }

    .language-button {
      position: relative;
      min-width: 140px;
      height: 40px;
      padding: 0 12px;
      border-radius: 8px;
      background: white;
      border: 1px solid #e5e7eb;
      color: #374151;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      &:hover {
        background: #f9fafb;
        border-color: #d1d5db;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      &.rtl {
        direction: rtl;
      }

      /*Hide Material Design focus indicators and touch targets*/
      ::ng-deep .mat-mdc-focus-indicator {
        display: none !important;
      }

      ::ng-deep .mat-mdc-button-touch-target {
        display: none !important;
      }

      /*Ensure proper button structure*/
      ::ng-deep .mat-mdc-button-persistent-ripple {
        border-radius: 6px;
      }

      /*Override Material button styles*/
      ::ng-deep .mdc-button {
        border-radius: 6px;
        padding: 0;
        min-width: unset;
        height: 100%;
      }
    }

    .language-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      color: #6b7280;
    }

    .language-text {
      font-size: 14px;
      font-weight: 500;
      margin: 0;
      color: #374151;
      flex: 1;
      text-align: left;

      &.font-arabic {
        font-family: 'Cairo', 'Noto Sans Arabic', sans-serif;
      }
    }

    .dropdown-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      color: #6b7280;
      transition: transform 0.2s ease;
    }

    .language-button[aria-expanded="true"] .dropdown-icon {
      transform: rotate(180deg);
    }

    /*Language dropdown menu styling*/
    ::ng-deep .language-dropdown {
      .mat-mdc-menu-content {
        background: white !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
        min-width: 160px !important;
        padding: 8px 0 !important;
        border: 1px solid #e0e0e0 !important;
      }
    }

    /*Language option styling*/
    ::ng-deep .language-option {
      height: 48px !important;
      font-size: 14px !important;
      color: #333 !important;
      padding: 0 16px !important;
      display: flex !important;
      align-items: center !important;

      &:hover {
        background: #f5f5f5 !important;
      }

      .check-icon {
        margin-right: 12px !important;
        font-size: 18px !important;
        color: #667eea !important;
        width: 20px !important;
        min-width: 20px !important;
      }

      .language-name {
        font-family: inherit !important;
        font-size: 14px !important;

        &:first-child {
          font-family: 'Cairo', 'Noto Sans Arabic', sans-serif !important;
        }
      }
    }

    /*Dashboard header specific styles*/
    :host-context(.dashboard-header) {
      .language-button {
        background: rgba(255, 255, 255, 0.15);

        &:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      }
    }

    /*Login page specific styles - now using default white button style*/
  `]
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  currentLanguage: SupportedLanguage = 'ar';
  isRTL = true;

  private destroy$ = new Subject<void>();

  public languageService = inject(LanguageService);

  constructor() {
    /*Initialize with current language from BehaviorSubject*/
    this.languageService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
    });
    this.languageService.isRTL$.subscribe(isRTL => {
      this.isRTL = isRTL;
    });
  }

  ngOnInit(): void {

    /*Subscribe to language changes*/
    this.languageService.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(language => {
        this.currentLanguage = language;
      });

    /*Subscribe to RTL changes*/
    this.languageService.isRTL$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isRTL => {
        this.isRTL = isRTL;
      });


  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getLanguageDisplay(): string {
    return this.currentLanguage === 'ar' ? 'ع' : 'EN';
  }

  switchToArabic(): void {
    this.languageService.setLanguage('ar');
  }

  switchToEnglish(): void {
    this.languageService.setLanguage('en');
  }

  onLanguageChange(language: SupportedLanguage): void {
    this.languageService.setLanguage(language);
  }
}
