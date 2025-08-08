export type DocumentStatus = 'pending' | 'in_review' | 'signed' | 'rejected';
export type DocumentPriority = 'low' | 'medium' | 'high' | 'urgent';

export enum DOCUMENT_PRIORITY {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

interface DocumentApiResponse {
  id?: number;
  title?: string;
  description?: string;
  file_name?: string;
  fileName?: string;
  file_size?: number;
  fileSize?: number;
  mime_type?: string;
  mimeType?: string;
  status?: string;
  priority?: string;
  department?: string;
  uploaded_by?: number;
  uploadedBy?: number;
  uploaded_by_name?: string;
  uploadedByName?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  file_url?: string;
  fileUrl?: string;
  reviewed_by?: number;
  reviewedBy?: number;
  reviewed_at?: string;
  reviewedAt?: string;
  comments?: string;
}

export class Document {
  constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly description: string,
    public readonly fileName: string,
    public readonly fileSize: number,
    public readonly mimeType: string,
    public readonly status: DocumentStatus,
    public readonly priority: DocumentPriority,
    public readonly department: string,
    public readonly uploadedBy: number,
    public readonly uploadedByName: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly fileUrl?: string,
    public readonly reviewedBy?: number,
    public readonly reviewedAt?: Date,
    public readonly comments?: string
  ) {}

  get isPending(): boolean {
    return this.status === 'pending';
  }

  get isSigned(): boolean {
    return this.status === 'signed';
  }

  get isInReview(): boolean {
    return this.status === 'in_review';
  }

  get isRejected(): boolean {
    return this.status === 'rejected';
  }

  get isHighPriority(): boolean {
    return this.priority === 'high';
  }

  get isMediumPriority(): boolean {
    return this.priority === 'medium';
  }

  get isLowPriority(): boolean {
    return this.priority === 'low';
  }

  get formattedFileSize(): string {
    const bytes = this.fileSize;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get statusColor(): string {
    switch (this.status) {
      case 'pending':
        return 'warning';
      case 'in_review':
        return 'info';
      case 'signed':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  }

  get priorityColor(): string {
    switch (this.priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  }

  get canBeEdited(): boolean {
    return this.status !== 'signed';
  }

  get canBeReviewed(): boolean {
    return this.status === 'pending' || this.status === 'in_review';
  }

  get canBeDeleted(): boolean {
    return this.status !== 'signed';
  }

  get isOverdue(): boolean {
    // Consider documents older than 30 days as overdue if still pending
    if (this.status !== 'pending') return false;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.createdAt < thirtyDaysAgo;
  }

  get daysSinceCreated(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get formattedCreatedAt(): string {
    return this.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get formattedUpdatedAt(): string {
    return this.updatedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static fromApiResponse(data: DocumentApiResponse): Document {
    const parseDate = (dateValue: unknown): Date => {
      if (!dateValue) return new Date();
      const parsed = new Date(dateValue as string);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const parseOptionalDate = (dateValue: unknown): Date | undefined => {
      if (!dateValue) return undefined;
      const parsed = new Date(dateValue as string);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    };

    return new Document(
      data.id || 0,
      data.title || '',
      data.description || '',
      data.file_name || data.fileName || '',
      data.file_size || data.fileSize || 0,
      data.mime_type || data.mimeType || '',
      (data.status as DocumentStatus) || 'pending',
      (data.priority as DocumentPriority) || 'medium',
      data.department || '',
      data.uploaded_by || data.uploadedBy || 0,
      data.uploaded_by_name || data.uploadedByName || '',
      parseDate(data.created_at || data.createdAt),
      parseDate(data.updated_at || data.updatedAt),
      data.file_url || data.fileUrl,
      data.reviewed_by || data.reviewedBy,
      parseOptionalDate(data.reviewed_at || data.reviewedAt),
      data.comments
    );
  }

  toApiRequest(): Record<string, unknown> {
    return {
      title: this.title,
      description: this.description,
      file_name: this.fileName,
      file_size: this.fileSize,
      mime_type: this.mimeType,
      status: this.status,
      priority: this.priority,
      department: this.department,
      comments: this.comments
    };
  }

  withStatus(status: DocumentStatus): Document {
    return new Document(
      this.id,
      this.title,
      this.description,
      this.fileName,
      this.fileSize,
      this.mimeType,
      status,
      this.priority,
      this.department,
      this.uploadedBy,
      this.uploadedByName,
      this.createdAt,
      new Date(), // Update the updatedAt timestamp
      this.fileUrl,
      this.reviewedBy,
      this.reviewedAt,
      this.comments
    );
  }

  withComments(comments: string): Document {
    return new Document(
      this.id,
      this.title,
      this.description,
      this.fileName,
      this.fileSize,
      this.mimeType,
      this.status,
      this.priority,
      this.department,
      this.uploadedBy,
      this.uploadedByName,
      this.createdAt,
      new Date(),
      this.fileUrl,
      this.reviewedBy,
      this.reviewedAt,
      comments
    );
  }
}
