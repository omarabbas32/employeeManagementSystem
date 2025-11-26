const { allAsync, getAsync, runAsync } = require('../Data/database');

const listDeductions = async (requestingUser) => {
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

  query += ` ORDER BY d.id DESC`;

  const deductions = await allAsync(query, params);

  // Map database fields to frontend expected fields
  return deductions.map(d => ({
    ...d,
    value: d.amount,
    employeeId: d.applyToEmployeeId,
    createdAt: d.createdAt || new Date().toISOString()
  }));
};

const createDeduction = async (payload) => {
  // Accept both frontend (value, employeeId) and backend (amount, applyToEmployeeId) field names
  const name = payload.name;
  const amount = payload.value !== undefined ? payload.value : payload.amount;
  const applyToEmployeeId = payload.employeeId !== undefined ? payload.employeeId : payload.applyToEmployeeId;
  const isActive = payload.isActive !== undefined ? payload.isActive : 1;

  // CRITICAL: Deductions must be employee-specific (no global deductions)
  if (!name || amount == null) {
    throw new Error('name and value are required');
  }

  if (!applyToEmployeeId) {
    throw new Error('employeeId is required - deductions must be assigned to a specific employee');
  }

  // Verify employee exists
  const employee = await getAsync(`SELECT id FROM employees WHERE id = ?`, [applyToEmployeeId]);
  if (!employee) {
    throw new Error('Employee not found');
  }

  // ALWAYS use 'fixed' type (no percentage)
  const type = 'fixed';

  const result = await runAsync(
    `INSERT INTO deduction_rules (name, type, amount, applyToEmployeeId, isActive)
     VALUES (?, ?, ?, ?, ?)`,
    [name, type, amount, applyToEmployeeId, isActive ? 1 : 0]
  );

  const deduction = await getAsync(`SELECT * FROM deduction_rules WHERE id = ?`, [result.lastID]);
  return {
    ...deduction,
    value: deduction.amount,
    employeeId: deduction.applyToEmployeeId
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
    isActive: payload.isActive ?? rule.isActive,
  };

  // Ensure employee-specific
  if (!updated.applyToEmployeeId) {
    throw new Error('employeeId is required - deductions must be assigned to a specific employee');
  }

  await runAsync(
    `UPDATE deduction_rules
     SET name = ?, type = ?, amount = ?, applyToEmployeeId = ?, isActive = ?
     WHERE id = ?`,
    [updated.name, updated.type, updated.amount, updated.applyToEmployeeId, updated.isActive ? 1 : 0, id]
  );

  const updatedRule = await getAsync(`SELECT * FROM deduction_rules WHERE id = ?`, [id]);
  return {
    ...updatedRule,
    value: updatedRule.amount,
    employeeId: updatedRule.applyToEmployeeId
  };
};

const deleteDeduction = async (id) => {
  await runAsync(`DELETE FROM deduction_rules WHERE id = ?`, [id]);
  return { success: true };
};

module.exports = {
  listDeductions,
  createDeduction,
  updateDeduction,
  deleteDeduction,
};
