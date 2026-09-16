const { DB_TYPE, execute } = require('../config/db');

async function initDatabase() {
  console.log(`[Database] Initializing tables for ${DB_TYPE.toUpperCase()}...`);

  // Compatible table definitions (works on both MySQL & SQLite)
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'usuario',
      fitness_level VARCHAR(30) NOT NULL DEFAULT 'principiante',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  const routinesTable = `
    CREATE TABLE IF NOT EXISTS routines (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      description TEXT,
      target_level VARCHAR(30) NOT NULL DEFAULT 'principiante',
      created_by VARCHAR(36) NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  const routineExercisesTable = `
    CREATE TABLE IF NOT EXISTS routine_exercises (
      id VARCHAR(36) PRIMARY KEY,
      routine_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      default_sets INTEGER NOT NULL DEFAULT 3,
      default_reps INTEGER NOT NULL DEFAULT 10,
      rest_seconds INTEGER NOT NULL DEFAULT 60,
      order_index INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  const classesTable = `
    CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      instructor_name VARCHAR(100) NOT NULL,
      schedule_time TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 20,
      location VARCHAR(100),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  const classBookingsTable = `
    CREATE TABLE IF NOT EXISTS class_bookings (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      class_id VARCHAR(36) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
      booking_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  const workoutLogsTable = `
    CREATE TABLE IF NOT EXISTS workout_logs (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      routine_id VARCHAR(36),
      workout_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  const workoutSetsTable = `
    CREATE TABLE IF NOT EXISTS workout_sets (
      id VARCHAR(36) PRIMARY KEY,
      workout_log_id VARCHAR(36) NOT NULL,
      exercise_name VARCHAR(100) NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight_kg REAL NOT NULL DEFAULT 0.0,
      rpe INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  await execute(usersTable);
  await execute(routinesTable);
  await execute(routineExercisesTable);
  await execute(classesTable);
  await execute(classBookingsTable);
  await execute(workoutLogsTable);
  await execute(workoutSetsTable);

  console.log('[Database] All tables initialized successfully.');
}

module.exports = { initDatabase };
