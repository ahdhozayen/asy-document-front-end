export class ApiConfig {
  private static instance: ApiConfig;

  private constructor(
    public readonly baseUrl = 'http://localhost:8000/api',
    public readonly timeout = 30000,
    public readonly retryAttempts = 3,
    public readonly retryDelay = 1000
  ) {}

  static getInstance(): ApiConfig {
    if (!ApiConfig.instance) {
      ApiConfig.instance = new ApiConfig();
    }
    return ApiConfig.instance;
  }

  static configure(
    config: Partial<{
      baseUrl: string;
      timeout: number;
      retryAttempts: number;
      retryDelay: number;
    }>
  ): void {
    ApiConfig.instance = new ApiConfig(
      config.baseUrl || 'http://localhost:8000/api',
      config.timeout || 30000,
      config.retryAttempts || 3,
      config.retryDelay || 1000
    );
  }

  get endpoints() {
    return {
      auth: {
        login: `${this.baseUrl}/token`,
        logout: `${this.baseUrl}/auth/logout`,
        refresh: `${this.baseUrl}/token/refresh`,
        profile: `${this.baseUrl}/auth/profile`,
        changePassword: `${this.baseUrl}/auth/change-password`,
      },
      users: {
        list: `${this.baseUrl}/users`,
        detail: (id: number) => `${this.baseUrl}/users/${id}`,
        create: `${this.baseUrl}/users`,
        update: (id: number) => `${this.baseUrl}/users/${id}`,
        delete: (id: number) => `${this.baseUrl}/users/${id}`,
      },
      home: {
        stats: `${this.baseUrl}/home/stats`,
      },
      documents: {
        list: `${this.baseUrl}/documents/list`,
        detail: (id: number) => `${this.baseUrl}/documents/${id}`,
        create: `${this.baseUrl}/documents/create`,
        update: (id: number) => `${this.baseUrl}/documents/${id}`,
        delete: (id: number) => `${this.baseUrl}/documents/${id}`,
        download: (id: number) => `${this.baseUrl}/documents/attachments/${id}`,
        sign: `${this.baseUrl}/documents/signature/create`,
        comment: (id: number) => `${this.baseUrl}/documents/${id}/comment`,
        stats: `${this.baseUrl}/home/stats`,
        attachments: {
          create: `${this.baseUrl}/documents/attachments/create`,
          detail: (id: number) => `${this.baseUrl}/documents/attachments/${id}`,
        },
      },
    };
  }
}
