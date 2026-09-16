const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gym_sync_super_secure_jwt_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      error: 'Token de autenticación requerido'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Token inválido o expirado'
      });
    }
    req.user = user;
    next();
  });
}

function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los roles: [${roles.join(', ')}]`
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole
};
