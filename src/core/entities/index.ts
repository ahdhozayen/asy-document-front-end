export * from './user.model';
export * from './document.model';
import type { User } from './user.model';

// API Response interfaces
export interface ApiResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
}

// Home Stats API Response
export interface HomeStatsApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: HomeStatsResult[];
}

export interface HomeStatsResult {
  total_documents: number;
  total_signed: number;
  total_pending: number;
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
  status?: string;
  priority?: string | number;
  page?: number;
  pageSize?: number;
  sort?: string;
  sortBy?: string;
}

export interface CreateDocumentData {
  title: string;
  description: string;
  priority: number;
  fileType: 'pdf' | 'images';
  files: File[];
}

export interface CreateDocumentMetadata {
  title: string;
  description: string;
  priority: number;
  file_type: 'pdf' | 'images';
}

export interface UploadDocumentAttachment {
  documentId: number;
  files: File[];
}
