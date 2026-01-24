export type DocumentStatus = 'pending' | 'in_review' | 'signed' | 'rejected';
export type DocumentPriority = number;

export interface Attachment {
  id: number;
  file: string;
  original_name: string;
  is_signed: boolean;
  created_at: string;
  document: number;
  version_number?: number;
  original_file?: string;
}

export interface DocumentUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface DocumentApiResponse {
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
  priority?: number;
  priority_ar?: string;
  priority_en?: string;
  uploaded_by?: DocumentUser | number;
  uploaded_by_name?: string;
  uploadedByName?: string;
  created_at?: string;
  updated_at?: string;
  file_url?: string;
  fileUrl?: string;
  comments?: string;
  file_type?: 'pdf' | 'images';
  attachments?: Attachment[];
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
    public readonly priority: number,
    public readonly priority_ar: string,
    public readonly priority_en: string,
    public readonly uploadedByName: string,
    public readonly created_at: Date,
    public readonly updated_at: Date,
    public readonly fileUrl?: string,
    public readonly comments?: string,
    public readonly file_type?: 'pdf' | 'images',
    public readonly attachments?: Attachment[]
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
    const p = String(this.priority_en).toLowerCase();
    return p.includes('high') || p.includes('urgent');
  }

  get isMediumPriority(): boolean {
    const p = String(this.priority_en).toLowerCase();
    return p.includes('medium');
  }

  get isLowPriority(): boolean {
    const p = String(this.priority_en).toLowerCase();
    return p.includes('low');
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
    const p = String(this.priority_en).toLowerCase();
    if (p.includes('high') || p.includes('urgent')) return 'error';
    if (p.includes('medium')) return 'warning';
    if (p.includes('low')) return 'success';
    return 'default';
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

    return this.created_at < thirtyDaysAgo;
  }

  get uploadedByUser(): DocumentUser | undefined {
    // This will be populated when the document is loaded from the API
    return undefined; // For now, we'll access it directly from the API response
  }

  get daysSinceCreated(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.created_at.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get maxVersion(): number {
    if (!this.attachments || this.attachments.length === 0) return 1;
    const versions = this.attachments.map(att => att.version_number || 1);
    return Math.max(...versions);
  }

  get formattedCreatedAt(): string {
    return this.created_at.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get formattedUpdatedAt(): string {
    return this.updated_at.toLocaleDateString('en-US', {
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

    // Handle uploaded_by as either User object or number
    const uploadedByName = typeof data.uploaded_by === 'object'
      ? `${data.uploaded_by.first_name} ${data.uploaded_by.last_name}`.trim()
      : (data.uploaded_by_name || data.uploadedByName || '');

    return new Document(
      data.id || 0,
      data.title || '',
      data.description || '',
      data.file_name || data.fileName || '',
      data.file_size || data.fileSize || 0,
      data.mime_type || data.mimeType || '',
      (data.status as DocumentStatus) || 'pending',
      data.priority || 0,
      data.priority_ar || '',
      data.priority_en || '',
      uploadedByName,
      parseDate(data.created_at),
      parseDate(data.updated_at),
      data.file_url || data.fileUrl,
      data.comments,
      data.file_type || 'pdf',
      data.attachments
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
      this.priority_ar,
      this.priority_en,
      this.uploadedByName,
      this.created_at,
      new Date(), // Update the updatedAt timestamp
      this.fileUrl,
      this.comments,
      this.file_type,
      this.attachments
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
      this.priority_ar,
      this.priority_en,
      this.uploadedByName,
      this.created_at,
      new Date(),
      this.fileUrl,
      comments,
      this.file_type,
      this.attachments
    );
  }
}
