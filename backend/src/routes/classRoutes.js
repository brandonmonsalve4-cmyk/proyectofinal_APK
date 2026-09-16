const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, execute } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/classes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

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

    return res.json({ classes });
  } catch (error) {
    console.error('Error en GET /classes:', error);
    return res.status(500).json({ error: 'Error al obtener clases' });
  }
});

// POST /api/classes (Admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, instructor_name, schedule_time, capacity = 20, location = 'Gimnasio Principal' } = req.body;

    if (!name || !instructor_name || !schedule_time) {
      return res.status(400).json({ error: 'Nombre, instructor y horario son obligatorios' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO classes (id, name, instructor_name, schedule_time, capacity, location, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, name.trim(), instructor_name.trim(), schedule_time, parseInt(capacity), location.trim(), now, now]
    );

    return res.status(201).json({
      message: 'Clase creada exitosamente',
      gymClass: {
        id,
        name,
        instructor_name,
        schedule_time,
        capacity,
        location,
        is_active: 1
      }
    });
  } catch (error) {
    console.error('Error en POST /classes:', error);
    return res.status(500).json({ error: 'Error al crear clase' });
  }
});

// POST /api/classes/:id/book (User booking)
router.post('/:id/book', authenticateToken, async (req, res) => {
  try {
    const classId = req.params.id;
    const userId = req.user.id;

    // Check class exists
    const gymClass = await queryOne('SELECT * FROM classes WHERE id = ? AND is_active = 1', [classId]);
    if (!gymClass) {
      return res.status(404).json({ error: 'La clase solicitada no existe o no está activa' });
    }

    // Check if user already booked
    const existingBooking = await queryOne(
      'SELECT id, status FROM class_bookings WHERE user_id = ? AND class_id = ?',
      [userId, classId]
    );

    if (existingBooking && existingBooking.status === 'confirmed') {
      return res.status(400).json({ error: 'Ya tienes una reserva confirmada para esta clase' });
    }

    // Check available capacity
    const countResult = await queryOne(
      "SELECT COUNT(*) as total FROM class_bookings WHERE class_id = ? AND status = 'confirmed'",
      [classId]
    );
    const bookedCount = countResult ? countResult.total : 0;

    if (bookedCount >= gymClass.capacity) {
      return res.status(400).json({ error: 'Lo sentimos, los cupos para esta clase están agotados' });
    }

    const now = new Date().toISOString();

    if (existingBooking) {
      // Re-activate previously cancelled booking
      await execute(
        "UPDATE class_bookings SET status = 'confirmed', updated_at = ? WHERE id = ?",
        [now, existingBooking.id]
      );
      return res.json({
        message: 'Reserva reactivada exitosamente',
        booking_id: existingBooking.id
      });
    } else {
      const bookingId = uuidv4();
      await execute(
        `INSERT INTO class_bookings (id, user_id, class_id, status, booking_date, created_at, updated_at)
         VALUES (?, ?, ?, 'confirmed', ?, ?, ?)`,
        [bookingId, userId, classId, gymClass.schedule_time, now, now]
      );
      return res.status(201).json({
        message: 'Reserva confirmada exitosamente',
        booking_id: bookingId
      });
    }
  } catch (error) {
    console.error('Error en POST /classes/:id/book:', error);
    return res.status(500).json({ error: 'Error al procesar la reserva' });
  }
});

// DELETE /api/classes/bookings/:booking_id (Cancel booking)
router.delete('/bookings/:booking_id', authenticateToken, async (req, res) => {
  try {
    const { booking_id } = req.params;
    const userId = req.user.id;

    const booking = await queryOne('SELECT * FROM class_bookings WHERE id = ?', [booking_id]);
    if (!booking) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Non-admin can only cancel their own booking
    if (req.user.role !== 'admin' && booking.user_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta reserva' });
    }

    const now = new Date().toISOString();
    await execute(
      "UPDATE class_bookings SET status = 'cancelled', updated_at = ? WHERE id = ?",
      [now, booking_id]
    );

    return res.json({ message: 'Reserva cancelada exitosamente' });
  } catch (error) {
    console.error('Error en DELETE /bookings/:id:', error);
    return res.status(500).json({ error: 'Error al cancelar la reserva' });
  }
});

// GET /api/classes/my-bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookings = await query(
      `SELECT b.id as booking_id, b.status, b.created_at as booked_at,
              c.id as class_id, c.name as class_name, c.instructor_name, c.schedule_time, c.location
       FROM class_bookings b
       JOIN classes c ON b.class_id = c.id
       WHERE b.user_id = ?
       ORDER BY c.schedule_time DESC`,
      [userId]
    );

    return res.json({ bookings });
  } catch (error) {
    console.error('Error en GET /my-bookings:', error);
    return res.status(500).json({ error: 'Error al obtener tus reservas' });
  }
});

module.exports = router;
