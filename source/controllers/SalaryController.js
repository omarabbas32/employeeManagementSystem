const dayjs = require('dayjs');
const { Employee, TaskAssignment, Responsibility, Attendance, DeductionRule } = require('../Data/database');

const sum = (arr) => arr.reduce((acc, val) => acc + Number(val || 0), 0);

const fetchEmployee = (employeeId) => Employee.findOne({ id: employeeId }).lean();

const fetchAttendanceTotals = async (employeeId, monthPattern) => {
  const monthPrefix = monthPattern.replace('%', '');
  const records = await Attendance.find({
    employeeId,
    date: new RegExp(`^${monthPrefix}`)
  }).lean();
  return sum(records.map((r) => r.dailyHours));
};

const fetchCompletedTasks = async (employeeId, month) => {
  const assignments = await TaskAssignment.find({
    assignedEmployeeId: employeeId,
    status: { $in: ['Completed', 'Done'] },
    completedMonth: month
  }).lean();

  const templateIds = [...new Set(assignments.map(a => a.templateId))];
  const templates = await require('../Data/database').TaskTemplate.find({ id: { $in: templateIds } }).lean();
  const templateMap = {};
  templates.forEach(t => { templateMap[t.id] = t; });

  return assignments.map(a => ({
    ...a,
    name: templateMap[a.templateId]?.name,
    description: templateMap[a.templateId]?.description,
    price: templateMap[a.templateId]?.price,
    factor: templateMap[a.templateId]?.factor
  }));
};

const fetchResponsibilities = (employeeId, month) =>
  Responsibility.find({
    assignedEmployeeId: employeeId,
    month
  }).lean();

const fetchSettings = () => require('../Data/database').AdminSettings.findOne({ _id: 1 }).lean();

const fetchDeductions = (employeeId, month) =>
  DeductionRule.find({
    isActive: 1,
    $or: [
      { applyToEmployeeId: null },
      { applyToEmployeeId: employeeId }
    ],
    month
  }).lean();

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

  // Use employee-specific hourly rates, fallback to global settings if not set
  const normalHourlyRate = employee.normalHourRate;
  const overtimeHourlyRate = employee.overtimeHourRate;
  const overtimeThreshold = employee.requiredMonthlyHours;

  // Calculate normal hours vs overtime hours
  const normalHours = Math.min(totalHours, overtimeThreshold);
  const overtimeHours = Math.max(0, totalHours - overtimeThreshold);

  // Calculate pay for normal and overtime hours separately
  const normalPay = normalHours * normalHourlyRate;
  const overtimePay = overtimeHours * overtimeHourlyRate;
  const workingHoursPay = normalPay + overtimePay;

  // Calculate task earnings from completed tasks
  const taskEarnings = sum(completedTasks.map(task => task.price ));
  const completedTaskCount = completedTasks.length;

  // Calculate responsibility earnings (price × monthly factor)
  const responsibilityEarnings = sum(responsibilities.map(resp =>
    (resp.monthlyPrice || 0) * (resp.factor || employee.monthlyFactor || 1)
  ));
  const responsibilityCount = responsibilities.length;

  const baseSalary = employee.baseSalary || 0;
  const grossSalary = baseSalary + workingHoursPay + taskEarnings + responsibilityEarnings;

  const deductionResult = applyDeductions(deductions, grossSalary, normalHourlyRate);
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
      normalHours: normalHours || 0,
      overtimeHours: overtimeHours || 0,
      normalRate: normalHourlyRate,
      overtimeRate: overtimeHourlyRate,
      overtimeThreshold: overtimeThreshold,
      normalPay: normalPay || 0,
      overtimePay: overtimePay || 0,
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
  const employees = await Employee.find().select('id name').lean();
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
  const monthPrefix = monthPattern.replace('%', '');
  const attendanceSessions = await Attendance.find({
    employeeId,
    date: new RegExp(`^${monthPrefix}`),
    checkOutTime: { $ne: null }
  }).sort({ date: 1, checkInTime: 1 }).lean();

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
