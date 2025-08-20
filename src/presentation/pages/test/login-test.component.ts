import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/use-cases/auth.service';
import { AuthorizationService } from '../../../core/use-cases/authorization.service';
import { Document } from '../../../core/entities';
import { User } from '../../../core/entities/user.model';

@Component({
    selector: 'app-login-test',
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        MatIconModule
    ],
    template: `
    <div class="test-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Login Test Results</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="isLoading" class="loading">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Running tests...</p>
          </div>

          <div *ngIf="!isLoading">
            <h3>Authentication Status</h3>
            <p>Is Authenticated: <strong>{{ isAuthenticated ? 'Yes' : 'No' }}</strong></p>
            
            <h3>User Profile</h3>
            <div *ngIf="currentUser; else noUser">
              <p>User ID: <strong>{{ currentUser.id }}</strong></p>
              <p>Name: <strong>{{ currentUser.firstName }} {{ currentUser.lastName }}</strong></p>
              <p>Email: <strong>{{ currentUser.email }}</strong></p>
              <p>Role: <strong>{{ currentUser.role }}</strong></p>
            </div>
            <ng-template #noUser>
              <p>No user profile loaded</p>
            </ng-template>

            <mat-divider class="my-3"></mat-divider>
            
            <h3>Permission Tests</h3>
            <div *ngIf="permissionResults.length > 0">
              <div *ngFor="let result of permissionResults" class="permission-result">
                <p>
                  <mat-icon [ngClass]="result.result ? 'success' : 'error'">
                    {{ result.result ? 'check_circle' : 'error' }}
                  </mat-icon>
                  <span>{{ result.name }}: <strong>{{ result.result ? 'Granted' : 'Denied' }}</strong></span>
                </p>
              </div>
            </div>
            <div *ngIf="permissionResults.length === 0">
              <p>No permission tests run yet</p>
            </div>

            <mat-divider class="my-3"></mat-divider>
            
            <h3>Test Log</h3>
            <div class="log-container">
              <p *ngFor="let log of logs" [ngClass]="log.type">
                {{ log.message }}
              </p>
            </div>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="runTests()">Run Tests</button>
          <button mat-button (click)="navigateToDashboard()">Go to Dashboard</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
    styles: [`
    .test-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 2rem 0;
    }
    .my-3 {
      margin: 1.5rem 0;
    }
    .log-container {
      max-height: 300px;
      overflow-y: auto;
      background-color: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      font-family: monospace;
    }
    .info {
      color: #0066cc;
    }
    .success {
      color: #00aa00;
    }
    .error {
      color: #cc0000;
    }
    .permission-result {
      display: flex;
      align-items: center;
    }
    .permission-result mat-icon {
      margin-right: 0.5rem;
    }
  `]
})
export class LoginTestComponent implements OnInit {
  isLoading = false;
  isAuthenticated = false;
  currentUser: User | null = null;
  permissionResults: { name: string; result: boolean }[] = [];
  logs: { type: 'info' | 'success' | 'error'; message: string }[] = [];

  private authService = inject(AuthService);
  private authorizationService = inject(AuthorizationService);
  private router = inject(Router);

  ngOnInit(): void {
    this.addLog('info', 'Test component initialized');
    this.checkAuthStatus();
  }

  checkAuthStatus(): void {
    this.isAuthenticated = this.authService.isAuthenticatedSync();
    this.currentUser = this.authService.currentUser;
    
    if (this.isAuthenticated) {
      this.addLog('success', 'User is authenticated');
      if (this.currentUser) {
        this.addLog('info', `User profile loaded: ${this.currentUser.firstName} ${this.currentUser.lastName}`);
      } else {
        this.addLog('error', 'User is authenticated but no profile is loaded');
      }
    } else {
      this.addLog('info', 'User is not authenticated');
    }
  }

  async runTests(): Promise<void> {
    this.isLoading = true;
    this.logs = [];
    this.permissionResults = [];
    
    this.addLog('info', '=== Starting Login Tests ===');
    
    // Check initial auth state
    this.checkAuthStatus();
    
    // Test user profile loading
    try {
      this.addLog('info', 'Testing user profile loading...');
      const user = await this.authService.getCurrentUser().toPromise();
      if (user) {
        this.addLog('success', `User profile loaded successfully: ${user.firstName} ${user.lastName}`);
        this.currentUser = user;
      } else {
        this.addLog('error', 'User profile is undefined');
      }
    } catch (error: unknown) {
      this.addLog('error', `Failed to load user profile: ${(error as Error)?.message || 'Unknown error'}`);
    }
    
    // Test permissions
    this.addLog('info', 'Testing permissions...');
    
    // Create a mock document for testing
    const mockDocument: Document = {
      id: 1,
      title: 'Test Document',
      description: 'Test description',
      department: 'finance',
      priority: 'high',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    } as Document;
    
    // Test view permission
    this.authorizationService.canViewDocumentOnDashboard().subscribe(
      result => {
        this.permissionResults.push({ name: 'View Documents on Dashboard', result });
        this.addLog(result ? 'success' : 'info', `Can view documents on dashboard: ${result}`);
      },
      error => this.addLog('error', `Error checking view permission: ${(error as Error)?.message || 'Unknown error'}`)
    );
    
    // Test edit permission
    this.authorizationService.canEditDocument(mockDocument).subscribe(
      result => {
        this.permissionResults.push({ name: 'Edit Document', result });
        this.addLog(result ? 'success' : 'info', `Can edit document: ${result}`);
      },
      error => this.addLog('error', `Error checking edit permission: ${(error as Error)?.message || 'Unknown error'}`)
    );
    
    // Test delete permission
    this.authorizationService.canDeleteDocument(mockDocument).subscribe(
      result => {
        this.permissionResults.push({ name: 'Delete Document', result });
        this.addLog(result ? 'success' : 'info', `Can delete document: ${result}`);
      },
      error => this.addLog('error', `Error checking delete permission: ${(error as Error)?.message || 'Unknown error'}`)
    );
    
    // Test comment permission
    this.authorizationService.canCommentOnDocument(mockDocument).subscribe(
      result => {
        this.permissionResults.push({ name: 'Comment on Document', result });
        this.addLog(result ? 'success' : 'info', `Can comment on document: ${result}`);
      },
      error => this.addLog('error', `Error checking comment permission: ${(error as Error)?.message || 'Unknown error'}`)
    );
    
    this.addLog('info', '=== Login Tests Complete ===');
    this.isLoading = false;
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  private addLog(type: 'info' | 'success' | 'error', message: string): void {
    this.logs.push({ type, message });
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}
