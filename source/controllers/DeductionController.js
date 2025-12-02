const { allAsync, getAsync, runAsync } = require('../Data/database');

const listDeductions = async (requestingUser, month = null) => {
  let query = `SELECT d.*, e.name as employeeName 
               FROM deduction_rules d
               LEFT JOIN employees e ON d.applyToEmployeeId = e.id
               WHERE d.isActive = 1`;
  const params = [];

  // If not admin, only show deductions for this employee
  if (!requestingUser.isAdmin) {
    query += ` AND d.applyToEmployeeId = ?`;
    params.push(requestingUser.id);
  }

  // Filter by month if provided
  if (month) {
    query += ` AND d.month = ?`;
    params.push(month);
  }

  query += ` ORDER BY d.id DESC`;

  const deductions = await allAsync(query, params);

  // Map database fields to frontend expected fields
  return deductions.map(d => ({
    ...d,
    value: d.amount,
    employeeId: d.applyToEmployeeId,
    hoursDeducted: d.hours_deducted,
    createdAt: d.createdAt || new Date().toISOString()
  }));
};

const createDeduction = async (payload) => {
  const dayjs = require('dayjs');
  // Accept both frontend (value, employeeId) and backend (amount, applyToEmployeeId) field names
  const name = payload.name;
  const amount = payload.value !== undefined ? payload.value : payload.amount;
  const applyToEmployeeId = payload.employeeId !== undefined ? payload.employeeId : payload.applyToEmployeeId;
  const hoursDeducted = payload.hoursDeducted !== undefined ? payload.hoursDeducted : payload.hours_deducted;
  const isActive = payload.isActive !== undefined ? payload.isActive : 1;
  const month = payload.month || dayjs().format('YYYY-MM');

  // Validate required fields
  if (!name || amount == null) {
    throw new Error('name and value are required');
  }

  // If employeeId is provided, verify employee exists
  if (applyToEmployeeId) {
    const employee = await getAsync(`SELECT id FROM employees WHERE id = ?`, [applyToEmployeeId]);
    if (!employee) {
      throw new Error('Employee not found');
    }
  }
  // If applyToEmployeeId is null/undefined, this will be a company-wide deduction

  // ALWAYS use 'fixed' type (no percentage)
  const type = 'fixed';

  const result = await runAsync(
    `INSERT INTO deduction_rules (name, type, amount, applyToEmployeeId, isActive, month, hours_deducted)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, type, amount, applyToEmployeeId || null, isActive ? 1 : 0, month, hoursDeducted || null]
  );

  const deduction = await getAsync(`SELECT * FROM deduction_rules WHERE id = ?`, [result.lastID]);
  return {
    ...deduction,
    value: deduction.amount,
    employeeId: deduction.applyToEmployeeId,
    hoursDeducted: deduction.hours_deducted
  };
};

const updateDeduction = async (id, payload) => {
  const rule = await getAsync(`SELECT * FROM deduction_rules WHERE id = ?`, [id]);
  if (!rule) {
    const error = new Error('Deduction rule not found');
    error.status = 404;
    throw error;
  }

  const updated = {
    name: payload.name ?? rule.name,
    type: 'fixed', // ALWAYS fixed
    amount: (payload.value !== undefined ? payload.value : payload.amount) ?? rule.amount,
    applyToEmployeeId: (payload.employeeId !== undefined ? payload.employeeId : payload.applyToEmployeeId) ?? rule.applyToEmployeeId,
    hoursDeducted: (payload.hoursDeducted !== undefined ? payload.hoursDeducted : payload.hours_deducted) ?? rule.hours_deducted,
    isActive: payload.isActive ?? rule.isActive,
  };

  // If employeeId is provided, verify employee exists
  if (updated.applyToEmployeeId) {
    const employee = await getAsync(`SELECT id FROM employees WHERE id = ?`, [updated.applyToEmployeeId]);
    if (!employee) {
      throw new Error('Employee not found');
    }
  }

  await runAsync(
    `UPDATE deduction_rules
     SET name = ?, type = ?, amount = ?, applyToEmployeeId = ?, isActive = ?, hours_deducted = ?
     WHERE id = ?`,
    [updated.name, updated.type, updated.amount, updated.applyToEmployeeId || null, updated.isActive ? 1 : 0, updated.hoursDeducted || null, id]
  );

  const updatedRule = await getAsync(`SELECT * FROM deduction_rules WHERE id = ?`, [id]);
  return {
    ...updatedRule,
    value: updatedRule.amount,
    employeeId: updatedRule.applyToEmployeeId,
    hoursDeducted: updatedRule.hours_deducted
  };
};

const deleteDeduction = async (id) => {
  await runAsync(`DELETE FROM deduction_rules WHERE id = ?`, [id]);
  return { success: true };
};

// Create a company-wide deduction (applies to all employees)
const createBulkDeduction = async (payload) => {
  const name = payload.name;
  const amount = payload.value !== undefined ? payload.value : payload.amount;
  const isActive = payload.isActive !== undefined ? payload.isActive : 1;

  if (!name || amount == null) {
    throw new Error('name and value are required');
  }

  const type = 'fixed';

  const result = await runAsync(
    `INSERT INTO deduction_rules (name, type, amount, applyToEmployeeId, isActive)
     VALUES (?, ?, ?, NULL, ?)`,
    [name, type, amount, isActive ? 1 : 0]
  );

  const deduction = await getAsync(`SELECT * FROM deduction_rules WHERE id = ?`, [result.lastID]);
  return {
    ...deduction,
    value: deduction.amount,
    employeeId: deduction.applyToEmployeeId
  };
};

// Get all deductions for a specific employee (both company-wide and individual)
const getEmployeeDeductions = async (employeeId, month = null) => {
  let query = `SELECT * FROM deduction_rules
     WHERE isActive = 1 AND (applyToEmployeeId IS NULL OR applyToEmployeeId = ?)`;
  const params = [employeeId];

  if (month) {
    query += ` AND month = ?`;
    params.push(month);
  }

  query += ` ORDER BY id DESC`;

  const deductions = await allAsync(query, params);

  return deductions.map(d => ({
    ...d,
    value: d.amount,
    employeeId: d.applyToEmployeeId,
    hoursDeducted: d.hours_deducted,
    isCompanyWide: d.applyToEmployeeId === null
  }));
};

module.exports = {
  listDeductions,
  createDeduction,
  updateDeduction,
  deleteDeduction,
  createBulkDeduction,
  getEmployeeDeductions,
};
