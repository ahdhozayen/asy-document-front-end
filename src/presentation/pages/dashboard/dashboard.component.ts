import { Component, OnInit, OnDestroy, inject, ViewChildren, QueryList, ENVIRONMENT_INITIALIZER, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSelect } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatSelectModule } from '@angular/material/select';
import {MatDividerModule} from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import {MatTableModule} from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { MatMenuTrigger } from '@angular/material/menu';

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
import { ChangePasswordModalComponent } from '../../../app/presentation/components/shared/change-password-modal.component';
@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        OverlayModule,
        MatDividerModule,
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
        HasPermissionDirective,
        ChangePasswordModalComponent
    ],
    providers: [
        // Register dialog components for dynamic loading without lint warnings
        // This is the recommended way to register components for dynamic loading in Angular
        { provide: ENVIRONMENT_INITIALIZER, multi: true, useValue: () => { } }
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren(MatSelect) matSelects!: QueryList<MatSelect>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('profileMenu') profileMenuTrigger!: MatMenuTrigger;

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

  // Pagination properties
  totalItems = 0;
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50];

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
  private cdr = inject(ChangeDetectorRef);
  
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

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData();
  }

  onSortChange(_event: Sort): void {
    // Reset to first page when sorting changes
    this.currentPage = 0;
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    // This method is called after the view has been initialized.
    // It's a good place to set initial values for the paginator and sort.
    if (this.paginator) {
      this.paginator.pageIndex = 0; // Set initial page to 0
    }
    

    
    // Use setTimeout instead of Promise.resolve to avoid ExpressionChangedAfterItHasBeenCheckedError
    // This ensures the sort operation happens in a new change detection cycle
    setTimeout(() => {
      if (this.sort) {
        this.sort.sort({ id: 'createdAt', start: 'desc', disableClear: false });
      }
      this.loadData();
    });
  }

  private loadData(): void {
    // Load documents and stats using the observable methods
    // Errors are handled by the observables in the service
    const filters: DocumentFilters = {
      page: this.currentPage + 1, // API uses 1-based indexing
      pageSize: this.pageSize
    };

    // Add sort parameters only if sort is initialized
    if (this.sort && this.sort.active && this.sort.direction) {
      filters.sort = this.sort.direction;
      filters.sortBy = this.sort.active;
    }

    this.documentService.getDocumentsWithPagination(filters).subscribe({
      next: (result) => {
        this.totalItems = result.total;
        // Update paginator if it exists
        if (this.paginator) {
          this.paginator.length = this.totalItems;
          this.paginator.pageIndex = this.currentPage;
        }
      },
      error: (error) => {
        console.error('Error loading documents:', error);
      }
    });
    
    this.documentService.getDocumentStats().subscribe({
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  private applyFilters(formFilters: { search?: string; department?: string | number; priority?: string; status?: string }): void {
    // Reset to first page when filters change
    this.currentPage = 0;
    
    const filters: DocumentFilters = {
      search: formFilters.search || undefined,
      department: formFilters.department === 'all' ? undefined : formFilters.department,
      priority: formFilters.priority === 'all' ? undefined : formFilters.priority,
      status: formFilters.status === 'all' ? undefined : formFilters.status,
      page: 1, // Reset to first page
      pageSize: this.pageSize
    };

    // Add sort parameters only if sort is initialized
    if (this.sort && this.sort.active && this.sort.direction) {
      filters.sort = this.sort.direction;
      filters.sortBy = this.sort.active;
    }

    // Apply filters by calling getDocuments with the filters
    this.documentService.getDocumentsWithPagination(filters).subscribe({
      next: (result) => {
        this.totalItems = result.total;
        // Update paginator if it exists
        if (this.paginator) {
          this.paginator.length = this.totalItems;
          this.paginator.pageIndex = 0;
        }
      },
      error: (error) => {
        console.error('Error applying filters:', error);
      }
    });
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
    
    // Reset pagination
    this.currentPage = 0;
    
    // Reload data with reset filters
    this.loadData();
  }

  openChangePasswordModal(): void {
    const dialogRef = this.dialog.open(ChangePasswordModalComponent, {
      width: '400px',
      disableClose: true
    });
    dialogRef.afterClosed().subscribe((result: { oldPassword: string, newPassword: string, confirmPassword: string }) => {
      if (result) {
        this.changePassword(result);
      }
    });
  }



  changePassword(data: { oldPassword: string, newPassword: string, confirmPassword: string }): void {
    this.authService.changePassword(data).subscribe({
      next: () => {
        this.toastService.success(this.translate.instant('auth.changePassword.success'));
        this.onLogout();
      },
      error: (err) => {
        this.toastService.error(this.translate.instant('auth.changePassword.error'));
      }
    });
  }
}
