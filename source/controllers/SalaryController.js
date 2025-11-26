const dayjs = require('dayjs');
const { getAsync, allAsync } = require('../Data/database');

const sum = (arr) => arr.reduce((acc, val) => acc + Number(val || 0), 0);

const fetchEmployee = (employeeId) => getAsync(`SELECT * FROM employees WHERE id = ?`, [employeeId]);

const fetchAttendanceTotals = async (employeeId, monthPattern) => {
  const records = await allAsync(
    `SELECT dailyHours FROM attendance WHERE employeeId = ? AND date LIKE ?`,
    [employeeId, monthPattern]
  );
  return sum(records.map((r) => r.dailyHours));
};

const fetchCompletedTasks = (employeeId) =>
  allAsync(
    `SELECT * FROM tasks
     WHERE assignedEmployeeId = ?
       AND status = 'Done'`,
    [employeeId]
  );

const fetchResponsibilities = (employeeId) =>
  allAsync(`SELECT * FROM responsibilities WHERE assignedEmployeeId = ?`, [employeeId]);

const fetchSettings = () => getAsync(`SELECT * FROM admin_settings WHERE id = 1`);

const fetchDeductions = (employeeId) =>
  allAsync(
    `SELECT * FROM deduction_rules
     WHERE isActive = 1 AND (applyToEmployeeId IS NULL OR applyToEmployeeId = ?)`,
    [employeeId]
  );

const calculateTaskPayment = (tasks, employeeFactor, overtimeBonus, allowTaskOvertimeFactor) => {
  const base = sum(tasks.map((task) => (task.price || 0) * (task.factor || employeeFactor)));
  if (allowTaskOvertimeFactor && overtimeBonus > 0) {
    return base * overtimeBonus;
  }
  return base;
};

const calculateResponsibilityPayment = (responsibilities, employeeFactor) =>
  sum(responsibilities.map((resp) => (resp.monthlyPrice || 0) * (resp.factor || employeeFactor)));

const applyDeductions = (deductions, gross) => {
  let total = 0;
  deductions.forEach((rule) => {
    if (rule.type === 'percentage') {
      total += (rule.amount / 100) * gross;
    } else {
      total += rule.amount;
    }
  });
  return total;
};

const calculateSalaryForEmployee = async (employeeId, month) => {
  const employee = await fetchEmployee(employeeId);
  if (!employee) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }

  const monthValue = month || dayjs().format('YYYY-MM');
  const monthPattern = `${monthValue}%`;
  const [settings, totalHours, tasks, responsibilities, deductions] = await Promise.all([
    fetchSettings(),
    fetchAttendanceTotals(employeeId, monthPattern),
    fetchCompletedTasks(employeeId),
    fetchResponsibilities(employeeId),
    fetchDeductions(employeeId),
  ]);

  const tasksForMonth = tasks.filter((task) => {
    if (!monthValue) {
      return true;
    }
    const startsInMonth = task.startDate && task.startDate.startsWith(monthValue);
    const dueInMonth = task.dueDate && task.dueDate.startsWith(monthValue);
    return startsInMonth || dueInMonth || (!task.startDate && !task.dueDate);
  });

  const normalHourRate = settings.normalHourRate || 0;
  const overtimeHourRate = settings.overtimeHourRate || 0;
  const overtimeThreshold = settings.overtimeThresholdHours || 160;

  const normalHours = Math.min(totalHours, overtimeThreshold);
  const overtimeHours = Math.max(totalHours - overtimeThreshold, 0);
  const normalPay = normalHours * normalHourRate;
  const overtimePay = overtimeHours * overtimeHourRate;

  const employeeFactor = employee.monthlyFactor || 1;
  const overtimeFactor = employee.overtimeFactor || 1;
  const overtimeBonusMultiplier = overtimeHours > 0 ? overtimeFactor : 1;

  const regularTaskPayment = calculateTaskPayment(
    tasksForMonth,
    employeeFactor,
    overtimeBonusMultiplier,
    Boolean(settings.allowTaskOvertimeFactor)
  );
  const responsibilityPayment = calculateResponsibilityPayment(responsibilities, employeeFactor);

  let responsibilityDeduction = 0;
  if (settings.allowResponsibilityDeduction) {
    const incomplete = responsibilities.filter((resp) => resp.status !== 'Done');
    responsibilityDeduction = sum(incomplete.map((resp) => (resp.monthlyPrice || 0) * (resp.factor || employeeFactor)));
  }

  const grossBeforeDeductions =
    normalPay + overtimePay + regularTaskPayment + responsibilityPayment - responsibilityDeduction;
  const deductionTotal = applyDeductions(deductions, grossBeforeDeductions);
  const netSalary = grossBeforeDeductions - deductionTotal;

  return {
    employee,
    period: monthValue,
    hours: {
      totalHours,
      normalHours,
      overtimeHours,
    },
    payments: {
      normalPay,
      overtimePay,
      regularTaskPayment,
      responsibilityPayment,
    },
    deductions: {
      responsibilityDeduction,
      configuredDeductions: deductionTotal,
    },
    netSalary,
  };
};

const calculateAllSalaries = async (month) => {
  const employees = await allAsync(`SELECT id FROM employees`);
  return Promise.all(employees.map((emp) => calculateSalaryForEmployee(emp.id, month)));
};

module.exports = {
  calculateSalaryForEmployee,
  calculateAllSalaries,
};

