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
      throw new Error('No refresh token available');
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (!response.ok) {
        throw new Error('Refresh token invalid');
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      this.isRefreshing = false;
      this.onTokenRefreshed(data.access_token);
      return data.access_token;
    } catch (err) {
      this.isRefreshing = false;
      throw err;
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
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
      response = await fetch(url, { ...options, headers });
    } catch (fetchErr: any) {
      // Silence continuous background polling warnings when serving local fallback store
      throw { message: 'Service unavailable or connection reset. Please try again.', status: 503 } as ApiError;
    }

    if (response.status === 401) {
      if (token) {
        try {
          const newToken = await this.refreshTokens();
          headers.set('Authorization', `Bearer ${newToken}`);
          const retryResponse = await fetch(url, { ...options, headers });
          return this.handleResponse<T>(retryResponse);
        } catch (err) {
          throw { message: 'Session expired. Please log in again.', status: 401 } as ApiError;
        }
      } else {
        throw { message: 'Not authenticated', status: 401 } as ApiError;
      }
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let message = 'An error occurred';
      let code = undefined;
      try {
        const errorData = await response.json();
        // FastAPI Pydantic validation errors return detail as an array of objects:
        // [{ "loc": [...], "msg": "...", "type": "..." }]
        if (Array.isArray(errorData.detail)) {
          // Extract the first human-readable message from validation errors
          const firstError = errorData.detail[0];
          message = firstError?.msg || firstError?.message || message;
          // Strip the Pydantic "Value error, " prefix if present
          message = message.replace(/^Value error,\s*/i, '');
        } else if (typeof errorData.detail === 'string') {
          message = errorData.detail;
        } else if (typeof errorData.message === 'string') {
          message = errorData.message;
        }
        code = errorData.code;
      } catch (e) {
        // Fallback for non-JSON errors
        message = response.statusText || message;
      }
      throw { message, code, status: response.status } as ApiError;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Helper HTTP methods
  public get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public put<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
