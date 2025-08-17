import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
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
  HomeStatsApiResponse
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
  private extractDocumentFromResponse(response: any): Document {
    // Handle paginated response structure
    if (response.results && Array.isArray(response.results) && response.results.length > 0) {
      return Document.fromApiResponse(response.results[0]);
    }
    return Document.fromApiResponse(response);
  }

  getDocuments(filters?: DocumentFilters): Observable<Document[]> {
    this.isLoadingSubject.next(true);

    let url = this.config.endpoints.documents.list;

    // Check if we have a token before making the request
    const token = localStorage.getItem('access');

    const params = new URLSearchParams();

    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.department) params.append('department', filters.department.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.uploadedBy) params.append('uploaded_by', filters.uploadedBy.toString());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.httpClient.get<ApiResponse<any>>(url).pipe(
      map(response => {
        // Handle both paginated and direct array responses
        const data = response.results || response;
        return Array.isArray(data) ? data.map(item => Document.fromApiResponse(item)) : [];
      }),
      tap(documents => {
        this.documentsSubject.next(documents);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {


        if (error.status === 401) {
          const currentToken = localStorage.getItem('access');
        }

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
    return this.httpClient.get<any>(this.config.endpoints.documents.detail(id)).pipe(
      map(response => this.extractDocumentFromResponse(response))
    );
  }

  createDocument(data: CreateDocumentData): Observable<Document> {
    // Validate file
    if (!data.file) {
      return throwError(() => new Error('File is required'));
    }

    // Step 1: Create document metadata
    const metadata: CreateDocumentMetadata = {
      title: data.title,
      description: data.description,
      department: data.department,
      priority: data.priority
    };

    return this.createDocumentMetadata(metadata).pipe(
      switchMap(document => {
        // Step 2: Upload file attachment
        console.log("test the document id")
        console.log(document);
        
        const attachment: UploadDocumentAttachment = {
          documentId: document.id,
          file: data.file,
          originalName: data.file.name
        };
        return this.uploadDocumentAttachment(attachment);
      }),
      tap(document => {
        // Update local documents list
        const currentDocs = this.documentsSubject.value;
        this.documentsSubject.next([document, ...currentDocs]);
      })
    );
  }

  createDocumentMetadata(metadata: CreateDocumentMetadata): Observable<Document> {
    return this.httpClient.post<any>(this.config.endpoints.documents.create, metadata).pipe(
      map(response => this.extractDocumentFromResponse(response))
    );
  }

  uploadDocumentAttachment(attachment: UploadDocumentAttachment): Observable<Document> {
    const formData = new FormData();
    formData.append('document', attachment.documentId.toString());
    formData.append('file', attachment.file);
    formData.append('original_name', attachment.originalName);

    return this.httpClient.postFormData<any>(this.config.endpoints.documents.attachments.create, formData).pipe(
      map(response => this.extractDocumentFromResponse(response))
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

    return this.httpClient.put<any>(this.config.endpoints.documents.update(id), updateData).pipe(
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

    return this.httpClient.patch<any>(this.config.endpoints.documents.update(id), reviewData).pipe(
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

    return this.httpClient.post<any>(this.config.endpoints.documents.sign, signData).pipe(
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

  addDocumentComment(id: number, data: { comment: string, redirectDepartment: string }): Observable<Document> {
    const commentData = {
      comment: data.comment,
      redirect_department: data.redirectDepartment
    };

    return this.httpClient.post<any>(this.config.endpoints.documents.comment(id), commentData).pipe(
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
