/**
 * Servicio de Autenticación y Estado de Usuario
 */
const AuthService = {
  async login(email, password) {
    const data = await HttpClient.post('/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
    }
    return data;
  },

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.reload();
  },

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },

  getUser() {
    const user = localStorage.getItem('user_data');
    return user ? JSON.parse(user) : null;
  }
};