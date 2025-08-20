import { Component, OnInit, OnDestroy, inject, ViewChildren, QueryList, ENVIRONMENT_INITIALIZER } from '@angular/core';
import { Router } from '@angular/router';
import { MatSelect } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { AuthService } from '../../../core/use-cases/auth.service';
import { DocumentService } from '../../../core/use-cases/document.service';
import { ToastService } from '../../../core/use-cases/toast.service';
import { LanguageService } from '../../../core/use-cases/language.service';
import { AuthorizationService } from '../../../core/use-cases/authorization.service';
import { DepartmentService } from '../../../data/services/department.service';
import { User, Document, DocumentFilters, DocumentStats } from '../../../core/entities';
import { Department } from '../../../domain/models/department.model';
import { LanguageSwitcherComponent } from '../../components/shared/language-switcher/language-switcher.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
// Import dialog components that will be loaded dynamically
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../components/shared/confirmation-dialog/confirmation-dialog.component';
import { DocumentCreateModalComponent } from '../../components/shared/document-create-modal/document-create-modal.component';
@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        MatCardModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MatTooltipModule,
        MatSnackBarModule,
        MatDialogModule,
        TranslateModule,
        LanguageSwitcherComponent,
        HasPermissionDirective
    ],
    providers: [
        // Register dialog components for dynamic loading without lint warnings
        // This is the recommended way to register components for dynamic loading in Angular
        { provide: ENVIRONMENT_INITIALIZER, multi: true, useValue: () => { } }
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChildren(MatSelect) matSelects!: QueryList<MatSelect>;

  currentUser: User | null = null;
  documents: Document[] = [];
  documentStats: DocumentStats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    signed: 0
  };

  isLoading = false;
  isRTL = false;

  filterForm: FormGroup;
  displayedColumns: string[] = ['title', 'department', 'priority', 'status', 'createdAt', 'actions'];

  private destroy$ = new Subject<void>();

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  public languageService = inject(LanguageService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);
  private departmentService = inject(DepartmentService);
  private router = inject(Router);
  private authorizationService = inject(AuthorizationService);
  
  departments: Department[] = [];

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      department: ['all'],
      priority: ['all'],
      status: ['all']
    });
  }

ngOnInit(): void {
  // Subscribe to language changes
  this.languageService.isRTL$
    .pipe(takeUntil(this.destroy$))
    .subscribe(isRTL => {
      this.isRTL = isRTL;
    });

  // Subscribe to current user
  this.authService.currentUser$
    .pipe(takeUntil(this.destroy$))
    .subscribe(user => {
      this.currentUser = user;
    });

  // Subscribe to documents
  this.documentService.documents$
    .pipe(takeUntil(this.destroy$))
    .subscribe(documents => {
      this.documents = documents;
    });

  // Subscribe to document stats
  this.documentService.stats$
    .pipe(takeUntil(this.destroy$))
    .subscribe((stats: DocumentStats) => {
      this.documentStats = stats;
    });

  // Subscribe to loading state - only show loading when both auth and documents are loading
  combineLatest([
    this.documentService.isLoading$,
    this.authService.isLoading$
  ]).pipe(takeUntil(this.destroy$))
    .subscribe(([docLoading, authLoading]) => {
      // Only show loading if documents are loading AND we're not in initial auth loading
      this.isLoading = docLoading && !authLoading;
    });

  // Subscribe to filter changes
  this.filterForm.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(filters => {
      this.applyFilters(filters);
    });

  // Load initial data only after auth is complete
  this.authService.isLoading$
    .pipe(takeUntil(this.destroy$))
    .subscribe(loading => {
      if (!loading) {
        this.loadData();
        // Load departments from the service
        this.departmentService.getDepartments().subscribe({
          next: (departments) => {
            this.departments = departments;
          },
          error: (error) => {
            console.error('Failed to load departments:', error);
          }
        });
      }
    });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    // Load documents and stats using the observable methods
    // Errors are handled by the observables in the service
    this.documentService.getDocuments().subscribe();
    this.documentService.getDocumentStats().subscribe();
  }

  private applyFilters(formFilters: { search?: string; department?: string | number; priority?: string; status?: string }): void {
    const filters: DocumentFilters = {
      search: formFilters.search || undefined,
      department: formFilters.department === 'all' ? undefined : formFilters.department,
      priority: formFilters.priority === 'all' ? undefined : formFilters.priority,
      status: formFilters.status === 'all' ? undefined : formFilters.status
    };

    // Apply filters by calling getDocuments with the filters
    this.documentService.getDocuments(filters).subscribe();
  }

  onLogout(): void {
    // Error is handled by the logout method in the service
    this.authService.logout();
  }

  onViewDocument(document: Document): void {
    this.router.navigate(['/document/view', document.id]);
  }

  onCreateDocument(): void {
    const dialogRef = this.dialog.open(DocumentCreateModalComponent, {
      width: '800px',
      maxWidth: '90vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.documentService.createDocument({
          title: result.title,
          description: result.description || '',
          department: result.fromDepartment,
          priority: result.priority,
          file: result.file
        }).subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.success(this.translate.instant('documents.create.success'));
            this.loadData(); // Refresh document list
          },
          error: () => {
            this.isLoading = false;
            this.toastService.error(this.translate.instant('documents.create.error'));
          }
        });
      }
    });
  }

  onEditDocument(document: Document): void {
    this.router.navigate(['/document/edit', document.id]);
  }

  onDeleteDocument(document: Document): void {
    const dialogData: ConfirmationDialogData = {
      title: this.translate.instant('dialogs.confirmation.deleteDocument.title'),
      message: this.translate.instant('dialogs.confirmation.deleteDocument.message'),
      documentTitle: document.title,
      confirmText: this.translate.instant('dialogs.confirmation.deleteDocument.confirm'),
      cancelText: this.translate.instant('dialogs.confirmation.deleteDocument.cancel'),
      type: 'danger'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteDocument(document);
      }
    });
  }

  private deleteDocument(document: Document): void {
    this.documentService.deleteDocument(document.id).subscribe({
      next: () => {
        this.toastService.successTranslated('documents.delete.success');
      },
      error: () => {
        this.toastService.errorTranslated('documents.delete.error');
      }
    });
  }

  // private signDocument(documentId: number, signatureBase64: string): void {
  //   this.documentService.signDocument(documentId, {
  //     signature_data: signatureBase64,
  //     documentId: documentId
  //   }).subscribe({
  //     next: () => {
  //       this.toastService.successTranslated('documents.sign.success');
  //       // Refresh documents list
  //       this.loadData();
  //     },
  //     error: (error) => {
  //       this.toastService.errorTranslated('documents.sign.error');
  //     }
  //   });
  // }

  private addDocumentComment(documentId: number, comment: string, redirectDepartment: string): void {
    this.documentService.addDocumentComment(documentId, {
      comment: comment,
      redirectDepartment: redirectDepartment
    }).subscribe({
      next: () => {
        this.toastService.successTranslated('documents.comment.success');
        // Refresh documents list
        this.loadData();
      },
      error: () => {
        this.toastService.errorTranslated('documents.comment.error');
      }
    });
  }

  canViewDocument(): boolean {
    // Use the synchronous method from the authorization service
    return this.authorizationService.canViewDocumentOnDashboardSync();
  }

  canEditDocument(document: Document): boolean {
    if (!document) return false;
    
    // Use the synchronous method from the authorization service
    return this.authorizationService.canEditDocumentSync(document);
  }

  canDeleteDocument(): boolean {
    return true; // All users can delete documents based on the current implementation
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'warn';
      case 'inProgress': return 'accent';
      case 'completed': return 'primary';
      case 'signed': return 'primary';
      default: return '';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'warn';
      case 'medium': return 'accent';
      case 'low': return 'primary';
      default: return '';
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat(
      this.languageService.currentLanguage,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);
  }
  
  resetFilters(): void {
    // Reset form to default values
    this.filterForm.reset({
      search: '',
      department: 'all',
      priority: 'all',
      status: 'all'
    });
    
    // Reload data with reset filters
    this.loadData();
  }
}
