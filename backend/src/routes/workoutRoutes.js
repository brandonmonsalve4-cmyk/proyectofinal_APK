const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, execute } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/workouts (Get user's logged workouts)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const workouts = await query(
      `SELECT w.id, w.routine_id, w.workout_date, w.notes, w.created_at, w.updated_at,
              r.title as routine_title
       FROM workout_logs w
       LEFT JOIN routines r ON w.routine_id = r.id
       WHERE w.user_id = ?
       ORDER BY w.workout_date DESC, w.created_at DESC`,
      [userId]
    );

    const workoutIds = workouts.map(w => w.id);
    let setsByWorkout = {};

    if (workoutIds.length > 0) {
      const placeholders = workoutIds.map(() => '?').join(',');
      const sets = await query(
        `SELECT id, workout_log_id, exercise_name, set_number, reps, weight_kg, rpe, created_at
         FROM workout_sets
         WHERE workout_log_id IN (${placeholders})
         ORDER BY set_number ASC`,
        workoutIds
      );

      for (const set of sets) {
        if (!setsByWorkout[set.workout_log_id]) {
          setsByWorkout[set.workout_log_id] = [];
        }
        setsByWorkout[set.workout_log_id].push(set);
      }
    }

    const result = workouts.map(w => ({
      ...w,
      sets: setsByWorkout[w.id] || []
    }));

    return res.json({ workouts: result });
  } catch (error) {
    console.error('Error en GET /workouts:', error);
    return res.status(500).json({ error: 'Error al consultar historial de entrenamientos' });
  }
});

// POST /api/workouts (Direct online creation)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: providedId, routine_id = null, workout_date, notes = '', sets = [] } = req.body;

    const workoutId = providedId || uuidv4();
    const date = workout_date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO workout_logs (id, user_id, routine_id, workout_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [workoutId, userId, routine_id, date, notes, now, now]
    );

    const createdSets = [];
    for (let i = 0; i < sets.length; i++) {
      const s = sets[i];
      const setId = s.id || uuidv4();
      await execute(
        `INSERT INTO workout_sets (id, workout_log_id, exercise_name, set_number, reps, weight_kg, rpe, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          setId,
          workoutId,
          s.exercise_name || 'Ejercicio General',
          parseInt(s.set_number || i + 1),
          parseInt(s.reps || 0),
          parseFloat(s.weight_kg || 0),
          s.rpe ? parseInt(s.rpe) : null,
          now,
          now
        ]
      );
      createdSets.push({
        id: setId,
        workout_log_id: workoutId,
        exercise_name: s.exercise_name,
        set_number: s.set_number || i + 1,
        reps: s.reps || 0,
        weight_kg: s.weight_kg || 0,
        rpe: s.rpe || null
      });
    }

    return res.status(201).json({
      message: 'Entrenamiento guardado correctamente',
      workout: {
        id: workoutId,
        user_id: userId,
        routine_id,
        workout_date: date,
        notes,
        created_at: now,
        updated_at: now,
        sets: createdSets
      }
    });
  } catch (error) {
    console.error('Error en POST /workouts:', error);
    return res.status(500).json({ error: 'Error al registrar entrenamiento' });
  }
});

module.exports = router;
