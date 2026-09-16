const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/sync
 * Master offline-first synchronization endpoint.
 * Performs bidirectional sync: Pushes unsynced offline transactions and pulls fresh catalog data.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      last_synced_at = null,
      workouts = [],
      workout_sets = [],
      bookings = []
    } = req.body;

    const serverTime = new Date().toISOString();
    const confirmedIds = {
      workouts: [],
      workout_sets: [],
      bookings: []
    };

    // 1. Process Workouts Upsert
    for (const w of workouts) {
      if (!w.id) continue;
      const existing = await queryOne('SELECT id FROM workout_logs WHERE id = ?', [w.id]);
      if (existing) {
        await execute(
          `UPDATE workout_logs
           SET routine_id = ?, workout_date = ?, notes = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`,
          [w.routine_id || null, w.workout_date, w.notes || '', w.updated_at || serverTime, w.id, userId]
        );
      } else {
        await execute(
          `INSERT INTO workout_logs (id, user_id, routine_id, workout_date, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            w.id,
            userId,
            w.routine_id || null,
            w.workout_date,
            w.notes || '',
            w.created_at || serverTime,
            w.updated_at || serverTime
          ]
        );
      }
      confirmedIds.workouts.push(w.id);
    }

    // 2. Process Workout Sets Upsert
    for (const s of workout_sets) {
      if (!s.id || !s.workout_log_id) continue;
      const existing = await queryOne('SELECT id FROM workout_sets WHERE id = ?', [s.id]);
      if (existing) {
        await execute(
          `UPDATE workout_sets
           SET exercise_name = ?, set_number = ?, reps = ?, weight_kg = ?, rpe = ?, updated_at = ?
           WHERE id = ?`,
          [
            s.exercise_name,
            parseInt(s.set_number || 1),
            parseInt(s.reps || 0),
            parseFloat(s.weight_kg || 0),
            s.rpe ? parseInt(s.rpe) : null,
            s.updated_at || serverTime,
            s.id
          ]
        );
      } else {
        await execute(
          `INSERT INTO workout_sets (id, workout_log_id, exercise_name, set_number, reps, weight_kg, rpe, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id,
            s.workout_log_id,
            s.exercise_name,
            parseInt(s.set_number || 1),
            parseInt(s.reps || 0),
            parseFloat(s.weight_kg || 0),
            s.rpe ? parseInt(s.rpe) : null,
            s.created_at || serverTime,
            s.updated_at || serverTime
          ]
        );
      }
      confirmedIds.workout_sets.push(s.id);
    }

    // 3. Process Bookings Upsert
    for (const b of bookings) {
      if (!b.id || !b.class_id) continue;
      const existing = await queryOne('SELECT id FROM class_bookings WHERE id = ?', [b.id]);
      if (existing) {
        await execute(
          `UPDATE class_bookings
           SET status = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`,
          [b.status || 'confirmed', b.updated_at || serverTime, b.id, userId]
        );
      } else {
        await execute(
          `INSERT INTO class_bookings (id, user_id, class_id, status, booking_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            b.id,
            userId,
            b.class_id,
            b.status || 'confirmed',
            b.booking_date || serverTime,
            b.created_at || serverTime,
            b.updated_at || serverTime
          ]
        );
      }
      confirmedIds.bookings.push(b.id);
    }

    // 4. Gather Server Catalog Updates (Pull Routines & Classes for mobile offline storage)
    const routines = await query(
      `SELECT r.id, r.title, r.description, r.target_level, r.is_active, r.created_at, r.updated_at
       FROM routines r
       WHERE r.is_active = 1
       ORDER BY r.created_at DESC`
    );

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

    const routinesWithExercises = routines.map(r => ({
      ...r,
      exercises: exercisesByRoutine[r.id] || []
    }));

    // Classes with available capacity
    const classes = await query(
      `SELECT c.id, c.name, c.instructor_name, c.schedule_time, c.capacity, c.location, c.is_active,
              c.created_at, c.updated_at,
              COALESCE(b.booked_count, 0) as booked_count,
              (c.capacity - COALESCE(b.booked_count, 0)) as available_slots,
              CASE WHEN my_b.id IS NOT NULL THEN 1 ELSE 0 END as is_booked_by_me,
              my_b.id as my_booking_id
       FROM classes c
       LEFT JOIN (
         SELECT class_id, COUNT(*) as booked_count
         FROM class_bookings
         WHERE status = 'confirmed'
         GROUP BY class_id
       ) b ON c.id = b.class_id
       LEFT JOIN class_bookings my_b ON c.id = my_b.class_id AND my_b.user_id = ? AND my_b.status = 'confirmed'
       WHERE c.is_active = 1
       ORDER BY c.schedule_time ASC`,
      [userId]
    );

    // Also return user's confirmed bookings
    const myBookings = await query(
      `SELECT b.id, b.class_id, b.status, b.booking_date, b.created_at, b.updated_at,
              c.name as class_name, c.instructor_name, c.schedule_time, c.location
       FROM class_bookings b
       JOIN classes c ON b.class_id = c.id
       WHERE b.user_id = ?`,
      [userId]
    );

    return res.json({
      success: true,
      server_time: serverTime,
      confirmed_ids: confirmedIds,
      server_updates: {
        routines: routinesWithExercises,
        classes,
        my_bookings: myBookings
      }
    });
  } catch (error) {
    console.error('Error en POST /api/sync:', error);
    return res.status(500).json({ error: 'Error durante el proceso de sincronización masiva' });
  }
});

module.exports = router;
