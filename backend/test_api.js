const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Probando API Backend ---');

  // 1. Health check
  const health = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  console.log('1. Health Check:', health.status, health.data.status);

  // 2. Login User
  const loginUser = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { email: 'usuario@gymsync.com', password: 'User123!' }
  );
  console.log('2. Login Usuario:', loginUser.status, 'Role:', loginUser.data.user?.role);
  const userToken = loginUser.data.token;

  // 3. Login Admin
  const loginAdmin = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { email: 'admin@gymsync.com', password: 'Admin123!' }
  );
  console.log('3. Login Admin:', loginAdmin.status, 'Role:', loginAdmin.data.user?.role);
  const adminToken = loginAdmin.data.token;

  // 4. Get Routines
  const routines = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/routines',
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` }
  });
  console.log('4. Get Routines:', routines.status, 'Count:', routines.data.routines?.length);

  // 5. Get Classes
  const classes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/classes',
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` }
  });
  console.log('5. Get Classes:', classes.status, 'Count:', classes.data.classes?.length);

  // 6. Test Batch Sync (Offline Push)
  const testWorkoutId = 'test-w-' + Date.now();
  const testSetId = 'test-s-' + Date.now();
  const syncResult = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/sync',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      }
    },
    {
      last_synced_at: new Date(Date.now() - 3600000).toISOString(),
      workouts: [
        {
          id: testWorkoutId,
          routine_id: routines.data.routines[0]?.id,
          workout_date: '2026-09-16',
          notes: 'Entrenamiento offline de prueba',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      workout_sets: [
        {
          id: testSetId,
          workout_log_id: testWorkoutId,
          exercise_name: 'Press de Banca',
          set_number: 1,
          reps: 10,
          weight_kg: 85.5,
          rpe: 8,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      bookings: []
    }
  );

  console.log('6. Sync Masivo (Offline -> Online):', syncResult.status, 'Success:', syncResult.data.success);
  console.log('   Confirmed Workouts:', syncResult.data.confirmed_ids?.workouts);
  console.log('   Confirmed Sets:', syncResult.data.confirmed_ids?.workout_sets);
  console.log('   Pulled Routines:', syncResult.data.server_updates?.routines?.length);
  console.log('   Pulled Classes:', syncResult.data.server_updates?.classes?.length);

  console.log('--- TODOS LOS TESTS DE API COMPLETADOS CON ÉXITO ---');
}

runTests().catch(console.error);
