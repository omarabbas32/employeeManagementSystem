const { DeductionRule, Employee } = require('../Data/database');

const listDeductions = async (requestingUser, month = null) => {
  const query = { isActive: 1 };

  // If not admin, only show deductions for this employee
  if (!requestingUser.isAdmin) {
    query.applyToEmployeeId = requestingUser.id;
  }

  // Filter by month if provided
  if (month) {
    query.month = month;
  }

  const deductions = await DeductionRule.find(query).sort({ id: -1 }).lean();

  // Get employee names
  const employeeIds = [...new Set(deductions.map(d => d.applyToEmployeeId).filter(id => id))];
  const employees = await Employee.find({ id: { $in: employeeIds } }).lean();
  const employeeMap = {};
  employees.forEach(e => { employeeMap[e.id] = e.name; });

  // Map database fields to frontend expected fields
  return deductions.map(d => ({
    ...d,
    value: d.amount,
    employeeId: d.applyToEmployeeId,
    employeeName: employeeMap[d.applyToEmployeeId] || null,
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
    const employee = await Employee.findOne({ id: applyToEmployeeId }).lean();
    if (!employee) {
      throw new Error('Employee not found');
    }
  }
  // If applyToEmployeeId is null/undefined, this will be a company-wide deduction

  // ALWAYS use 'fixed' type (no percentage)
  const type = 'fixed';

  const deduction = await DeductionRule.create({
    name,
    type,
    amount,
    applyToEmployeeId: applyToEmployeeId || null,
    isActive: isActive ? 1 : 0,
    month,
    hours_deducted: hoursDeducted || null
  });

  return {
    ...deduction.toObject(),
    value: deduction.amount,
    employeeId: deduction.applyToEmployeeId,
    hoursDeducted: deduction.hours_deducted
  };
};

const updateDeduction = async (id, payload) => {
  const rule = await DeductionRule.findOne({ id }).lean();
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
    hours_deducted: (payload.hoursDeducted !== undefined ? payload.hoursDeducted : payload.hours_deducted) ?? rule.hours_deducted,
    isActive: payload.isActive ?? rule.isActive,
  };

  // If employeeId is provided, verify employee exists
  if (updated.applyToEmployeeId) {
    const employee = await Employee.findOne({ id: updated.applyToEmployeeId }).lean();
    if (!employee) {
      throw new Error('Employee not found');
    }
  }

  await DeductionRule.updateOne(
    { id },
    {
      $set: {
        name: updated.name,
        type: updated.type,
        amount: updated.amount,
        applyToEmployeeId: updated.applyToEmployeeId || null,
        isActive: updated.isActive ? 1 : 0,
        hours_deducted: updated.hours_deducted || null
      }
    }
  );

  const updatedRule = await DeductionRule.findOne({ id }).lean();
  return {
    ...updatedRule,
    value: updatedRule.amount,
    employeeId: updatedRule.applyToEmployeeId,
    hoursDeducted: updatedRule.hours_deducted
  };
};

const deleteDeduction = async (id) => {
  await DeductionRule.deleteOne({ id });
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

  const deduction = await DeductionRule.create({
    name,
    type,
    amount,
    applyToEmployeeId: null,
    isActive: isActive ? 1 : 0
  });

  return {
    ...deduction.toObject(),
    value: deduction.amount,
    employeeId: deduction.applyToEmployeeId
  };
};

// Get all deductions for a specific employee (both company-wide and individual)
const getEmployeeDeductions = async (employeeId, month = null) => {
  const query = {
    isActive: 1,
    $or: [
      { applyToEmployeeId: null },
      { applyToEmployeeId: employeeId }
    ]
  };

  if (month) {
    query.month = month;
  }

  const deductions = await DeductionRule.find(query).sort({ id: -1 }).lean();

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
