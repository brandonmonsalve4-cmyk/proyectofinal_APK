/**
 * Punto de Entrada y Control de Interfaz (UI)
 */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  async init() {
    this.bindEvents();
    this.renderAuthUI();
    await this.checkHealth();
    await this.loadDashboardData();
  },

  bindEvents() {
    window.addEventListener('auth:unauthorized', () => {
      alert('Tu sesión ha expirado. Por favor ingresa nuevamente.');
      this.renderAuthUI();
    });
  },

  async checkHealth() {
    const badge = document.getElementById('apiStatus');
    if (!badge) return;

    try {
      await RoutineService.getAll();
      badge.textContent = 'Online / Conectado';
      badge.className = 'badge badge-online';
    } catch {
      badge.textContent = 'Offline / Sin conexión';
      badge.className = 'badge badge-offline';
    }
  },

  renderAuthUI() {
    const container = document.getElementById('authStatus');
    if (!container) return;

    if (AuthService.isAuthenticated()) {
      container.innerHTML = `
        <button class="btn-primary" onclick="AuthService.logout()">Cerrar Sesión</button>
      `;
    } else {
      container.innerHTML = `
        <button class="btn-primary" onclick="App.handleLoginPrompt()">Iniciar Sesión</button>
      `;
    }
  },

  async handleLoginPrompt() {
    const email = prompt("Email:");
    const password = prompt("Contraseña:");
    
    if (email && password) {
      try {
        await AuthService.login(email, password);
        this.renderAuthUI();
        await this.loadDashboardData();
      } catch (err) {
        alert(err.message || 'Error al autenticar');
      }
    }
  },

  async loadDashboardData() {
    const routinesContainer = document.getElementById('routinesList');
    const totalRoutinesEl = document.getElementById('totalRoutines');

    if (!routinesContainer) return;

    try {
      const routines = await RoutineService.getAll();
      
      if (totalRoutinesEl) totalRoutinesEl.textContent = routines.length;

      if (!routines || routines.length === 0) {
        routinesContainer.innerHTML = '<p class="muted-text">No hay rutinas registradas.</p>';
        return;
      }

      routinesContainer.innerHTML = routines.map(r => `
        <article class="routine-card">
          <h4>${r.title || r.name || 'Rutina de Entrenamiento'}</h4>
          <p class="muted-text">${r.description || 'Sin descripción'}</p>
        </article>
      `).join('');

    } catch {
      routinesContainer.innerHTML = '<p class="muted-text">No se pudieron cargar las rutinas.</p>';
    }
  }
};