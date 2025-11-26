const { allAsync, getAsync, runAsync } = require('../Data/database');

const listDeductions = () => allAsync(`SELECT * FROM deduction_rules ORDER BY id DESC`);

const createDeduction = async ({ name, type, amount, applyToEmployeeId = null, isActive = 1 }) => {
  if (!name || !type || amount == null) {
    throw new Error('name, type, and amount are required');
  }

  const result = await runAsync(
    `INSERT INTO deduction_rules (name, type, amount, applyToEmployeeId, isActive)
     VALUES (?, ?, ?, ?, ?)`,
    [name, type, amount, applyToEmployeeId, isActive ? 1 : 0]
  );

  return getAsync(`SELECT * FROM deduction_rules WHERE id = ?`, [result.lastID]);
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
    type: payload.type ?? rule.type,
    amount: payload.amount ?? rule.amount,
    applyToEmployeeId: payload.applyToEmployeeId ?? rule.applyToEmployeeId,
    isActive: payload.isActive ?? rule.isActive,
  };

  await runAsync(
    `UPDATE deduction_rules
     SET name = ?, type = ?, amount = ?, applyToEmployeeId = ?, isActive = ?
     WHERE id = ?`,
    [updated.name, updated.type, updated.amount, updated.applyToEmployeeId, updated.isActive ? 1 : 0, id]
  );

  return getAsync(`SELECT * FROM deduction_rules WHERE id = ?`, [id]);
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

