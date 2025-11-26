const jwt = require('jsonwebtoken');
const { getAsync } = require('../Data/database');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'ADMIN_SECRET_KEY';
const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_JWT_KEY';

const normalizeRole = (role = '') => role.toLowerCase();

const mapEmployeeToUser = (employee) => {
  const role = normalizeRole(employee.employeeType);
  return {
    id: employee.id,
    name: employee.name,
    role,
    isAdmin: role === 'admin',
  };
};

const attachEmployeeToRequest = async (req, employeeId) => {
  const employee = await getAsync(`SELECT * FROM employees WHERE id = ?`, [employeeId]);
  if (!employee) {
    return null;
  }
  req.user = mapEmployeeToUser(employee);
  return req.user;
};

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.header('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await attachEmployeeToRequest(req, payload.sub);
        if (!user) {
          return res.status(401).json({ message: 'Token owner no longer exists' });
        }
        return next();
      } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
    }

    const adminSecret = req.header('x-admin-secret');
    if (adminSecret && adminSecret === ADMIN_SECRET) {
      req.user = {
        id: null,
        name: 'System Admin',
        role: 'admin',
        isAdmin: true,
        viaSecret: true,
      };
      return next();
    }

    const userId = req.header('x-user-id');
    if (userId) {
      const user = await attachEmployeeToRequest(req, userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      return next();
    }

    return res.status(401).json({ message: 'Missing authentication token, admin secret, or user id' });
  } catch (error) {
    next(error);
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }
  const allowed = roles.map(normalizeRole);
  if (allowed.includes(req.user.role)) {
    return next();
  }
  if (req.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden' });
};

const authorizeSelfOrRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }
  if (req.user.isAdmin) {
    return next();
  }
  const allowed = roles.map(normalizeRole);
  if (allowed.includes(req.user.role)) {
    return next();
  }
  const requestedId = req.params.employeeId || req.body.employeeId || req.query.employeeId;
  if (requestedId && Number(requestedId) === Number(req.user.id)) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden' });
};

module.exports = {
  authenticateUser,
  authorizeRoles,
  authorizeSelfOrRoles,
};

