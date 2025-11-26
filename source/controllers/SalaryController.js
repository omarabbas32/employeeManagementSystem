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
  const details = [];

  deductions.forEach((rule) => {
    let amount = 0;
    if (rule.type === 'percentage') {
      amount = (rule.amount / 100) * gross;
    } else {
      amount = rule.amount;
    }
    total += amount;
    details.push({
      name: rule.name,
      type: rule.type,
      value: rule.amount,
      calculatedAmount: amount
    });
  });

  return { total, details };
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

  const normalHourRate = settings?.normalHourRate || 0;
  const overtimeHourRate = settings?.overtimeHourRate || 0;
  const overtimeThreshold = settings?.overtimeThresholdHours || 160;

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
    Boolean(settings?.allowTaskOvertimeFactor)
  );
  const responsibilityPayment = calculateResponsibilityPayment(responsibilities, employeeFactor);

  let responsibilityDeduction = 0;
  if (settings?.allowResponsibilityDeduction) {
    const incomplete = responsibilities.filter((resp) => resp.status !== 'Done');
    responsibilityDeduction = sum(incomplete.map((resp) => (resp.monthlyPrice || 0) * (resp.factor || employeeFactor)));
  }

  const baseSalary = employee.baseSalary || 0;
  const grossBeforeDeductions =
    baseSalary + normalPay + overtimePay + regularTaskPayment + responsibilityPayment - responsibilityDeduction;

  const deductionResult = applyDeductions(deductions, grossBeforeDeductions);
  const netSalary = grossBeforeDeductions - deductionResult.total;

  // Return structure that matches frontend expectations
  return {
    employee: employee,
    employeeId: employee.id,
    employeeName: employee.name,
    period: monthValue,
    baseSalary: baseSalary,
    // Attendance data
    attendance: {
      totalHours: totalHours || 0,
      normalHours: normalHours || 0,
      overtimeHours: overtimeHours || 0,
      normalPay: normalPay || 0,
      overtimePay: overtimePay || 0
    },
    // Tasks data
    tasks: {
      completed: tasksForMonth.length,
      totalEarnings: regularTaskPayment || 0
    },
    // Responsibilities data
    responsibilities: {
      count: responsibilities.length,
      totalEarnings: responsibilityPayment || 0,
      deduction: responsibilityDeduction || 0
    },
    // Deductions
    deductions: {
      total: deductionResult.total || 0,
      details: deductionResult.details
    },
    // Totals
    grossSalary: grossBeforeDeductions,
    netSalary: netSalary
  };
};

const calculateAllSalaries = async (month) => {
  const employees = await allAsync(`SELECT id, name FROM employees`);
  const results = await Promise.all(employees.map((emp) => calculateSalaryForEmployee(emp.id, month)));

  // Return format expected by payroll page
  return results.map(result => ({
    employeeId: result.employeeId,
    employeeName: result.employeeName,
    grossSalary: result.grossSalary,
    netSalary: result.netSalary,
    period: result.period
  }));
};

// NEW: Generate detailed invoice for a single employee
const generateEmployeeInvoice = async (employeeId, month) => {
  const salaryData = await calculateSalaryForEmployee(employeeId, month);

  // Fetch detailed attendance sessions
  const monthValue = month || dayjs().format('YYYY-MM');
  const monthPattern = `${monthValue}%`;
  const attendanceSessions = await allAsync(
    `SELECT * FROM attendance 
     WHERE employeeId = ? AND date LIKE ? AND checkOutTime IS NOT NULL
     ORDER BY date ASC, checkInTime ASC`,
    [employeeId, monthPattern]
  );

  // Fetch completed tasks for the month
  const allTasks = await fetchCompletedTasks(employeeId);
  const tasksForMonth = allTasks.filter((task) => {
    if (!monthValue) return true;
    const startsInMonth = task.startDate && task.startDate.startsWith(monthValue);
    const dueInMonth = task.dueDate && task.dueDate.startsWith(monthValue);
    return startsInMonth || dueInMonth || (!task.startDate && !task.dueDate);
  });

  // Fetch responsibilities
  const responsibilities = await fetchResponsibilities(employeeId);

  // Fetch deductions
  const deductions = await fetchDeductions(employeeId);

  return {
    employee: salaryData.employee || {},
    period: monthValue,
    generatedAt: dayjs().toISOString(),

    // Attendance details
    attendance: {
      totalHours: salaryData.attendance.totalHours,
      normalHours: salaryData.attendance.normalHours,
      overtimeHours: salaryData.attendance.overtimeHours,
      sessions: attendanceSessions.map(s => ({
        date: s.date,
        checkIn: s.checkInTime,
        checkOut: s.checkOutTime,
        hours: s.dailyHours
      }))
    },

    // Tasks details
    tasks: {
      completed: tasksForMonth.length,
      totalEarnings: salaryData.tasks.totalEarnings,
      list: tasksForMonth.map(t => ({
        title: t.name,
        description: t.description,
        price: t.price,
        factor: t.factor,
        completedDate: t.dueDate
      }))
    },

    // Responsibilities details
    responsibilities: {
      count: responsibilities.length,
      totalEarnings: salaryData.responsibilities.totalEarnings,
      list: responsibilities.map(r => ({
        title: r.name,
        description: r.description,
        monthlyPrice: r.monthlyPrice,
        factor: r.factor
      }))
    },

    // Deductions details
    deductions: {
      total: salaryData.deductions.total,
      list: salaryData.deductions.details || []
    },

    // Salary breakdown
    salary: {
      base: salaryData.baseSalary,
      gross: salaryData.grossSalary,
      deductions: salaryData.deductions.total,
      net: salaryData.netSalary
    }
  };
};

module.exports = {
  calculateSalaryForEmployee,
  calculateAllSalaries,
  generateEmployeeInvoice,
};
