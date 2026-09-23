/**
 * Servicio de Autenticación y Manejo de Sesión de Atleta / Coach
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

  async register(name, email, password, fitness_level = 'principiante') {
    const data = await HttpClient.post('/auth/register', {
      name,
      email,
      password,
      fitness_level
    });
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
    }
    return data;
  },

  async getProfile() {
    if (!this.isAuthenticated()) return null;
    try {
      const data = await HttpClient.get('/auth/profile');
      if (data && data.user) {
        localStorage.setItem('user_data', JSON.stringify(data.user));
        return data.user;
      }
    } catch {
      // Fallback a datos locales si la red falla
    }
    return this.getUser();
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
    try {
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }
};