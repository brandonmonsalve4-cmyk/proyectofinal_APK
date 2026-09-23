/**
 * ==========================================================================
 * HYL GYM - APP CONTROLLER & MODERN UI LOGIC
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  // Estado local en memoria
  state: {
    activeTab: 'dashboard',
    routines: [],
    classes: [],
    activeFilter: 'all',
    myBookings: []
  },

  async init() {
    this.bindEvents();
    this.renderAuthUI();
    await this.checkHealth();
    await this.loadAllData();
  },

  bindEvents() {
    // Escuchar eventos globales de desautenticación
    window.addEventListener('auth:unauthorized', () => {
      this.showToast('Tu sesión ha expirado. Por favor ingresa nuevamente.', 'error');
      this.renderAuthUI();
      this.openAuthModal('login');
    });

    // Cerrar modal al presionar tecla ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAuthModal();
      }
    });

    // Eventos de conexión de red del navegador
    window.addEventListener('online', () => {
      this.showToast('Conexión a internet restablecida', 'success');
      this.checkHealth();
    });

    window.addEventListener('offline', () => {
      this.showToast('Sin conexión a internet. Modo offline activado.', 'info');
      const badge = document.getElementById('apiStatus');
      if (badge) {
        badge.className = 'badge badge-offline';
        badge.innerHTML = '<span class="badge-dot"></span><span>Modo Offline</span>';
      }
    });
  },

  // --- 1. Verificación del Servidor Backend ---
  async checkHealth() {
    const badge = document.getElementById('apiStatus');
    if (!badge) return;

    try {
      const res = await HttpClient.get('/health');
      if (res && res.status === 'OK') {
        badge.className = 'badge badge-online';
        badge.innerHTML = '<span class="badge-dot"></span><span>En Línea (v' + (res.version || '1.0') + ')</span>';
      } else {
        throw new Error();
      }
    } catch {
      badge.className = 'badge badge-offline';
      badge.innerHTML = '<span class="badge-dot"></span><span>Desconectado</span>';
    }
  },

  // --- 2. Renderizado de Interfaz de Usuario / Auth ---
  renderAuthUI() {
    const container = document.getElementById('authStatus');
    const greetingEl = document.getElementById('heroGreeting');
    const fitnessLevelEl = document.getElementById('userFitnessLevel');
    const roleHintEl = document.getElementById('userRoleHint');

    if (!container) return;

    if (AuthService.isAuthenticated()) {
      const user = AuthService.getUser() || { name: 'Atleta', role: 'usuario', fitness_level: 'intermedio' };
      const initials = (user.name || 'A')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      container.innerHTML = `
        <div class="user-profile-badge">
          <div class="user-avatar">${initials}</div>
          <div class="user-info">
            <span class="user-name">${user.name}</span>
            <span class="user-role-chip">${user.role === 'admin' ? 'Coach Admin' : 'Atleta Pro'}</span>
          </div>
          <button class="btn btn-danger btn-sm" onclick="AuthService.logout()" title="Cerrar Sesión">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            <span>Salir</span>
          </button>
        </div>
      `;

      if (greetingEl) {
        greetingEl.innerHTML = `¡HOLA, <span class="accent-text">${user.name.toUpperCase()}</span>!`;
      }
      if (fitnessLevelEl) {
        fitnessLevelEl.textContent = user.fitness_level || 'Atleta';
      }
      if (roleHintEl) {
        roleHintEl.textContent = user.role === 'admin' ? 'Acceso Entrenador' : 'Membresía Activa';
      }
    } else {
      container.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="App.openAuthModal('login')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span>Acceder</span>
        </button>
      `;

      if (greetingEl) {
        greetingEl.innerHTML = `PANEL DE CONTROL <span class="accent-text">ATHLETE</span>`;
      }
      if (fitnessLevelEl) {
        fitnessLevelEl.textContent = 'Invitado';
      }
      if (roleHintEl) {
        roleHintEl.textContent = 'Inicia sesión';
      }
    }
  },

  // Mantener compatibilidad hacia atrás
  handleLoginPrompt() {
    this.openAuthModal('login');
  },

  // --- 3. Navegación por Pestañas & Menú Móvil ---
  switchTab(tabId) {
    this.state.activeTab = tabId;

    // Actualizar botones de navegación
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Actualizar paneles de contenido
    const tabPanels = {
      dashboard: document.getElementById('tabDashboard'),
      routines: document.getElementById('tabRoutines'),
      classes: document.getElementById('tabClasses')
    };

    Object.entries(tabPanels).forEach(([key, panel]) => {
      if (!panel) return;
      if (key === tabId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Cerrar menú móvil al navegar
    const menu = document.getElementById('navMenu');
    if (menu) menu.classList.remove('open');

    // Scroll suave a vista
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  toggleMobileMenu() {
    const menu = document.getElementById('navMenu');
    if (menu) {
      menu.classList.toggle('open');
    }
  },

  // --- 4. Modal de Autenticación Moderno ---
  openAuthModal(defaultTab = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    this.switchAuthForm(defaultTab);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    modal.classList.remove('active');
    document.body.style.overflow = '';
  },

  handleBackdropClick(event) {
    if (event.target.id === 'authModal') {
      this.closeAuthModal();
    }
  },

  switchAuthForm(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const titleEl = document.getElementById('authModalTitle');

    if (mode === 'login') {
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
      if (tabLoginBtn) tabLoginBtn.classList.add('active');
      if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
      if (titleEl) titleEl.textContent = 'Iniciar Sesión en HYL GYM';
    } else {
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'block';
      if (tabLoginBtn) tabLoginBtn.classList.remove('active');
      if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
      if (titleEl) titleEl.textContent = 'Crear Cuenta de Atleta';
    }
  },

  fillDemo(type) {
    this.switchAuthForm('login');
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');

    if (type === 'admin') {
      if (emailInput) emailInput.value = 'admin@gymsync.com';
      if (passInput) passInput.value = 'Admin123!';
      this.showToast('Credenciales de Coach Admin cargadas', 'info');
    } else {
      if (emailInput) emailInput.value = 'usuario@gymsync.com';
      if (passInput) passInput.value = 'User123!';
      this.showToast('Credenciales de Atleta Demo cargadas', 'info');
    }
  },

  async handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (!email || !password) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verificando...</span>';
    }

    try {
      await AuthService.login(email, password);
      this.showToast('¡Bienvenido a HYL GYM!', 'success');
      this.closeAuthModal();
      this.renderAuthUI();
      await this.loadAllData();
    } catch (err) {
      this.showToast(err.message || 'Error al autenticar', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Entrar al Gimnasio</span>';
      }
    }
  },

  async handleRegisterSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('registerName')?.value.trim();
    const email = document.getElementById('registerEmail')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;
    const fitness_level = document.getElementById('registerLevel')?.value;
    const submitBtn = document.getElementById('registerSubmitBtn');

    if (!name || !email || !password) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Creando cuenta...</span>';
    }

    try {
      await AuthService.register(name, email, password, fitness_level);
      this.showToast('¡Cuenta creada exitosamente! Bienvenido.', 'success');
      this.closeAuthModal();
      this.renderAuthUI();
      await this.loadAllData();
    } catch (err) {
      this.showToast(err.message || 'Error al registrar', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Crear mi Cuenta</span>';
      }
    }
  },

  // --- 5. Carga Integral de Datos del Gimnasio ---
  async loadAllData() {
    await Promise.allSettled([
      this.loadRoutines(),
      this.loadClasses()
    ]);
    this.updateMetrics();
    this.renderDashboardPreview();
  },

  async loadRoutines() {
    const routinesContainer = document.getElementById('routinesList');
    if (!routinesContainer) return;

    if (!AuthService.isAuthenticated()) {
      routinesContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🔒</div>
          <div class="state-title">Acceso a Rutinas Requerido</div>
          <div class="state-desc">Inicia sesión como Atleta o Coach para consultar y registrar tus entrenamientos.</div>
          <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="App.openAuthModal('login')">Iniciar Sesión</button>
        </div>
      `;
      this.state.routines = [];
      return;
    }

    try {
      const routines = await RoutineService.getAll();
      this.state.routines = Array.isArray(routines) ? routines : [];
      this.filterRoutines(this.state.activeFilter);
    } catch (error) {
      routinesContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">⚠️</div>
          <div class="state-title">No se pudieron cargar las rutinas</div>
          <div class="state-desc">${error.message || 'Error de conexión con el servidor'}</div>
        </div>
      `;
    }
  },

  async loadClasses() {
    const classesContainer = document.getElementById('classesList');
    if (!classesContainer) return;

    if (!AuthService.isAuthenticated()) {
      classesContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🔒</div>
          <div class="state-title">Horario de Clases Exclusivo</div>
          <div class="state-desc">Inicia sesión para ver los cupos disponibles y reservar tus sesiones dirigidas.</div>
          <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="App.openAuthModal('login')">Iniciar Sesión</button>
        </div>
      `;
      this.state.classes = [];
      return;
    }

    try {
      const classes = await RoutineService.getClasses();
      this.state.classes = Array.isArray(classes) ? classes : [];
      this.renderClasses(this.state.classes);
    } catch (error) {
      classesContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">⚠️</div>
          <div class="state-title">No se pudieron cargar las clases</div>
          <div class="state-desc">${error.message || 'Error al conectar con la API'}</div>
        </div>
      `;
    }
  },

  // Mantener compatibilidad con la firma anterior
  async loadDashboardData() {
    await this.loadAllData();
  },

  // --- 6. Filtros y Render de Rutinas ---
  filterRoutines(level) {
    this.state.activeFilter = level;

    // Actualizar botones de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
      if (btn.getAttribute('data-filter') === level) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const routinesContainer = document.getElementById('routinesList');
    if (!routinesContainer) return;

    const filtered = level === 'all'
      ? this.state.routines
      : this.state.routines.filter(r => (r.target_level || '').toLowerCase() === level);

    if (filtered.length === 0) {
      routinesContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🏋️‍♂️</div>
          <div class="state-title">No hay rutinas en esta categoría</div>
          <div class="state-desc">Pronto añadiremos nuevos planes de entrenamiento para este nivel.</div>
        </div>
      `;
      return;
    }

    routinesContainer.innerHTML = filtered.map(r => this.createRoutineCardHTML(r)).join('');
  },

  createRoutineCardHTML(r) {
    const level = (r.target_level || 'intermedio').toLowerCase();
    const levelClass = `level-${level}`;
    const exercises = Array.isArray(r.exercises) ? r.exercises : [];

    const exercisesHTML = exercises.length > 0
      ? `
        <div class="exercise-list">
          <div class="exercise-list-title">Ejercicios (${exercises.length})</div>
          ${exercises.map(ex => `
            <div class="exercise-item">
              <span class="exercise-name">${ex.name}</span>
              <span class="exercise-meta">${ex.default_sets} x ${ex.default_reps} (${ex.rest_seconds}s)</span>
            </div>
          `).join('')}
        </div>
      `
      : '';

    return `
      <article class="routine-card">
        <div>
          <div class="routine-card-header">
            <h4>${r.title || 'Rutina de Fuerza'}</h4>
            <span class="level-badge ${levelClass}">${level}</span>
          </div>
          <p class="routine-desc">${r.description || 'Sin descripción detallada'}</p>
          ${exercisesHTML}
        </div>
        <div class="routine-footer">
          <span>Creado por: ${r.creator_name || 'Coach HYL'}</span>
          <span>${exercises.length} Ejercicios</span>
        </div>
      </article>
    `;
  },

  // --- 7. Render de Clases Colectivas & Reservas ---
  renderClasses(classes) {
    const classesContainer = document.getElementById('classesList');
    if (!classesContainer) return;

    if (!classes || classes.length === 0) {
      classesContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">📅</div>
          <div class="state-title">No hay clases programadas hoy</div>
          <div class="state-desc">Consulta nuevamente más tarde para ver la agenda actualizada.</div>
        </div>
      `;
      return;
    }

    classesContainer.innerHTML = classes.map(c => {
      const bookedCount = c.booked_count || 0;
      const capacity = c.capacity || 20;
      const available = Math.max(0, capacity - bookedCount);
      const percent = Math.min(100, Math.round((bookedCount / capacity) * 100));
      const isBooked = !!c.is_booked_by_me;
      const isFull = available <= 0;

      let dateString = c.schedule_time || 'Horario Flexible';
      try {
        const d = new Date(c.schedule_time);
        if (!isNaN(d.getTime())) {
          dateString = d.toLocaleString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch {}

      return `
        <article class="class-card">
          <div>
            <div class="class-card-header">
              <h4 class="class-title">${c.name}</h4>
              <span class="badge ${isBooked ? 'badge-online' : (isFull ? 'badge-offline' : 'badge-online')}">
                ${isBooked ? 'Tu Reserva' : (isFull ? 'Agotada' : `${available} Cupos`)}
              </span>
            </div>

            <div class="class-info-item">
              <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <span>Coach: <strong>${c.instructor_name || 'Staff HYL'}</strong></span>
            </div>

            <div class="class-info-item">
              <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <span>${dateString}</span>
            </div>

            <div class="class-info-item">
              <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>${c.location || 'Sala Principal'}</span>
            </div>

            <div class="capacity-container">
              <div class="capacity-labels">
                <span>Ocupación: ${bookedCount}/${capacity}</span>
                <span>${percent}%</span>
              </div>
              <div class="capacity-bar-bg">
                <div class="capacity-bar-fill ${percent >= 90 ? 'warning' : ''}" style="width: ${percent}%;"></div>
              </div>
            </div>
          </div>

          <div style="margin-top: 1rem;">
            ${isBooked ? `
              <button class="btn btn-danger btn-sm" style="width: 100%;" onclick="App.handleCancelBooking('${c.my_booking_id || ''}')">
                Cancelar Reserva
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" style="width: 100%;" ${isFull ? 'disabled' : ''} onclick="App.handleBookClass('${c.id}')">
                ${isFull ? 'Sin Cupos Disponibles' : 'Reservar Mi Cupo'}
              </button>
            `}
          </div>
        </article>
      `;
    }).join('');
  },

  async handleBookClass(classId) {
    if (!AuthService.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }

    try {
      await RoutineService.bookClass(classId);
      this.showToast('¡Cupo reservado con éxito!', 'success');
      await this.loadClasses();
      this.updateMetrics();
    } catch (err) {
      this.showToast(err.message || 'Error al reservar clase', 'error');
    }
  },

  async handleCancelBooking(bookingId) {
    if (!bookingId) {
      this.showToast('No se identificó la reserva para cancelar', 'error');
      return;
    }

    try {
      await RoutineService.cancelBooking(bookingId);
      this.showToast('Reserva cancelada correctamente', 'info');
      await this.loadClasses();
      this.updateMetrics();
    } catch (err) {
      this.showToast(err.message || 'Error al cancelar reserva', 'error');
    }
  },

  // --- 8. Preview en Dashboard ---
  renderDashboardPreview() {
    const previewContainer = document.getElementById('dashboardPreviewList');
    if (!previewContainer) return;

    if (!AuthService.isAuthenticated()) {
      previewContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">⚡</div>
          <div class="state-title">Bienvenido a HYL GYM</div>
          <div class="state-desc">Inicia sesión para desbloquear tu plan de entrenamiento personalizado y reservar clases.</div>
          <div style="margin-top: 1rem;">
            <button class="btn btn-primary btn-sm" onclick="App.openAuthModal('login')">Iniciar Sesión</button>
          </div>
        </div>
      `;
      return;
    }

    const routinesPreview = this.state.routines.slice(0, 3);
    if (routinesPreview.length === 0) {
      previewContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">📋</div>
          <div class="state-title">No hay entrenamientos activos</div>
          <div class="state-desc">Visita la pestaña Rutinas para comenzar.</div>
        </div>
      `;
      return;
    }

    previewContainer.innerHTML = routinesPreview.map(r => this.createRoutineCardHTML(r)).join('');
  },

  // --- 9. Actualización de Métricas ---
  updateMetrics() {
    const totalRoutinesEl = document.getElementById('totalRoutines');
    const totalClassesEl = document.getElementById('totalClasses');
    const myBookingsCountEl = document.getElementById('myBookingsCount');

    if (totalRoutinesEl) {
      totalRoutinesEl.textContent = this.state.routines.length;
    }

    if (totalClassesEl) {
      totalClassesEl.textContent = this.state.classes.length;
    }

    if (myBookingsCountEl) {
      const booked = this.state.classes.filter(c => !!c.is_booked_by_me).length;
      myBookingsCountEl.textContent = booked;
    }
  },

  // --- 10. Forzar Sincronización ---
  async handleSyncClick() {
    const syncStatusEl = document.getElementById('syncStatus');
    if (syncStatusEl) syncStatusEl.textContent = 'Sincronizando...';

    try {
      await RoutineService.triggerSync();
      this.showToast('Datos sincronizados correctamente con la base central', 'success');
      if (syncStatusEl) syncStatusEl.textContent = 'Sincronizado';
      await this.loadAllData();
    } catch {
      this.showToast('Sincronización guardada localmente (modo offline)', 'info');
      if (syncStatusEl) syncStatusEl.textContent = 'Pendiente Sync';
    }
  },

  // --- 11. Sistema Moderno de Alertas Toast ---
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSVG = '';
    if (type === 'success') {
      iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#00f59b"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    } else if (type === 'error') {
      iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
    } else {
      iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#38bdf8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
    }

    toast.innerHTML = `
      ${iconSVG}
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }
};