const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { queryOne, execute } = require('../config/db');
const { initDatabase } = require('./init');

async function seedDatabase() {
  await initDatabase();

  console.log('[Seed] Seeding initial data...');

  // 1. Seed Users
  const existingAdmin = await queryOne('SELECT id FROM users WHERE email = ?', ['admin@gymsync.com']);
  let adminId = existingAdmin ? existingAdmin.id : uuidv4();

  if (!existingAdmin) {
    const adminPassHash = await bcrypt.hash('Admin123!', 10);
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO users (id, name, email, password_hash, role, fitness_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'Coach Admin', 'admin@gymsync.com', adminPassHash, 'admin', 'avanzado', now, now]
    );
    console.log('[Seed] Created admin: admin@gymsync.com (Password: Admin123!)');
  }

  const existingUser = await queryOne('SELECT id FROM users WHERE email = ?', ['usuario@gymsync.com']);
  if (!existingUser) {
    const userPassHash = await bcrypt.hash('User123!', 10);
    const now = new Date().toISOString();
    const userId = uuidv4();
    await execute(
      `INSERT INTO users (id, name, email, password_hash, role, fitness_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'Juan Perez', 'usuario@gymsync.com', userPassHash, 'usuario', 'intermedio', now, now]
    );
    console.log('[Seed] Created demo user: usuario@gymsync.com (Password: User123!)');
  }

  // 2. Seed Routines
  const existingRoutine = await queryOne('SELECT id FROM routines LIMIT 1');
  if (!existingRoutine) {
    const now = new Date().toISOString();

    // Routine 1: Hipertrofia Torso
    const r1Id = uuidv4();
    await execute(
      `INSERT INTO routines (id, title, description, target_level, created_by, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [r1Id, 'Hipertrofia Torso / Empuje', 'Rutina de pecho, hombros y tríceps para ganancia de masa muscular.', 'intermedio', adminId, 1, now, now]
    );

    const r1Exercises = [
      { name: 'Press de Banca Plano con Barra', sets: 4, reps: 10, rest: 90, order: 1 },
      { name: 'Press Militar con Mancuernas', sets: 3, reps: 12, rest: 60, order: 2 },
      { name: 'Fondos en Paralelas / Dips', sets: 3, reps: 12, rest: 60, order: 3 },
      { name: 'Extensiones de Tríceps en Polea', sets: 4, reps: 15, rest: 45, order: 4 }
    ];

    for (const ex of r1Exercises) {
      await execute(
        `INSERT INTO routine_exercises (id, routine_id, name, default_sets, default_reps, rest_seconds, order_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), r1Id, ex.name, ex.sets, ex.reps, ex.rest, ex.order, now, now]
      );
    }

    // Routine 2: Pierna y Core
    const r2Id = uuidv4();
    await execute(
      `INSERT INTO routines (id, title, description, target_level, created_by, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [r2Id, 'Fuerza Pierna y Core', 'Sentadilla, prensa y ejercicios de estabilidad central.', 'avanzado', adminId, 1, now, now]
    );

    const r2Exercises = [
      { name: 'Sentadilla Trasera con Barra', sets: 4, reps: 8, rest: 120, order: 1 },
      { name: 'Prensa Inclinada 45°', sets: 4, reps: 12, rest: 90, order: 2 },
      { name: 'Curl Femoral Tumbado', sets: 3, reps: 15, rest: 60, order: 3 },
      { name: 'Elevación de Talones (Gemelos)', sets: 4, reps: 20, rest: 45, order: 4 },
      { name: 'Plancha Abdominal Estricta', sets: 3, reps: 60, rest: 45, order: 5 }
    ];

    for (const ex of r2Exercises) {
      await execute(
        `INSERT INTO routine_exercises (id, routine_id, name, default_sets, default_reps, rest_seconds, order_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), r2Id, ex.name, ex.sets, ex.reps, ex.rest, ex.order, now, now]
      );
    }

    // Routine 3: Full Body Iniciación
    const r3Id = uuidv4();
    await execute(
      `INSERT INTO routines (id, title, description, target_level, created_by, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [r3Id, 'Full Body Iniciación', 'Acondicionamiento físico general para nuevos usuarios.', 'principiante', adminId, 1, now, now]
    );

    const r3Exercises = [
      { name: 'Prensa de Piernas Guiada', sets: 3, reps: 12, rest: 60, order: 1 },
      { name: 'Jalón al Pecho en Polea', sets: 3, reps: 12, rest: 60, order: 2 },
      { name: 'Press de Pecho en Máquina', sets: 3, reps: 12, rest: 60, order: 3 },
      { name: 'Plancha Abdominal', sets: 3, reps: 30, rest: 45, order: 4 }
    ];

    for (const ex of r3Exercises) {
      await execute(
        `INSERT INTO routine_exercises (id, routine_id, name, default_sets, default_reps, rest_seconds, order_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), r3Id, ex.name, ex.sets, ex.reps, ex.rest, ex.order, now, now]
      );
    }

    console.log('[Seed] Created 3 default workout routines with exercises.');
  }

  // 3. Seed Gym Classes
  const existingClass = await queryOne('SELECT id FROM classes LIMIT 1');
  if (!existingClass) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    const afterTomorrow = new Date(now);
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);
    afterTomorrow.setHours(7, 30, 0, 0);

    const weekend = new Date(now);
    weekend.setDate(weekend.getDate() + 3);
    weekend.setHours(10, 0, 0, 0);

    const classesData = [
      {
        name: 'Spinning Power Ride',
        instructor: 'Camila Ríos',
        time: tomorrow.toISOString(),
        capacity: 15,
        location: 'Salón Indoor Bike (Piso 2)'
      },
      {
        name: 'Yoga Vinyasa & Core',
        instructor: 'Mateo Morales',
        time: afterTomorrow.toISOString(),
        capacity: 20,
        location: 'Salón Zen (Piso 3)'
      },
      {
        name: 'Cross Training HIIT 360',
        instructor: 'David Salazar',
        time: weekend.toISOString(),
        capacity: 12,
        location: 'Zona Funcional Exterior'
      }
    ];

    for (const c of classesData) {
      await execute(
        `INSERT INTO classes (id, name, instructor_name, schedule_time, capacity, location, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [uuidv4(), c.name, c.instructor, c.time, c.capacity, c.location, now.toISOString(), now.toISOString()]
      );
    }

    console.log('[Seed] Created 3 scheduled gym classes.');
  }

  console.log('[Seed] Seeding completed successfully.');
}

module.exports = { seedDatabase };

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
