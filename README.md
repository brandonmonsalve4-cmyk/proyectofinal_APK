# Gym Sync - Discipline Tracker (App Móvil & Backend REST)

Proyecto de Gestión y Seguimiento de Gimnasio con arquitectura **Offline-First**, sincronización en tiempo real mediante detección de red, autenticación JWT con roles (`usuario` y `admin`), y empaquetado de APK ejecutable con Expo EAS Build.

---

## 🏗️ 1. Arquitectura del Proyecto

```
proyecto_APK/
├── backend/                  # Servidor API REST (Express / Node.js con soporte dual SQLite / MySQL)
│   ├── server.js             # Entrada y arranque del servidor
│   ├── src/
│   │   ├── config/db.js      # Adaptador universal de Base de Datos (MySQL / SQLite)
│   │   ├── db/
│   │   │   ├── init.js       # Inicialización de esquemas y tablas
│   │   │   └── seed.js       # Semillas iniciales (Admin, Usuario demo, Rutinas, Clases)
│   │   ├── middleware/auth.js# Verificación JWT y control de acceso por roles (RBAC)
│   │   ├── routes/
│   │   │   ├── authRoutes.js # Login, Registro, Perfil, Socios
│   │   │   ├── routineRoutes.js # Rutinas con ejercicios asignados
│   │   │   ├── classRoutes.js   # Clases del gym, cupos y reservas
│   │   │   ├── workoutRoutes.js # Registro y consulta de entrenamientos
│   │   │   └── syncRoutes.js    # Endpoint de Sincronización Masiva (/api/sync)
│   │   └── app.js            # Configuración de Express, CORS y Middleware
│   └── test_api.js           # Suite de pruebas automatizadas de endpoints
│
└── frontend/                 # Aplicación Móvil React Native con Expo (TypeScript)
    ├── App.tsx               # Entrypoint con providers de navegación y auth
    ├── app.json              # Configuración del paquete Android (com.gymsync.app)
    ├── eas.json              # Perfil 'preview' configurado para compilar archivo APK
    └── src/
        ├── api/client.ts     # Cliente Axios con inyección de JWT Bearer
        ├── db/database.ts    # Base de datos SQLite local (expo-sqlite) y repositorios
        ├── services/syncService.ts # Motor de sincronización bidireccional
        ├── hooks/useSync.ts  # Hook de detección de red (@react-native-community/netinfo)
        ├── context/AuthContext.tsx # Estado global de autenticación persistente
        ├── components/NetworkBanner.tsx # Indicador visual de modo Offline/Online
        ├── navigation/AppNavigator.tsx # Enrutador dinámico por rol
        └── screens/          # Los 5 Módulos Requeridos
            ├── LoginScreen.tsx           # Módulo 1: Login con JWT y accesos demo
            ├── RegisterScreen.tsx        # Módulo 2: Registro con nivel de fitness
            ├── WorkoutLoggerScreen.tsx   # Módulo 3: Logger de entrenamientos (Offline-First)
            ├── AdminPanelScreen.tsx      # Módulo 4: Panel Admin (Rutinas y Clases)
            └── HistoryBookingsScreen.tsx # Módulo 5: Historial de sesiones y Reservas
```

---

## 🔑 2. Credenciales de Prueba Preconfiguradas

El backend incluye datos de prueba para evaluar de inmediato ambos roles:

| Rol | Correo Electrónico | Contraseña | Capacidades |
| :--- | :--- | :--- | :--- |
| **Usuario / Socio** | `usuario@gymsync.com` | `User123!` | Registrar series offline/online, ver historial y reservar clases |
| **Coach / Administrador** | `admin@gymsync.com` | `Admin123!` | Crear rutinas, definir ejercicios, programar clases y ver socios |

*(En la pantalla de Login hay botones de "Acceso Rápido" para autocompletar estas credenciales con un solo toque).*

---

## 🚀 3. Instrucciones de Ejecución

### A. Iniciar el Backend API
1. Abre una terminal en la carpeta `backend`:
   ```bash
   cd backend
   ```
2. Ejecuta el servidor:
   ```bash
   npm start
   ```
   *El servidor inicializará las tablas y las semillas automáticamente, quedando disponible en `http://localhost:5000`.*
   *Por defecto opera en modo SQLite embebido para ejecución inmediata sin configuración. Si deseas conectarlo a un servidor MySQL físico, edita el archivo `.env` cambiando `DB_TYPE=mysql` y tus credenciales.*

3. Puedes verificar el estado de los endpoints ejecutando la suite de pruebas:
   ```bash
   node test_api.js
   ```

---

### B. Iniciar la App Móvil en Expo
1. Abre otra terminal en la carpeta `frontend`:
   ```bash
   cd frontend
   ```
2. En `src/config/api.ts`, asegúrate de apuntar a la IP de tu máquina en la red local si pruebas desde un teléfono real (ejemplo: `http://192.168.1.50:5000/api`).
3. Inicia el entorno Expo:
   ```bash
   npm start
   ```
4. Escanea el código QR desde la aplicación **Expo Go** en Android o presiona `a` para abrir el emulador de Android.

---

## 📦 4. Instrucciones para Compilar y Generar el APK

Para generar el instalable `.apk` para Android sin necesidad de configurar Android Studio:

1. **Instalar EAS CLI globalmente** (si aún no lo tienes):
   ```bash
   npm install -g eas-cli
   ```

2. **Iniciar sesión con tu cuenta de Expo**:
   ```bash
   eas login
   ```
   *(Si no tienes cuenta, regístrate gratis en https://expo.dev/signup).*

3. **Configurar el proyecto en tu cuenta de Expo** (solo la primera vez):
   ```bash
   cd frontend
   eas project:init
   ```

4. **Ejecutar el comando de compilación del APK**:
   ```bash
   eas build -p android --profile preview
   ```

### ¿Por qué `--profile preview`?
En el archivo `frontend/eas.json`, el perfil `preview` tiene la instrucción `"buildType": "apk"`:
```json
"preview": {
  "android": {
    "buildType": "apk"
  }
}
```
Esto le indica a los servidores de Expo en la nube que compile un archivo **`.apk` autónomo e instalable directamente**, en lugar de un `.aab` (que solo sirve para Google Play Store). Al terminar, la consola te entregará un enlace directo y un código QR para descargar el archivo APK a cualquier celular Android.

---

## 💡 5. Verificación de la Funcionalidad Offline-First

1. Abre la app en el celular o emulador con sesión iniciada.
2. Desactiva el Wi-Fi / Datos móviles (o activa el Modo Avión).
3. Verás que la barra superior cambia a **"Modo Offline: Operando con SQLite Local"**.
4. Dirígete a la pestaña **"Entrenar"**, selecciona o crea un ejercicio con peso y repeticiones, y pulsa **Guardar Entrenamiento**.
5. Se guardará de inmediato en la base de datos local SQLite nativa del dispositivo con la bandera `synced = 0`.
6. En la pestaña **"Progreso"**, verás tu entrenamiento con la etiqueta amarilla `Pendiente Sync`.
7. Reactiva el Wi-Fi / Internet.
8. El hook `useSync` detecta la recuperación de red en tiempo real, ejecuta el envío por lotes al endpoint `/api/sync`, y actualiza los registros a `synced = 1` (etiqueta verde `Sincronizado`).
