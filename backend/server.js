const dotenv = require('dotenv');
dotenv.config();

const app = require('./src/app');
const { seedDatabase } = require('./src/db/seed');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('==============================================');
    console.log('       INICIANDO BACKEND GYM SYNC API        ');
    console.log('==============================================');

    // Initialize tables and seed initial admin & test data
    await seedDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Gym Sync API] Servidor corriendo exitosamente en http://localhost:${PORT}`);
      console.log(`[Gym Sync API] Health Check: http://localhost:${PORT}/api/health`);
      console.log(`[Gym Sync API] Modo de Base de Datos: ${(process.env.DB_TYPE || 'sqlite').toUpperCase()}`);
      console.log('==============================================');
    });
  } catch (error) {
    console.error('[Startup Error] Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
