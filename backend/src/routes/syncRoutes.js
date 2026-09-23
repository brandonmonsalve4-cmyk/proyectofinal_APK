const express = require('express');
const router = express.Router();
const { execute } = require('../config/db'); // Usamos el mismo import que tus otras rutas

router.post('/', async (req, res) => {
  console.log('📥 [Sync Request Recibida]:', JSON.stringify(req.body, null, 2));
  const { bookings } = req.body;

  if (!Array.isArray(bookings) || bookings.length === 0) {
    return res.status(400).json({ error: 'No hay reservas para sincronizar' });
  }

  try {
    const now = new Date().toISOString();

    // Iteramos e insertamos cada reserva usando la función execute de tu proyecto
    for (const item of bookings) {
      const bookingId = item.id || 'b-' + Math.random().toString(36).substring(2, 9);
      const userId = item.user_id || '6a77308e-7dbc-4183-8058-d113a6a9e287';
      const classId = item.class_id;
      const bookingDate = item.booking_date || item.created_at || now;

      await execute(
        `INSERT INTO class_bookings (id, user_id, class_id, status, booking_date, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [bookingId, userId, classId, 'confirmed', bookingDate, now, now]
      );
    }

    console.log(`✅ [Sync] Sincronizadas exitosamente ${bookings.length} reservas offline en SQLite.`);
    return res.status(200).json({ success: true, syncedCount: bookings.length });
  } catch (error) {
    console.error('❌ [Sync Error Detallado]:', error.message);
    return res.status(500).json({ error: 'Error interno al guardar las reservas: ' + error.message });
  }
});

module.exports = router;