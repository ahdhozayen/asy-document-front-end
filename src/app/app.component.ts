import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../core/use-cases/auth.service';
import { LanguageService } from '../core/use-cases/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'document-management-angular';
  isLoading = true;
  isAuthenticated = false;
  isRTL = true;
  
  private destroy$ = new Subject<void>();

  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);

  ngOnInit(): void {
    // Subscribe to authentication state
    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });

    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(authenticated => {
        this.isAuthenticated = authenticated;
      });

    // Subscribe to language changes
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
}
