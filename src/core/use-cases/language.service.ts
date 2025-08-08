import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from '../../infrastructure/storage/storage.service';

export type SupportedLanguage = 'ar' | 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguageSubject = new BehaviorSubject<SupportedLanguage>('ar');
  private isRTLSubject = new BehaviorSubject<boolean>(true);

  public currentLanguage$ = this.currentLanguageSubject.asObservable();
  public isRTL$ = this.isRTLSubject.asObservable();

  constructor(
    private translate: TranslateService,
    private storage: StorageService
  ) {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    // Get saved language preference or default to Arabic
    const savedLanguage = this.storage.getLanguage() as SupportedLanguage || 'ar';
    this.setLanguage(savedLanguage);
  }

  setLanguage(language: SupportedLanguage): void {
    this.currentLanguageSubject.next(language);
    this.isRTLSubject.next(language === 'ar');
    
    // Update translation service
    this.translate.use(language);
    
    // Save preference
    this.storage.setLanguage(language);
    
    // Update document direction and language
    this.updateDocumentDirection(language);
  }

  private updateDocumentDirection(language: SupportedLanguage): void {
    const isRTL = language === 'ar';
    const htmlElement = document.documentElement;
    
    // Set direction attribute
    htmlElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    
    // Set language attribute
    htmlElement.setAttribute('lang', language);
    
    // Add/remove RTL class for additional styling
    if (isRTL) {
      htmlElement.classList.add('rtl');
      htmlElement.classList.remove('ltr');
    } else {
      htmlElement.classList.add('ltr');
      htmlElement.classList.remove('rtl');
    }
  }

  toggleLanguage(): void {
    const currentLang = this.currentLanguageSubject.value;
    const newLang: SupportedLanguage = currentLang === 'ar' ? 'en' : 'ar';
    this.setLanguage(newLang);
  }

  // Getters for current state
  get currentLanguage(): SupportedLanguage {
    return this.currentLanguageSubject.value;
  }

  get isRTL(): boolean {
    return this.isRTLSubject.value;
  }

  get isArabic(): boolean {
    return this.currentLanguage === 'ar';
  }

  get isEnglish(): boolean {
    return this.currentLanguage === 'en';
  }
}
