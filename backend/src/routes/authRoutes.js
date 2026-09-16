const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, execute } = require('../config/db');
const { JWT_SECRET, authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, fitness_level = 'principiante' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este correo electrónico' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const now = new Date().toISOString();
    const role = 'usuario';

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role, fitness_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), cleanEmail, password_hash, role, fitness_level, now, now]
    );

    const token = jwt.sign(
      { id, email: cleanEmail, role, name: name.trim() },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id,
        name: name.trim(),
        email: cleanEmail,
        role,
        fitness_level
      }
    });
  } catch (error) {
    console.error('Error en /register:', error);
    return res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await queryOne(
      'SELECT id, name, email, password_hash, role, fitness_level FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas (usuario no encontrado)' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas (contraseña incorrecta)' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        fitness_level: user.fitness_level
      }
    });
  } catch (error) {
    console.error('Error en /login:', error);
    return res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, name, email, role, fitness_level, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Error en /profile:', error);
    return res.status(500).json({ error: 'Error interno al consultar perfil' });
  }
});

// GET /api/auth/users (Admin only: list registered members)
router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await query(
      'SELECT id, name, email, role, fitness_level, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ users });
  } catch (error) {
    console.error('Error en /users:', error);
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

module.exports = router;
