// ── AharSetu Enterprise API Client ───────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

const BASE_URL = '/api/v1';

// Token Storage Keys
const ACCESS_TOKEN_KEY = 'aharsetu_access_token';
const REFRESH_TOKEN_KEY = 'aharsetu_refresh_token';

/**
 * Returns a human-readable error message based on HTTP status code.
 * Prevents all auth/server errors from being labelled "Session expired".
 */
function buildErrorMessage(httpStatus: number, backendDetail?: string): string {
  if (backendDetail) {
    // Use the backend's message if it's specific enough (not a generic fallback)
    const generic = ['an error occurred', 'internal server error', 'bad request'];
    const isGeneric = generic.some(g => backendDetail.toLowerCase().includes(g));
    if (!isGeneric) return backendDetail;
  }
  switch (httpStatus) {
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return backendDetail || 'You do not have permission to perform this action.';
    case 404:
      return backendDetail || 'The requested resource could not be found.';
    case 422:
      return backendDetail || 'Invalid request data. Please check your input.';
    case 500:
      return 'A server error occurred. Please try again later.';
    case 503:
      return 'Service unavailable. Please check your connection and try again.';
    default:
      return backendDetail || 'An unexpected error occurred.';
  }
}

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    // Try sessionStorage first (current tab), then fall back to localStorage
    // (restored after page reload when session is remembered)
    return sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  public setTokens(access: string, refresh: string) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    // Also persist to localStorage so tokens survive page reload
    // (sessionStorage is tab-scoped and cleared on tab close/reload)
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    } catch {}
  }

  public clearTokens() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {}
  }

  /**
   * Returns true when the stored access token is clearly a mock/offline token
   * (not a real JWT). Mock tokens must never be sent to the authenticated backend
   * because the backend no longer supports the mock-token bypass.
   */
  public hasMockToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    return token.startsWith('mock-token-') || token.startsWith('demo-');
  }

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.map((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private async refreshTokens(): Promise<string> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.subscribeTokenRefresh((token) => {
          resolve(token);
        });
      });
    }

    const refresh = this.getRefreshToken();
    if (!refresh) {
      this.clearTokens();
      throw { message: 'Your session has expired. Please log in again.', status: 401 } as ApiError;
    }

    // Do NOT attempt to refresh mock/offline tokens — they are not real JWTs
    if (refresh.startsWith('mock-token-') || refresh.startsWith('demo-')) {
      this.clearTokens();
      throw { message: 'Your session has expired. Please log in again.', status: 401 } as ApiError;
    }

    this.isRefreshing = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refresh }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Parse backend error detail if available
        let detail = 'Your session has expired. Please log in again.';
        try {
          const errData = await response.json();
          if (typeof errData.detail === 'string') detail = errData.detail;
        } catch {}
        throw { message: detail, status: response.status } as ApiError;
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      this.isRefreshing = false;
      this.onTokenRefreshed(data.access_token);
      return data.access_token;
    } catch (err: any) {
      this.isRefreshing = false;
      // Propagate structured errors as-is; wrap raw errors
      if (err?.status) throw err;
      throw { message: 'Your session has expired. Please log in again.', status: 401 } as ApiError;
    } finally {
      clearTimeout(timer);
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {}
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? 5000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timer);
      throw { message: 'Service unavailable or connection reset. Please try again.', status: 503 } as ApiError;
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401) {
      // Only attempt token refresh if we have a real (non-mock) token
      if (token && !token.startsWith('mock-token-') && !token.startsWith('demo-')) {
        try {
          const newToken = await this.refreshTokens();
          headers.set('Authorization', `Bearer ${newToken}`);
          const retryController = new AbortController();
          const retryTimer = setTimeout(() => retryController.abort(), timeoutMs);
          try {
            const retryResponse = await fetch(url, {
              ...options,
              headers,
              signal: retryController.signal,
            });
            return this.handleResponse<T>(retryResponse);
          } finally {
            clearTimeout(retryTimer);
          }
        } catch (err: any) {
          // Propagate the specific error from refreshTokens or the retried request
          if (err?.status) throw err;
          throw { message: 'Your session has expired. Please log in again.', status: 401 } as ApiError;
        }
      } else {
        // Mock/offline token — clear it and signal session expired
        this.clearTokens();
        throw { message: 'Your session has expired. Please log in again.', status: 401 } as ApiError;
      }
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let backendDetail: string | undefined;
      let code: string | undefined;
      try {
        const errorData = await response.json();
        // FastAPI Pydantic validation errors return detail as an array
        if (Array.isArray(errorData.detail)) {
          const firstError = errorData.detail[0];
          backendDetail = firstError?.msg || firstError?.message;
          if (backendDetail) {
            backendDetail = backendDetail.replace(/^Value error,\s*/i, '');
          }
        } else if (typeof errorData.detail === 'string') {
          backendDetail = errorData.detail;
        } else if (typeof errorData.message === 'string') {
          backendDetail = errorData.message;
        }
        code = errorData.code;
      } catch (e) {
        backendDetail = response.statusText || undefined;
      }

      const message = buildErrorMessage(response.status, backendDetail);
      throw { message, code, status: response.status } as ApiError;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Helper HTTP methods
  public get<T>(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public put<T>(endpoint: string, body?: any, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public patch<T>(endpoint: string, body?: any, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public delete<T>(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
