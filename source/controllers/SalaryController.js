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

const fetchCompletedTasks = (employeeId, month) =>
  allAsync(
    `SELECT ta.*, tt.name, tt.description, tt.price, tt.factor
     FROM task_assignments ta
     JOIN task_templates tt ON ta.templateId = tt.id
     WHERE ta.assignedEmployeeId = ?
       AND (ta.status = 'Completed' OR ta.status = 'Done')
       AND ta.completedMonth = ?`,
    [employeeId, month]
  );

const fetchResponsibilities = (employeeId, month) =>
  allAsync(
    `SELECT * FROM responsibilities 
     WHERE assignedEmployeeId = ? AND month = ?`,
    [employeeId, month]
  );

const fetchSettings = () => getAsync(`SELECT * FROM admin_settings WHERE id = 1`);

const fetchDeductions = (employeeId, month) =>
  allAsync(
    `SELECT * FROM deduction_rules
     WHERE isActive = 1 
       AND (applyToEmployeeId IS NULL OR applyToEmployeeId = ?)
       AND month = ?`,
    [employeeId, month]
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

const applyDeductions = (deductions, gross, employeeHourlyRate) => {
  let total = 0;
  const details = [];

  deductions.forEach((rule) => {
    let amount = 0;
    let hoursDeducted = null;

    // Check if this is a hour-based deduction
    if (rule.hours_deducted != null && rule.hours_deducted > 0) {
      hoursDeducted = rule.hours_deducted;
      amount = hoursDeducted * (employeeHourlyRate || 0);
    } else if (rule.type === 'percentage') {
      amount = (rule.amount / 100) * gross;
    } else {
      amount = rule.amount;
    }

    total += amount;
    details.push({
      name: rule.name,
      type: rule.type,
      value: rule.amount,
      hoursDeducted: hoursDeducted,
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
  const [settings, totalHours, deductions, completedTasks, responsibilities] = await Promise.all([
    fetchSettings(),
    fetchAttendanceTotals(employeeId, monthPattern),
    fetchDeductions(employeeId, monthValue),
    fetchCompletedTasks(employeeId, monthValue),
    fetchResponsibilities(employeeId, monthValue),
  ]);

  // COMPLETE CALCULATION: Net Salary = Base + Hours Pay + Task Earnings + Responsibility Earnings - Deductions

  // Use employee-specific hourly rate, fallback to global settings if not set
  const hourlyRate = employee.normalHourRate || settings?.normalHourRate || 15;

  // Calculate working hours payment (all hours paid at same rate)
  const workingHoursPay = totalHours * hourlyRate;

  // Calculate task earnings from completed tasks
  const taskEarnings = sum(completedTasks.map(task => task.price || 0));
  const completedTaskCount = completedTasks.length;

  // Calculate responsibility earnings (price × monthly factor)
  const responsibilityEarnings = sum(responsibilities.map(resp =>
    (resp.monthlyPrice || 0) * (resp.factor || employee.monthlyFactor || 1)
  ));
  const responsibilityCount = responsibilities.length;

  const baseSalary = employee.baseSalary || 0;
  const grossSalary = baseSalary + workingHoursPay + taskEarnings + responsibilityEarnings;

  const deductionResult = applyDeductions(deductions, grossSalary, hourlyRate);
  const netSalary = grossSalary - deductionResult.total;

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
      hourlyRate: hourlyRate,
      workingHoursPay: workingHoursPay || 0
    },
    // Task data
    tasks: {
      completed: completedTaskCount,
      totalEarnings: taskEarnings || 0
    },
    // Responsibility data
    responsibilities: {
      count: responsibilityCount,
      totalEarnings: responsibilityEarnings || 0
    },
    // Deductions
    deductions: {
      total: deductionResult.total || 0,
      details: deductionResult.details
    },
    // Totals
    grossSalary: grossSalary,
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

  return {
    employee: salaryData.employee || {},
    period: monthValue,
    generatedAt: dayjs().toISOString(),

    // Attendance details
    attendance: {
      totalHours: salaryData.attendance.totalHours,
      hourlyRate: salaryData.attendance.hourlyRate,
      workingHoursPay: salaryData.attendance.workingHoursPay,
      sessions: attendanceSessions.map(s => ({
        date: s.date,
        checkIn: s.checkInTime,
        checkOut: s.checkOutTime,
        hours: s.dailyHours
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
      workingHoursPay: salaryData.attendance.workingHoursPay,
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
