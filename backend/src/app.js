const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const routineRoutes = require('./routes/routineRoutes');
const classRoutes = require('./routes/classRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const syncRoutes = require('./routes/syncRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Gym Sync Backend REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/sync', syncRoutes);

// --- BÚSQUEDA AUTOMÁTICA DE LA CARPETA FRONTEND ---
const posiblesRutasFrontend = [
  path.join(__dirname, '../frontend'),
  path.join(__dirname, '../../frontend'),
  path.join(process.cwd(), 'frontend'),
  path.join(process.cwd(), '../frontend')
];

let carpetaFrontendValida = null;

for (const ruta of posiblesRutasFrontend) {
  if (fs.existsSync(ruta) && fs.existsSync(path.join(ruta, 'index.html'))) {
    carpetaFrontendValida = ruta;
    break;
  }
}

if (carpetaFrontendValida) {
  console.log(`[Frontend] Sirviendo archivos estáticos desde: ${carpetaFrontendValida}`);
  app.use(express.static(carpetaFrontendValida));

  app.get('/', (req, res) => {
    res.sendFile(path.join(carpetaFrontendValida, 'index.html'));
  });
} else {
  console.warn('[Frontend WARNING] No se encontró un archivo index.html dentro de ninguna carpeta frontend conocida.');
}

// Manejador 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error('[App Error]:', err);
  res.status(500).json({ error: 'Error inesperado en el servidor' });
});

module.exports = app;