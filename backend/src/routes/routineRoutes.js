const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, execute } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/routines (Available to all logged-in users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const routines = await query(
      `SELECT r.id, r.title, r.description, r.target_level, r.created_by, r.is_active, r.created_at, r.updated_at,
              u.name as creator_name
       FROM routines r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.is_active = 1
       ORDER BY r.created_at DESC`
    );

    // Fetch exercises for each routine
    const routineIds = routines.map(r => r.id);
    let exercisesByRoutine = {};

    if (routineIds.length > 0) {
      const placeholders = routineIds.map(() => '?').join(',');
      const exercises = await query(
        `SELECT id, routine_id, name, default_sets, default_reps, rest_seconds, order_index
         FROM routine_exercises
         WHERE routine_id IN (${placeholders})
         ORDER BY order_index ASC`,
        routineIds
      );

      for (const ex of exercises) {
        if (!exercisesByRoutine[ex.routine_id]) {
          exercisesByRoutine[ex.routine_id] = [];
        }
        exercisesByRoutine[ex.routine_id].push(ex);
      }
    }

    const result = routines.map(r => ({
      ...r,
      exercises: exercisesByRoutine[r.id] || []
    }));

    return res.json({ routines: result });
  } catch (error) {
    console.error('Error en GET /routines:', error);
    return res.status(500).json({ error: 'Error al obtener rutinas' });
  }
});

// POST /api/routines (Admin only: create routine with exercises)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { title, description, target_level = 'principiante', exercises = [] } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'El título de la rutina es obligatorio' });
    }

    const routineId = uuidv4();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO routines (id, title, description, target_level, created_by, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [routineId, title.trim(), description || '', target_level, req.user.id, now, now]
    );

    const createdExercises = [];
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const exId = uuidv4();
      await execute(
        `INSERT INTO routine_exercises (id, routine_id, name, default_sets, default_reps, rest_seconds, order_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          exId,
          routineId,
          ex.name || `Ejercicio ${i + 1}`,
          parseInt(ex.default_sets || 3),
          parseInt(ex.default_reps || 10),
          parseInt(ex.rest_seconds || 60),
          i + 1,
          now,
          now
        ]
      );
      createdExercises.push({
        id: exId,
        routine_id: routineId,
        name: ex.name,
        default_sets: ex.default_sets || 3,
        default_reps: ex.default_reps || 10,
        rest_seconds: ex.rest_seconds || 60,
        order_index: i + 1
      });
    }

    return res.status(201).json({
      message: 'Rutina creada con éxito',
      routine: {
        id: routineId,
        title,
        description,
        target_level,
        created_by: req.user.id,
        is_active: 1,
        created_at: now,
        updated_at: now,
        exercises: createdExercises
      }
    });
  } catch (error) {
    console.error('Error en POST /routines:', error);
    return res.status(500).json({ error: 'Error al crear rutina' });
  }
});

// DELETE /api/routines/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    await execute('UPDATE routines SET is_active = 0, updated_at = ? WHERE id = ?', [now, id]);
    return res.json({ message: 'Rutina desactivada correctamente' });
  } catch (error) {
    console.error('Error en DELETE /routines/:id:', error);
    return res.status(500).json({ error: 'Error al desactivar rutina' });
  }
});

module.exports = router;
