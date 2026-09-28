/**
 * NovaStore API Configuration & HTTP Client
 * Dynamically resolves API_BASE_URL across local and deployed environments.
 * Provides unified request wrapper with Bearer token authentication and error handling.
 */

const API_CONFIG = {
  // Dynamically resolve API base URL without hardcoding localhost in business logic
  getBaseUrl() {
    // 1. Explicit window-injected config (e.g., environment variable from hosting provider)
    if (window.__APP_ENV__ && window.__APP_ENV__.API_BASE_URL) {
      return window.__APP_ENV__.API_BASE_URL.replace(/\/+$/, '');
    }

    // 2. User/developer manual override stored in localStorage
    const savedUrl = localStorage.getItem('novastore_api_url');
    if (savedUrl) {
      return savedUrl.replace(/\/+$/, '');
    }

    // 3. If running from file:// protocol (double-clicked index.html locally)
    if (window.location.protocol === 'file:') {
      return 'http://localhost:8080/api';
    }

    // 4. Same origin (frontend and backend served together or through reverse proxy)
    return `${window.location.origin}/api`;
  }
};

class ApiClient {
  constructor() {
    this.tokenKey = 'novastore_auth_token';
  }

  getToken() {
    return localStorage.getItem(this.tokenKey) || null;
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  async request(endpoint, options = {}) {
    const baseUrl = API_CONFIG.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const errorMsg = (data && data.error) || (data && data.message) || `HTTP error ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${options.method || 'GET'} ${url}:`, error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Global API client instance
window.api = new ApiClient();
window.API_CONFIG = API_CONFIG;
