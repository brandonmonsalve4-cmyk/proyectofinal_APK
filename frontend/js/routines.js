/**
 * Servicio para gestión de Rutinas, Clases y Sincronización con el Backend
 */
const RoutineService = {
  // --- Rutinas ---
  async getAll() {
    const data = await HttpClient.get('/routines');
    return data?.routines || (Array.isArray(data) ? data : []);
  },

  async getById(id) {
    const data = await HttpClient.get(`/routines/${id}`);
    return data?.routine || data;
  },

  // --- Clases Colectivas ---
  async getClasses() {
    const data = await HttpClient.get('/classes');
    return data?.classes || (Array.isArray(data) ? data : []);
  },

  async bookClass(classId) {
    return await HttpClient.post(`/classes/${classId}/book`, {});
  },

  async cancelBooking(bookingId) {
    return await HttpClient.delete(`/classes/bookings/${bookingId}`);
  },

  async getMyBookings() {
    const data = await HttpClient.get('/classes/my-bookings');
    return data?.bookings || [];
  },

  // --- Sincronización Offline ---
  async triggerSync(offlineData = {}) {
    const payload = {
      last_synced_at: new Date(Date.now() - 3600000).toISOString(),
      workouts: offlineData.workouts || [],
      workout_sets: offlineData.workout_sets || [],
      bookings: offlineData.bookings || []
    };
    return await HttpClient.post('/sync', payload);
  }
};