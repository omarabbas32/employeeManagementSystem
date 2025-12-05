const jwt = require('jsonwebtoken');
const { Employee } = require('../Data/database');
const { comparePassword } = require('../utils/password');

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_JWT_KEY';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

const generateToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

const resolveEmployeeByCredential = async ({ username, email }) => {
  if (!username && !email) {
    throw new Error('username or email is required');
  }
  const query = username ? { username } : { email };
  return Employee.findOne(query).lean();
};

const login = async ({ username, email, password }) => {
  if (!password) {
    throw new Error('password is required');
  }

  const employee = await resolveEmployeeByCredential({ username, email });
  if (!employee || !employee.passwordHash) {
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const valid = await comparePassword(password, employee.passwordHash);
  if (!valid) {
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const token = generateToken({
    sub: employee.id.toString(),
    role: employee.employeeType.toLowerCase(),
    name: employee.name,
  });

  return {
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      employeeType: employee.employeeType,
      username: employee.username,
      email: employee.email,
    },
  };
};

module.exports = {
  login,
};

