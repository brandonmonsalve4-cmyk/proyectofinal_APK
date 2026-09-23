/**
 * Servicio para gestión de Rutinas y Sincronización
 */
const RoutineService = {
  async getAll() {
    return await HttpClient.get('/routines');
  },

  async getById(id) {
    return await HttpClient.get(`/routines/${id}`);
  },

  async triggerSync(offlineData) {
    return await HttpClient.post('/sync', offlineData);
  }
};