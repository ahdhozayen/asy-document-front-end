export type UserRole = 'ceo' | 'admin' | 'user' | 'helpdesk';

interface UserApiResponse {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  role?: string;
  avatar?: string;
  is_staff?: boolean;
  isStaff?: boolean;
  is_superuser?: boolean;
  isSuperuser?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  date_joined?: string;
  dateJoined?: string;
  last_login?: string;
  lastLogin?: string;
}

export class User {
  constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: UserRole,
    public readonly isStaff = false,
    public readonly isSuperuser = false,
    public readonly dateJoined: Date = new Date(),
    public readonly lastLogin?: Date,
    public readonly avatar?: string
  ) {}

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get displayName(): string {
    return this.fullName || this.email;
  }

  get initials(): string {
    const first = this.firstName?.charAt(0)?.toUpperCase() || '';
    const last = this.lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || this.email.charAt(0).toUpperCase();
  }

  isAdmin(): boolean {
    return this.isSuperuser || this.isStaff;
  }

  isCEO(): boolean {
    return this.role === 'ceo';
  }

  isHelpdesk(): boolean {
    return this.role === 'helpdesk';
  }

  canReviewDocuments(): boolean {
    // return this.isCEO() || this.isAdmin();
    return true;
  }

  canUploadDocuments(): boolean {
    return true; // All authenticated users can upload
  }

  canEditDocument(): boolean {
    // return this.isCEO() || this.isHelpdesk();
    return true;
  }

  canDeleteDocument(): boolean {
    return true; // All authenticated users can delete their own documents
  }

  canViewDocument(): boolean {
    // return this.isCEO() || this.isAdmin();
    return true;
  }

  static fromApiResponse(data: UserApiResponse): User {
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

    return new User(
      data.id || 0,
      data.email || '',
      data.first_name || data.firstName || '',
      data.last_name || data.lastName || '',
      (data.role as UserRole) || 'user',
      data.is_staff || data.isStaff || false,
      data.is_superuser || data.isSuperuser || false,
      parseDate(data.date_joined || data.dateJoined),
      parseOptionalDate(data.last_login || data.lastLogin),
      data.avatar
    );
  }

  toApiRequest(): Record<string, unknown> {
    return {
      email: this.email,
      first_name: this.firstName,
      last_name: this.lastName,
      role: this.role,
      is_staff: this.isStaff,
      is_superuser: this.isSuperuser
    };
  }
}
