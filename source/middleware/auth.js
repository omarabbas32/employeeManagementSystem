const jwt = require('jsonwebtoken');
const { Employee } = require('../Data/database');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'ADMIN_SECRET_KEY';
const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_JWT_KEY';

const normalizeRole = (role = '') => role.toLowerCase();

const mapEmployeeToUser = (employee) => {
  const role = normalizeRole(employee.employeeType);
  return {
    id: employee.id, // Use numeric id instead of MongoDB _id
    name: employee.name,
    role,
    isAdmin: role === 'admin',
  };
};

const attachEmployeeToRequest = async (req, employeeId) => {
  // employeeId from JWT token is now the numeric id
  const numericId = parseInt(employeeId);
  let employee;

  if (!isNaN(numericId)) {
    employee = await Employee.findOne({ id: numericId }).lean();
  } else if (typeof employeeId === 'string' && employeeId.length === 24 && /^[0-9a-fA-F]{24}$/.test(employeeId)) {
    // Fallback for old tokens with MongoDB ObjectId
    employee = await Employee.findById(employeeId).lean();
  }

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

const authorizeSelfOrRoles = (...roles) => async (req, res, next) => {
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
  if (requestedId) {
    // Direct string comparison
    if (requestedId.toString() === req.user.id.toString()) {
      return next();
    }

    // Check if requested ID matches the user's employee record (handles both numeric id and _id)
    try {
      const numericId = parseInt(requestedId);
      const query = { $or: [] };

      // Add numeric id query if valid
      if (!isNaN(numericId)) {
        query.$or.push({ id: numericId });
      }

      // Add MongoDB _id query if it looks like an ObjectId (24 hex chars)
      if (typeof requestedId === 'string' && requestedId.length === 24 && /^[0-9a-fA-F]{24}$/.test(requestedId)) {
        query.$or.push({ _id: requestedId });
      }

      if (query.$or.length > 0) {
        const employee = await Employee.findOne(query).lean();
        if (employee && (employee.id.toString() === req.user.id.toString() || employee._id.toString() === req.user.id.toString())) {
          return next();
        }
      }
    } catch (err) {
      // If lookup fails, continue to forbidden
    }
  }

  return res.status(403).json({ message: 'Forbidden' });
};

module.exports = {
  authenticateUser,
  authorizeRoles,
  authorizeSelfOrRoles,
};

