const { allAsync, getAsync, runAsync } = require('../Data/database');
const { hashPassword } = require('../utils/password');

const mapEmployeeDetails = async (employee) => {
  if (!employee) {
    return null;
  }

  const [tasks, responsibilities, attendance, notes] = await Promise.all([
    allAsync(`SELECT * FROM tasks WHERE assignedEmployeeId = ?`, [employee.id]),
    allAsync(`SELECT * FROM responsibilities WHERE assignedEmployeeId = ?`, [employee.id]),
    allAsync(`SELECT * FROM attendance WHERE employeeId = ? ORDER BY date DESC`, [employee.id]),
    allAsync(`SELECT * FROM notes WHERE employeeId = ? ORDER BY createdAt DESC`, [employee.id]),
  ]);

  // Map database fields to frontend expected fields
  const mappedTasks = tasks.map(task => ({
    ...task,
    title: task.name,
    checkIn: task.checkInTime,
    checkOut: task.checkOutTime,
    totalHours: task.dailyHours
  }));

  const mappedResponsibilities = responsibilities.map(resp => ({
    ...resp,
    title: resp.name
  }));

  const mappedAttendance = attendance.map(att => ({
    ...att,
    checkIn: att.checkInTime,
    checkOut: att.checkOutTime,
    totalHours: att.dailyHours || 0
  }));

  return {
    ...employee,
    assignedTasks: mappedTasks,
    assignedResponsibilities: mappedResponsibilities,
    attendanceRecords: mappedAttendance,
    notes,
  };
};

const listEmployees = async () => {
  const employees = await allAsync(`SELECT * FROM employees`);
  return Promise.all(employees.map((e) => mapEmployeeDetails(e)));
};

const getEmployeeDetails = async (id) => {
  const employee = await getAsync(`SELECT * FROM employees WHERE id = ?`, [id]);
  return mapEmployeeDetails(employee);
};

const createEmployee = async (payload) => {
  const {
    name,
    employeeType,
    username,
    email,
    password,
    baseSalary = 0,
    monthlyFactor = 1,
    overtimeFactor = 1,
    notes = '',
  } = payload;
  if (!name || !employeeType) {
    throw new Error('name and employeeType are required');
  }
  if (!username && !email) {
    throw new Error('username or email is required');
  }
  if (!password) {
    throw new Error('password is required');
  }

  const passwordHash = await hashPassword(password);

  const result = await runAsync(
    `INSERT INTO employees (name, username, email, passwordHash, employeeType, baseSalary, monthlyFactor, overtimeFactor, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, username, email, passwordHash, employeeType, baseSalary, monthlyFactor, overtimeFactor, notes]
  );

  return getEmployeeDetails(result.lastID);
};

const updateEmployee = async (id, payload) => {
  const employee = await getAsync(`SELECT * FROM employees WHERE id = ?`, [id]);
  if (!employee) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }

  const {
    name = employee.name,
    username = employee.username,
    email = employee.email,
    employeeType = employee.employeeType,
    baseSalary = employee.baseSalary,
    monthlyFactor = employee.monthlyFactor,
    overtimeFactor = employee.overtimeFactor,
    notes = employee.notes,
    password,
  } = payload;

  let passwordHash = employee.passwordHash;
  if (password) {
    passwordHash = await hashPassword(password);
  }

  await runAsync(
    `UPDATE employees
     SET name = ?, username = ?, email = ?, passwordHash = ?, employeeType = ?, baseSalary = ?, monthlyFactor = ?, overtimeFactor = ?, notes = ?
     WHERE id = ?`,
    [name, username, email, passwordHash, employeeType, baseSalary, monthlyFactor, overtimeFactor, notes, id]
  );

  return getEmployeeDetails(id);
};

const deleteEmployee = async (id) => {
  await runAsync(`DELETE FROM tasks WHERE assignedEmployeeId = ?`, [id]);
  await runAsync(`DELETE FROM responsibilities WHERE assignedEmployeeId = ?`, [id]);
  await runAsync(`DELETE FROM attendance WHERE employeeId = ?`, [id]);
  await runAsync(`DELETE FROM notes WHERE employeeId = ?`, [id]);
  await runAsync(`DELETE FROM employees WHERE id = ?`, [id]);
  return { success: true };
};

module.exports = {
  listEmployees,
  getEmployeeDetails,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
