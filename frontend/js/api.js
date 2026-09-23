/**
 * Cliente HTTP base para la API REST de HyL GYM
 */
const API_BASE_URL = (window.location.port === '5000' || window.location.hostname === 'localhost' && window.location.port === '5000')
  ? '/api'
  : 'http://localhost:5000/api';

class HttpClient {
  static async request(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Error HTTP: ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn(`[API] ${options.method || 'GET'} ${endpoint} ->`, error.message);
      throw error;
    }
  }

  static get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  static post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}