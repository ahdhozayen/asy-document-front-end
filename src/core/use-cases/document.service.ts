import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, throwError, forkJoin } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { HttpClientService } from '../../infrastructure/http/http-client.service';
import { ApiConfig } from '../../infrastructure/http/api.config';
import {
  Document,
  DocumentStats,
  DocumentFilters,
  CreateDocumentData,
  CreateDocumentMetadata,
  UploadDocumentAttachment,
  ApiResponse,
  HomeStatsApiResponse,
  DocumentApiResponse
} from '../entities';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private config = ApiConfig.getInstance();
  private documentsSubject = new BehaviorSubject<Document[]>([]);
  private statsSubject = new BehaviorSubject<DocumentStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    signed: 0
  });
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public documents$ = this.documentsSubject.asObservable();
  public stats$ = this.statsSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  private httpClient = inject(HttpClientService);

  /**
   * Helper method to extract a document from a potentially paginated API response
   * @param response API response that might be paginated
   * @returns Document instance
   */
  public extractDocumentFromResponse(response: ApiResponse<DocumentApiResponse> | DocumentApiResponse): Document {
    // Handle paginated response structure
    if ((response as ApiResponse<DocumentApiResponse>).results && Array.isArray((response as ApiResponse<DocumentApiResponse>).results) && (response as ApiResponse<DocumentApiResponse>).results.length > 0) {
      return Document.fromApiResponse((response as ApiResponse<DocumentApiResponse>).results[0]);
    }
    return Document.fromApiResponse(response as DocumentApiResponse);
  }

  getDocuments(filters?: DocumentFilters): Observable<Document[]> {
    // Set loading state asynchronously to avoid ExpressionChangedAfterItHasBeenCheckedError
    Promise.resolve().then(() => this.isLoadingSubject.next(true));

    let url = this.config.endpoints.documents.list;

    const params = new URLSearchParams();

    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.department) params.append('department', filters.department.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('page_size', filters.pageSize.toString());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.httpClient.get<ApiResponse<DocumentApiResponse>>(url).pipe(
      map(response => {
        // Handle both paginated and direct array responses
        const data = (response as ApiResponse<DocumentApiResponse>).results || response;
        return Array.isArray(data) ? data.map(item => Document.fromApiResponse(item as DocumentApiResponse)) : [];
      }),
      tap(documents => {
        this.documentsSubject.next(documents);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        console.error('An error occurred:', error);
        console.error('Error fetching documents:', error);
        console.log('Error details:', error); 
        this.isLoadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  getDocumentsWithPagination(filters?: DocumentFilters): Observable<{ documents: Document[]; total: number; currentPage: number; pageSize: number }> {
    // Set loading state asynchronously to avoid ExpressionChangedAfterItHasBeenCheckedError
    Promise.resolve().then(() => this.isLoadingSubject.next(true));

    let url = this.config.endpoints.documents.list;

    const params = new URLSearchParams();

    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.department) params.append('department', filters.department.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('page_size', filters.pageSize.toString());
      if (filters.sortBy && filters.sort) {
        const ordering = filters.sort === 'desc' ? `-${filters.sortBy}` : filters.sortBy;
        params.append('ordering', ordering);
      }
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.httpClient.get<ApiResponse<DocumentApiResponse>>(url).pipe(
      map(response => {
        const documents = Array.isArray(response.results) 
          ? response.results.map(item => Document.fromApiResponse(item as DocumentApiResponse)) 
          : [];
        
        return {
          documents,
          total: response.count || 0,
          currentPage: filters?.page || 1,
          pageSize: filters?.pageSize || 10
        };
      }),
      tap(result => {
        this.documentsSubject.next(result.documents);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        console.error('An error occurred:', error);
        console.error('Error fetching documents:', error);
        console.log('Error details:', error); 
        this.isLoadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  getDocumentStats(): Observable<DocumentStats> {
    const statsEndpoint = this.config.endpoints.home.stats;

    if (!statsEndpoint) {
      const defaultStats: DocumentStats = {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        signed: 0
      };
      this.statsSubject.next(defaultStats);
      return new Observable(observer => {
        observer.next(defaultStats);
        observer.complete();
      });
    }

    return this.httpClient.get<HomeStatsApiResponse>(statsEndpoint).pipe(
      map(response => {
        // Map the API response to DocumentStats interface
        const stats = response.results[0];
        if (stats) {
          return {
            total: stats.total_documents,
            pending: stats.total_pending,
            inProgress: 0, // Not provided by API
            completed: 0,  // Not provided by API
            signed: stats.total_signed
          };
        }
        return {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          signed: 0
        };
      }),
      tap(stats => this.statsSubject.next(stats)),
      catchError(error => {
        console.error('An error occurred:', error);
        console.error('Error fetching document stats:', error);
        console.log('Error details:', error); 
        const defaultStats: DocumentStats = {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          signed: 0
        };
        this.statsSubject.next(defaultStats);
        return new Observable<DocumentStats>(observer => {
          observer.next(defaultStats);
          observer.complete();
        });
      })
    );
  }

  getDocument(id: number): Observable<Document> {
    return this.httpClient.get<DocumentApiResponse>(this.config.endpoints.documents.detail(id)).pipe(
      map(response => this.extractDocumentFromResponse(response))
    );
  }

  createDocument(data: CreateDocumentData): Observable<Document> {
    console.log('Starting document creation with data:', data);
    console.log('API Base URL:', this.config.baseUrl);
    console.log('Document create endpoint:', this.config.endpoints.documents.create);

    // Validate files
    if (!data.files || data.files.length === 0) {
      console.error('No files provided');
      return throwError(() => new Error('At least one file is required'));
    }

    // Validate file count based on type
    if (data.fileType === 'pdf' && data.files.length > 1) {
      console.error('Multiple PDF files not allowed');
      return throwError(() => new Error('Only one PDF file is allowed'));
    }

    // Step 1: Create document metadata
    const metadata: CreateDocumentMetadata = {
      title: data.title,
      description: data.description,
      department: data.department,
      priority: data.priority,
      file_type: data.fileType
    };

    console.log('Step 1: Creating document metadata with:', metadata);
    return this.createDocumentMetadata(metadata).pipe(
      switchMap(document => {
        console.log('Step 2: Uploading attachments for document:', document.id);
        // Step 2: Upload file attachments
        const attachment: UploadDocumentAttachment = {
          documentId: document.id,
          files: data.files
        };
        return this.uploadDocumentAttachment(attachment);
      }),
      tap(document => {
        console.log('Document creation completed successfully:', document);
        // Update local documents list
        const currentDocs = this.documentsSubject.value;
        this.documentsSubject.next([document, ...currentDocs]);
      }),
      catchError(error => {
        console.error('Error in createDocument:', error);
        console.error('Error type:', typeof error);
        console.error('Error message:', error.message);
        console.error('Error status:', error.status);
        return throwError(() => error);
      })
    );
  }

  createDocumentMetadata(metadata: CreateDocumentMetadata): Observable<Document> {
    console.log('Creating document metadata:', metadata);
    return this.httpClient.post<DocumentApiResponse>(this.config.endpoints.documents.create, metadata).pipe(
      map(response => {
        console.log('Document metadata created successfully:', response);
        return this.extractDocumentFromResponse(response);
      }),
      catchError(error => {
        console.error('Error creating document metadata:', error);
        console.error('Metadata sent:', metadata);
        return throwError(() => error);
      })
    );
  }

  uploadDocumentAttachment(attachment: UploadDocumentAttachment): Observable<Document> {
    console.log('Uploading attachments:', attachment.files.length, 'files for document:', attachment.documentId);
    
    // Upload files sequentially to avoid conflicts
    const uploadObservables = attachment.files.map((file, index) => {
      const formData = new FormData();
      formData.append('document', attachment.documentId.toString());
      formData.append('file', file);
      formData.append('original_name', file.name);

      console.log(`Uploading file ${index + 1}/${attachment.files.length}:`, file.name);
      
      return this.httpClient.postFormData<DocumentApiResponse>(this.config.endpoints.documents.attachments.create, formData);
    });

    // Upload all files and return the document (we'll get it from the last response)
    return forkJoin(uploadObservables).pipe(
      map(responses => {
        console.log('All files uploaded successfully');
        // Return the document from the last response
        return this.extractDocumentFromResponse(responses[responses.length - 1]);
      }),
      catchError(error => {
        console.error('Error uploading attachments:', error);
        return throwError(() => error);
      })
    );
  }

  updateDocument(id: number, data: Partial<CreateDocumentData & { status?: string }>): Observable<Document> {
    const updateData = {
      title: data.title,
      description: data.description,
      department: data.department,
      priority: data.priority,
      status: data.status
    };

    return this.httpClient.put<DocumentApiResponse>(this.config.endpoints.documents.update(id), updateData).pipe(
      map(response => this.extractDocumentFromResponse(response)),
      tap(updatedDocument => {
        // Update local documents list
        const currentDocs = this.documentsSubject.value;
        const index = currentDocs.findIndex(doc => doc.id === id);
        if (index !== -1) {
          const updatedDocs = [...currentDocs];
          updatedDocs[index] = updatedDocument;
          this.documentsSubject.next(updatedDocs);
        }
      })
    );
  }

  deleteDocument(id: number): Observable<void> {
    return this.httpClient.delete<void>(this.config.endpoints.documents.delete(id)).pipe(
      tap(() => {
        // Update local documents list
        const currentDocs = this.documentsSubject.value;
        const filteredDocs = currentDocs.filter(doc => doc.id !== id);
        this.documentsSubject.next(filteredDocs);
      })
    );
  }

  downloadDocument(id: number, fileName: string): Observable<void> {
    return this.httpClient.downloadFile(this.config.endpoints.documents.download(id)).pipe(
      map(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
    );
  }

  reviewDocument(id: number, status: 'signed' | 'rejected', comments?: string): Observable<Document> {
    const reviewData = {
      status,
      comments: comments || ''
    };

    return this.httpClient.patch<DocumentApiResponse>(this.config.endpoints.documents.update(id), reviewData).pipe(
      map(response => this.extractDocumentFromResponse(response)),
      tap(updatedDocument => {
        // Update local documents list
        const currentDocs = this.documentsSubject.value;
        const index = currentDocs.findIndex(doc => doc.id === id);
        if (index !== -1) {
          const updatedDocs = [...currentDocs];
          updatedDocs[index] = updatedDocument;
          this.documentsSubject.next(updatedDocs);
        }
      })
    );
  }

  signDocument(id:number, data: { signature_data: string, attachmentId:number }): Observable<Document> {
    const signData = {
      signature_data: data.signature_data,
      attachment: data.attachmentId || null
    };

    return this.httpClient.post<DocumentApiResponse>(this.config.endpoints.documents.sign, signData).pipe(
      map(response => this.extractDocumentFromResponse(response)),
      tap(updatedDocument => {
        // Update local documents list
        const currentDocs = this.documentsSubject.value;
        const index = currentDocs.findIndex(doc => doc.id === id);
        if (index !== -1) {
          const updatedDocs = [...currentDocs];
          updatedDocs[index] = updatedDocument;
          this.documentsSubject.next(updatedDocs);
        }
      })
    );
  }

  signDocumentWithComment(data: { attachment: number, signature_data: string, comments_data: string, comments: string }): Observable<Document> {
    return this.httpClient.post<DocumentApiResponse>(this.config.endpoints.documents.sign, data).pipe(
      map(response => this.extractDocumentFromResponse(response)),
      tap(updatedDocument => {
        // Update local documents list
        const currentDocs = this.documentsSubject.value;
        const index = currentDocs.findIndex(doc => doc.id === data.attachment);
        if (index !== -1) {
          const updatedDocs = [...currentDocs];
          updatedDocs[index] = updatedDocument;
          this.documentsSubject.next(updatedDocs);
        }
      })
    );
  }

  addDocumentComment(id: number, data: { comment: string, redirectDepartment: string }): Observable<Document> {
    const commentData = {
      comment: data.comment,
      redirect_department: data.redirectDepartment
    };

    return this.httpClient.post<DocumentApiResponse>(this.config.endpoints.documents.comment(id), commentData).pipe(
      map(response => this.extractDocumentFromResponse(response)),
      tap(updatedDocument => {
        // Update local documents list
        const currentDocs = this.documentsSubject.value;
        const index = currentDocs.findIndex(doc => doc.id === id);
        if (index !== -1) {
          const updatedDocs = [...currentDocs];
          updatedDocs[index] = updatedDocument;
          this.documentsSubject.next(updatedDocs);
        }
      })
    );
  }

  deleteAttachment(attachmentId: number): Observable<void> {
    return this.httpClient.delete<void>(this.config.endpoints.documents.attachments.delete(attachmentId));
  }

  getSignaturesForAttachment(attachmentId: number): Observable<any[]> {
    return this.httpClient.get<any[]>(this.config.endpoints.documents.signatures.list(attachmentId)).pipe(
      map(response => {
        // Handle array response
        return Array.isArray(response) ? response : [];
      }),
      catchError(error => {
        console.error('Error fetching signatures:', error);
        return throwError(() => error);
      })
    );
  }

  // Getters for current state
  get documents(): Document[] {
    return this.documentsSubject.value;
  }

  get stats(): DocumentStats {
    return this.statsSubject.value;
  }

  get isLoading(): boolean {
    return this.isLoadingSubject.value;
  }
}
