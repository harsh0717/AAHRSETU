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
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  public setTokens(access: string, refresh: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  public clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
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
      this.clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?expired=1';
      }
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
    console.log(`[API CLIENT] Sending request to: ${url} | Token: ${token ? token.substring(0, 15) + '...' : 'null'} | Headers:`, Object.fromEntries(headers.entries()));
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && token) {
      // Access token expired, attempt refresh
      try {
        const newToken = await this.refreshTokens();
        headers.set('Authorization', `Bearer ${newToken}`);
        const retryResponse = await fetch(url, { ...options, headers });
        return this.handleResponse<T>(retryResponse);
      } catch (err) {
        throw { message: 'Session expired. Please log in again.', status: 401 } as ApiError;
      }
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        this.clearTokens();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('aharsetu_session');
          window.location.href = '/login?expired=1';
        }
      }
      let message = 'An error occurred';
      let code = undefined;
      try {
        const errorData = await response.json();
        message = errorData.detail || errorData.message || message;
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
