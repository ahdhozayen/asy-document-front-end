export * from './user.model';
export * from './document.model';
import type { User } from './user.model';

// Common types and constants
export const DEPARTMENTS = [
  'Finance',
  'HR',
  'IT',
  'Legal',
  'Operations',
  'Marketing',
  'Sales'
] as const;

export const DOCUMENT_STATUS = {
  PENDING: 'pending' as const,
  IN_REVIEW: 'in_review' as const,
  SIGNED: 'signed' as const,
  REJECTED: 'rejected' as const
};

export const DOCUMENT_PRIORITY = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const
};

export const USER_ROLES = {
  CEO: 'ceo' as const,
  HELPDESK: 'helpdesk' as const,
  EMPLOYEE: 'employee' as const
};

// API Response interfaces
export interface ApiResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
}

export interface DocumentStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  signed: number;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface DocumentFilters {
  search?: string;
  department?: string;
  status?: string;
  priority?: string;
  uploadedBy?: number;
}

export interface CreateDocumentData {
  title: string;
  description: string;
  department: string;
  priority: string;
  file: File;
}

export interface CreateDocumentMetadata {
  title: string;
  description: string;
  department: string;
  priority: string;
}

export interface UploadDocumentAttachment {
  documentId: number;
  file: File;
  originalName: string;
}
