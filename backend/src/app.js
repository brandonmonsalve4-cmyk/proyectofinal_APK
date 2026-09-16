const express = require('express');
const cors = require('cors');

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

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/sync', syncRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[App Error]:', err);
  res.status(500).json({ error: 'Error inesperado en el servidor' });
});

module.exports = app;
