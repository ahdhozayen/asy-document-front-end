import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '../core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../presentation/pages/login/login.component').then(
        (m) => m.LoginComponent
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('../presentation/pages/login/login.component').then(
        (m) => m.LoginComponent
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../presentation/pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'document/view/:id',
    loadComponent: () =>
      import(
        '../presentation/pages/document-view/document-view.component'
      ).then((m) => m.DocumentViewComponent),
    canActivate: [authGuard],
  },
  {
    path: 'document/edit/:id',
    loadComponent: () =>
      import(
        '../presentation/pages/document-edit/document-edit.component'
      ).then((m) => m.DocumentEditComponent),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
